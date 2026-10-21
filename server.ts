import express from 'express';
import fs from 'fs';
import http from 'http';
import mqtt from 'mqtt';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOMS_CACHE_FILE = path.join(__dirname, '.mp-rooms-cache.json');
const SERVER_INSTANCE_ID = `srv_${Math.random().toString(36).slice(2, 9)}`;
const CLUSTER_TOPIC_PREFIX = 'sixgun_mp_v3_ba31eb5b';

export interface CustomSlotState {
  slotIndex: number;
  team: 'blue' | 'red' | 'solo';
  occupiedBy: 'human' | 'bot' | 'empty';
  playerId: string | null;
  playerName: string;
  charId: string;
  outfitId: string;
  faceId: string;
  ready: boolean;
  isHost: boolean;
  micOn: boolean;
  listenOn: boolean;
  speaking: boolean;
}

export interface CustomRoomState {
  code: string;
  name: string;
  hostId: string;
  mode: 'volleyball_2v2' | 'obstacle_rush' | 'floor_is_lava';
  mapId: string;
  maxPlayers: number; // 4 for volleyball_2v2, 2..5 for obstacle_rush & floor_is_lava
  winScore: number;
  timerMinutes: 3 | 5 | 6;
  difficulty: string;
  fillWithBots: boolean;
  status: 'LOBBY' | 'PLAYING';
  createdAt: number;
  updatedAt?: number;
  version?: number;
  slots: CustomSlotState[];
}

interface ConnectedClient {
  ws: WebSocket | null;
  playerId: string;
  name: string;
  charId: string;
  outfitId: string;
  faceId: string;
  roomCode: string | null;
  lastSeenAt: number;
}

const DEFAULT_BOT_CHARS = [
  { name: 'BOT BJORN', charId: 'viking_beard', outfitId: 'viking_tunic', faceId: 'viking_beard' },
  { name: 'BOT BERRY', charId: 'strawberry_kid', outfitId: 'strawberry_suit', faceId: 'kawaii_blush' },
  { name: 'BOT PINE', charId: 'pineapple_king', outfitId: 'pineapple_suit', faceId: 'cool_shades' },
  { name: 'BOT BURGER', charId: 'burger_chef', outfitId: 'burger_suit', faceId: 'chef_beard' },
  { name: 'BOT MAYA', charId: 'purple_shades', outfitId: 'cat_hoodie', faceId: 'kawaii_blush' },
];

const rooms = new Map<string, CustomRoomState>();
const clients = new Map<string, ConnectedClient>();

function normalizeRoomCode(raw: string): string {
  return String(raw || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .replace(/0/g, 'O')
    .replace(/1/g, 'I')
    .slice(0, 6);
}

function loadPersistedRooms() {
  try {
    if (fs.existsSync(ROOMS_CACHE_FILE)) {
      const raw = fs.readFileSync(ROOMS_CACHE_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const now = Date.now();
        for (const r of parsed) {
          if (
            r &&
            typeof r.code === 'string' &&
            now - (r.updatedAt || r.createdAt || 0) < 7200_000
          ) {
            const norm = normalizeRoomCode(r.code);
            if (norm) {
              r.code = norm;
              rooms.set(norm, r);
            }
          }
        }
      }
    }
  } catch (_e) {
    // Ignore cache read errors
  }
}

function savePersistedRooms() {
  try {
    const list = Array.from(rooms.values());
    fs.writeFileSync(ROOMS_CACHE_FILE, JSON.stringify(list), 'utf-8');
  } catch (_e) {
    // Ignore cache write errors
  }
}

loadPersistedRooms();

function findMatchingRoom(rawCode: string): CustomRoomState | undefined {
  const clean = normalizeRoomCode(rawCode);
  if (!clean) return undefined;
  return rooms.get(clean);
}

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 5; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  const norm = normalizeRoomCode(code);
  return rooms.has(norm) ? generateRoomCode() : norm;
}

function buildInitialSlots(
  mode: CustomRoomState['mode'],
  maxPlayers: number,
  fillWithBots: boolean,
  existingSlots?: CustomSlotState[]
): CustomSlotState[] {
  const count = mode === 'volleyball_2v2' ? 4 : Math.max(2, Math.min(5, maxPlayers));
  const result: CustomSlotState[] = [];

  for (let i = 0; i < count; i++) {
    const team: CustomSlotState['team'] =
      mode === 'volleyball_2v2' ? (i < 2 ? 'blue' : 'red') : 'solo';
    const prev = existingSlots?.find((s) => s.slotIndex === i);

    if (prev && prev.occupiedBy === 'human' && prev.playerId) {
      result.push({
        ...prev,
        slotIndex: i,
        team,
      });
    } else {
      const botDef = DEFAULT_BOT_CHARS[i % DEFAULT_BOT_CHARS.length];
      result.push({
        slotIndex: i,
        team,
        occupiedBy: fillWithBots ? 'bot' : 'empty',
        playerId: null,
        playerName: fillWithBots ? botDef.name : 'OPEN SLOT',
        charId: botDef.charId,
        outfitId: botDef.outfitId,
        faceId: botDef.faceId,
        ready: true,
        isHost: false,
        micOn: false,
        listenOn: true,
        speaking: false,
      });
    }
  }
  return result;
}

/**
 * Deterministic CRDT-style Room Merger:
 * If two instances (`ais-dev` and `ais-pre`) ever create or update the same room code concurrently,
 * this merges ALL distinct human players from both room states into a single unified lobby!
 */
export function mergeRoomStates(
  localRoom: CustomRoomState | undefined,
  incomingRoom: CustomRoomState
): CustomRoomState {
  const normCode = normalizeRoomCode(incomingRoom.code);
  incomingRoom.code = normCode;

  if (!localRoom) {
    return incomingRoom;
  }

  // Determine which room was created first (canonical host/settings) and which has newer updates
  const incomingIsNewer =
    (incomingRoom.version || 0) > (localRoom.version || 0) ||
    (incomingRoom.updatedAt || 0) >= (localRoom.updatedAt || 0);

  const baseRoom: CustomRoomState = incomingIsNewer
    ? { ...incomingRoom, slots: incomingRoom.slots.map((s) => ({ ...s })) }
    : { ...localRoom, slots: localRoom.slots.map((s) => ({ ...s })) };

  const secondaryRoom = incomingIsNewer ? localRoom : incomingRoom;

  // Preserve earliest createdAt and original hostId if host is still present
  if ((secondaryRoom.createdAt || Infinity) < (baseRoom.createdAt || Infinity)) {
    baseRoom.createdAt = secondaryRoom.createdAt;
  }

  // Collect all unique human players across both room states, preserving their preferred slots
  const humanByPlayerId = new Map<string, CustomSlotState>();

  for (const s of secondaryRoom.slots) {
    if (s.occupiedBy === 'human' && s.playerId) {
      humanByPlayerId.set(s.playerId, { ...s });
    }
  }
  for (const s of baseRoom.slots) {
    if (s.occupiedBy === 'human' && s.playerId) {
      humanByPlayerId.set(s.playerId, { ...s });
    }
  }

  // Ensure every human in humanByPlayerId is seated in baseRoom.slots
  for (const [pid, humanSlot] of humanByPlayerId.entries()) {
    const alreadyInBase = baseRoom.slots.some(
      (s) => s.occupiedBy === 'human' && s.playerId === pid
    );
    if (!alreadyInBase) {
      // Try their preferred slotIndex first if non-human, otherwise first available non-human slot
      let target =
        baseRoom.slots[humanSlot.slotIndex] &&
        baseRoom.slots[humanSlot.slotIndex].occupiedBy !== 'human'
          ? baseRoom.slots[humanSlot.slotIndex]
          : baseRoom.slots.find((s) => s.occupiedBy !== 'human');

      if (target) {
        target.occupiedBy = 'human';
        target.playerId = humanSlot.playerId;
        target.playerName = humanSlot.playerName;
        target.charId = humanSlot.charId;
        target.outfitId = humanSlot.outfitId;
        target.faceId = humanSlot.faceId;
        target.ready = humanSlot.ready;
        target.micOn = humanSlot.micOn;
        target.listenOn = humanSlot.listenOn;
        target.speaking = humanSlot.speaking;
      }
    }
  }

  // Ensure exactly one host among seated humans
  const humansInSlots = baseRoom.slots.filter(
    (s) => s.occupiedBy === 'human' && s.playerId
  );
  if (humansInSlots.length > 0) {
    const currentHostStillHere = humansInSlots.find(
      (s) => s.playerId === baseRoom.hostId
    );
    const chosenHost = currentHostStillHere || humansInSlots[0];
    baseRoom.hostId = chosenHost.playerId!;
    for (const s of baseRoom.slots) {
      s.isHost = s.occupiedBy === 'human' && s.playerId === baseRoom.hostId;
    }
  }

  if (secondaryRoom.status === 'PLAYING' || baseRoom.status === 'PLAYING') {
    if (incomingIsNewer) {
      baseRoom.status = incomingRoom.status;
    }
  }

  baseRoom.version = Math.max(localRoom.version || 1, incomingRoom.version || 1);
  return baseRoom;
}

// ============================================================================
// GLOBAL CROSS-INSTANCE MQTT CLUSTER BRIDGE (Connects ais-dev & ais-pre!)
// ============================================================================
let clusterMqtt: mqtt.MqttClient | null = null;

function initClusterBridge() {
  try {
    const client = mqtt.connect('wss://broker.emqx.io:8084/mqtt', {
      clientId: `sixgun_srv_${SERVER_INSTANCE_ID}`,
      clean: true,
      reconnectPeriod: 2000,
      connectTimeout: 8000,
    });
    clusterMqtt = client;

    client.on('connect', () => {
      client.subscribe(`${CLUSTER_TOPIC_PREFIX}/rooms/+`, { qos: 1 });
      client.subscribe(`${CLUSTER_TOPIC_PREFIX}/events`, { qos: 0 });
    });

    client.on('message', (topic, payloadBuf) => {
      try {
        if (!payloadBuf || payloadBuf.length === 0) return;
        const data = JSON.parse(payloadBuf.toString());
        if (!data || data.instanceId === SERVER_INSTANCE_ID) return;

        if (topic.startsWith(`${CLUSTER_TOPIC_PREFIX}/rooms/`)) {
          if (data.deleted && data.code) {
            const norm = normalizeRoomCode(data.code);
            if (rooms.has(norm)) {
              rooms.delete(norm);
              savePersistedRooms();
              broadcastPublicRoomList(false);
            }
            return;
          }
          if (data.room && data.room.code) {
            const incoming = data.room as CustomRoomState;
            const norm = normalizeRoomCode(incoming.code);
            const prevStatus = rooms.get(norm)?.status;
            const merged = mergeRoomStates(rooms.get(norm), incoming);
            rooms.set(norm, merged);
            savePersistedRooms();
            broadcastRoomStateLocal(norm);
            if (prevStatus !== 'PLAYING' && merged.status === 'PLAYING') {
              broadcastMatchStartLocal(norm);
            }
            broadcastPublicRoomList(false);
          }
          return;
        }

        if (topic === `${CLUSTER_TOPIC_PREFIX}/events`) {
          handleClusterEvent(data);
        }
      } catch (_err) {
        // Ignore malformed packet
      }
    });

    client.on('error', () => {
      // Handled by auto-reconnect
    });
  } catch (_e) {
    // Ignore init error
  }
}

initClusterBridge();

function publishRoomToCluster(room: CustomRoomState) {
  if (!clusterMqtt || !clusterMqtt.connected) return;
  try {
    const norm = normalizeRoomCode(room.code);
    clusterMqtt.publish(
      `${CLUSTER_TOPIC_PREFIX}/rooms/${norm}`,
      JSON.stringify({
        instanceId: SERVER_INSTANCE_ID,
        room,
        ts: Date.now(),
      }),
      { qos: 1, retain: true }
    );
  } catch (_e) {
    // Ignore publish error
  }
}

function publishRoomDeleteToCluster(code: string) {
  if (!clusterMqtt || !clusterMqtt.connected) return;
  try {
    const norm = normalizeRoomCode(code);
    clusterMqtt.publish(
      `${CLUSTER_TOPIC_PREFIX}/rooms/${norm}`,
      JSON.stringify({
        instanceId: SERVER_INSTANCE_ID,
        deleted: true,
        code: norm,
        ts: Date.now(),
      }),
      { qos: 1, retain: true }
    );
  } catch (_e) {
    // Ignore
  }
}

function publishClusterEvent(eventPayload: Record<string, any>) {
  if (!clusterMqtt || !clusterMqtt.connected) return;
  try {
    clusterMqtt.publish(
      `${CLUSTER_TOPIC_PREFIX}/events`,
      JSON.stringify({
        ...eventPayload,
        instanceId: SERVER_INSTANCE_ID,
      }),
      { qos: 0 }
    );
  } catch (_e) {
    // Ignore
  }
}

function handleClusterEvent(data: Record<string, any>) {
  const evtType = data.type as string;
  const roomCode = normalizeRoomCode(data.roomCode || '');

  if (evtType === 'cluster:join_request' && roomCode && data.client) {
    const room = rooms.get(roomCode);
    if (room) {
      const dummyClient = getOrUpdateClient(data.client);
      handleJoinRoomForClient(dummyClient, roomCode, data.preferredSlot, {}, false);
    }
    return;
  }

  if (
    (evtType === 'game:player_state' ||
      evtType === 'game:event' ||
      evtType === 'voice:audio_chunk') &&
    roomCode
  ) {
    const outMsg = JSON.stringify(data.packet);
    for (const c of clients.values()) {
      if (
        c.roomCode === roomCode &&
        c.playerId !== data.senderId &&
        c.ws &&
        c.ws.readyState === WebSocket.OPEN
      ) {
        c.ws.send(outMsg);
      }
    }
    return;
  }

  if (evtType === 'voice:signal' && roomCode) {
    const targetId = String(data.targetId || '');
    const targetClient = clients.get(targetId);
    if (
      targetClient &&
      targetClient.roomCode === roomCode &&
      targetClient.ws &&
      targetClient.ws.readyState === WebSocket.OPEN
    ) {
      sendJson(targetClient.ws, {
        type: 'voice:signal',
        fromId: data.fromId,
        signal: data.signal,
      });
    }
  }
}

function getOrUpdateClient(data: {
  playerId?: string;
  name?: string;
  charId?: string;
  outfitId?: string;
  faceId?: string;
  ws?: WebSocket | null;
}): ConnectedClient {
  const playerId = String(
    data.playerId || `p_${Math.random().toString(36).slice(2, 9)}`
  );
  const existing = clients.get(playerId);
  const client: ConnectedClient = {
    ws: data.ws !== undefined ? data.ws : existing?.ws || null,
    playerId,
    name:
      String(data.name || existing?.name || 'Athlete')
        .trim()
        .slice(0, 16) || 'Athlete',
    charId: String(data.charId || existing?.charId || 'green_hoodie'),
    outfitId: String(data.outfitId || existing?.outfitId || 'crown_hoodie'),
    faceId: String(data.faceId || existing?.faceId || 'happy_laugh'),
    roomCode: existing?.roomCode || null,
    lastSeenAt: Date.now(),
  };
  clients.set(playerId, client);
  return client;
}

function getPublicRoomSummaries() {
  const now = Date.now();
  for (const [code, room] of rooms.entries()) {
    if (now - (room.updatedAt || room.createdAt || 0) > 7200_000) {
      rooms.delete(code);
    }
  }
  return Array.from(rooms.values())
    .filter((r) => r.status === 'LOBBY')
    .map((r) => ({
      code: r.code,
      name: r.name,
      mode: r.mode,
      mapId: r.mapId,
      maxPlayers: r.maxPlayers,
      humanCount: Math.max(
        1,
        r.slots.filter((s) => s.occupiedBy === 'human').length
      ),
      status: r.status,
    }));
}

function sendJson(ws: WebSocket | null, payload: unknown) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(payload));
  }
}

function broadcastRoomStateLocal(roomCode: string) {
  const norm = normalizeRoomCode(roomCode);
  const room = rooms.get(norm);
  if (!room) return;

  const msg = JSON.stringify({
    type: 'room:state',
    room,
  });
  for (const client of clients.values()) {
    const inSlots = room.slots.some(
      (s) => s.occupiedBy === 'human' && s.playerId === client.playerId
    );
    if (inSlots) {
      client.roomCode = norm;
    }
    if (
      (client.roomCode === norm || inSlots) &&
      client.ws &&
      client.ws.readyState === WebSocket.OPEN
    ) {
      client.ws.send(msg);
    }
  }
}

function broadcastMatchStartLocal(roomCode: string) {
  const norm = normalizeRoomCode(roomCode);
  const room = rooms.get(norm);
  if (!room) return;
  const startMsg = JSON.stringify({
    type: 'match:start',
    room,
  });
  for (const c of clients.values()) {
    const inSlots = room.slots.some(
      (s) => s.occupiedBy === 'human' && s.playerId === c.playerId
    );
    if (
      (c.roomCode === norm || inSlots) &&
      c.ws &&
      c.ws.readyState === WebSocket.OPEN
    ) {
      c.ws.send(startMsg);
    }
  }
}

function broadcastRoomState(roomCode: string, syncCluster: boolean = true) {
  const norm = normalizeRoomCode(roomCode);
  const room = rooms.get(norm);
  if (!room) return;
  room.updatedAt = Date.now();
  room.version = (room.version || 0) + 1;
  savePersistedRooms();
  broadcastRoomStateLocal(norm);
  if (syncCluster) {
    publishRoomToCluster(room);
  }
}

function broadcastPublicRoomList(syncCluster: boolean = true) {
  if (syncCluster) {
    savePersistedRooms();
  }
  const publicRooms = getPublicRoomSummaries();
  const onlineCount = Math.max(1, clients.size);

  const msg = JSON.stringify({
    type: 'rooms:list',
    rooms: publicRooms,
    onlineCount,
  });

  for (const client of clients.values()) {
    if (client.ws && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(msg);
    }
  }
}

function removePlayerFromCurrentRoom(client: ConnectedClient) {
  const code = client.roomCode ? normalizeRoomCode(client.roomCode) : null;
  if (!code) return;
  client.roomCode = null;

  const room = rooms.get(code);
  if (!room) return;

  const slot = room.slots.find((s) => s.playerId === client.playerId);
  if (slot) {
    const botDef = DEFAULT_BOT_CHARS[slot.slotIndex % DEFAULT_BOT_CHARS.length];
    slot.occupiedBy = room.fillWithBots ? 'bot' : 'empty';
    slot.playerId = null;
    slot.playerName = room.fillWithBots ? botDef.name : 'OPEN SLOT';
    slot.charId = botDef.charId;
    slot.outfitId = botDef.outfitId;
    slot.faceId = botDef.faceId;
    slot.ready = true;
    slot.isHost = false;
    slot.micOn = false;
    slot.speaking = false;
  }

  const remainingHumans = room.slots.filter((s) => s.occupiedBy === 'human');
  if (remainingHumans.length === 0) {
    rooms.delete(code);
    publishRoomDeleteToCluster(code);
  } else {
    if (room.hostId === client.playerId) {
      const nextHost = remainingHumans[0];
      room.hostId = nextHost.playerId!;
      nextHost.isHost = true;
    }
    broadcastRoomState(code, true);
  }
  broadcastPublicRoomList(true);
}

function handleCreateRoomForClient(
  client: ConnectedClient,
  data: Record<string, any>,
  forcedCode?: string
): CustomRoomState {
  const requestedCode = normalizeRoomCode(forcedCode || data.customCode || '');

  // CRITICAL FIX: If a room with this requestedCode ALREADY exists, DO NOT create a separate lobby!
  // Instead, join the existing room so two players using the same code ALWAYS enter the SAME lobby!
  if (requestedCode.length >= 3 && rooms.has(requestedCode)) {
    const joinRes = handleJoinRoomForClient(client, requestedCode, undefined, data);
    if (joinRes.room) {
      return joinRes.room;
    }
  }

  if (client.roomCode && (!requestedCode || client.roomCode !== requestedCode)) {
    removePlayerFromCurrentRoom(client);
  }

  const mode: CustomRoomState['mode'] =
    data.mode === 'volleyball_2v2' ||
    data.mode === 'obstacle_rush' ||
    data.mode === 'floor_is_lava'
      ? data.mode
      : 'obstacle_rush';
  const maxPlayers =
    mode === 'volleyball_2v2'
      ? 4
      : Math.max(2, Math.min(5, Number(data.maxPlayers) || 5));
  const fillWithBots = data.fillWithBots !== false;
  const code =
    requestedCode.length >= 3 && !rooms.has(requestedCode)
      ? requestedCode
      : generateRoomCode();

  const slots = buildInitialSlots(mode, maxPlayers, fillWithBots);
  slots[0] = {
    slotIndex: 0,
    team: mode === 'volleyball_2v2' ? 'blue' : 'solo',
    occupiedBy: 'human',
    playerId: client.playerId,
    playerName: client.name,
    charId: client.charId,
    outfitId: client.outfitId,
    faceId: client.faceId,
    ready: true,
    isHost: true,
    micOn: false,
    listenOn: true,
    speaking: false,
  };

  const room: CustomRoomState = {
    code,
    name: `${client.name}'s Room`,
    hostId: client.playerId,
    mode,
    mapId: String(
      data.mapId ||
        (mode === 'volleyball_2v2'
          ? 'pirate_cove'
          : mode === 'floor_is_lava'
            ? 'volcano_summit'
            : 'sky_carnival')
    ),
    maxPlayers,
    winScore: Number(data.winScore) || 5,
    timerMinutes: (data.timerMinutes === 5 || data.timerMinutes === 6
      ? data.timerMinutes
      : 3) as 3 | 5 | 6,
    difficulty: String(data.difficulty || 'breezy'),
    fillWithBots,
    status: 'LOBBY',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    version: 1,
    slots,
  };

  rooms.set(code, room);
  client.roomCode = code;
  broadcastRoomState(code, true);
  broadcastPublicRoomList(true);
  return room;
}

function handleJoinRoomForClient(
  client: ConnectedClient,
  rawCode: string,
  preferredSlot?: number,
  fallbackOptions?: Record<string, any>,
  notifyClusterJoin: boolean = true
): { room?: CustomRoomState; error?: string } {
  const cleanCode = normalizeRoomCode(rawCode);
  if (!cleanCode) {
    return { error: 'Please enter a valid Room Code!' };
  }

  if (notifyClusterJoin) {
    publishClusterEvent({
      type: 'cluster:join_request',
      roomCode: cleanCode,
      preferredSlot,
      client: {
        playerId: client.playerId,
        name: client.name,
        charId: client.charId,
        outfitId: client.outfitId,
        faceId: client.faceId,
      },
    });
  }

  // If the client passed a knownRoom snapshot from the browser's global pub/sub or BroadcastChannel,
  // merge it into our server's rooms map first so we NEVER create a separate duplicate room!
  if (
    fallbackOptions?.knownRoom &&
    typeof fallbackOptions.knownRoom === 'object' &&
    normalizeRoomCode(fallbackOptions.knownRoom.code) === cleanCode
  ) {
    const mergedKnown = mergeRoomStates(
      rooms.get(cleanCode),
      fallbackOptions.knownRoom as CustomRoomState
    );
    rooms.set(cleanCode, mergedKnown);
  }

  let room = findMatchingRoom(cleanCode);

  if (!room) {
    const created = handleCreateRoomForClient(
      client,
      fallbackOptions || {},
      cleanCode
    );
    return { room: created };
  }

  if (client.roomCode && client.roomCode !== room.code) {
    removePlayerFromCurrentRoom(client);
  }

  // Check if player is already in a slot in this room
  let mySlot = room.slots.find((s) => s.playerId === client.playerId);
  if (!mySlot) {
    const prefIdx = typeof preferredSlot === 'number' ? preferredSlot : -1;
    if (
      prefIdx >= 0 &&
      prefIdx < room.slots.length &&
      room.slots[prefIdx].occupiedBy !== 'human'
    ) {
      mySlot = room.slots[prefIdx];
    } else {
      mySlot = room.slots.find((s) => s.occupiedBy !== 'human');
    }

    if (!mySlot) {
      return {
        error: `Room "${room.code}" is full (${room.maxPlayers}/${room.maxPlayers} players)!`,
      };
    }

    mySlot.occupiedBy = 'human';
    mySlot.playerId = client.playerId;
    mySlot.playerName = client.name;
    mySlot.charId = client.charId;
    mySlot.outfitId = client.outfitId;
    mySlot.faceId = client.faceId;
    mySlot.ready = true;
    mySlot.isHost = room.hostId === client.playerId;
    mySlot.micOn = false;
    mySlot.listenOn = true;
    mySlot.speaking = false;
  } else {
    mySlot.playerName = client.name;
    mySlot.charId = client.charId;
    mySlot.outfitId = client.outfitId;
    mySlot.faceId = client.faceId;
  }

  client.roomCode = room.code;
  broadcastRoomState(room.code, true);
  broadcastPublicRoomList(true);
  return { room };
}

async function startServer() {
  const app = express();
  const server = http.createServer(app);
  const PORT = 3000;

  // Disable Nagle's algorithm for ultra-low latency real-time packets & voice chat
  server.on('connection', (socket) => {
    socket.setNoDelay(true);
  });

  // Enable CORS so even if a client directly queries across origins, it succeeds cleanly
  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }
    next();
  });

  app.use(express.json());

  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      instanceId: SERVER_INSTANCE_ID,
      onlinePlayers: Math.max(1, clients.size),
      activeRooms: rooms.size,
    });
  });

  // =========================================================================
  // HTTP REST ENDPOINTS FOR GUARANTEED ROOM CREATION, JOINING & STATE SYNC
  // =========================================================================
  app.get('/api/mp/state', (req, res) => {
    const playerId = String(req.query.playerId || '');
    const roomCode = normalizeRoomCode(String(req.query.roomCode || ''));
    let room: CustomRoomState | null = null;
    if (roomCode) {
      room = findMatchingRoom(roomCode) || null;
    } else if (playerId && clients.has(playerId)) {
      const cl = clients.get(playerId)!;
      cl.lastSeenAt = Date.now();
      if (cl.roomCode) {
        room = rooms.get(normalizeRoomCode(cl.roomCode)) || null;
      }
    }
    res.json({
      room,
      rooms: getPublicRoomSummaries(),
      onlineCount: Math.max(1, clients.size),
    });
  });

  app.post('/api/mp/room/sync', (req, res) => {
    const incoming = req.body?.room as CustomRoomState | undefined;
    if (incoming && incoming.code) {
      const norm = normalizeRoomCode(incoming.code);
      const merged = mergeRoomStates(rooms.get(norm), incoming);
      rooms.set(norm, merged);
      broadcastRoomState(norm, true);
      broadcastPublicRoomList(true);
      res.json({ room: merged });
      return;
    }
    res.status(400).json({ error: 'Invalid room payload' });
  });

  app.post('/api/mp/room/create', (req, res) => {
    const client = getOrUpdateClient(req.body || {});
    const room = handleCreateRoomForClient(client, req.body || {});
    res.json({
      room,
      rooms: getPublicRoomSummaries(),
      onlineCount: Math.max(1, clients.size),
    });
  });

  app.post('/api/mp/room/join', (req, res) => {
    const client = getOrUpdateClient(req.body || {});
    const result = handleJoinRoomForClient(
      client,
      String(req.body?.code || ''),
      req.body?.preferredSlot,
      req.body,
      true
    );
    if (result.error) {
      res.status(400).json({ error: result.error });
      return;
    }
    res.json({
      room: result.room,
      rooms: getPublicRoomSummaries(),
      onlineCount: Math.max(1, clients.size),
    });
  });

  app.post('/api/mp/room/leave', (req, res) => {
    const client = getOrUpdateClient(req.body || {});
    removePlayerFromCurrentRoom(client);
    res.json({
      room: null,
      rooms: getPublicRoomSummaries(),
      onlineCount: Math.max(1, clients.size),
    });
  });

  app.post('/api/mp/room/select-slot', (req, res) => {
    const client = getOrUpdateClient(req.body || {});
    const code = normalizeRoomCode(req.body?.roomCode || client.roomCode || '');
    const room = findMatchingRoom(code);
    if (!room) {
      res.status(404).json({ error: 'Room not active' });
      return;
    }
    const targetIdx = Number(req.body?.slotIndex);
    if (!isNaN(targetIdx) && targetIdx >= 0 && targetIdx < room.slots.length) {
      const targetSlot = room.slots[targetIdx];
      if (
        targetSlot.occupiedBy !== 'human' ||
        targetSlot.playerId === client.playerId
      ) {
        const currentSlot = room.slots.find(
          (s) => s.playerId === client.playerId
        );
        if (currentSlot && currentSlot.slotIndex !== targetIdx) {
          const prevMic = currentSlot.micOn;
          const prevListen = currentSlot.listenOn;
          const prevReady = currentSlot.ready;
          const prevHost = currentSlot.isHost;

          const botDef =
            DEFAULT_BOT_CHARS[currentSlot.slotIndex % DEFAULT_BOT_CHARS.length];
          currentSlot.occupiedBy = room.fillWithBots ? 'bot' : 'empty';
          currentSlot.playerId = null;
          currentSlot.playerName = room.fillWithBots ? botDef.name : 'OPEN SLOT';
          currentSlot.charId = botDef.charId;
          currentSlot.outfitId = botDef.outfitId;
          currentSlot.faceId = botDef.faceId;
          currentSlot.ready = true;
          currentSlot.isHost = false;
          currentSlot.micOn = false;
          currentSlot.speaking = false;

          targetSlot.occupiedBy = 'human';
          targetSlot.playerId = client.playerId;
          targetSlot.playerName = client.name;
          targetSlot.charId = client.charId;
          targetSlot.outfitId = client.outfitId;
          targetSlot.faceId = client.faceId;
          targetSlot.ready = prevReady;
          targetSlot.isHost = prevHost;
          targetSlot.micOn = prevMic;
          targetSlot.listenOn = prevListen;
          targetSlot.speaking = false;
          broadcastRoomState(room.code, true);
        }
      }
    }
    res.json({ room });
  });

  app.post('/api/mp/room/toggle-bot', (req, res) => {
    const client = getOrUpdateClient(req.body || {});
    const code = normalizeRoomCode(req.body?.roomCode || client.roomCode || '');
    const room = findMatchingRoom(code);
    if (!room) {
      res.status(404).json({ error: 'Room not active' });
      return;
    }
    const targetIdx = Number(req.body?.slotIndex);
    const targetSlot = room.slots[targetIdx];
    if (targetSlot && targetSlot.occupiedBy !== 'human') {
      const botDef = DEFAULT_BOT_CHARS[targetIdx % DEFAULT_BOT_CHARS.length];
      if (targetSlot.occupiedBy === 'bot') {
        targetSlot.occupiedBy = 'empty';
        targetSlot.playerName = 'OPEN SLOT';
      } else {
        targetSlot.occupiedBy = 'bot';
        targetSlot.playerName = botDef.name;
        targetSlot.charId = botDef.charId;
        targetSlot.outfitId = botDef.outfitId;
        targetSlot.faceId = botDef.faceId;
      }
      broadcastRoomState(room.code, true);
    }
    res.json({ room });
  });

  app.post('/api/mp/room/settings', (req, res) => {
    const client = getOrUpdateClient(req.body || {});
    const code = normalizeRoomCode(req.body?.roomCode || client.roomCode || '');
    const room = findMatchingRoom(code);
    if (!room) {
      res.status(404).json({ error: 'Room not active' });
      return;
    }
    const data = req.body || {};
    if (
      data.mode === 'volleyball_2v2' ||
      data.mode === 'obstacle_rush' ||
      data.mode === 'floor_is_lava'
    ) {
      room.mode = data.mode;
      if (room.mode === 'volleyball_2v2') {
        room.maxPlayers = 4;
        if (
          room.mapId === 'sky_carnival' ||
          room.mapId === 'lava_foundry' ||
          room.mapId === 'volcano_summit' ||
          room.mapId === 'hex_colosseum'
        ) {
          room.mapId = 'pirate_cove';
        }
      } else if (room.mode === 'obstacle_rush') {
        if (room.mapId !== 'sky_carnival' && room.mapId !== 'lava_foundry') {
          room.mapId = 'sky_carnival';
        }
      } else if (room.mode === 'floor_is_lava') {
        if (room.mapId !== 'volcano_summit' && room.mapId !== 'hex_colosseum') {
          room.mapId = 'volcano_summit';
        }
      }
    }

    if (typeof data.maxPlayers === 'number') {
      room.maxPlayers =
        room.mode === 'volleyball_2v2'
          ? 4
          : Math.max(2, Math.min(5, Math.round(data.maxPlayers)));
    }
    if (typeof data.fillWithBots === 'boolean') {
      room.fillWithBots = data.fillWithBots;
    }
    if (typeof data.mapId === 'string') {
      room.mapId = data.mapId;
    }
    if (typeof data.winScore === 'number') {
      room.winScore = data.winScore;
    }
    if (
      data.timerMinutes === 3 ||
      data.timerMinutes === 5 ||
      data.timerMinutes === 6
    ) {
      room.timerMinutes = data.timerMinutes;
    }
    if (typeof data.difficulty === 'string') {
      room.difficulty = data.difficulty;
    }

    room.slots = buildInitialSlots(
      room.mode,
      room.maxPlayers,
      room.fillWithBots,
      room.slots
    );
    broadcastRoomState(room.code, true);
    broadcastPublicRoomList(true);
    res.json({ room });
  });

  app.post('/api/mp/room/start', (req, res) => {
    const client = getOrUpdateClient(req.body || {});
    const code = normalizeRoomCode(req.body?.roomCode || client.roomCode || '');
    const room = findMatchingRoom(code);
    if (!room) {
      res.status(404).json({ error: 'Room not active' });
      return;
    }
    room.status = 'PLAYING';
    broadcastRoomState(room.code, true);
    broadcastMatchStartLocal(room.code);
    broadcastPublicRoomList(true);
    res.json({ room });
  });

  // =========================================================================
  // WEBSOCKET SERVER ON /ws (NO-SERVER UPGRADE SO VITE NEVER CONFLICTS)
  // =========================================================================
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (request, socket, head) => {
    const pathname = request.url ? request.url.split('?')[0] : '';
    if (pathname === '/ws') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    } else {
      socket.destroy();
    }
  });

  wss.on('connection', (ws) => {
    let currentPlayerId: string | null = null;

    ws.on('message', (raw) => {
      try {
        const data = JSON.parse(raw.toString());
        const type = data.type as string;

        if (type === 'player:identify') {
          const clientObj = getOrUpdateClient({
            playerId: data.playerId,
            name: data.name,
            charId: data.charId,
            outfitId: data.outfitId,
            faceId: data.faceId,
            ws,
          });
          currentPlayerId = clientObj.playerId;

          const roomCode = normalizeRoomCode(
            data.roomCode || clientObj.roomCode || ''
          );
          if (roomCode) {
            const room = findMatchingRoom(roomCode);
            if (room) {
              clientObj.roomCode = room.code;
              const slot = room.slots.find(
                (s) => s.playerId === clientObj.playerId
              );
              if (slot) {
                slot.playerName = clientObj.name;
                slot.charId = clientObj.charId;
                slot.outfitId = clientObj.outfitId;
                slot.faceId = clientObj.faceId;
              }
              sendJson(ws, { type: 'room:state', room });
            }
          }

          broadcastPublicRoomList(false);
          return;
        }

        const pid = currentPlayerId || String(data.playerId || '');
        if (!pid) return;
        const client = getOrUpdateClient({
          playerId: pid,
          name: data.name,
          charId: data.charId,
          outfitId: data.outfitId,
          faceId: data.faceId,
          ws,
        });
        currentPlayerId = client.playerId;

        if (type === 'player:update_profile') {
          if (client.roomCode && rooms.has(client.roomCode)) {
            const room = rooms.get(client.roomCode)!;
            const slot = room.slots.find((s) => s.playerId === client.playerId);
            if (slot) {
              slot.playerName = client.name;
              slot.charId = client.charId;
              slot.outfitId = client.outfitId;
              slot.faceId = client.faceId;
              broadcastRoomState(room.code, true);
            }
          }
          return;
        }

        if (type === 'room:create') {
          handleCreateRoomForClient(client, data);
          return;
        }

        if (type === 'room:join') {
          const res = handleJoinRoomForClient(
            client,
            String(data.code || ''),
            data.preferredSlot,
            data,
            true
          );
          if (res.error) {
            sendJson(ws, {
              type: 'room:error',
              message: res.error,
            });
          }
          return;
        }

        if (type === 'room:leave') {
          removePlayerFromCurrentRoom(client);
          sendJson(ws, { type: 'room:left' });
          return;
        }

        const normCode = normalizeRoomCode(
          data.roomCode || client.roomCode || ''
        );
        if (!normCode || !rooms.has(normCode)) return;
        const room = rooms.get(normCode)!;

        if (type === 'room:select_slot') {
          const targetIdx = Number(data.slotIndex);
          if (
            isNaN(targetIdx) ||
            targetIdx < 0 ||
            targetIdx >= room.slots.length
          ) {
            return;
          }
          const targetSlot = room.slots[targetIdx];
          if (
            targetSlot.occupiedBy === 'human' &&
            targetSlot.playerId !== client.playerId
          ) {
            sendJson(ws, {
              type: 'room:error',
              message: 'That slot is already taken by another player!',
            });
            return;
          }

          const currentSlot = room.slots.find(
            (s) => s.playerId === client.playerId
          );
          if (!currentSlot || currentSlot.slotIndex === targetIdx) return;

          const prevMic = currentSlot.micOn;
          const prevListen = currentSlot.listenOn;
          const prevReady = currentSlot.ready;
          const prevHost = currentSlot.isHost;

          const botDef =
            DEFAULT_BOT_CHARS[currentSlot.slotIndex % DEFAULT_BOT_CHARS.length];
          currentSlot.occupiedBy = room.fillWithBots ? 'bot' : 'empty';
          currentSlot.playerId = null;
          currentSlot.playerName = room.fillWithBots ? botDef.name : 'OPEN SLOT';
          currentSlot.charId = botDef.charId;
          currentSlot.outfitId = botDef.outfitId;
          currentSlot.faceId = botDef.faceId;
          currentSlot.ready = true;
          currentSlot.isHost = false;
          currentSlot.micOn = false;
          currentSlot.speaking = false;

          targetSlot.occupiedBy = 'human';
          targetSlot.playerId = client.playerId;
          targetSlot.playerName = client.name;
          targetSlot.charId = client.charId;
          targetSlot.outfitId = client.outfitId;
          targetSlot.faceId = client.faceId;
          targetSlot.ready = prevReady;
          targetSlot.isHost = prevHost;
          targetSlot.micOn = prevMic;
          targetSlot.listenOn = prevListen;
          targetSlot.speaking = false;

          broadcastRoomState(room.code, true);
          return;
        }

        if (type === 'room:toggle_slot_bot') {
          const targetIdx = Number(data.slotIndex);
          const targetSlot = room.slots[targetIdx];
          if (!targetSlot || targetSlot.occupiedBy === 'human') return;

          const botDef = DEFAULT_BOT_CHARS[targetIdx % DEFAULT_BOT_CHARS.length];
          if (targetSlot.occupiedBy === 'bot') {
            targetSlot.occupiedBy = 'empty';
            targetSlot.playerName = 'OPEN SLOT';
          } else {
            targetSlot.occupiedBy = 'bot';
            targetSlot.playerName = botDef.name;
            targetSlot.charId = botDef.charId;
            targetSlot.outfitId = botDef.outfitId;
            targetSlot.faceId = botDef.faceId;
          }
          broadcastRoomState(room.code, true);
          return;
        }

        if (type === 'room:update_player') {
          const slot = room.slots.find((s) => s.playerId === client.playerId);
          if (!slot) return;
          if (typeof data.name === 'string' && data.name.trim()) {
            client.name = data.name.trim().slice(0, 16);
            slot.playerName = client.name;
          }
          if (typeof data.charId === 'string') {
            client.charId = data.charId;
            slot.charId = data.charId;
          }
          if (typeof data.outfitId === 'string') {
            client.outfitId = data.outfitId;
            slot.outfitId = data.outfitId;
          }
          if (typeof data.faceId === 'string') {
            client.faceId = data.faceId;
            slot.faceId = data.faceId;
          }
          if (typeof data.ready === 'boolean') {
            slot.ready = data.ready;
          }
          if (typeof data.micOn === 'boolean') {
            slot.micOn = data.micOn;
          }
          if (typeof data.listenOn === 'boolean') {
            slot.listenOn = data.listenOn;
          }
          if (typeof data.speaking === 'boolean') {
            slot.speaking = data.speaking;
          }
          broadcastRoomState(room.code, true);
          return;
        }

        if (type === 'room:update_settings') {
          if (
            data.mode === 'volleyball_2v2' ||
            data.mode === 'obstacle_rush' ||
            data.mode === 'floor_is_lava'
          ) {
            room.mode = data.mode;
            if (room.mode === 'volleyball_2v2') {
              room.maxPlayers = 4;
              if (
                room.mapId === 'sky_carnival' ||
                room.mapId === 'lava_foundry' ||
                room.mapId === 'volcano_summit' ||
                room.mapId === 'hex_colosseum'
              ) {
                room.mapId = 'pirate_cove';
              }
            } else if (room.mode === 'obstacle_rush') {
              if (room.mapId !== 'sky_carnival' && room.mapId !== 'lava_foundry') {
                room.mapId = 'sky_carnival';
              }
            } else if (room.mode === 'floor_is_lava') {
              if (
                room.mapId !== 'volcano_summit' &&
                room.mapId !== 'hex_colosseum'
              ) {
                room.mapId = 'volcano_summit';
              }
            }
          }

          if (typeof data.maxPlayers === 'number') {
            room.maxPlayers =
              room.mode === 'volleyball_2v2'
                ? 4
                : Math.max(2, Math.min(5, Math.round(data.maxPlayers)));
          }

          if (typeof data.fillWithBots === 'boolean') {
            room.fillWithBots = data.fillWithBots;
          }

          if (typeof data.mapId === 'string') {
            room.mapId = data.mapId;
          }
          if (typeof data.winScore === 'number') {
            room.winScore = data.winScore;
          }
          if (
            data.timerMinutes === 3 ||
            data.timerMinutes === 5 ||
            data.timerMinutes === 6
          ) {
            room.timerMinutes = data.timerMinutes;
          }
          if (typeof data.difficulty === 'string') {
            room.difficulty = data.difficulty;
          }

          room.slots = buildInitialSlots(
            room.mode,
            room.maxPlayers,
            room.fillWithBots,
            room.slots
          );

          broadcastRoomState(room.code, true);
          broadcastPublicRoomList(true);
          return;
        }

        if (type === 'room:start_match') {
          room.status = 'PLAYING';
          broadcastRoomState(room.code, true);
          broadcastMatchStartLocal(room.code);
          broadcastPublicRoomList(true);
          return;
        }

        if (type === 'room:return_lobby') {
          room.status = 'LOBBY';
          broadcastRoomState(room.code, true);
          broadcastPublicRoomList(true);
          return;
        }

        // Ultra-Low-Latency Real-Time Game State & Voice Relays (Local + Cross-Instance Cluster)
        if (
          type === 'game:player_state' ||
          type === 'game:event' ||
          type === 'voice:audio_chunk'
        ) {
          const outPacket = {
            ...data,
            senderId: client.playerId,
          };
          const outMsg = JSON.stringify(outPacket);
          for (const c of clients.values()) {
            if (
              c.roomCode === room.code &&
              c.playerId !== client.playerId &&
              c.ws &&
              c.ws.readyState === WebSocket.OPEN
            ) {
              c.ws.send(outMsg);
            }
          }
          publishClusterEvent({
            type,
            roomCode: room.code,
            senderId: client.playerId,
            packet: outPacket,
          });
          return;
        }

        // Targeted WebRTC Peer-to-Peer Voice Signaling (Offer / Answer / ICE)
        if (type === 'voice:signal') {
          const targetId = String(data.targetId || '');
          const targetClient = clients.get(targetId);
          if (
            targetClient &&
            targetClient.roomCode === room.code &&
            targetClient.ws &&
            targetClient.ws.readyState === WebSocket.OPEN
          ) {
            sendJson(targetClient.ws, {
              type: 'voice:signal',
              fromId: client.playerId,
              signal: data.signal,
            });
          } else {
            publishClusterEvent({
              type: 'voice:signal',
              roomCode: room.code,
              fromId: client.playerId,
              targetId,
              signal: data.signal,
            });
          }
          return;
        }
      } catch (_err) {
        // Ignore malformed packets
      }
    });

    ws.on('close', () => {
      if (currentPlayerId && clients.has(currentPlayerId)) {
        const cl = clients.get(currentPlayerId)!;
        if (cl.ws === ws) {
          cl.ws = null;
          cl.lastSeenAt = Date.now();
        }
      }
    });
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
        watch: null,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Real-time multiplayer & voice server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
