import mqtt, { MqttClient } from 'mqtt';
import { CharacterId, FaceId, OutfitId } from '../types/game';

const CLUSTER_TOPIC_PREFIX = 'sixgun_mp_v3_ba31eb5b';

export interface CustomSlotInfo {
  slotIndex: number;
  team: 'blue' | 'red' | 'solo';
  occupiedBy: 'human' | 'bot' | 'empty';
  playerId: string | null;
  playerName: string;
  charId: CharacterId;
  outfitId: OutfitId;
  faceId: FaceId;
  ready: boolean;
  isHost: boolean;
  micOn: boolean;
  listenOn: boolean;
  speaking: boolean;
}

export interface CustomRoomInfo {
  code: string;
  name: string;
  hostId: string;
  mode: 'volleyball_2v2' | 'obstacle_rush' | 'floor_is_lava';
  mapId: string;
  maxPlayers: number;
  winScore: number;
  timerMinutes: 3 | 5 | 6;
  difficulty: string;
  fillWithBots: boolean;
  status: 'LOBBY' | 'PLAYING';
  createdAt: number;
  updatedAt?: number;
  version?: number;
  slots: CustomSlotInfo[];
}

export interface PublicRoomSummary {
  code: string;
  name: string;
  mode: 'volleyball_2v2' | 'obstacle_rush' | 'floor_is_lava';
  mapId: string;
  maxPlayers: number;
  humanCount: number;
  status: 'LOBBY' | 'PLAYING';
}

export interface RemotePlayerStatePacket {
  senderId: string;
  slotIndex: number;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  yaw: number;
  hp?: number;
  maxHp?: number;
  kills?: number;
  deaths?: number;
  weapon?: string;
  holdingBallId?: number | null;
  action?: string;
}

export interface RemoteGameEventPacket {
  senderId: string;
  eventKind: string;
  payload: Record<string, any>;
}

type Listener<T> = (data: T) => void;

const DEFAULT_BOT_CHARS: Array<{
  name: string;
  charId: CharacterId;
  outfitId: OutfitId;
  faceId: FaceId;
}> = [
  { name: 'BOT BJORN', charId: 'viking_beard', outfitId: 'viking_tunic', faceId: 'viking_beard' },
  { name: 'BOT BERRY', charId: 'strawberry_kid', outfitId: 'strawberry_suit', faceId: 'kawaii_blush' },
  { name: 'BOT PINE', charId: 'pineapple_king', outfitId: 'pineapple_suit', faceId: 'cool_shades' },
  { name: 'BOT BURGER', charId: 'burger_chef', outfitId: 'burger_suit', faceId: 'chef_beard' },
  { name: 'BOT MAYA', charId: 'purple_shades', outfitId: 'cat_hoodie', faceId: 'kawaii_blush' },
];

export function normalizeRoomCodeClient(raw: string): string {
  return String(raw || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .replace(/0/g, 'O')
    .replace(/1/g, 'I')
    .slice(0, 6);
}

/**
 * Deterministic CRDT-style Room Merger on the client side:
 * Ensures that if two players create/join the same room code across different servers or tabs,
 * ALL human players are merged into slots 0, 1, 2... of the single shared room!
 */
export function mergeClientRooms(
  localRoom: CustomRoomInfo | null | undefined,
  incomingRoom: CustomRoomInfo
): CustomRoomInfo {
  const normCode = normalizeRoomCodeClient(incomingRoom.code);
  incomingRoom.code = normCode;
  if (!localRoom || normalizeRoomCodeClient(localRoom.code) !== normCode) {
    return {
      ...incomingRoom,
      slots: incomingRoom.slots.map((s) => ({ ...s })),
    };
  }

  const incomingIsNewer =
    (incomingRoom.version || 0) > (localRoom.version || 0) ||
    (incomingRoom.updatedAt || 0) >= (localRoom.updatedAt || 0);

  const baseRoom: CustomRoomInfo = incomingIsNewer
    ? { ...incomingRoom, slots: incomingRoom.slots.map((s) => ({ ...s })) }
    : { ...localRoom, slots: localRoom.slots.map((s) => ({ ...s })) };

  const secondaryRoom = incomingIsNewer ? localRoom : incomingRoom;

  if ((secondaryRoom.createdAt || Infinity) < (baseRoom.createdAt || Infinity)) {
    baseRoom.createdAt = secondaryRoom.createdAt;
  }

  const humanByPlayerId = new Map<string, CustomSlotInfo>();
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

  for (const [pid, humanSlot] of humanByPlayerId.entries()) {
    const alreadyInBase = baseRoom.slots.some(
      (s) => s.occupiedBy === 'human' && s.playerId === pid
    );
    if (!alreadyInBase) {
      const target =
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

  baseRoom.version = Math.max(localRoom.version || 1, incomingRoom.version || 1);
  return baseRoom;
}

class MultiplayerClientManager {
  private ws: WebSocket | null = null;
  private mqttClient: MqttClient | null = null;
  private subscribedFastRoomCode: string | null = null;
  private broadcastChan: BroadcastChannel | null = null;
  private reconnectTimer: number | null = null;
  private pollTimer: number | null = null;
  private pendingWsQueue: Array<Record<string, any>> = [];
  private knownRoomsByCode = new Map<string, CustomRoomInfo>();

  public playerId: string;
  public playerName: string = 'Athlete';
  public charId: CharacterId = 'green_hoodie';
  public outfitId: OutfitId = 'crown_hoodie';
  public faceId: FaceId = 'happy_laugh';

  public connected: boolean = true;
  public onlineCount: number = 1;
  public currentRoom: CustomRoomInfo | null = null;
  public publicRooms: PublicRoomSummary[] = [];
  public lastError: string | null = null;

  // Voice Chat State (Talk & Listen)
  public micEnabled: boolean = false;
  public listenEnabled: boolean = true;
  public isSpeaking: boolean = false;
  private localStream: MediaStream | null = null;
  private audioCtx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private scriptProcessor: ScriptProcessorNode | null = null;
  private vadInterval: number | null = null;
  private peerConnections = new Map<string, RTCPeerConnection>();
  private remoteAudioEls = new Map<string, HTMLAudioElement>();
  private nextPlayTimeBySender = new Map<string, number>();

  private stateListeners = new Set<Listener<void>>();
  private matchStartListeners = new Set<Listener<CustomRoomInfo>>();
  private remoteTickListeners = new Set<Listener<RemotePlayerStatePacket>>();
  private remoteEventListeners = new Set<Listener<RemoteGameEventPacket>>();

  constructor() {
    // Generate a strictly unique playerId per window/tab instance so even duplicated browser tabs
    // never share the same playerId or overwrite each other's slot!
    this.playerId = `ath_${Math.random().toString(36).slice(2, 9)}_${Date.now().toString(36).slice(-4)}`;
    try {
      const savedName = localStorage.getItem('sixgun_player_name');
      if (savedName && savedName.trim()) {
        this.playerName = savedName.trim().slice(0, 16);
      }
    } catch (_e) {
      // Ignore storage error
    }
    this.initBroadcastChannel();
    this.initGlobalMqttMesh();
  }

  private initBroadcastChannel() {
    if (typeof window === 'undefined' || typeof BroadcastChannel === 'undefined') {
      return;
    }
    try {
      const bc = new BroadcastChannel('sixgun_mp_bus_v3');
      this.broadcastChan = bc;
      bc.onmessage = (ev) => {
        if (!ev.data || ev.data.senderId === this.playerId) return;
        this.handleCrossPeerPacket(ev.data);
      };
    } catch (_e) {
      // Ignore if BroadcastChannel is blocked
    }
  }

  private initGlobalMqttMesh() {
    if (typeof window === 'undefined') return;
    try {
      const client = mqtt.connect('wss://broker.emqx.io:8084/mqtt', {
        clientId: `sixgun_web_${this.playerId}`,
        clean: true,
        reconnectPeriod: 2000,
        connectTimeout: 8000,
      });
      this.mqttClient = client;

      client.on('connect', () => {
        this.connected = true;
        client.subscribe(`${CLUSTER_TOPIC_PREFIX}/rooms/+`, { qos: 1 });
        client.subscribe(`${CLUSTER_TOPIC_PREFIX}/events`, { qos: 0 });
        if (this.currentRoom?.code) {
          this.subscribeFastRoomTopic(this.currentRoom.code);
        }
        this.notifyState();
      });

      client.on('message', (topic, payloadBuf) => {
        try {
          if (!payloadBuf || payloadBuf.length === 0) return;
          const data = JSON.parse(payloadBuf.toString());
          if (!data || data.senderId === this.playerId) return;

          if (topic.startsWith(`${CLUSTER_TOPIC_PREFIX}/rooms/`)) {
            if (data.deleted && data.code) {
              const norm = normalizeRoomCodeClient(data.code);
              this.knownRoomsByCode.delete(norm);
              this.rebuildPublicRoomsFromKnown();
              return;
            }
            if (data.room && data.room.code) {
              this.ingestIncomingRoomState(data.room as CustomRoomInfo);
            }
            return;
          }

          this.handleCrossPeerPacket(data);
        } catch (_err) {
          // Ignore malformed packet
        }
      });

      client.on('error', () => {
        // Handled cleanly by reconnect + HTTP/WS
      });
    } catch (_e) {
      // Ignore MQTT init error
    }
  }

  private subscribeFastRoomTopic(rawCode: string) {
    const norm = normalizeRoomCodeClient(rawCode);
    if (!norm || !this.mqttClient) return;
    if (this.subscribedFastRoomCode && this.subscribedFastRoomCode !== norm) {
      try {
        this.mqttClient.unsubscribe(
          `${CLUSTER_TOPIC_PREFIX}/fast/${this.subscribedFastRoomCode}`
        );
      } catch (_e) {
        // Ignore
      }
    }
    this.subscribedFastRoomCode = norm;
    try {
      this.mqttClient.subscribe(`${CLUSTER_TOPIC_PREFIX}/fast/${norm}`, {
        qos: 0,
      });
    } catch (_e) {
      // Ignore
    }
  }

  private publishCrossPeer(
    payload: Record<string, any>,
    options?: { retainRoom?: CustomRoomInfo; fastRoomCode?: string }
  ) {
    const packet = {
      ...payload,
      senderId: this.playerId,
    };

    if (this.broadcastChan) {
      try {
        this.broadcastChan.postMessage(packet);
      } catch (_e) {
        // Ignore
      }
    }

    if (this.mqttClient && this.mqttClient.connected) {
      try {
        if (options?.retainRoom) {
          const norm = normalizeRoomCodeClient(options.retainRoom.code);
          this.mqttClient.publish(
            `${CLUSTER_TOPIC_PREFIX}/rooms/${norm}`,
            JSON.stringify({
              senderId: this.playerId,
              room: options.retainRoom,
              ts: Date.now(),
            }),
            { qos: 1, retain: true }
          );
        } else if (options?.fastRoomCode) {
          const norm = normalizeRoomCodeClient(options.fastRoomCode);
          this.mqttClient.publish(
            `${CLUSTER_TOPIC_PREFIX}/fast/${norm}`,
            JSON.stringify(packet),
            { qos: 0 }
          );
        } else {
          this.mqttClient.publish(
            `${CLUSTER_TOPIC_PREFIX}/events`,
            JSON.stringify(packet),
            { qos: 0 }
          );
        }
      } catch (_e) {
        // Ignore
      }
    }
  }

  private ingestIncomingRoomState(incoming: CustomRoomInfo) {
    const norm = normalizeRoomCodeClient(incoming.code);
    if (!norm) return;
    incoming.code = norm;

    const existingKnown = this.knownRoomsByCode.get(norm);
    const merged = mergeClientRooms(existingKnown, incoming);
    this.knownRoomsByCode.set(norm, merged);

    if (
      this.currentRoom &&
      normalizeRoomCodeClient(this.currentRoom.code) === norm
    ) {
      const prevRoom = this.currentRoom;
      const prevStatus = prevRoom.status;
      const prevHumans = prevRoom.slots.filter(
        (s) => s.occupiedBy === 'human'
      ).length;
      const unified = mergeClientRooms(prevRoom, merged);
      this.currentRoom = unified;
      this.knownRoomsByCode.set(norm, unified);
      this.subscribeFastRoomTopic(norm);

      const newHumans = unified.slots.filter(
        (s) => s.occupiedBy === 'human'
      ).length;
      // If merging combined two previously separate lobbies into one, broadcast the unified state so everyone converges!
      if (newHumans > prevHumans) {
        this.publishCrossPeer(
          { type: 'room:state', room: unified },
          { retainRoom: unified }
        );
        fetch('/api/mp/room/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ room: unified }),
        }).catch(() => {});
      }

      if (prevStatus !== 'PLAYING' && unified.status === 'PLAYING') {
        for (const cb of this.matchStartListeners) {
          cb(unified);
        }
      }
      if (this.micEnabled) {
        this.syncWebRTCPeers(prevRoom, unified);
      }
    }

    this.rebuildPublicRoomsFromKnown();
    this.notifyState();
  }

  private rebuildPublicRoomsFromKnown() {
    const byCode = new Map<string, PublicRoomSummary>();
    for (const r of this.publicRooms) {
      const norm = normalizeRoomCodeClient(r.code);
      if (norm) byCode.set(norm, { ...r, code: norm });
    }
    for (const [norm, r] of this.knownRoomsByCode.entries()) {
      if (r.status === 'LOBBY') {
        const humanCount = Math.max(
          1,
          r.slots.filter((s) => s.occupiedBy === 'human').length
        );
        byCode.set(norm, {
          code: norm,
          name: r.name,
          mode: r.mode,
          mapId: r.mapId,
          maxPlayers: r.maxPlayers,
          humanCount,
          status: r.status,
        });
      } else {
        byCode.delete(norm);
      }
    }
    this.publicRooms = Array.from(byCode.values());
  }

  private handleCrossPeerPacket(data: Record<string, any>) {
    const type = data.type as string;

    if (type === 'room:state' && data.room) {
      this.ingestIncomingRoomState(data.room as CustomRoomInfo);
      return;
    }

    if (type === 'cluster:join_request' && data.roomCode && data.client) {
      const targetCode = normalizeRoomCodeClient(data.roomCode);
      if (
        this.currentRoom &&
        normalizeRoomCodeClient(this.currentRoom.code) === targetCode
      ) {
        // Another player is joining our room code! Add them to our room state immediately and broadcast back!
        const room = {
          ...this.currentRoom,
          slots: this.currentRoom.slots.map((s) => ({ ...s })),
        };
        const joiner = data.client;
        let slot = room.slots.find((s) => s.playerId === joiner.playerId);
        if (!slot) {
          const prefIdx =
            typeof data.preferredSlot === 'number' ? data.preferredSlot : -1;
          if (
            prefIdx >= 0 &&
            prefIdx < room.slots.length &&
            room.slots[prefIdx].occupiedBy !== 'human'
          ) {
            slot = room.slots[prefIdx];
          } else {
            slot = room.slots.find((s) => s.occupiedBy !== 'human');
          }
          if (slot) {
            slot.occupiedBy = 'human';
            slot.playerId = joiner.playerId;
            slot.playerName = joiner.name || 'Athlete';
            slot.charId = (joiner.charId || 'green_hoodie') as CharacterId;
            slot.outfitId = (joiner.outfitId || 'crown_hoodie') as OutfitId;
            slot.faceId = (joiner.faceId || 'happy_laugh') as FaceId;
            slot.ready = true;
            slot.isHost = room.hostId === joiner.playerId;
            slot.micOn = false;
            slot.listenOn = true;
            slot.speaking = false;
          }
        }
        room.updatedAt = Date.now();
        room.version = (room.version || 1) + 1;
        this.currentRoom = room;
        this.knownRoomsByCode.set(targetCode, room);
        this.publishCrossPeer({ type: 'room:state', room }, { retainRoom: room });
        fetch('/api/mp/room/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ room }),
        }).catch(() => {});
        this.notifyState();
      }
      return;
    }

    if (type === 'match:start' && data.room) {
      const incoming = data.room as CustomRoomInfo;
      const norm = normalizeRoomCodeClient(incoming.code);
      if (
        this.currentRoom &&
        normalizeRoomCodeClient(this.currentRoom.code) === norm
      ) {
        this.currentRoom = mergeClientRooms(this.currentRoom, incoming);
        this.currentRoom.status = 'PLAYING';
        this.notifyState();
        for (const cb of this.matchStartListeners) {
          cb(this.currentRoom);
        }
      }
      return;
    }

    const packet = data.packet || data;
    const roomCode = normalizeRoomCodeClient(
      data.roomCode || packet.roomCode || ''
    );
    if (
      !this.currentRoom ||
      (roomCode &&
        normalizeRoomCodeClient(this.currentRoom.code) !== roomCode)
    ) {
      return;
    }

    if (type === 'game:player_state' || packet.type === 'game:player_state') {
      const pkt = packet as RemotePlayerStatePacket;
      if (pkt.senderId !== this.playerId) {
        for (const cb of this.remoteTickListeners) {
          cb(pkt);
        }
      }
      return;
    }

    if (type === 'game:event' || packet.type === 'game:event') {
      const pkt = packet as RemoteGameEventPacket;
      if (pkt.senderId !== this.playerId) {
        for (const cb of this.remoteEventListeners) {
          cb(pkt);
        }
      }
      return;
    }

    if (type === 'voice:audio_chunk' || packet.type === 'voice:audio_chunk') {
      if (
        this.listenEnabled &&
        packet.senderId !== this.playerId &&
        Array.isArray(packet.samples)
      ) {
        this.playIncomingAudioChunk(
          String(packet.senderId || ''),
          packet.samples as number[],
          Number(packet.sampleRate) || 16000
        );
      }
      return;
    }
  }

  public connect() {
    this.startPollingFallback();

    if (
      this.ws &&
      (this.ws.readyState === WebSocket.OPEN ||
        this.ws.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    try {
      const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const url = `${proto}//${window.location.host}/ws`;
      const ws = new WebSocket(url);
      this.ws = ws;

      ws.onopen = () => {
        this.connected = true;
        this.send({
          type: 'player:identify',
          playerId: this.playerId,
          name: this.playerName,
          charId: this.charId,
          outfitId: this.outfitId,
          faceId: this.faceId,
          roomCode: this.currentRoom?.code || null,
        });
        while (this.pendingWsQueue.length > 0) {
          const item = this.pendingWsQueue.shift();
          if (item && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(item));
          }
        }
        this.notifyState();
      };

      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data);
          this.handleMessage(msg);
        } catch (_err) {
          // Ignore invalid JSON
        }
      };

      ws.onclose = () => {
        if (this.reconnectTimer === null) {
          this.reconnectTimer = window.setTimeout(() => {
            this.reconnectTimer = null;
            this.connect();
          }, 2200);
        }
      };

      ws.onerror = () => {
        // Handled cleanly via HTTP/MQTT fallback + auto-reconnect
      };
    } catch (_err) {
      // HTTP + MQTT fallback remains active
    }
  }

  private startPollingFallback() {
    if (this.pollTimer !== null || typeof window === 'undefined') return;
    this.refreshStateHttp();
    this.pollTimer = window.setInterval(() => {
      this.refreshStateHttp();
    }, 1800);
  }

  public async refreshStateHttp() {
    try {
      const params = new URLSearchParams({
        playerId: this.playerId,
        roomCode: this.currentRoom?.code || '',
      });
      const res = await fetch(`/api/mp/state?${params.toString()}`);
      if (!res.ok) return;
      const data = await res.json();
      this.connected = true;
      if (Array.isArray(data.rooms)) {
        this.publicRooms = data.rooms;
        this.rebuildPublicRoomsFromKnown();
      }
      if (typeof data.onlineCount === 'number') {
        this.onlineCount = Math.max(1, data.onlineCount);
      }
      if (data.room) {
        this.ingestIncomingRoomState(data.room as CustomRoomInfo);
      }
      this.notifyState();
    } catch (_e) {
      // Ignore transient network errors
    }
  }

  private handleMessage(msg: any) {
    const type = msg.type as string;

    if (type === 'rooms:list') {
      this.publicRooms = Array.isArray(msg.rooms) ? msg.rooms : [];
      this.rebuildPublicRoomsFromKnown();
      this.onlineCount = Math.max(1, Number(msg.onlineCount) || 1);
      this.notifyState();
      return;
    }

    if (type === 'room:state' && msg.room) {
      this.lastError = null;
      this.ingestIncomingRoomState(msg.room as CustomRoomInfo);
      return;
    }

    if (type === 'room:left') {
      this.currentRoom = null;
      this.cleanupVoicePeers();
      this.notifyState();
      return;
    }

    if (type === 'room:error') {
      this.lastError = String(msg.message || 'Unable to join room');
      this.notifyState();
      return;
    }

    if (type === 'match:start' && msg.room) {
      const incoming = msg.room as CustomRoomInfo;
      this.currentRoom = mergeClientRooms(this.currentRoom, incoming);
      this.currentRoom.status = 'PLAYING';
      this.notifyState();
      for (const cb of this.matchStartListeners) {
        cb(this.currentRoom);
      }
      return;
    }

    if (type === 'game:player_state') {
      const pkt = msg as RemotePlayerStatePacket;
      if (pkt.senderId !== this.playerId) {
        for (const cb of this.remoteTickListeners) {
          cb(pkt);
        }
      }
      return;
    }

    if (type === 'game:event') {
      const pkt = msg as RemoteGameEventPacket;
      if (pkt.senderId !== this.playerId) {
        for (const cb of this.remoteEventListeners) {
          cb(pkt);
        }
      }
      return;
    }

    if (type === 'voice:signal') {
      this.handleVoiceSignal(String(msg.fromId || ''), msg.signal);
      return;
    }

    if (type === 'voice:audio_chunk') {
      if (
        this.listenEnabled &&
        msg.senderId !== this.playerId &&
        Array.isArray(msg.samples)
      ) {
        this.playIncomingAudioChunk(
          String(msg.senderId || ''),
          msg.samples as number[],
          Number(msg.sampleRate) || 16000
        );
      }
      return;
    }
  }

  public send(payload: Record<string, any>) {
    const enriched = {
      playerId: this.playerId,
      name: this.playerName,
      charId: this.charId,
      outfitId: this.outfitId,
      faceId: this.faceId,
      roomCode: this.currentRoom?.code || null,
      ...payload,
    };
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(enriched));
    } else if (
      payload.type !== 'game:player_state' &&
      payload.type !== 'voice:audio_chunk'
    ) {
      this.pendingWsQueue.push(enriched);
      if (this.pendingWsQueue.length > 12) {
        this.pendingWsQueue.shift();
      }
    }
  }

  public syncProfile(
    name: string,
    charId: CharacterId,
    outfitId: OutfitId,
    faceId: FaceId
  ) {
    this.playerName = name.trim().slice(0, 16) || 'Athlete';
    this.charId = charId;
    this.outfitId = outfitId;
    this.faceId = faceId;
    try {
      localStorage.setItem('sixgun_player_name', this.playerName);
    } catch (_e) {
      // Ignore storage error
    }
    if (this.currentRoom) {
      const mySlot = this.currentRoom.slots.find(
        (s) => s.playerId === this.playerId
      );
      if (mySlot) {
        mySlot.playerName = this.playerName;
        mySlot.charId = this.charId;
        mySlot.outfitId = this.outfitId;
        mySlot.faceId = this.faceId;
        this.currentRoom.updatedAt = Date.now();
        this.currentRoom.version = (this.currentRoom.version || 1) + 1;
        this.publishCrossPeer(
          { type: 'room:state', room: this.currentRoom },
          { retainRoom: this.currentRoom }
        );
      }
    }
    this.send({
      type: 'player:update_profile',
      name: this.playerName,
      charId: this.charId,
      outfitId: this.outfitId,
      faceId: this.faceId,
    });
    this.notifyState();
  }

  public async createCustomRoom(options: {
    mode: 'volleyball_2v2' | 'obstacle_rush' | 'floor_is_lava';
    mapId: string;
    maxPlayers: number;
    winScore: number;
    timerMinutes: 3 | 5 | 6;
    difficulty: string;
    fillWithBots: boolean;
    customCode?: string;
  }) {
    this.lastError = null;
    this.notifyState();
    this.connect();

    try {
      const res = await fetch('/api/mp/room/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: this.playerId,
          name: this.playerName,
          charId: this.charId,
          outfitId: this.outfitId,
          faceId: this.faceId,
          ...options,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.room) {
          const room = data.room as CustomRoomInfo;
          room.code = normalizeRoomCodeClient(room.code);
          this.currentRoom = room;
          this.knownRoomsByCode.set(room.code, room);
          this.subscribeFastRoomTopic(room.code);
          this.publishCrossPeer({ type: 'room:state', room }, { retainRoom: room });
          this.lastError = null;
        }
        if (Array.isArray(data.rooms)) {
          this.publicRooms = data.rooms;
          this.rebuildPublicRoomsFromKnown();
        }
        this.notifyState();
        return;
      }
    } catch (_e) {
      // Fallback to WebSocket below
    }

    this.send({
      type: 'room:create',
      ...options,
    });
  }

  public async joinCustomRoom(code: string, preferredSlot?: number) {
    const cleanCode = normalizeRoomCodeClient(code);
    if (!cleanCode) return;
    this.lastError = null;
    this.notifyState();
    this.connect();
    this.subscribeFastRoomTopic(cleanCode);

    // 1. Immediately announce join request across BroadcastChannel & Global MQTT Mesh
    // so if the host is on another Cloud Run instance (ais-dev vs ais-pre) or another tab,
    // the host immediately merges us into their room and broadcasts the unified room state!
    this.publishCrossPeer({
      type: 'cluster:join_request',
      roomCode: cleanCode,
      preferredSlot,
      client: {
        playerId: this.playerId,
        name: this.playerName,
        charId: this.charId,
        outfitId: this.outfitId,
        faceId: this.faceId,
      },
    });

    const knownRoom = this.knownRoomsByCode.get(cleanCode);

    try {
      const res = await fetch('/api/mp/room/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: this.playerId,
          name: this.playerName,
          charId: this.charId,
          outfitId: this.outfitId,
          faceId: this.faceId,
          code: cleanCode,
          preferredSlot,
          knownRoom,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        this.lastError = String(data.error || 'Could not join room');
        this.notifyState();
        return;
      }
      if (data.room) {
        const merged = mergeClientRooms(
          this.knownRoomsByCode.get(cleanCode),
          data.room as CustomRoomInfo
        );
        this.currentRoom = merged;
        this.knownRoomsByCode.set(cleanCode, merged);
        this.publishCrossPeer(
          { type: 'room:state', room: merged },
          { retainRoom: merged }
        );
        this.lastError = null;
      }
      if (Array.isArray(data.rooms)) {
        this.publicRooms = data.rooms;
        this.rebuildPublicRoomsFromKnown();
      }
      this.notifyState();
      return;
    } catch (_e) {
      // Fallback to WebSocket
    }

    this.send({
      type: 'room:join',
      code: cleanCode,
      preferredSlot,
      knownRoom,
    });
  }

  public async leaveCustomRoom() {
    this.stopMicrophone();
    this.cleanupVoicePeers();
    const prevCode = this.currentRoom?.code;
    this.currentRoom = null;
    this.notifyState();

    try {
      await fetch('/api/mp/room/leave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: this.playerId,
          roomCode: prevCode,
        }),
      });
    } catch (_e) {
      this.send({ type: 'room:leave' });
    }
  }

  public async selectSlot(slotIndex: number) {
    if (this.currentRoom) {
      const room = {
        ...this.currentRoom,
        slots: this.currentRoom.slots.map((s) => ({ ...s })),
      };
      const targetSlot = room.slots[slotIndex];
      const currentSlot = room.slots.find((s) => s.playerId === this.playerId);
      if (
        targetSlot &&
        currentSlot &&
        currentSlot.slotIndex !== slotIndex &&
        targetSlot.occupiedBy !== 'human'
      ) {
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
        targetSlot.playerId = this.playerId;
        targetSlot.playerName = this.playerName;
        targetSlot.charId = this.charId;
        targetSlot.outfitId = this.outfitId;
        targetSlot.faceId = this.faceId;
        targetSlot.ready = prevReady;
        targetSlot.isHost = prevHost;
        targetSlot.micOn = prevMic;
        targetSlot.listenOn = prevListen;
        targetSlot.speaking = false;

        room.updatedAt = Date.now();
        room.version = (room.version || 1) + 1;
        this.currentRoom = room;
        this.knownRoomsByCode.set(room.code, room);
        this.publishCrossPeer({ type: 'room:state', room }, { retainRoom: room });
        this.notifyState();
      }
    }

    this.send({
      type: 'room:select_slot',
      slotIndex,
    });
    try {
      const res = await fetch('/api/mp/room/select-slot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: this.playerId,
          roomCode: this.currentRoom?.code,
          slotIndex,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.room) {
          this.ingestIncomingRoomState(data.room);
        }
      }
    } catch (_e) {
      // Handled by WS/MQTT
    }
  }

  public async toggleSlotBot(slotIndex: number) {
    this.send({
      type: 'room:toggle_slot_bot',
      slotIndex,
    });
    try {
      const res = await fetch('/api/mp/room/toggle-bot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: this.playerId,
          roomCode: this.currentRoom?.code,
          slotIndex,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.room) {
          this.ingestIncomingRoomState(data.room);
          if (this.currentRoom) {
            this.publishCrossPeer(
              { type: 'room:state', room: this.currentRoom },
              { retainRoom: this.currentRoom }
            );
          }
        }
      }
    } catch (_e) {
      // Handled by WS
    }
  }

  public async updateRoomSettings(settings: {
    mode?: 'volleyball_2v2' | 'obstacle_rush' | 'floor_is_lava';
    mapId?: string;
    maxPlayers?: number;
    winScore?: number;
    timerMinutes?: 3 | 5 | 6;
    difficulty?: string;
    fillWithBots?: boolean;
  }) {
    this.send({
      type: 'room:update_settings',
      ...settings,
    });
    try {
      const res = await fetch('/api/mp/room/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: this.playerId,
          roomCode: this.currentRoom?.code,
          ...settings,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.room) {
          this.ingestIncomingRoomState(data.room);
          if (this.currentRoom) {
            this.publishCrossPeer(
              { type: 'room:state', room: this.currentRoom },
              { retainRoom: this.currentRoom }
            );
          }
        }
      }
    } catch (_e) {
      // Handled by WS
    }
  }

  public updateMyRoomPlayer(updates: {
    name?: string;
    charId?: CharacterId;
    outfitId?: OutfitId;
    faceId?: FaceId;
    ready?: boolean;
    micOn?: boolean;
    listenOn?: boolean;
    speaking?: boolean;
  }) {
    if (this.currentRoom) {
      const mySlot = this.currentRoom.slots.find(
        (s) => s.playerId === this.playerId
      );
      if (mySlot) {
        if (updates.name) mySlot.playerName = updates.name;
        if (updates.charId) mySlot.charId = updates.charId;
        if (updates.outfitId) mySlot.outfitId = updates.outfitId;
        if (updates.faceId) mySlot.faceId = updates.faceId;
        if (typeof updates.ready === 'boolean') mySlot.ready = updates.ready;
        if (typeof updates.micOn === 'boolean') mySlot.micOn = updates.micOn;
        if (typeof updates.listenOn === 'boolean')
          mySlot.listenOn = updates.listenOn;
        if (typeof updates.speaking === 'boolean')
          mySlot.speaking = updates.speaking;
        this.currentRoom.updatedAt = Date.now();
        this.currentRoom.version = (this.currentRoom.version || 1) + 1;
        this.publishCrossPeer(
          { type: 'room:state', room: this.currentRoom },
          { retainRoom: this.currentRoom }
        );
      }
    }
    this.send({
      type: 'room:update_player',
      ...updates,
    });
  }

  public async startMatch() {
    if (this.currentRoom) {
      this.currentRoom.status = 'PLAYING';
      this.currentRoom.updatedAt = Date.now();
      this.currentRoom.version = (this.currentRoom.version || 1) + 1;
      this.publishCrossPeer(
        { type: 'match:start', room: this.currentRoom },
        { retainRoom: this.currentRoom }
      );
      this.publishCrossPeer({
        type: 'match:start',
        room: this.currentRoom,
      });
    }
    this.send({ type: 'room:start_match' });
    try {
      const res = await fetch('/api/mp/room/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: this.playerId,
          roomCode: this.currentRoom?.code,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.room) {
          this.currentRoom = mergeClientRooms(this.currentRoom, data.room);
          this.currentRoom.status = 'PLAYING';
          this.notifyState();
          for (const cb of this.matchStartListeners) {
            cb(this.currentRoom!);
          }
          return;
        }
      }
    } catch (_e) {
      // Handled by WS/MQTT
    }
    if (this.currentRoom) {
      for (const cb of this.matchStartListeners) {
        cb(this.currentRoom);
      }
    }
  }

  public returnToLobby() {
    if (this.currentRoom) {
      this.currentRoom.status = 'LOBBY';
      this.currentRoom.updatedAt = Date.now();
      this.currentRoom.version = (this.currentRoom.version || 1) + 1;
      this.publishCrossPeer(
        { type: 'room:state', room: this.currentRoom },
        { retainRoom: this.currentRoom }
      );
      this.notifyState();
    }
    this.send({ type: 'room:return_lobby' });
  }

  public sendPlayerTick(packet: Omit<RemotePlayerStatePacket, 'senderId'>) {
    if (!this.currentRoom || this.currentRoom.status !== 'PLAYING') return;
    const fullPacket: RemotePlayerStatePacket = {
      ...packet,
      senderId: this.playerId,
    };
    this.send({
      type: 'game:player_state',
      ...fullPacket,
    });
    this.publishCrossPeer(
      {
        type: 'game:player_state',
        roomCode: this.currentRoom.code,
        packet: fullPacket,
      },
      { fastRoomCode: this.currentRoom.code }
    );
  }

  public sendGameEvent(eventKind: string, payload: Record<string, any>) {
    if (!this.currentRoom || this.currentRoom.status !== 'PLAYING') return;
    const fullPacket: RemoteGameEventPacket = {
      senderId: this.playerId,
      eventKind,
      payload,
    };
    this.send({
      type: 'game:event',
      ...fullPacket,
    });
    this.publishCrossPeer(
      {
        type: 'game:event',
        roomCode: this.currentRoom.code,
        packet: fullPacket,
      },
      { fastRoomCode: this.currentRoom.code }
    );
  }

  // =========================================================================
  // REAL-TIME VOICE CHAT ENGINE (TALK & LISTEN WITH ZERO DELAY)
  // =========================================================================
  public async toggleMicrophone(): Promise<boolean> {
    if (this.micEnabled) {
      this.stopMicrophone();
      return false;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
        },
        video: false,
      });

      this.localStream = stream;
      this.micEnabled = true;

      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (!this.audioCtx) {
        this.audioCtx = new AudioCtx();
      }
      if (this.audioCtx.state === 'suspended') {
        await this.audioCtx.resume();
      }

      const source = this.audioCtx.createMediaStreamSource(stream);
      const analyser = this.audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      this.analyser = analyser;

      const processor = this.audioCtx.createScriptProcessor(2048, 1, 1);
      const muteGain = this.audioCtx.createGain();
      muteGain.gain.value = 0;
      source.connect(processor);
      processor.connect(muteGain);
      muteGain.connect(this.audioCtx.destination);
      this.scriptProcessor = processor;

      const inputSampleRate = this.audioCtx.sampleRate;
      const targetSampleRate = 16000;
      const ratio = Math.max(1, Math.round(inputSampleRate / targetSampleRate));

      processor.onaudioprocess = (ev) => {
        if (!this.micEnabled || !this.currentRoom) return;
        const input = ev.inputBuffer.getChannelData(0);
        let sumSq = 0;
        for (let i = 0; i < input.length; i += 4) {
          sumSq += input[i] * input[i];
        }
        const rms = Math.sqrt(sumSq / (input.length / 4));
        if (rms < 0.012) return;

        const downsampled: number[] = [];
        for (let i = 0; i < input.length; i += ratio) {
          downsampled.push(Math.round(input[i] * 1000) / 1000);
        }

        const voicePkt = {
          type: 'voice:audio_chunk',
          senderId: this.playerId,
          roomCode: this.currentRoom.code,
          sampleRate: Math.round(inputSampleRate / ratio),
          samples: downsampled,
        };
        this.send(voicePkt);
        this.publishCrossPeer(
          {
            type: 'voice:audio_chunk',
            roomCode: this.currentRoom.code,
            packet: voicePkt,
          },
          { fastRoomCode: this.currentRoom.code }
        );
      };

      const dataArr = new Uint8Array(analyser.frequencyBinCount);
      this.vadInterval = window.setInterval(() => {
        if (!this.analyser || !this.micEnabled) return;
        this.analyser.getByteFrequencyData(dataArr);
        let sum = 0;
        for (let i = 0; i < dataArr.length; i++) {
          sum += dataArr[i];
        }
        const avg = sum / dataArr.length;
        const speakingNow = avg > 14;
        if (speakingNow !== this.isSpeaking) {
          this.isSpeaking = speakingNow;
          this.updateMyRoomPlayer({
            micOn: this.micEnabled,
            listenOn: this.listenEnabled,
            speaking: this.isSpeaking,
          });
          this.notifyState();
        }
      }, 110);

      this.updateMyRoomPlayer({
        micOn: true,
        listenOn: this.listenEnabled,
        speaking: false,
      });

      if (this.currentRoom) {
        this.syncWebRTCPeers(null, this.currentRoom);
      }

      this.notifyState();
      return true;
    } catch (_err) {
      this.micEnabled = false;
      this.lastError =
        'Microphone permission was denied or unavailable on this device.';
      this.notifyState();
      return false;
    }
  }

  public stopMicrophone() {
    this.micEnabled = false;
    this.isSpeaking = false;
    if (this.vadInterval !== null) {
      clearInterval(this.vadInterval);
      this.vadInterval = null;
    }
    if (this.scriptProcessor) {
      try {
        this.scriptProcessor.disconnect();
      } catch (_e) {
        // Ignore
      }
      this.scriptProcessor = null;
    }
    if (this.localStream) {
      for (const track of this.localStream.getTracks()) {
        track.stop();
      }
      this.localStream = null;
    }
    this.cleanupVoicePeers();
    this.updateMyRoomPlayer({
      micOn: false,
      listenOn: this.listenEnabled,
      speaking: false,
    });
    this.notifyState();
  }

  public toggleListen(): boolean {
    this.listenEnabled = !this.listenEnabled;
    for (const audioEl of this.remoteAudioEls.values()) {
      audioEl.muted = !this.listenEnabled;
    }
    this.updateMyRoomPlayer({
      micOn: this.micEnabled,
      listenOn: this.listenEnabled,
      speaking: this.isSpeaking,
    });
    this.notifyState();
    return this.listenEnabled;
  }

  private playIncomingAudioChunk(
    senderId: string,
    samples: number[],
    sampleRate: number
  ) {
    if (!this.listenEnabled || samples.length === 0) return;
    if (this.peerConnections.has(senderId)) {
      const pc = this.peerConnections.get(senderId);
      if (pc && pc.connectionState === 'connected') {
        return;
      }
    }

    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (!this.audioCtx) {
        this.audioCtx = new AudioCtx();
      }
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }

      const buf = this.audioCtx.createBuffer(1, samples.length, sampleRate);
      const chan = buf.getChannelData(0);
      for (let i = 0; i < samples.length; i++) {
        chan[i] = samples[i];
      }

      const src = this.audioCtx.createBufferSource();
      src.buffer = buf;
      src.connect(this.audioCtx.destination);

      const now = this.audioCtx.currentTime;
      const prevEnd = this.nextPlayTimeBySender.get(senderId) || 0;
      const startAt = Math.max(now + 0.015, prevEnd);
      src.start(startAt);
      this.nextPlayTimeBySender.set(senderId, startAt + buf.duration);
    } catch (_e) {
      // Ignore audio context autoplay restriction
    }
  }

  private syncWebRTCPeers(
    _prevRoom: CustomRoomInfo | null,
    nextRoom: CustomRoomInfo
  ) {
    if (!this.localStream) return;
    const humanIds = nextRoom.slots
      .filter(
        (s) =>
          s.occupiedBy === 'human' &&
          s.playerId &&
          s.playerId !== this.playerId
      )
      .map((s) => s.playerId!);

    for (const remoteId of humanIds) {
      if (!this.peerConnections.has(remoteId)) {
        this.createPeerConnection(remoteId, true);
      }
    }
  }

  private async createPeerConnection(remoteId: string, isInitiator: boolean) {
    try {
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
      });
      this.peerConnections.set(remoteId, pc);

      if (this.localStream) {
        for (const track of this.localStream.getTracks()) {
          pc.addTrack(track, this.localStream);
        }
      }

      pc.onicecandidate = (ev) => {
        if (ev.candidate) {
          this.send({
            type: 'voice:signal',
            targetId: remoteId,
            signal: { type: 'candidate', candidate: ev.candidate },
          });
        }
      };

      pc.ontrack = (ev) => {
        const stream = ev.streams[0];
        if (!stream) return;
        let audioEl = this.remoteAudioEls.get(remoteId);
        if (!audioEl) {
          audioEl = new Audio();
          audioEl.autoplay = true;
          this.remoteAudioEls.set(remoteId, audioEl);
        }
        audioEl.srcObject = stream;
        audioEl.muted = !this.listenEnabled;
        audioEl.play().catch(() => {});
      };

      if (isInitiator) {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        this.send({
          type: 'voice:signal',
          targetId: remoteId,
          signal: { type: 'offer', sdp: offer },
        });
      }
    } catch (_e) {
      // Fallback PCM chunk relay handles voice if WebRTC is blocked
    }
  }

  private async handleVoiceSignal(fromId: string, signal: any) {
    if (!fromId || !signal) return;
    try {
      let pc = this.peerConnections.get(fromId);
      if (!pc) {
        await this.createPeerConnection(fromId, false);
        pc = this.peerConnections.get(fromId);
      }
      if (!pc) return;

      if (signal.type === 'offer' && signal.sdp) {
        await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        this.send({
          type: 'voice:signal',
          targetId: fromId,
          signal: { type: 'answer', sdp: answer },
        });
      } else if (signal.type === 'answer' && signal.sdp) {
        await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
      } else if (signal.type === 'candidate' && signal.candidate) {
        await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
      }
    } catch (_e) {
      // Ignore signaling race condition
    }
  }

  private cleanupVoicePeers() {
    for (const pc of this.peerConnections.values()) {
      try {
        pc.close();
      } catch (_e) {
        // Ignore
      }
    }
    this.peerConnections.clear();
    for (const audioEl of this.remoteAudioEls.values()) {
      audioEl.srcObject = null;
    }
    this.remoteAudioEls.clear();
  }

  public subscribe(cb: Listener<void>) {
    this.stateListeners.add(cb);
    return () => {
      this.stateListeners.delete(cb);
    };
  }

  public onMatchStart(cb: Listener<CustomRoomInfo>) {
    this.matchStartListeners.add(cb);
    return () => {
      this.matchStartListeners.delete(cb);
    };
  }

  public onRemoteTick(cb: Listener<RemotePlayerStatePacket>) {
    this.remoteTickListeners.add(cb);
    return () => {
      this.remoteTickListeners.delete(cb);
    };
  }

  public onRemoteEvent(cb: Listener<RemoteGameEventPacket>) {
    this.remoteEventListeners.add(cb);
    return () => {
      this.remoteEventListeners.delete(cb);
    };
  }

  private notifyState() {
    for (const cb of this.stateListeners) {
      cb();
    }
  }
}

export const multiplayerClient = new MultiplayerClientManager();
