import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import {
  AIDifficulty,
  CameraPreset,
  CHARACTER_OUTFITS,
  CharacterConfig,
  CharacterId,
  CRAYON_CHARACTERS,
  DIFFICULTY_LEVELS,
  GameState,
  ObstacleRushMapConfig,
  OutfitId,
} from '../types/game';
import {
  addCrayonOutline,
  createCourtFloorTexture,
  createCrayonToonMaterial,
  createLushGrassTurfTexture,
  createStylizedRoofTileTexture,
  createStylizedSkyDomeTexture,
  createStylizedStoneWallTexture,
  createStylizedWaterTexture,
  createWaterfallStreamTexture,
  getToonGradientMap,
} from '../three/crayonMaterials';
import { createStylizedPostPipeline } from '../three/postProcessing';
import {
  CharacterRig,
  createCrayonCharacter,
  createLushGrassBorderCluster,
  createSculptedAlpineMountainPeak,
  createStylizedSkyVehicle,
  setLiveRushMapThumbnail,
} from '../three/crayonModels';
import { crayonAudio } from '../audio/crayonAudio';
import { CustomSlotInfo, multiplayerClient } from '../network/multiplayerClient';

export interface ObstacleRushHudState {
  countdown: number;
  raceTimeSec: number;
  timeRemainingSec: number;
  playerProgressPct: number;
  sectionName: string;
  stageIndex: number;
  fallsCount: number;
  maxFalls: number;
  isOvertime?: boolean;
  playerHp?: number;
  playerMaxHp?: number;
  playerKills?: number;
  playerDeaths?: number;
  playerRank?: number;
  blueTeamScore?: number;
  redTeamScore?: number;
  targetTeamScore?: number;
  weaponName?: string;
  weaponTimerSec?: number;
  dashCooldownPct?: number;
  superChargePct?: number;
  killFeedText?: string;
  standings?: Array<{
    id: string;
    name: string;
    kills: number;
    deaths: number;
    isPlayer: boolean;
    charId: CharacterId;
    dressColor?: string;
  }>;
}

interface ObstacleRushCanvasProps {
  gameState: GameState;
  playerChar: CharacterConfig;
  playerDisplayName?: string;
  customSlots?: CustomSlotInfo[];
  maxCustomPlayers?: number;
  rushMap: ObstacleRushMapConfig;
  difficulty: AIDifficulty;
  cameraPreset: CameraPreset;
  gameSpeedMultiplier: number;
  cameraFov: number;
  enableVfx: boolean;
  enableScreenShake: boolean;
  matchDurationSec?: number; // 300 (5 MIN) or 600 (10 MIN)
  actionTriggerRef: React.MutableRefObject<{
    spikeRequested: boolean;
    diveRequested: boolean;
    superRequested: boolean;
    jumpRequested?: boolean;
    joystickX?: number;
    joystickY?: number;
    joystickActive?: boolean;
  }>;
  onHudUpdate: (hud: ObstacleRushHudState) => void;
  onCallout: (callout: {
    text: string;
    subtext?: string;
    color: string;
    x: number;
    y: number;
  }) => void;
  onRaceFinished: (
    winner: 'player' | 'ai',
    reason: string,
    raceTimeSec: number,
    timeRemainingSec: number,
    fallsCount: number,
    maxFalls: number,
    progressPct: number,
    standings?: Array<{
      id: string;
      name: string;
      kills: number;
      deaths: number;
      isPlayer: boolean;
      charId: CharacterId;
    }>
  ) => void;
}

interface SolidBoxCollider {
  x: number;
  y: number;
  z: number;
  w: number;
  h: number;
  d: number;
  walkable: boolean;
  blocksSight?: boolean;
}

interface SolidCylinderCollider {
  x: number;
  y: number;
  z: number;
  radius: number;
  height: number;
  blocksSight?: boolean;
}

interface JumpPadZone {
  x: number;
  z: number;
  radius: number;
  ringMesh: THREE.Mesh;
  cooldownMap: Record<string, number>;
}

export type ArenaWeaponType = 'assault' | 'shotgun' | 'fire';

interface MedkitPickup {
  mesh: THREE.Group;
  ringMesh: THREE.Mesh;
  x: number;
  y: number;
  z: number;
  active: boolean;
  respawnTimer: number;
  spotIndex: number;
}

interface WeaponPickup {
  mesh: THREE.Group;
  shotgunVisual: THREE.Group;
  fireVisual: THREE.Group;
  ringMesh: THREE.Mesh;
  weaponType: 'shotgun' | 'fire';
  x: number;
  y: number;
  z: number;
  active: boolean;
  respawnTimer: number;
  spotIndex: number;
}

interface BulletProjectile {
  mesh: THREE.Group;
  ownerId: string;
  weaponType: ArenaWeaponType;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  damage: number;
  knockback: number;
  radius: number;
  life: number;
  maxLife: number;
  colorHex: string;
}

interface StylizedVfxParticle {
  mesh: THREE.Object3D;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
  kind:
    | 'ring'
    | 'streak'
    | 'pillar'
    | 'star'
    | 'shell'
    | 'blood_drop'
    | 'blood_splat'
    | 'blood_mist';
  rotSpeed?: number;
  floorY?: number;
}

interface ArenaFighter {
  id: string;
  name: string;
  isPlayer: boolean;
  charConfig: CharacterConfig;
  dressColor: string;
  dressLabel: string;
  rig: CharacterRig;
  group: THREE.Group;
  gunGroup: THREE.Group;
  assaultMeshGroup: THREE.Group;
  shotgunMeshGroup: THREE.Group;
  fireMeshGroup: THREE.Group;
  muzzleFlashMesh: THREE.Mesh;
  hitHaloMesh: THREE.Mesh;
  spawnShieldGroup: THREE.Group;
  hpBarFill: THREE.Mesh;
  hpBarBg: THREE.Mesh;
  weaponType: ArenaWeaponType;
  weaponTimer: number;
  burnTimer: number;
  burnTickTimer: number;
  burnedById: string | null;
  x: number;
  y: number;
  visualY: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  prevVx: number;
  prevVz: number;
  jiggleY: number;
  jiggleVelY: number;
  jiggleRoll: number;
  jiggleVelRoll: number;
  jiggleIntensity: number;
  killStreak: number;
  knockVx: number;
  knockVz: number;
  facingYaw: number;
  targetFacingYaw: number;
  aimHoldTimer: number;
  walkPhase: number;
  hitFlashTimer: number;
  speedBoostTimer: number;
  grounded: boolean;
  hp: number;
  maxHp: number;
  kills: number;
  deaths: number;
  fireCooldown: number;
  gunRecoil: number;
  dashCooldown: number;
  dashActiveTimer: number;
  superCharge: number;
  respawnTimer: number;
  invulnTimer: number;
  timeSinceLastHit: number;
  spawnIndex: number;
  aiTargetId: string | null;
  aiStrafeDir: number;
  aiStrafeTimer: number;
  aiJumpTimer: number;
  aiGoalTimer: number;
  aiGoalX: number;
  aiGoalZ: number;
  aiTactic: 'jiggle_duel' | 'flank_rush' | 'cover_peek' | 'high_ground';
  aiTacticTimer: number;
  lastDamagedById: string | null;
  remotePlayerId?: string | null;
  lastRemoteTickAt?: number;
}

/**
 * 8 Open-Court Solo Spawn Points around the Arena:
 * Initial 4 fighters use indices 0..3; respawns dynamically pick the safest open point!
 */
const SOLO_SPAWN_POINTS: Array<{ x: number; y: number; z: number; yaw: number }> = [
  { x: -15.5, y: 0.02, z: 12.2, yaw: Math.PI * 0.25 },
  { x: 15.5, y: 0.02, z: -9.2, yaw: -Math.PI * 0.75 },
  { x: -15.5, y: 0.02, z: -9.2, yaw: Math.PI * 0.75 },
  { x: 15.5, y: 0.02, z: 12.2, yaw: -Math.PI * 0.25 },
  { x: 0.0, y: 0.02, z: 13.6, yaw: Math.PI },
  { x: 0.0, y: 0.02, z: -9.6, yaw: 0 },
  { x: -16.2, y: 0.02, z: 1.5, yaw: Math.PI * 0.5 },
  { x: 16.2, y: 0.02, z: 1.5, yaw: -Math.PI * 0.5 },
];

/**
 * Guaranteed Valid Outfit Pool using the ACTUAL OutfitId entries from CHARACTER_OUTFITS in src/types/game.ts!
 * This guarantees all 4 Solo Fighters ALWAYS wear 4 completely different outfits & colors!
 */
const VALID_SOLO_OUTFIT_POOL: Array<{
  outfitId: OutfitId;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  label: string;
}> = [
  {
    outfitId: 'crown_hoodie',
    primaryColor: '#4ADE80', // Emerald Green
    secondaryColor: '#1E293B',
    accentColor: '#FFFFFF',
    label: 'EMERALD',
  },
  {
    outfitId: 'pirate_coat',
    primaryColor: '#DC2626', // Crimson Red
    secondaryColor: '#0F172A',
    accentColor: '#FACC15',
    label: 'CRIMSON',
  },
  {
    outfitId: 'cat_hoodie',
    primaryColor: '#A855F7', // Royal Purple
    secondaryColor: '#312E81',
    accentColor: '#F472B6',
    label: 'PURPLE',
  },
  {
    outfitId: 'banana_suit',
    primaryColor: '#FACC15', // Tropi-Gold Yellow
    secondaryColor: '#713F12',
    accentColor: '#FEF08A',
    label: 'GOLD',
  },
  {
    outfitId: 'cyber_jacket',
    primaryColor: '#2563EB', // Electric Blue
    secondaryColor: '#0F172A',
    accentColor: '#38BDF8',
    label: 'BLUE',
  },
  {
    outfitId: 'king_royal',
    primaryColor: '#EC4899', // Berry Pink
    secondaryColor: '#4C1D95',
    accentColor: '#FDE047',
    label: 'PINK',
  },
];

function lerpAngleShortest(current: number, target: number, alpha: number): number {
  let diff = ((target - current + Math.PI) % (Math.PI * 2)) - Math.PI;
  if (diff < -Math.PI) diff += Math.PI * 2;
  return current + diff * alpha;
}

/**
 * Smooth, Grain-Free Cel-Shaded Toon Material (100% Zero Glitter / Zero Shimmer!)
 */
function createCleanToonMaterial(hexColor: string): THREE.MeshToonMaterial {
  return new THREE.MeshToonMaterial({
    color: new THREE.Color(hexColor),
    gradientMap: getToonGradientMap(),
  });
}

const castleStoneTexCache = new Map<string, THREE.CanvasTexture>();
const containerTexCache = new Map<string, THREE.CanvasTexture>();

/**
 * Clean Non-Glitter Architectural Stone Wall Texture with Bold Hand-Inked Line Art
 */
function createCleanCastleStoneTexture(
  baseHex: string,
  mortarHex: string
): THREE.CanvasTexture {
  const cacheKey = `${baseHex}_${mortarHex}`;
  const cached = castleStoneTexCache.get(cacheKey);
  if (cached) return cached;

  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = mortarHex;
  ctx.fillRect(0, 0, size, size);

  const rows = 4;
  const cols = 3;
  const rh = size / rows;
  const cw = size / cols;
  const baseColor = new THREE.Color(baseHex);

  for (let r = 0; r < rows; r++) {
    const ox = r % 2 === 1 ? cw * 0.5 : 0;
    for (let c = -1; c <= cols; c++) {
      const shade = baseColor
        .clone()
        .offsetHSL(0, 0, ((r * 3 + c) % 3 - 1) * 0.03);
      ctx.fillStyle = `#${shade.getHexString()}`;
      ctx.beginPath();
      ctx.roundRect(c * cw + ox + 6, r * rh + 6, cw - 12, rh - 12, 12);
      ctx.fill();
      ctx.lineWidth = 4.5;
      ctx.strokeStyle = '#0F172A';
      ctx.stroke();

      // Comic Corner Hatch Line-Art inside Stone Block
      ctx.strokeStyle = 'rgba(15, 23, 42, 0.32)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(c * cw + ox + 18, r * rh + 18);
      ctx.lineTo(c * cw + ox + 46, r * rh + 18);
      ctx.stroke();
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  castleStoneTexCache.set(cacheKey, tex);
  return tex;
}

/**
 * Clean Non-Glitter Corrugated Cargo Container Texture with Bold Inked Panel Line-Art
 */
function createCleanContainerTexture(
  baseHex: string,
  accentHex: string
): THREE.CanvasTexture {
  const cacheKey = `${baseHex}_${accentHex}`;
  const cached = containerTexCache.get(cacheKey);
  if (cached) return cached;

  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const baseCol = new THREE.Color(baseHex);
  const darkCol = baseCol.clone().offsetHSL(0, 0.03, -0.08);
  const lightCol = baseCol.clone().offsetHSL(0, -0.02, 0.06);

  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, size, size);

  const ribCount = 8;
  const ribW = size / ribCount;
  for (let i = 0; i < ribCount; i++) {
    const rx = i * ribW;
    ctx.fillStyle = `#${darkCol.getHexString()}`;
    ctx.fillRect(rx, 44, ribW * 0.45, size - 88);
    ctx.fillStyle = `#${lightCol.getHexString()}`;
    ctx.fillRect(rx + ribW * 0.45, 44, ribW * 0.35, size - 88);

    // Bold Ink Rib Seam Line-Art
    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(rx, 44);
    ctx.lineTo(rx, size - 44);
    ctx.stroke();
  }

  ctx.fillStyle = '#1E293B';
  ctx.fillRect(0, 0, size, 44);
  ctx.fillRect(0, size - 44, size, 44);

  ctx.fillStyle = accentHex;
  ctx.fillRect(0, size * 0.44, size, 36);
  ctx.strokeStyle = '#0F172A';
  ctx.lineWidth = 4;
  ctx.strokeRect(0, size * 0.44, size, 36);

  ctx.fillStyle = '#0F172A';
  ctx.beginPath();
  ctx.arc(size * 0.5, size * 0.44 + 18, 44, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 6;
  ctx.strokeStyle = accentHex;
  ctx.stroke();

  ctx.fillStyle = accentHex;
  ctx.beginPath();
  ctx.arc(size * 0.5, size * 0.44 + 18, 20, 0, Math.PI * 2);
  ctx.fill();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  containerTexCache.set(cacheKey, tex);
  return tex;
}

let cachedShieldHexTex: THREE.CanvasTexture | null = null;

/**
 * Procedural Low-Opacity Golden Honeycomb Hex-Energy Forcefield Texture for 1.5s Respawn Sphere Protection
 */
function createShieldHexDomeTexture(): THREE.CanvasTexture {
  if (cachedShieldHexTex) return cachedShieldHexTex;

  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.clearRect(0, 0, size, size);

  // Soft vertical Fresnel-style gradient (crystal-clear center, warm golden poles & equator)
  const grad = ctx.createLinearGradient(0, 0, 0, size);
  grad.addColorStop(0.0, 'rgba(254, 240, 138, 0.72)');
  grad.addColorStop(0.18, 'rgba(250, 204, 21, 0.14)');
  grad.addColorStop(0.46, 'rgba(245, 158, 11, 0.24)');
  grad.addColorStop(0.5, 'rgba(254, 249, 195, 0.65)');
  grad.addColorStop(0.54, 'rgba(245, 158, 11, 0.24)');
  grad.addColorStop(0.82, 'rgba(250, 204, 21, 0.14)');
  grad.addColorStop(1.0, 'rgba(254, 240, 138, 0.75)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  // Crisp Honeycomb Hexagonal Energy Lattice + Glowing Vertex Nodes
  const hexR = 22;
  const hexH = Math.sqrt(3) * hexR;
  const colStep = hexR * 1.5;

  for (let col = -1; col <= Math.ceil(size / colStep) + 1; col++) {
    const cx = col * colStep;
    const yOffset = col % 2 === 0 ? 0 : hexH * 0.5;
    for (let row = -1; row <= Math.ceil(size / hexH) + 1; row++) {
      const cy = row * hexH + yOffset;
      ctx.beginPath();
      for (let s = 0; s < 6; s++) {
        const ang = (s * Math.PI) / 3;
        const vx = cx + Math.cos(ang) * (hexR - 2.2);
        const vy = cy + Math.sin(ang) * (hexR - 2.2);
        if (s === 0) ctx.moveTo(vx, vy);
        else ctx.lineTo(vx, vy);
      }
      ctx.closePath();
      if ((col + row) % 4 === 0) {
        ctx.fillStyle = 'rgba(254, 240, 138, 0.15)';
        ctx.fill();
      }
      ctx.strokeStyle = 'rgba(254, 249, 195, 0.78)';
      ctx.lineWidth = 2.0;
      ctx.stroke();

      // Tiny bright energy node in cell center
      if ((col + row) % 2 === 0) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.72)';
        ctx.beginPath();
        ctx.arc(cx, cy, 2.1, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // Equatorial Golden Tech Band
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.lineWidth = 3.2;
  ctx.beginPath();
  ctx.moveTo(0, size * 0.5);
  ctx.lineTo(size, size * 0.5);
  ctx.stroke();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.needsUpdate = true;
  cachedShieldHexTex = tex;
  return tex;
}

/**
 * Helper to create a smooth Rounded-Rectangle THREE.Shape for the Sculpted Diorama Island
 */
function createRoundedRectShape(width: number, length: number, radius: number): THREE.Shape {
  const shape = new THREE.Shape();
  const x = -width / 2;
  const y = -length / 2;
  shape.moveTo(x + radius, y);
  shape.lineTo(x + width - radius, y);
  shape.quadraticCurveTo(x + width, y, x + width, y + radius);
  shape.lineTo(x + width, y + length - radius);
  shape.quadraticCurveTo(x + width, y + length, x + width - radius, y + length);
  shape.lineTo(x + radius, y + length);
  shape.quadraticCurveTo(x, y + length, x, y + length - radius);
  shape.lineTo(x, y + radius);
  shape.quadraticCurveTo(x, y, x + radius, y);
  return shape;
}

/**
 * Builds the 3D Multi-Weapon Arsenal (Assault Blaster + Twin-Barrel Pump Shotgun + Crimson Fire Blaster)
 * fitted directly into the Chibi character's two hands!
 */
function createFittedMultiWeaponArsenal(accentColorHex: string): {
  gunGroup: THREE.Group;
  assaultMeshGroup: THREE.Group;
  shotgunMeshGroup: THREE.Group;
  fireMeshGroup: THREE.Group;
  muzzleFlashMesh: THREE.Mesh;
} {
  const gunGroup = new THREE.Group();

  const darkMetalMat = createCleanToonMaterial('#1E293B');
  const gunmetalMat = createCleanToonMaterial('#475569');
  const barrelSteelMat = createCleanToonMaterial('#94A3B8');
  const gripMat = createCleanToonMaterial('#0F172A');
  const accentMat = createCleanToonMaterial(accentColorHex);
  const woodStockMat = createCleanToonMaterial('#B45309');
  const goldMat = createCleanToonMaterial('#FACC15');
  const fireOrangeMat = createCleanToonMaterial('#EA580C');
  const fireRedMat = createCleanToonMaterial('#DC2626');
  const sightGlassMat = new THREE.MeshBasicMaterial({
    color: '#38BDF8',
    transparent: true,
    opacity: 0.85,
  });

  // --- 1. DEFAULT ASSAULT BLASTER RIFLE ---
  const assaultMeshGroup = new THREE.Group();
  gunGroup.add(assaultMeshGroup);

  const stockGeo = new THREE.BoxGeometry(0.085, 0.125, 0.24);
  const stock = new THREE.Mesh(stockGeo, darkMetalMat);
  stock.position.set(0, -0.015, -0.18);
  addCrayonOutline(stock, 0.035);
  assaultMeshGroup.add(stock);

  const buttPadGeo = new THREE.BoxGeometry(0.095, 0.145, 0.045);
  const buttPad = new THREE.Mesh(buttPadGeo, gripMat);
  buttPad.position.set(0, -0.02, -0.31);
  assaultMeshGroup.add(buttPad);

  const receiverGeo = new THREE.BoxGeometry(0.115, 0.14, 0.36);
  const receiver = new THREE.Mesh(receiverGeo, gunmetalMat);
  receiver.position.set(0, 0.015, 0.08);
  receiver.castShadow = true;
  addCrayonOutline(receiver, 0.035);
  assaultMeshGroup.add(receiver);

  const stripeGeo = new THREE.BoxGeometry(0.125, 0.048, 0.28);
  const stripe = new THREE.Mesh(stripeGeo, accentMat);
  stripe.position.set(0, 0.022, 0.08);
  assaultMeshGroup.add(stripe);

  const rearGripGeo = new THREE.BoxGeometry(0.075, 0.165, 0.085);
  const rearGrip = new THREE.Mesh(rearGripGeo, gripMat);
  rearGrip.position.set(0, -0.105, -0.02);
  rearGrip.rotation.x = -0.22;
  assaultMeshGroup.add(rearGrip);

  const magGeo = new THREE.BoxGeometry(0.068, 0.2, 0.092);
  const mag = new THREE.Mesh(magGeo, darkMetalMat);
  mag.position.set(0, -0.13, 0.14);
  mag.rotation.x = 0.2;
  addCrayonOutline(mag, 0.035);
  assaultMeshGroup.add(mag);

  const magBaseGeo = new THREE.BoxGeometry(0.076, 0.04, 0.1);
  const magBase = new THREE.Mesh(magBaseGeo, accentMat);
  magBase.position.set(0, -0.22, 0.16);
  magBase.rotation.x = 0.2;
  assaultMeshGroup.add(magBase);

  const foreGripGeo = new THREE.CylinderGeometry(0.034, 0.034, 0.13, 8);
  const foreGrip = new THREE.Mesh(foreGripGeo, gripMat);
  foreGrip.position.set(-0.02, -0.095, 0.31);
  assaultMeshGroup.add(foreGrip);

  const opticHousingGeo = new THREE.BoxGeometry(0.088, 0.072, 0.11);
  const opticHousing = new THREE.Mesh(opticHousingGeo, darkMetalMat);
  opticHousing.position.set(0, 0.122, 0.06);
  addCrayonOutline(opticHousing, 0.035);
  assaultMeshGroup.add(opticHousing);

  const opticLensGeo = new THREE.BoxGeometry(0.064, 0.048, 0.02);
  const opticLens = new THREE.Mesh(opticLensGeo, sightGlassMat);
  opticLens.position.set(0, 0.125, 0.11);
  assaultMeshGroup.add(opticLens);

  const shroudGeo = new THREE.BoxGeometry(0.098, 0.1, 0.26);
  const shroud = new THREE.Mesh(shroudGeo, darkMetalMat);
  shroud.position.set(0, 0.015, 0.36);
  addCrayonOutline(shroud, 0.035);
  assaultMeshGroup.add(shroud);

  const barrelGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.26, 10);
  barrelGeo.rotateX(Math.PI / 2);
  const barrel = new THREE.Mesh(barrelGeo, barrelSteelMat);
  barrel.position.set(0, 0.022, 0.55);
  assaultMeshGroup.add(barrel);

  const muzzleGeo = new THREE.CylinderGeometry(0.044, 0.038, 0.085, 10);
  muzzleGeo.rotateX(Math.PI / 2);
  const muzzle = new THREE.Mesh(muzzleGeo, gripMat);
  muzzle.position.set(0, 0.022, 0.68);
  assaultMeshGroup.add(muzzle);

  // --- 2. HEAVY TWIN-BARREL PUMP SHOTGUN ---
  const shotgunMeshGroup = new THREE.Group();
  shotgunMeshGroup.visible = false;
  gunGroup.add(shotgunMeshGroup);

  const sgStock = new THREE.Mesh(
    new THREE.BoxGeometry(0.095, 0.14, 0.28),
    woodStockMat
  );
  sgStock.position.set(0, -0.02, -0.18);
  addCrayonOutline(sgStock, 0.035);
  shotgunMeshGroup.add(sgStock);

  const sgReceiver = new THREE.Mesh(
    new THREE.BoxGeometry(0.135, 0.15, 0.34),
    darkMetalMat
  );
  sgReceiver.position.set(0, 0.02, 0.08);
  addCrayonOutline(sgReceiver, 0.038);
  shotgunMeshGroup.add(sgReceiver);

  const sgGoldStripe = new THREE.Mesh(
    new THREE.BoxGeometry(0.145, 0.05, 0.26),
    goldMat
  );
  sgGoldStripe.position.set(0, 0.03, 0.08);
  shotgunMeshGroup.add(sgGoldStripe);

  // Twin Heavy Buckshot Barrels
  [-0.036, 0.036].forEach((bx) => {
    const sgBarrelGeo = new THREE.CylinderGeometry(0.038, 0.038, 0.52, 10);
    sgBarrelGeo.rotateX(Math.PI / 2);
    const sgBarrel = new THREE.Mesh(sgBarrelGeo, barrelSteelMat);
    sgBarrel.position.set(bx, 0.045, 0.46);
    addCrayonOutline(sgBarrel, 0.03);
    shotgunMeshGroup.add(sgBarrel);
  });

  // Ribbed Wooden Pump Fore-end
  const sgPumpGeo = new THREE.CylinderGeometry(0.055, 0.055, 0.26, 10);
  sgPumpGeo.rotateX(Math.PI / 2);
  const sgPump = new THREE.Mesh(sgPumpGeo, woodStockMat);
  sgPump.position.set(0, -0.035, 0.38);
  addCrayonOutline(sgPump, 0.035);
  shotgunMeshGroup.add(sgPump);

  // --- 3. BLAZING FIRE BLASTER / FLAMETHROWER ---
  const fireMeshGroup = new THREE.Group();
  fireMeshGroup.visible = false;
  gunGroup.add(fireMeshGroup);

  const fbBody = new THREE.Mesh(
    new THREE.BoxGeometry(0.14, 0.16, 0.38),
    fireRedMat
  );
  fbBody.position.set(0, 0.02, 0.06);
  addCrayonOutline(fbBody, 0.038);
  fireMeshGroup.add(fbBody);

  // Under-slung Pressurized Napalm Fuel Cylinder
  const fuelTankGeo = new THREE.CylinderGeometry(0.075, 0.075, 0.34, 12);
  fuelTankGeo.rotateX(Math.PI / 2);
  const fuelTank = new THREE.Mesh(fuelTankGeo, fireOrangeMat);
  fuelTank.position.set(0, -0.11, 0.22);
  addCrayonOutline(fuelTank, 0.035);
  fireMeshGroup.add(fuelTank);

  const fuelBand = new THREE.Mesh(
    new THREE.BoxGeometry(0.16, 0.05, 0.12),
    goldMat
  );
  fuelBand.position.set(0, -0.11, 0.22);
  fireMeshGroup.add(fuelBand);

  // Wide Perforated Flame Nozzle Shroud
  const fbNozzleGeo = new THREE.CylinderGeometry(0.065, 0.05, 0.34, 12);
  fbNozzleGeo.rotateX(Math.PI / 2);
  const fbNozzle = new THREE.Mesh(fbNozzleGeo, darkMetalMat);
  fbNozzle.position.set(0, 0.035, 0.42);
  addCrayonOutline(fbNozzle, 0.035);
  fireMeshGroup.add(fbNozzle);

  const igniterTip = new THREE.Mesh(
    new THREE.SphereGeometry(0.055, 10, 8),
     new THREE.MeshBasicMaterial({ color: '#FEF08A' })
  );
  igniterTip.position.set(0, 0.035, 0.62);
  fireMeshGroup.add(igniterTip);

  // Shared Muzzle Flash Cone
  const flashGeo = new THREE.ConeGeometry(0.16, 0.38, 8);
  flashGeo.rotateX(Math.PI / 2);
  const flashMat = new THREE.MeshBasicMaterial({
    color: '#FEF08A',
    transparent: true,
    opacity: 0,
  });
  const muzzleFlashMesh = new THREE.Mesh(flashGeo, flashMat);
  muzzleFlashMesh.position.set(0, 0.025, 0.84);
  gunGroup.add(muzzleFlashMesh);

  return {
    gunGroup,
    assaultMeshGroup,
    shotgunMeshGroup,
    fireMeshGroup,
    muzzleFlashMesh,
  };
}

export const ObstacleRushCanvas: React.FC<ObstacleRushCanvasProps> = ({
  gameState,
  playerChar,
  playerDisplayName,
  customSlots,
  rushMap,
  difficulty,
  cameraPreset,
  gameSpeedMultiplier,
  cameraFov,
  enableVfx,
  enableScreenShake,
  matchDurationSec = 300,
  actionTriggerRef,
  onHudUpdate,
  onRaceFinished,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const gameStateRef = useRef<GameState>(gameState);
  gameStateRef.current = gameState;

  const cameraPresetRef = useRef<CameraPreset>(cameraPreset);
  cameraPresetRef.current = cameraPreset;

  const speedMultRef = useRef<number>(gameSpeedMultiplier);
  speedMultRef.current = gameSpeedMultiplier;

  const fovRef = useRef<number>(cameraFov);
  fovRef.current = cameraFov;

  const enableVfxRef = useRef<boolean>(enableVfx);
  enableVfxRef.current = enableVfx;

  const enableShakeRef = useRef<boolean>(enableScreenShake);
  enableShakeRef.current = enableScreenShake;

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    crayonAudio.resetGunMatchVoiceState();

    const isJungleMap = rushMap?.id === 'lava_foundry';
    const diffConfig =
      DIFFICULTY_LEVELS.find((d) => d.id === difficulty) || DIFFICULTY_LEVELS[1];

    // Strict Playable Court Bounds so NO character can EVER walk behind the North Castle or Side Forts!
    const ARENA_MIN_X = -22.2;
    const ARENA_MAX_X = 22.2;
    const ARENA_MIN_Z = -13.6;
    const ARENA_MAX_Z = 17.6;

    // 1. Scene & Crisp Sky Setup (Supports Both Coastal Grand Fort & Jungle Run Mayan Temple!)
    const scene = new THREE.Scene();
    const fogHex = isJungleMap ? '#6EE7B7' : '#7DD3FC';
    scene.background = new THREE.Color(fogHex);
    scene.fog = new THREE.FogExp2(fogHex, 0.0038);

    const camera = new THREE.PerspectiveCamera(
      fovRef.current,
      container.clientWidth / Math.max(1, container.clientHeight),
      0.6,
      260
    );
    camera.position.set(0, 10.8, 16.5);
    camera.lookAt(0, 1.3, 0);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2.5));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.94;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const postPipeline = createStylizedPostPipeline(
      renderer,
      scene,
      camera,
      container.clientWidth,
      container.clientHeight,
      {
        bloomStrength: 0.24,
        bloomRadius: 0.44,
        bloomThreshold: 0.86,
        vignetteIntensity: 0.24,
      }
    );

    const maxAnisotropy = Math.min(
      renderer.capabilities.getMaxAnisotropy() || 8,
      16
    );

    // 3D Stylized Painted Sky Dome with Sunbeams & Cirrus Clouds
    const skyDomeTex = createStylizedSkyDomeTexture(
      isJungleMap ? '#0284C7' : '#1D4ED8',
      isJungleMap ? '#A7F3D0' : '#93C5FD',
      '#FEF08A'
    );
    const skyDomeMesh = new THREE.Mesh(
      new THREE.SphereGeometry(230, 24, 16),
      new THREE.MeshBasicMaterial({
        map: skyDomeTex,
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
      })
    );
    skyDomeMesh.position.y = -8;
    scene.add(skyDomeMesh);

    // 2. Crisp Cool-Sky & High-Contrast Daylight Lighting Rig (Zero Glare on Whites!)
    const hemiLight = new THREE.HemisphereLight(
      isJungleMap ? 0xdcfce7 : 0xcbd5e1,
      isJungleMap ? 0x15803d : 0x64748b,
      0.86
    );
    hemiLight.position.set(0, 28, 0);
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xf8fafc, 1.26);
    dirLight.position.set(24, 48, 30);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1536;
    dirLight.shadow.mapSize.height = 1536;
    dirLight.shadow.camera.near = 2;
    dirLight.shadow.camera.far = 140;
    const shadowD = 36;
    dirLight.shadow.camera.left = -shadowD;
    dirLight.shadow.camera.right = shadowD;
    dirLight.shadow.camera.top = shadowD;
    dirLight.shadow.camera.bottom = -shadowD;
    // CRITICAL: normalBias + bias completely eliminates shadow acne glitter on flat floors!
    dirLight.shadow.bias = -0.0006;
    dirLight.shadow.normalBias = 0.045;
    scene.add(dirLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 0.48);
    rimLight.position.set(-28, 22, -24);
    scene.add(rimLight);

    // 3. Build the Zero-Glitter Volleyball-Style Pro Court & Tropical Cove Island World
    const worldGroup = new THREE.Group();
    scene.add(worldGroup);

    const solidColliders: SolidBoxCollider[] = [];
    const cylinderColliders: SolidCylinderCollider[] = [];
    const jumpPads: JumpPadZone[] = [];
    const animatedWaveRings: THREE.Mesh[] = [];

    // Clean, Non-Glitter Materials with High-Contrast Shaded Whites (#CBD5E1 instead of harsh #FFFFFF)
    const castleWallMat = new THREE.MeshToonMaterial({
      map: createCleanCastleStoneTexture(
        isJungleMap ? '#78716C' : '#94A3B8',
        isJungleMap ? '#44403C' : '#475569'
      ),
      gradientMap: getToonGradientMap(),
    });
    const darkStoneMat = new THREE.MeshToonMaterial({
      map: createCleanCastleStoneTexture(
        isJungleMap ? '#57534E' : '#64748B',
        isJungleMap ? '#292524' : '#334155'
      ),
      gradientMap: getToonGradientMap(),
    });
    const warmStoneMat = new THREE.MeshToonMaterial({
      map: createCleanCastleStoneTexture(
        isJungleMap ? '#A8A29E' : '#CBD5E1',
        isJungleMap ? '#57534E' : '#64748B'
      ),
      gradientMap: getToonGradientMap(),
    });

    const foliage1 = createCleanToonMaterial(isJungleMap ? '#16A34A' : '#22C55E');
    const foliage2 = createCleanToonMaterial(isJungleMap ? '#15803D' : '#16A34A');
    const woodMat = createCleanToonMaterial('#854D0E');
    // Cool Alpine Slate-Blue or Mossy Jungle Volcanic Rock for Mountains & Cliffs (NO Dark Yellow!)
    const alpineRockMat = createCleanToonMaterial(isJungleMap ? '#57534E' : '#475569');
    const lightGraniteMat = createCleanToonMaterial(isJungleMap ? '#78716C' : '#64748B');
    const islandGrassTex = createLushGrassTurfTexture(
      isJungleMap ? '#16A34A' : '#22C55E',
      maxAnisotropy,
      7
    );
    const islandGrassMat = new THREE.MeshToonMaterial({
      color: 0xffffff,
      map: islandGrassTex,
      gradientMap: getToonGradientMap(),
    });
    // Soft Shaded Slate-Cream White Material so White Elements Always Have Crisp Contrast & Line Art!
    const whiteMat = createCleanToonMaterial('#CBD5E1');
    const redMat = createCleanToonMaterial('#EF4444');
    const goldMat = createCleanToonMaterial('#FACC15');
    const slateIronMat = createCleanToonMaterial('#1E293B');

    const addSolidBox = (
      x: number,
      y: number,
      z: number,
      w: number,
      h: number,
      d: number,
      colorOrMat: string | THREE.Material,
      trimHex?: string,
      walkable = true,
      blocksSight = true
    ) => {
      const geo = new THREE.BoxGeometry(w, h, d);
      const mat =
        typeof colorOrMat === 'string'
          ? createCleanToonMaterial(colorOrMat)
          : colorOrMat;
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(x, y, z);
      mesh.receiveShadow = true;
      mesh.castShadow = true;
      addCrayonOutline(mesh, 0.032);
      worldGroup.add(mesh);

      if (trimHex) {
        const trimGeo = new THREE.BoxGeometry(w + 0.14, 0.22, d + 0.14);
        const trimMat = createCleanToonMaterial(trimHex);
        const trimMesh = new THREE.Mesh(trimGeo, trimMat);
        trimMesh.position.set(x, y + h * 0.5 - 0.08, z);
        trimMesh.receiveShadow = true;
        addCrayonOutline(trimMesh, 0.028);
        worldGroup.add(trimMesh);
      }

      solidColliders.push({ x, y, z, w, h, d, walkable, blocksSight });
      return mesh;
    };

    // --- A. TROPICAL PALM TREES & PUFFY CARTOON TREES ---
    const buildPalmTree = (
      x: number,
      y: number,
      z: number,
      scale: number = 1,
      leanDir: number = 1
    ) => {
      const palm = new THREE.Group();
      for (let s = 0; s < 5; s++) {
        const seg = new THREE.Mesh(
          new THREE.CylinderGeometry(
            0.2 - s * 0.022,
            0.26 - s * 0.022,
            0.62,
            12
          ),
          woodMat
        );
        seg.position.set(leanDir * (s * s * 0.036), 0.28 + s * 0.5, 0);
        seg.rotation.z = -leanDir * s * 0.065;
        seg.castShadow = true;
        addCrayonOutline(seg, 0.028);
        palm.add(seg);
      }

      const topX = leanDir * 0.58;
      const topY = 2.7;

      [-0.14, 0.14, 0].forEach((cx, ci) => {
        const coco = new THREE.Mesh(
          new THREE.SphereGeometry(0.14, 10, 8),
          woodMat
        );
        coco.position.set(topX + cx, topY - 0.1, ci === 2 ? 0.14 : -0.06);
        palm.add(coco);
      });

      for (let f = 0; f < 7; f++) {
        const angle = (f / 7) * Math.PI * 2;
        const frondPivot = new THREE.Group();
        frondPivot.position.set(topX, topY, 0);
        frondPivot.rotation.y = angle;

        const leaf = new THREE.Mesh(
          new THREE.SphereGeometry(0.68, 14, 10),
          f % 2 === 0 ? foliage1 : foliage2
        );
        leaf.scale.set(1.38, 0.22, 0.54);
        leaf.rotation.z = -0.36;
        leaf.position.set(0.72, -0.1, 0);
        leaf.castShadow = true;
        addCrayonOutline(leaf, 0.025);
        frondPivot.add(leaf);
        palm.add(frondPivot);
      }

      palm.position.set(x, y, z);
      palm.scale.setScalar(scale);
      worldGroup.add(palm);
    };

    const buildPuffyTree = (
      x: number,
      y: number,
      z: number,
      scale: number = 1,
      withCourtPlanter: boolean = false
    ) => {
      const g = new THREE.Group();
      g.position.set(x, y, z);

      if (withCourtPlanter) {
        const planterOuter = new THREE.Mesh(
          new THREE.CylinderGeometry(1.35, 1.48, 0.65, 18),
          warmStoneMat
        );
        planterOuter.position.y = 0.325;
        planterOuter.castShadow = true;
        planterOuter.receiveShadow = true;
        addCrayonOutline(planterOuter, 0.022);
        g.add(planterOuter);

        const planterRim = new THREE.Mesh(
          new THREE.TorusGeometry(1.38, 0.1, 10, 24),
          goldMat
        );
        planterRim.rotation.x = Math.PI / 2;
        planterRim.position.y = 0.65;
        g.add(planterRim);

        const turfSoil = new THREE.Mesh(
          new THREE.CylinderGeometry(1.22, 1.22, 0.68, 16),
          foliage2
        );
        turfSoil.position.y = 0.34;
        g.add(turfSoil);

        cylinderColliders.push({
          x,
          y,
          z,
          radius: 1.42,
          height: 3.4,
          blocksSight: true,
        });
      }

      const baseY = withCourtPlanter ? 0.55 : 0;
      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.22 * scale, 0.32 * scale, 2.1 * scale, 12),
        woodMat
      );
      trunk.position.y = baseY + 1.05 * scale;
      trunk.castShadow = true;
      addCrayonOutline(trunk, 0.03);
      g.add(trunk);

      const puffs = [
        { ox: 0, oy: 2.55, oz: 0, r: 1.15, mat: foliage1 },
        { ox: -0.62, oy: 2.12, oz: 0.25, r: 0.86, mat: foliage2 },
        { ox: 0.64, oy: 2.15, oz: -0.2, r: 0.88, mat: foliage2 },
        { ox: 0.1, oy: 2.08, oz: 0.62, r: 0.82, mat: foliage1 },
        { ox: -0.15, oy: 2.12, oz: -0.6, r: 0.84, mat: foliage1 },
      ];
      puffs.forEach((pf) => {
        const m = new THREE.Mesh(
          new THREE.SphereGeometry(pf.r * scale, 18, 14),
          pf.mat
        );
        m.position.set(pf.ox * scale, baseY + pf.oy * scale, pf.oz * scale);
        m.scale.set(1.08, 0.92, 1.05);
        m.castShadow = true;
        addCrayonOutline(m, 0.026);
        g.add(m);
      });

      worldGroup.add(g);
    };

    // --- B. MULTI-LAYERED TROPICAL LAGOON WATER, COOL ALPINE MOUNTAINS ("PAHAD") & LIGHTHOUSE COVE ---
    // 1. Deep Sapphire Ocean Bed with Stylized Caustic Wave Texture & 3D Wave Motion
    const deepOceanGeo = new THREE.PlaneGeometry(480, 480, 1, 1);
    deepOceanGeo.rotateX(-Math.PI / 2);
    const deepOceanTex = createStylizedWaterTexture(
      isJungleMap ? '#0D9488' : '#0284C7',
      maxAnisotropy,
      16
    );
    const deepOceanMat = new THREE.MeshToonMaterial({
      color: 0xffffff,
      map: deepOceanTex,
      gradientMap: getToonGradientMap(),
    });
    const deepOcean = new THREE.Mesh(deepOceanGeo, deepOceanMat);
    deepOcean.position.y = -4.2;
    deepOcean.matrixAutoUpdate = false;
    deepOcean.updateMatrix();
    worldGroup.add(deepOcean);

    // 2. Shallow Glowing Turquoise Lagoon Shelf around the Island with Stylized Caustics
    const lagoonShape = createRoundedRectShape(98, 82, 22);
    const lagoonGeo = new THREE.ShapeGeometry(lagoonShape, 32);
    lagoonGeo.rotateX(-Math.PI / 2);
    const lagoonTex = createStylizedWaterTexture(
      isJungleMap ? '#2DD4BF' : '#38BDF8',
      maxAnisotropy,
      5
    );
    const lagoonMat = new THREE.MeshBasicMaterial({
      map: lagoonTex,
      transparent: true,
      opacity: 0.74,
    });
    const lagoonMesh = new THREE.Mesh(lagoonGeo, lagoonMat);
    lagoonMesh.position.y = -3.92;
    worldGroup.add(lagoonMesh);

    // 3. Animated Shoreline Surf Foam Rings (Gently bob, ripple and breathe in the animate loop!)
    [0, 1, 2].forEach((idx) => {
      const surfShape = createRoundedRectShape(
        75.5 + idx * 4.2,
        59.5 + idx * 4.2,
        14 + idx * 1.2
      );
      const surfGeo = new THREE.ShapeGeometry(surfShape, 28);
      surfGeo.rotateX(-Math.PI / 2);
      const surfMat = new THREE.MeshBasicMaterial({
        color: idx === 0 ? 0xe0f2fe : idx === 1 ? 0xbae6fd : 0x7dd3fc,
        transparent: true,
        opacity: idx === 0 ? 0.68 : idx === 1 ? 0.42 : 0.24,
      });
      const surfMesh = new THREE.Mesh(surfGeo, surfMat);
      surfMesh.position.y = -3.82 + idx * 0.03;
      worldGroup.add(surfMesh);
      animatedWaveRings.push(surfMesh);
    });

    // 4. Cool Slate-Granite Island Cliff Base & Lush Emerald Turf Plateau
    // CRITICAL: Positioned well below y = 0.0 (top at y = -0.55) so it NEVER Z-fights with the Court Floor!
    const cliffShape = createRoundedRectShape(72, 56, 11);
    const cliffGeo = new THREE.ExtrudeGeometry(cliffShape, {
      depth: 3.0,
      bevelEnabled: true,
      bevelThickness: 0.4,
      bevelSize: 1.0,
      bevelSegments: 3,
      curveSegments: 24,
    });
    cliffGeo.rotateX(Math.PI / 2);
    const cliffMesh = new THREE.Mesh(cliffGeo, lightGraniteMat);
    cliffMesh.position.y = -1.2;
    cliffMesh.receiveShadow = true;
    worldGroup.add(cliffMesh);

    const turfShape = createRoundedRectShape(66, 50, 9);
    const turfGeo = new THREE.ExtrudeGeometry(turfShape, {
      depth: 1.2,
      bevelEnabled: false,
      curveSegments: 24,
    });
    turfGeo.rotateX(Math.PI / 2);
    const turfMesh = new THREE.Mesh(turfGeo, islandGrassMat);
    // Top of turfMesh is at y = -0.35 (0.35m below courtFloor top at y = 0.0 -> 100% ZERO Z-FIGHTING!)
    turfMesh.position.y = -0.35;
    turfMesh.receiveShadow = true;
    worldGroup.add(turfMesh);

    // 5. Cascading Crystal Waterfalls pouring into the Turquoise Lagoon with Animated Stream Texture
    const waterfallTextures: THREE.Texture[] = [];
    const waterfallFoamPuffs: THREE.Mesh[] = [];
    const buildWaterfall = (x: number, z: number, width: number, rotY: number) => {
      const wf = new THREE.Group();
      const wfTex = createWaterfallStreamTexture('#7DD3FC', maxAnisotropy);
      waterfallTextures.push(wfTex);
      const wfMat = new THREE.MeshBasicMaterial({
        map: wfTex,
        transparent: true,
        opacity: 0.92,
      });
      const stream = new THREE.Mesh(
        new THREE.BoxGeometry(width, 3.8, 0.35),
        wfMat
      );
      stream.position.y = -2.1;
      wf.add(stream);

      [-width * 0.32, 0, width * 0.32].forEach((fx, i) => {
        const topFoam = new THREE.Mesh(
          new THREE.SphereGeometry(0.42 + (i % 2) * 0.12, 12, 10),
          whiteMat
        );
        topFoam.position.set(fx, -0.22, 0.2);
        addCrayonOutline(topFoam, 0.026);
        wf.add(topFoam);
        waterfallFoamPuffs.push(topFoam);

        const botFoam = new THREE.Mesh(
          new THREE.SphereGeometry(0.62 + (i % 2) * 0.18, 12, 10),
          whiteMat
        );
        botFoam.position.set(fx, -3.75, 0.28);
        addCrayonOutline(botFoam, 0.028);
        wf.add(botFoam);
        waterfallFoamPuffs.push(botFoam);
      });
      wf.position.set(x, -0.2, z);
      wf.rotation.y = rotY;
      worldGroup.add(wf);
    };
    buildWaterfall(-33.2, 4.0, 3.4, -Math.PI / 2);
    buildWaterfall(33.2, 4.0, 3.4, Math.PI / 2);
    buildWaterfall(-14.0, 25.2, 3.2, 0);
    buildWaterfall(14.0, 25.2, 3.2, 0);

    // 6. Iconic Red-and-White Striped Coastal Lighthouse on the East Cove (Matches Volleyball Cove!)
    const lighthouse = new THREE.Group();
    const lhBase = new THREE.Mesh(
      new THREE.CylinderGeometry(2.2, 2.6, 1.2, 18),
      alpineRockMat
    );
    lhBase.position.y = 0.6;
    addCrayonOutline(lhBase, 0.025);
    lighthouse.add(lhBase);
    for (let i = 0; i < 4; i++) {
      const seg = new THREE.Mesh(
        new THREE.CylinderGeometry(1.5 - i * 0.16, 1.66 - i * 0.16, 2.2, 18),
        i % 2 === 0 ? redMat : whiteMat
      );
      seg.position.y = 2.1 + i * 2.2;
      seg.castShadow = true;
      addCrayonOutline(seg, 0.025);
      lighthouse.add(seg);
    }
    const lhRoof = new THREE.Mesh(
      new THREE.ConeGeometry(1.35, 1.8, 18),
      redMat
    );
    lhRoof.position.y = 10.6;
    addCrayonOutline(lhRoof, 0.025);
    lighthouse.add(lhRoof);
    lighthouse.position.set(30.5, -0.35, -14.0);
    worldGroup.add(lighthouse);

    // 7. Sculpted Multi-Ridge Craggy Alpine Mountains ("Pahad") with Glacier Snow Caps & Foothill Pines
    const mountainRanges = [
      { x: -58, z: -42, r: 19, h: 29, seed: 1 },
      { x: 58, z: -44, r: 21, h: 33, seed: 2 },
      { x: 0, z: -58, r: 28, h: 38, seed: 3 },
      { x: -66, z: 16, r: 17, h: 25, seed: 4 },
      { x: 66, z: 18, r: 18, h: 27, seed: 5 },
      { x: -34, z: -50, r: 16, h: 25, seed: 6 },
      { x: 34, z: -50, r: 16, h: 25, seed: 7 },
    ];
    mountainRanges.forEach((m) => {
      const mGrp = createSculptedAlpineMountainPeak(
        m.r,
        m.h,
        m.seed,
        isJungleMap
      );
      mGrp.position.set(m.x, -4.2, m.z);
      worldGroup.add(mGrp);
    });

    // 3D Sculpted Grass Blade Tufts & Wildflowers around the Outer Lawn Perimeter
    [
      [-28.2, -11.0],
      [28.2, -11.0],
      [-28.8, 3.0],
      [28.8, 3.0],
      [-27.8, 13.0],
      [27.8, 13.0],
      [-22.0, 20.8],
      [22.0, 20.8],
      [-8.5, 21.4],
      [8.5, 21.4],
      [0.0, 21.6],
    ].forEach(([gx, gz], gIdx) => {
      const grassCluster = createLushGrassBorderCluster(
        isJungleMap,
        gIdx % 2 === 0
      );
      grassCluster.position.set(gx, -0.32, gz);
      grassCluster.scale.setScalar(1.38 + (gIdx % 3) * 0.18);
      grassCluster.rotation.y = gIdx * 1.15;
      worldGroup.add(grassCluster);
    });

    // Fluffy 3D Cumulus Clouds in the Sky (With Bold Ink Outlines so White Has Contrast!)
    const cloudSpots = [
      [-42, 28, -55, 2.6],
      [0, 32, -62, 3.0],
      [44, 27, -52, 2.5],
      [-54, 24, -18, 2.2],
      [54, 25, -16, 2.2],
    ];
    cloudSpots.forEach(([cx, cy, cz, sc]) => {
      const cg = new THREE.Group();
      const p1 = new THREE.Mesh(new THREE.SphereGeometry(0.95, 14, 12), whiteMat);
      addCrayonOutline(p1, 0.032);
      const p2 = new THREE.Mesh(new THREE.SphereGeometry(0.74, 12, 10), whiteMat);
      p2.position.set(0.78, -0.1, 0.1);
      addCrayonOutline(p2, 0.032);
      const p3 = new THREE.Mesh(new THREE.SphereGeometry(0.68, 12, 10), whiteMat);
      p3.position.set(-0.74, -0.12, -0.1);
      addCrayonOutline(p3, 0.032);
      cg.add(p1, p2, p3);
      cg.position.set(cx, cy, cz);
      cg.scale.setScalar(sc);
      worldGroup.add(cg);
    });

    // Stylized Textured Sky Biplane & Dirigible Airship soaring across the Arena Sky!
    const skyVehicles: Array<{
      group: THREE.Group;
      baseX: number;
      baseY: number;
      baseZ: number;
      orbitR: number;
      speed: number;
      phase: number;
    }> = [];
    const skyVehiclePropellers: THREE.Object3D[] = [];
    [
      {
        variant: 'biplane' as const,
        x: -18,
        y: 21.5,
        z: -34,
        scale: 2.35,
        base: '#2563EB',
        stripe: '#FACC15',
        accent: '#EF4444',
        orbitR: 11.5,
        speed: 0.38,
        phase: 0,
      },
      {
        variant: 'airship' as const,
        x: 22,
        y: 25.0,
        z: -40,
        scale: 2.2,
        base: isJungleMap ? '#10B981' : '#0284C7',
        stripe: '#FDE047',
        accent: '#F43F5E',
        orbitR: 8.5,
        speed: 0.24,
        phase: 2.1,
      },
    ].forEach((sv) => {
      const { group, propellers } = createStylizedSkyVehicle(
        sv.variant,
        sv.base,
        sv.stripe,
        sv.accent,
        maxAnisotropy
      );
      group.position.set(sv.x, sv.y, sv.z);
      group.scale.setScalar(sv.scale);
      worldGroup.add(group);
      skyVehicles.push({
        group,
        baseX: sv.x,
        baseY: sv.y,
        baseZ: sv.z,
        orbitR: sv.orbitR,
        speed: sv.speed,
        phase: sv.phase,
      });
      propellers.forEach((p) => skyVehiclePropellers.push(p));
    });

    // Outer Island Palm Trees & Puffy Trees around the Court Perimeter
    buildPalmTree(-29.5, -0.35, -16.5, 1.35, -1);
    buildPalmTree(29.5, -0.35, -16.5, 1.35, 1);
    buildPalmTree(-30.0, -0.35, 14.5, 1.3, -1);
    buildPalmTree(30.0, -0.35, 14.5, 1.3, 1);
    buildPuffyTree(-29.5, -0.35, -2.0, 1.35, false);
    buildPuffyTree(29.5, -0.35, -2.0, 1.35, false);
    buildPuffyTree(-28.5, -0.35, 7.5, 1.25, false);
    buildPuffyTree(28.5, -0.35, 7.5, 1.25, false);
    buildPuffyTree(-18.0, -0.35, 21.5, 1.2, false);
    buildPuffyTree(18.0, -0.35, 21.5, 1.2, false);

    // --- C. VOLLEYBALL-STYLE PRO COURT FLOOR (AZURE/EMERALD OR JUNGLE RUN EMERALD/JADE!) ---
    // 1. Solid Foundation Slab (y = -0.45 to y = -0.06, well below courtPlane at y = 0.015 for zero mobile Z-fighting!)
    const courtBaseSlab = new THREE.Mesh(
      new THREE.BoxGeometry(53.6, 0.38, 37.6),
      createCleanToonMaterial(isJungleMap ? '#15803D' : '#10B981')
    );
    courtBaseSlab.position.set(0, -0.25, 2.0);
    courtBaseSlab.receiveShadow = true;
    worldGroup.add(courtBaseSlab);

    // 2. Pro Court Floor Plane using `createCourtFloorTexture` with Smooth Zero-Jitter Surface & Outer Line-Art!
    const courtPlaneGeo = new THREE.PlaneGeometry(51.6, 35.6);
    courtPlaneGeo.rotateX(-Math.PI / 2);
    const courtPlaneMat = new THREE.MeshToonMaterial({
      color: 0xffffff,
      map: createCourtFloorTexture(
        isJungleMap ? '#22C55E' : '#38BDF8',
        isJungleMap ? '#15803D' : '#10B981',
        isJungleMap ? '#ECFDF5' : '#E2E8F0',
        maxAnisotropy
      ),
      gradientMap: getToonGradientMap(),
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });
    const courtPlane = new THREE.Mesh(courtPlaneGeo, courtPlaneMat);
    courtPlane.position.set(0, 0.018, 2.0);
    courtPlane.receiveShadow = true;
    worldGroup.add(courtPlane);

    // 4 Courtyard Trees in Stone Planters at Tactical Court Corners (Palm + Canopy Trees in Jungle Run!)
    const courtyardTreeSpots = [
      [-14.2, -5.8],
      [14.2, -5.8],
      [-14.2, 8.6],
      [14.2, 8.6],
    ];
    courtyardTreeSpots.forEach(([tx, tz], idx) => {
      buildPuffyTree(tx, 0, tz, 0.92, true);
      if (isJungleMap) {
        buildPalmTree(
          tx + (idx % 2 === 0 ? -0.35 : 0.35),
          0.55,
          tz,
          0.88,
          idx % 2 === 0 ? -1 : 1
        );
      }
    });

    if (isJungleMap) {
      // Extra Lush Coconut Palms around the Jungle Run Island Perimeter
      buildPalmTree(-24.5, -0.35, -18.5, 1.45, -1);
      buildPalmTree(24.5, -0.35, -18.5, 1.45, 1);
      buildPalmTree(-28.5, -0.35, 3.0, 1.38, -1);
      buildPalmTree(28.5, -0.35, 3.0, 1.38, 1);
    }

    // --- D. CLEAN ARCHITECTURAL STADIUM FENCING AROUND THE PERIMETER ---
    const buildStadiumFence = (
      x1: number,
      z1: number,
      x2: number,
      z2: number,
      baysCount: number,
      blocksSight = false
    ) => {
      const dx = x2 - x1;
      const dz = z2 - z1;
      const totalLen = Math.hypot(dx, dz);
      const angle = Math.atan2(dx, dz);
      const midX = (x1 + x2) * 0.5;
      const midZ = (z1 + z2) * 0.5;

      const curbGeo = new THREE.BoxGeometry(0.65, 0.5, totalLen);
      const curb = new THREE.Mesh(curbGeo, warmStoneMat);
      curb.position.set(midX, 0.25, midZ);
      curb.rotation.y = angle;
      curb.receiveShadow = true;
      curb.castShadow = true;
      worldGroup.add(curb);

      [0.9, 1.5, 2.05].forEach((rh, idx) => {
        const railGeo = new THREE.BoxGeometry(0.18, 0.16, totalLen);
        const rail = new THREE.Mesh(
          railGeo,
          idx === 2 ? goldMat : slateIronMat
        );
        rail.position.set(midX, rh, midZ);
        rail.rotation.y = angle;
        rail.castShadow = true;
        worldGroup.add(rail);
      });

      for (let i = 0; i <= baysCount; i++) {
        const t = i / baysCount;
        const px = x1 + dx * t;
        const pz = z1 + dz * t;

        const pillar = new THREE.Mesh(
          new THREE.CylinderGeometry(0.28, 0.32, 2.25, 14),
          darkStoneMat
        );
        pillar.position.set(px, 1.125, pz);
        pillar.castShadow = true;
        pillar.receiveShadow = true;
        worldGroup.add(pillar);

        const cap = new THREE.Mesh(
          new THREE.SphereGeometry(0.32, 14, 12),
          goldMat
        );
        cap.position.set(px, 2.32, pz);
        worldGroup.add(cap);
      }

      const isHorizontal = Math.abs(dx) >= Math.abs(dz);
      solidColliders.push({
        x: midX,
        y: 1.2,
        z: midZ,
        w: isHorizontal ? totalLen + 0.6 : 0.85,
        h: 2.4,
        d: isHorizontal ? 0.85 : totalLen + 0.6,
        walkable: false,
        blocksSight,
      });
    };

    buildStadiumFence(-25.8, 18.8, 25.8, 18.8, 10, false); // South Fence
    buildStadiumFence(-25.8, -14.8, -25.8, 18.8, 8, false); // West Fence
    buildStadiumFence(25.8, -14.8, 25.8, 18.8, 8, false); // East Fence

    // --- E. HIGH-DETAIL SCULPTED NORTH CITADEL (ROYAL MEDIEVAL CASTLE OR STEPPED MAYAN JUNGLE TEMPLE!) ---
    const roofBlueMat = new THREE.MeshToonMaterial({
      color: 0xffffff,
      map: createStylizedRoofTileTexture('#2563EB', '#FACC15'),
      gradientMap: getToonGradientMap(),
    });
    const roofRedMat = new THREE.MeshToonMaterial({
      color: 0xffffff,
      map: createStylizedRoofTileTexture('#DC2626', '#FACC15'),
      gradientMap: getToonGradientMap(),
    });
    const timberMat = createCleanToonMaterial('#78350F');
    const windowGlowMat = new THREE.MeshBasicMaterial({ color: '#FEF08A' });

    // 1. Main Fortified Curtain Wall with Sculpted Base Plinth & Crenellated Battlement Merlons
    addSolidBox(
      0,
      2.2,
      -17.2,
      52.0,
      4.4,
      4.8,
      castleWallMat,
      isJungleMap ? '#FACC15' : '#CBD5E1',
      false,
      true
    );

    const northPlinth = new THREE.Mesh(
      new THREE.BoxGeometry(53.2, 0.9, 5.4),
      darkStoneMat
    );
    northPlinth.position.set(0, 0.45, -17.2);
    addCrayonOutline(northPlinth, 0.02);
    worldGroup.add(northPlinth);

    for (let mx = -23.0; mx <= 23.0; mx += 2.3) {
      if (Math.abs(mx) < 4.5) continue;
      const merlon = new THREE.Mesh(
        new THREE.BoxGeometry(1.25, 0.85, 0.95),
        warmStoneMat
      );
      merlon.position.set(mx, 4.75, -15.1);
      merlon.castShadow = true;
      addCrayonOutline(merlon, 0.02);
      worldGroup.add(merlon);
    }

    // North Walkable Forecourt Balcony Deck in front of the North Citadel (z = -13.2, y = 1.44m)
    addSolidBox(
      0,
      0.72,
      -13.2,
      15.6,
      1.44,
      3.6,
      warmStoneMat,
      '#FACC15',
      true,
      true
    );
    [-9.2, 9.2].forEach((sx) => {
      const dirS = Math.sign(sx);
      for (let s = 1; s <= 3; s++) {
        const sh = s * 0.48;
        addSolidBox(
          sx - dirS * (s - 2) * 0.8,
          sh * 0.5,
          -13.2,
          0.9,
          sh,
          3.2,
          warmStoneMat,
          isJungleMap ? '#FACC15' : '#CBD5E1',
          true,
          false
        );
      }
    });

    if (isJungleMap) {
      // GRAND 4-TIER STEPPED ANCIENT MAYAN TEMPLE PYRAMID + GOLDEN SUN SHRINE & FLAMING BRAZIERS!
      for (let step = 0; step < 4; step++) {
        const tierW = 20.5 - step * 3.8;
        const tierD = 6.6 - step * 0.85;
        const tierMesh = new THREE.Mesh(
          new THREE.BoxGeometry(tierW, 1.65, tierD),
          step % 2 === 0 ? castleWallMat : warmStoneMat
        );
        tierMesh.position.set(0, 5.2 + step * 1.65, -17.4);
        tierMesh.castShadow = true;
        addCrayonOutline(tierMesh, 0.024);
        worldGroup.add(tierMesh);

        const tierCornice = new THREE.Mesh(
          new THREE.BoxGeometry(tierW + 0.45, 0.28, tierD + 0.45),
          goldMat
        );
        tierCornice.position.set(0, 5.95 + step * 1.65, -17.4);
        addCrayonOutline(tierCornice, 0.018);
        worldGroup.add(tierCornice);
      }

      // Top Mayan Sanctuary Shrine + Golden Cornice + Dark Doorway
      const shrineTop = new THREE.Mesh(
        new THREE.BoxGeometry(6.2, 2.8, 3.6),
        darkStoneMat
      );
      shrineTop.position.set(0, 12.2, -17.4);
      shrineTop.castShadow = true;
      addCrayonOutline(shrineTop, 0.025);
      worldGroup.add(shrineTop);

      const shrineGoldRoof = new THREE.Mesh(
        new THREE.BoxGeometry(6.8, 0.65, 4.1),
        goldMat
      );
      shrineGoldRoof.position.set(0, 13.85, -17.4);
      addCrayonOutline(shrineGoldRoof, 0.025);
      worldGroup.add(shrineGoldRoof);

      const sunCrest = new THREE.Mesh(
        new THREE.CylinderGeometry(1.15, 1.15, 0.32, 16),
        goldMat
      );
      sunCrest.rotation.x = Math.PI / 2;
      sunCrest.position.set(0, 14.5, -15.6);
      addCrayonOutline(sunCrest, 0.022);
      worldGroup.add(sunCrest);

      const shrineDoor = new THREE.Mesh(
        new THREE.PlaneGeometry(2.2, 2.1),
        slateIronMat
      );
      shrineDoor.position.set(0, 11.8, -15.55);
      worldGroup.add(shrineDoor);

      // Stepped Temple Staircase + Flanking Stone Balustrades & Flaming Golden Braziers
      const pyramidStairs = new THREE.Mesh(
        new THREE.BoxGeometry(4.2, 7.6, 2.4),
        warmStoneMat
      );
      pyramidStairs.position.set(0, 7.8, -15.0);
      pyramidStairs.rotation.x = -0.34;
      addCrayonOutline(pyramidStairs, 0.024);
      worldGroup.add(pyramidStairs);

      [-2.35, 2.35].forEach((bx) => {
        const balustrade = new THREE.Mesh(
          new THREE.BoxGeometry(0.55, 7.9, 2.6),
          goldMat
        );
        balustrade.position.set(bx, 7.95, -14.95);
        balustrade.rotation.x = -0.34;
        addCrayonOutline(balustrade, 0.02);
        worldGroup.add(balustrade);
      });

      [-16.2, -9.5, 9.5, 16.2].forEach((bx, idx) => {
        const isOuter = idx === 0 || idx === 3;
        const tH = isOuter ? 6.6 : 5.4;
        const brazierTower = new THREE.Mesh(
          new THREE.CylinderGeometry(isOuter ? 1.8 : 1.45, isOuter ? 2.2 : 1.75, tH, 14),
          darkStoneMat
        );
        brazierTower.position.set(bx, 2.4 + tH * 0.5, -17.2);
        addCrayonOutline(brazierTower, 0.022);
        worldGroup.add(brazierTower);

        const goldBowl = new THREE.Mesh(
          new THREE.CylinderGeometry(isOuter ? 2.1 : 1.65, isOuter ? 1.4 : 1.15, 0.95, 14),
          goldMat
        );
        goldBowl.position.set(bx, 2.4 + tH + 0.45, -17.2);
        addCrayonOutline(goldBowl, 0.022);
        worldGroup.add(goldBowl);

        const flameCone = new THREE.Mesh(
          new THREE.ConeGeometry(isOuter ? 1.35 : 1.05, isOuter ? 2.8 : 2.2, 12),
          createCleanToonMaterial('#F97316')
        );
        flameCone.position.set(bx, 2.4 + tH + 1.8, -17.2);
        addCrayonOutline(flameCone, 0.02);
        worldGroup.add(flameCone);
      });
    } else {
      // SCULPTED ROYAL MEDIEVAL CASTLE CITADEL (Keep + Arched Gatehouse + 4 Watchtowers + Heraldry)
      const keepMesh = new THREE.Mesh(
        new THREE.BoxGeometry(9.6, 6.4, 5.2),
        castleWallMat
      );
      keepMesh.position.set(0, 6.8, -17.4);
      keepMesh.castShadow = true;
      addCrayonOutline(keepMesh, 0.024);
      worldGroup.add(keepMesh);

      const keepUpper = new THREE.Mesh(
        new THREE.BoxGeometry(7.2, 3.2, 4.2),
        darkStoneMat
      );
      keepUpper.position.set(0, 11.2, -17.4);
      keepUpper.castShadow = true;
      addCrayonOutline(keepUpper, 0.022);
      worldGroup.add(keepUpper);

      const keepRoof = new THREE.Mesh(
        new THREE.ConeGeometry(5.2, 3.6, 4),
        roofBlueMat
      );
      keepRoof.rotation.y = Math.PI / 4;
      keepRoof.position.set(0, 14.5, -17.4);
      addCrayonOutline(keepRoof, 0.024);
      worldGroup.add(keepRoof);

      // Arched Medieval Gatehouse & Iron Portcullis Grille
      const gateArchFrame = new THREE.Mesh(
        new THREE.BoxGeometry(4.6, 3.9, 1.3),
        darkStoneMat
      );
      gateArchFrame.position.set(0, 3.4, -14.8);
      addCrayonOutline(gateArchFrame, 0.022);
      worldGroup.add(gateArchFrame);

      const portcullisRecess = new THREE.Mesh(
        new THREE.BoxGeometry(3.3, 3.1, 0.45),
        slateIronMat
      );
      portcullisRecess.position.set(0, 3.0, -14.3);
      worldGroup.add(portcullisRecess);

      [-1.1, -0.55, 0, 0.55, 1.1].forEach((gx) => {
        const bar = new THREE.Mesh(
          new THREE.CylinderGeometry(0.06, 0.06, 3.0, 6),
          goldMat
        );
        bar.position.set(gx, 3.0, -14.08);
        worldGroup.add(bar);
      });

      // Glowing Stained-Glass Lancet Windows & Royal Banners on Keep
      [-2.6, 0, 2.6].forEach((wx, wIdx) => {
        const winFrame = new THREE.Mesh(
          new THREE.BoxGeometry(0.95, 1.75, 0.3),
          darkStoneMat
        );
        winFrame.position.set(wx, 7.6, -14.78);
        addCrayonOutline(winFrame, 0.018);
        worldGroup.add(winFrame);

        const winPane = new THREE.Mesh(
          new THREE.BoxGeometry(0.62, 1.38, 0.34),
          windowGlowMat
        );
        winPane.position.set(wx, 7.6, -14.76);
        worldGroup.add(winPane);

        if (wIdx !== 1) {
          const banner = new THREE.Mesh(
            new THREE.BoxGeometry(1.1, 2.8, 0.16),
            createCleanToonMaterial(wIdx === 0 ? '#2563EB' : '#DC2626')
          );
          banner.position.set(wx * 1.35, 6.2, -14.72);
          addCrayonOutline(banner, 0.018);
          worldGroup.add(banner);
        }
      });

      // 4 Sculpted Cylindrical Watchtowers with Corbel Rings & Conical Tiled Roofs
      const towerConfigs = [
        { tx: -18.5, tz: -16.8, rTop: 2.5, rBot: 2.85, h: 8.6, roofH: 3.8, mat: roofBlueMat, flagCol: '#2563EB' },
        { tx: -7.4, tz: -16.4, rTop: 1.95, rBot: 2.2, h: 7.4, roofH: 3.2, mat: roofRedMat, flagCol: '#EF4444' },
        { tx: 7.4, tz: -16.4, rTop: 1.95, rBot: 2.2, h: 7.4, roofH: 3.2, mat: roofBlueMat, flagCol: '#2563EB' },
        { tx: 18.5, tz: -16.8, rTop: 2.5, rBot: 2.85, h: 8.6, roofH: 3.8, mat: roofRedMat, flagCol: '#EF4444' },
      ];
      towerConfigs.forEach((tc) => {
        const towerPlinth = new THREE.Mesh(
          new THREE.CylinderGeometry(tc.rBot * 1.06, tc.rBot * 1.14, 1.5, 18),
          darkStoneMat
        );
        towerPlinth.position.set(tc.tx, 0.75, tc.tz);
        addCrayonOutline(towerPlinth, 0.022);
        worldGroup.add(towerPlinth);

        const towerShaft = new THREE.Mesh(
          new THREE.CylinderGeometry(tc.rTop, tc.rBot, tc.h, 18),
          castleWallMat
        );
        towerShaft.position.set(tc.tx, 1.2 + tc.h * 0.5, tc.tz);
        towerShaft.castShadow = true;
        addCrayonOutline(towerShaft, 0.022);
        worldGroup.add(towerShaft);

        const corbelRing = new THREE.Mesh(
          new THREE.CylinderGeometry(tc.rTop * 1.16, tc.rTop * 1.04, 0.85, 18),
          warmStoneMat
        );
        corbelRing.position.set(tc.tx, 1.2 + tc.h + 0.35, tc.tz);
        addCrayonOutline(corbelRing, 0.022);
        worldGroup.add(corbelRing);

        const timberBand = new THREE.Mesh(
          new THREE.CylinderGeometry(tc.rTop * 1.18, tc.rTop * 1.18, 0.32, 18),
          timberMat
        );
        timberBand.position.set(tc.tx, 1.2 + tc.h + 0.82, tc.tz);
        worldGroup.add(timberBand);

        const roof = new THREE.Mesh(
          new THREE.ConeGeometry(tc.rTop * 1.32, tc.roofH, 18),
          tc.mat
        );
        roof.position.set(tc.tx, 1.2 + tc.h + 0.9 + tc.roofH * 0.5, tc.tz);
        roof.castShadow = true;
        addCrayonOutline(roof, 0.022);
        worldGroup.add(roof);

        const finial = new THREE.Mesh(
          new THREE.CylinderGeometry(0.08, 0.1, 1.7, 8),
          goldMat
        );
        finial.position.set(tc.tx, 1.2 + tc.h + 0.9 + tc.roofH + 0.75, tc.tz);
        worldGroup.add(finial);

        const pennant = new THREE.Mesh(
          new THREE.ConeGeometry(0.45, 1.35, 4),
          createCleanToonMaterial(tc.flagCol)
        );
        pennant.rotation.z = -Math.PI / 2;
        pennant.position.set(tc.tx + 0.65, 1.2 + tc.h + 0.9 + tc.roofH + 1.2, tc.tz);
        addCrayonOutline(pennant, 0.016);
        worldGroup.add(pennant);
      });
    }

    // West & East Side Fort Bastions with Walkable 4-Step Stone Staircases & Corner Turrets
    const buildSideFort = (side: 'west' | 'east') => {
      const dir = side === 'west' ? -1 : 1;
      const fortX = dir * 22.8;
      const fortZ = 1.2;
      const bannerHex = isJungleMap
        ? side === 'west'
          ? '#10B981'
          : '#FACC15'
        : side === 'west'
          ? '#2563EB'
          : '#DC2626';

      addSolidBox(
        fortX,
        0.96,
        fortZ,
        6.0,
        1.92,
        11.2,
        castleWallMat,
        isJungleMap ? '#FACC15' : '#CBD5E1',
        true,
        true
      );

      addSolidBox(
        fortX + dir * 2.6,
        2.8,
        fortZ,
        0.9,
        1.8,
        11.2,
        darkStoneMat,
        bannerHex,
        false,
        true
      );

      // Sculpted Battlement Merlons + Corner Watch Turrets on Side Forts
      [-4.2, -1.4, 1.4, 4.2].forEach((mz) => {
        const merlon = new THREE.Mesh(
          new THREE.BoxGeometry(1.05, 0.65, 1.2),
          warmStoneMat
        );
        merlon.position.set(fortX + dir * 2.6, 3.95, fortZ + mz);
        addCrayonOutline(merlon, 0.018);
        worldGroup.add(merlon);
      });

      [-5.6, 5.6].forEach((tz) => {
        const turret = new THREE.Mesh(
          new THREE.CylinderGeometry(1.15, 1.3, 4.4, 14),
          castleWallMat
        );
        turret.position.set(fortX + dir * 2.4, 2.2, fortZ + tz);
        turret.castShadow = true;
        addCrayonOutline(turret, 0.02);
        worldGroup.add(turret);

        const tRoof = new THREE.Mesh(
          new THREE.ConeGeometry(1.45, 2.1, 14),
          isJungleMap
            ? goldMat
            : side === 'west'
              ? roofBlueMat
              : roofRedMat
        );
        tRoof.position.set(fortX + dir * 2.4, 5.4, fortZ + tz);
        addCrayonOutline(tRoof, 0.02);
        worldGroup.add(tRoof);
      });

      for (let s = 1; s <= 4; s++) {
        const sh = s * 0.48;
        const sx = fortX - dir * (3.0 + (4 - s + 0.5) * 0.85);
        addSolidBox(
          sx,
          sh * 0.5,
          fortZ,
          0.9,
          sh,
          4.2,
          warmStoneMat,
          isJungleMap ? '#FACC15' : '#E2E8F0',
          true,
          false
        );
      }
    };
    buildSideFort('west');
    buildSideFort('east');

    // --- F. PURPOSEFUL, INTERACTIVE & FUN TACTICAL COURT OBJECTS (NO POINTLESS DESTRUCTIBLE BOXES!) ---
    // 1. Walkable Corrugated Cargo Containers with 3-Step Walk-Up Steel Ramps!
    // Players and AI can climb onto the roofs (y = 1.92m) for awesome high-ground shootouts!
    const buildWalkableCargoContainer = (
      cx: number,
      cz: number,
      w: number,
      h: number,
      d: number,
      baseHex: string,
      accentHex: string,
      rampDirZ: 1 | -1
    ) => {
      const cGrp = new THREE.Group();
      cGrp.position.set(cx, h * 0.5, cz);

      const containerMat = new THREE.MeshToonMaterial({
        map: createCleanContainerTexture(baseHex, accentHex),
        gradientMap: getToonGradientMap(),
      });

      const hull = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), containerMat);
      hull.castShadow = true;
      hull.receiveShadow = true;
      addCrayonOutline(hull, 0.02);
      cGrp.add(hull);

      const topFrame = new THREE.Mesh(
        new THREE.BoxGeometry(w + 0.14, 0.2, d + 0.14),
        slateIronMat
      );
      topFrame.position.y = h * 0.5 - 0.08;
      cGrp.add(topFrame);

      worldGroup.add(cGrp);

      // Container itself is WALKABLE on top (h = 1.92m)!
      solidColliders.push({
        x: cx,
        y: h * 0.5,
        z: cz,
        w,
        h,
        d,
        walkable: true,
        blocksSight: true,
      });

      // 3-Step Walk-Up Ramp at one end of the Container so fighters can climb onto the roof!
      for (let s = 1; s <= 3; s++) {
        const sh = (s / 3) * (h - 0.36);
        const sz = cz + rampDirZ * (d * 0.5 + (4 - s - 0.5) * 0.85);
        addSolidBox(
          cx,
          sh * 0.5,
          sz,
          w * 0.86,
          sh,
          0.9,
          slateIronMat,
          accentHex,
          true,
          false
        );
      }
    };

    // Left & Right Walkable Cargo Containers (Themed for Coastal Fort or Jungle Run Expedition!)
    buildWalkableCargoContainer(
      -8.8,
      1.5,
      3.0,
      1.92,
      5.4,
      isJungleMap ? '#15803D' : '#D97706',
      '#FEF08A',
      1
    );
    buildWalkableCargoContainer(
      8.8,
      1.5,
      3.0,
      1.92,
      5.4,
      isJungleMap ? '#B45309' : '#334155',
      isJungleMap ? '#34D399' : '#38BDF8',
      -1
    );

    // 2. Sculpted Tactical Stone & Gold Peek Cover Walls (Indestructible, Clean 3D Architecture)
    const buildTacticalCoverWall = (bx: number, bz: number, w: number, d: number) => {
      const wallGrp = new THREE.Group();
      wallGrp.position.set(bx, 0, bz);

      const mainBlock = new THREE.Mesh(
        new THREE.BoxGeometry(w, 1.45, d),
        warmStoneMat
      );
      mainBlock.position.y = 0.725;
      mainBlock.castShadow = true;
      mainBlock.receiveShadow = true;
      addCrayonOutline(mainBlock, 0.022);
      wallGrp.add(mainBlock);

      const goldTopTrim = new THREE.Mesh(
        new THREE.BoxGeometry(w + 0.16, 0.22, d + 0.16),
        goldMat
      );
      goldTopTrim.position.y = 1.48;
      wallGrp.add(goldTopTrim);

      // Rounded End Pillars
      [-w * 0.5, w * 0.5].forEach((px) => {
        const endCol = new THREE.Mesh(
          new THREE.CylinderGeometry(0.45, 0.5, 1.75, 14),
          darkStoneMat
        );
        endCol.position.set(px, 0.875, 0);
        endCol.castShadow = true;
        addCrayonOutline(endCol, 0.022);
        wallGrp.add(endCol);
      });

      worldGroup.add(wallGrp);
      solidColliders.push({
        x: bx,
        y: 0.8,
        z: bz,
        w: w + 0.45,
        h: 1.65,
        d: d + 0.2,
        walkable: false,
        blocksSight: true,
      });
    };
    buildTacticalCoverWall(0, -4.8, 4.2, 1.0);
    buildTacticalCoverWall(0, 8.2, 4.2, 1.0);

    // 3. SCARCE, RANDOMIZED 3D MEDKIT PICKUPS (Max 2 Slots Across 8 Random Spots — Never Too Many!)
    const MEDKIT_CANDIDATE_SPOTS: Array<{ x: number; y: number; z: number }> = [
      { x: 0, y: 0.02, z: 1.6 }, // Center Court Medallion
      { x: -8.8, y: 1.92, z: 1.5 }, // West Container Roof
      { x: 8.8, y: 1.92, z: 1.5 }, // East Container Roof
      { x: 0, y: 1.44, z: -13.2 }, // North Balcony Deck
      { x: 0, y: 0.02, z: 13.5 }, // South Midline Court
      { x: -16.8, y: 0.02, z: 1.5 }, // West Wing Court
      { x: 16.8, y: 0.02, z: 1.5 }, // East Wing Court
      { x: 0, y: 0.02, z: -9.0 }, // North Inner Court
    ];

    const medkits: MedkitPickup[] = [];
    const emeraldCrossMat = createCleanToonMaterial('#22C55E');

    const pickRandomFreeMedkitSpot = (excludeIdx: number): number => {
      const candidates: number[] = [];
      for (let i = 0; i < MEDKIT_CANDIDATE_SPOTS.length; i++) {
        if (i !== excludeIdx && !medkits.some((m) => m.spotIndex === i)) {
          candidates.push(i);
        }
      }
      return candidates[Math.floor(Math.random() * candidates.length)] ?? 0;
    };

    const createRandomMedkitSlot = (initialSpotIdx: number, startActive: boolean, initialDelay: number) => {
      const spot = MEDKIT_CANDIDATE_SPOTS[initialSpotIdx];
      const baseRing = new THREE.Mesh(
        new THREE.RingGeometry(0.72, 1.02, 28),
        new THREE.MeshBasicMaterial({
          color: '#4ADE80',
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.85,
        })
      );
      baseRing.rotation.x = -Math.PI / 2;
      baseRing.position.set(spot.x, spot.y + 0.04, spot.z);
      baseRing.visible = startActive;
      worldGroup.add(baseRing);

      const medGrp = new THREE.Group();
      medGrp.position.set(spot.x, spot.y + 0.58, spot.z);
      medGrp.visible = startActive;

      // Sculpted Shaded First-Aid Case with Bold Black Line-Art Outline
      const caseMesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.92, 0.66, 0.52),
        whiteMat
      );
      caseMesh.castShadow = true;
      addCrayonOutline(caseMesh, 0.045);
      medGrp.add(caseMesh);

      const bandMesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.95, 0.16, 0.54),
        emeraldCrossMat
      );
      bandMesh.position.y = -0.18;
      medGrp.add(bandMesh);

      const handleMesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.38, 0.14, 0.14),
        slateIronMat
      );
      handleMesh.position.y = 0.38;
      addCrayonOutline(handleMesh, 0.04);
      medGrp.add(handleMesh);

      const crossH = new THREE.Mesh(
        new THREE.BoxGeometry(0.42, 0.14, 0.58),
        redMat
      );
      crossH.position.y = 0.05;
      addCrayonOutline(crossH, 0.035);
      medGrp.add(crossH);

      const crossV = new THREE.Mesh(
        new THREE.BoxGeometry(0.14, 0.42, 0.58),
        redMat
      );
      crossV.position.y = 0.05;
      addCrayonOutline(crossV, 0.035);
      medGrp.add(crossV);

      worldGroup.add(medGrp);
      medkits.push({
        mesh: medGrp,
        ringMesh: baseRing,
        x: spot.x,
        y: spot.y,
        z: spot.z,
        active: startActive,
        respawnTimer: initialDelay,
        spotIndex: initialSpotIdx,
      });
    };

    // Only 2 Medkit Slots total (1 active at a random spot at start, 2nd spawns randomly after 11s!)
    const firstMedIdx = Math.floor(Math.random() * MEDKIT_CANDIDATE_SPOTS.length);
    createRandomMedkitSlot(firstMedIdx, true, 0);
    createRandomMedkitSlot((firstMedIdx + 3) % MEDKIT_CANDIDATE_SPOTS.length, false, 11.0);

    // 3B. RANDOM SPAWNING POWER WEAPONS: PUMP SHOTGUN & BLAZING FIRE BLASTER!
    const WEAPON_SPAWN_SPOTS: Array<{ x: number; y: number; z: number }> = [
      { x: -8.8, y: 1.92, z: 1.5 }, // West Container Roof
      { x: 8.8, y: 1.92, z: 1.5 }, // East Container Roof
      { x: 0, y: 1.44, z: -13.2 }, // North Castle Balcony
      { x: -5.4, y: 0.02, z: -2.2 }, // North-West Court
      { x: 5.4, y: 0.02, z: 5.6 }, // South-East Court
      { x: 0, y: 0.02, z: 11.8 }, // South Center Court
    ];

    const weaponPickups: WeaponPickup[] = [];
    const pickRandomFreeWeaponSpot = (excludeIdx: number): number => {
      const candidates: number[] = [];
      for (let i = 0; i < WEAPON_SPAWN_SPOTS.length; i++) {
        if (i !== excludeIdx && !weaponPickups.some((w) => w.spotIndex === i)) {
          candidates.push(i);
        }
      }
      return candidates[Math.floor(Math.random() * candidates.length)] ?? 0;
    };

    const createWeaponPickupSlot = (
      initialSpotIdx: number,
      initialType: 'shotgun' | 'fire',
      startActive: boolean,
      initialDelay: number
    ) => {
      const spot = WEAPON_SPAWN_SPOTS[initialSpotIdx];
      const ringMat = new THREE.MeshBasicMaterial({
        color: initialType === 'fire' ? '#F97316' : '#FACC15',
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.9,
      });
      const baseRing = new THREE.Mesh(
        new THREE.RingGeometry(0.82, 1.16, 28),
        ringMat
      );
      baseRing.rotation.x = -Math.PI / 2;
      baseRing.position.set(spot.x, spot.y + 0.04, spot.z);
      baseRing.visible = startActive;
      worldGroup.add(baseRing);

      const wGrp = new THREE.Group();
      wGrp.position.set(spot.x, spot.y + 0.68, spot.z);
      wGrp.visible = startActive;

      // Floating 3D Shotgun Crate Visual
      const shotgunVisual = new THREE.Group();
      const sgCrateBase = new THREE.Mesh(
        new THREE.BoxGeometry(1.15, 0.36, 0.34),
        createCleanToonMaterial('#B45309')
      );
      addCrayonOutline(sgCrateBase, 0.042);
      shotgunVisual.add(sgCrateBase);

      [-0.08, 0.08].forEach((bz) => {
        const bCyl = new THREE.Mesh(
          new THREE.CylinderGeometry(0.08, 0.08, 1.35, 10),
          slateIronMat
        );
        bCyl.rotation.z = Math.PI / 2;
        bCyl.position.set(0.18, 0.14, bz);
        addCrayonOutline(bCyl, 0.035);
        shotgunVisual.add(bCyl);
      });
      const sgBadge = new THREE.Mesh(
        new THREE.BoxGeometry(0.45, 0.4, 0.38),
        goldMat
      );
      sgBadge.position.set(-0.22, 0.02, 0);
      addCrayonOutline(sgBadge, 0.035);
      shotgunVisual.add(sgBadge);
      shotgunVisual.visible = initialType === 'shotgun';
      wGrp.add(shotgunVisual);

      // Floating 3D Fire Blaster / Flamethrower Visual
      const fireVisual = new THREE.Group();
      const fbTank = new THREE.Mesh(
        new THREE.CylinderGeometry(0.24, 0.24, 1.08, 14),
        createCleanToonMaterial('#EA580C')
      );
      fbTank.rotation.z = Math.PI / 2;
      addCrayonOutline(fbTank, 0.042);
      fireVisual.add(fbTank);

      const fbHousing = new THREE.Mesh(
        new THREE.BoxGeometry(0.68, 0.42, 0.44),
        redMat
      );
      fbHousing.position.set(-0.1, 0.14, 0);
      addCrayonOutline(fbHousing, 0.038);
      fireVisual.add(fbHousing);

      const fbFlameCore = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.26, 0),
        new THREE.MeshBasicMaterial({ color: '#FEF08A' })
      );
      fbFlameCore.position.set(0.64, 0.08, 0);
      fireVisual.add(fbFlameCore);
      fireVisual.visible = initialType === 'fire';
      wGrp.add(fireVisual);

      worldGroup.add(wGrp);
      weaponPickups.push({
        mesh: wGrp,
        shotgunVisual,
        fireVisual,
        ringMesh: baseRing,
        weaponType: initialType,
        x: spot.x,
        y: spot.y,
        z: spot.z,
        active: startActive,
        respawnTimer: initialDelay,
        spotIndex: initialSpotIdx,
      });
    };

    // Spawn 1 Pump Shotgun & 1 Fire Blaster at random court weapon pads!
    createWeaponPickupSlot(0, 'shotgun', true, 0);
    createWeaponPickupSlot(3, 'fire', true, 0);

    // 4. 4 Interactive Spring Jump-Pads (Launch Trampolines) at Tactical Court Corners!
    const jumpPadCoords = [
      [-14.5, -1.5],
      [14.5, -1.5],
      [-14.5, 4.8],
      [14.5, 4.8],
    ];
    jumpPadCoords.forEach(([jx, jz]) => {
      const jpGrp = new THREE.Group();
      jpGrp.position.set(jx, 0.02, jz);

      const baseCyl = new THREE.Mesh(
        new THREE.CylinderGeometry(1.25, 1.4, 0.24, 20),
        slateIronMat
      );
      baseCyl.position.y = 0.12;
      addCrayonOutline(baseCyl, 0.022);
      jpGrp.add(baseCyl);

      const bounceTop = new THREE.Mesh(
        new THREE.CylinderGeometry(1.05, 1.12, 0.14, 20),
        createCleanToonMaterial('#38BDF8')
      );
      bounceTop.position.y = 0.26;
      jpGrp.add(bounceTop);

      const pulseRing = new THREE.Mesh(
        new THREE.RingGeometry(0.65, 0.95, 24),
        new THREE.MeshBasicMaterial({
          color: '#FEF08A',
          side: THREE.DoubleSide,
        })
      );
      pulseRing.rotation.x = -Math.PI / 2;
      pulseRing.position.y = 0.34;
      jpGrp.add(pulseRing);

      worldGroup.add(jpGrp);
      jumpPads.push({
        x: jx,
        z: jz,
        radius: 1.35,
        ringMesh: pulseRing,
        cooldownMap: {},
      });
    });

    // 4. Spawn 4 Solo Characters (YOU + 3 AI Rivals) with Larger Scale (1.38x) & 4 Guaranteed Unique Outfits!
    const fighters: ArenaFighter[] = [];
    const bullets: BulletProjectile[] = [];
    const vfxParticles: StylizedVfxParticle[] = [];

    const playerActiveOutfitId: OutfitId =
      playerChar.outfitId || playerChar.defaultOutfit || 'crown_hoodie';
    const playerActiveOutfit =
      CHARACTER_OUTFITS.find((o) => o.id === playerActiveOutfitId) ||
      CHARACTER_OUTFITS[0];
    const playerDressHex = playerActiveOutfit.primaryColor;

    // Select up to 4 AI Outfits from VALID_SOLO_OUTFIT_POOL (Supports up to 5 total players in Custom Gun Fight!)
    const uniqueAiPalettes = VALID_SOLO_OUTFIT_POOL.filter(
      (p) =>
        p.outfitId !== playerActiveOutfitId &&
        p.primaryColor.toLowerCase() !== playerDressHex.toLowerCase()
    ).slice(0, 4);

    // Pick up to 4 AI characters guaranteeing both Male & Female characters!
    const allCandidateChars = CRAYON_CHARACTERS.filter(
      (c) => c.id !== playerChar.id
    );
    const femaleAiPool = allCandidateChars.filter((c) =>
      crayonAudio.isFemaleCharacter(c.id)
    );
    const maleAiPool = allCandidateChars.filter(
      (c) => !crayonAudio.isFemaleCharacter(c.id)
    );
    const isPlayerFemale = crayonAudio.isFemaleCharacter(playerChar.id);
    const distinctAiChars: CharacterConfig[] = (
      isPlayerFemale
        ? [maleAiPool[0], femaleAiPool[0], maleAiPool[1], femaleAiPool[1]]
        : [femaleAiPool[0], maleAiPool[0], femaleAiPool[1], maleAiPool[1]]
    ).filter((c): c is CharacterConfig => Boolean(c));

    const createFighterInstance = (
      id: string,
      name: string,
      isPlayer: boolean,
      baseChar: CharacterConfig,
      dressOverride: {
        outfitId: OutfitId;
        primaryColor: string;
        secondaryColor: string;
        accentColor: string;
        label: string;
      },
      spawnIdx: number
    ): ArenaFighter => {
      const customizedChar: CharacterConfig = isPlayer
        ? {
            ...baseChar,
            outfitId: playerActiveOutfitId,
            primaryColor: playerDressHex,
          }
        : {
            ...baseChar,
            outfitId: dressOverride.outfitId,
            defaultOutfit: dressOverride.outfitId,
            primaryColor: dressOverride.primaryColor,
            secondaryColor: dressOverride.secondaryColor,
            accentColor: dressOverride.accentColor,
          };

      const rig = createCrayonCharacter(customizedChar, maxAnisotropy);
      const charGroup = rig.root;

      // MAKE CHARACTER SIZE BIGGER & HEROIC (1.38x Scale!)
      charGroup.scale.setScalar(1.38);

      rig.rightArm.position.set(0.205, 0.815, 0.02);
      rig.rightArm.rotation.set(-1.12, -0.22, -0.18);

      rig.leftArm.position.set(-0.195, 0.815, 0.06);
      rig.leftArm.rotation.set(-1.18, 0.52, 0.25);

      const dressHex = isPlayer ? playerDressHex : dressOverride.primaryColor;
      const {
        gunGroup,
        assaultMeshGroup,
        shotgunMeshGroup,
        fireMeshGroup,
        muzzleFlashMesh,
      } = createFittedMultiWeaponArsenal(dressHex);
      gunGroup.position.set(0.11, 0.67, 0.27);
      rig.bodyGroup.add(gunGroup);

      // Clean Ground Ring under each Fighter matching their unique Outfit Color
      const ringGeo = new THREE.RingGeometry(
        isPlayer ? 0.54 : 0.46,
        isPlayer ? 0.72 : 0.62,
        28
      );
      ringGeo.rotateX(-Math.PI / 2);
      const ringMat = new THREE.MeshBasicMaterial({
        color: isPlayer ? '#FACC15' : dressHex,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: isPlayer ? 0.92 : 0.82,
      });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.position.y = 0.03;
      charGroup.add(ringMesh);

      const haloGeo = new THREE.SphereGeometry(0.68, 14, 12);
      const haloMat = new THREE.MeshBasicMaterial({
        color: '#E2E8F0',
        transparent: true,
        opacity: 0,
        depthWrite: false,
      });
      const hitHaloMesh = new THREE.Mesh(haloGeo, haloMat);
      hitHaloMesh.position.set(0, 0.72, 0);
      charGroup.add(hitHaloMesh);

      // 1.5-Second Respawn Protection Stylized 3D Honeycomb Forcefield Sphere + Gyroscopic Orbit Rings (Only shown after death!)
      const spawnShieldGroup = new THREE.Group();
      spawnShieldGroup.visible = false;

      // Child 0: Translucent Golden Honeycomb Hex-Energy Dome Sphere
      const shieldSphereBubble = new THREE.Mesh(
        new THREE.SphereGeometry(0.96, 32, 24),
        new THREE.MeshBasicMaterial({
          map: createShieldHexDomeTexture(),
          color: '#FDE047',
          transparent: true,
          opacity: 0.24,
          side: THREE.DoubleSide,
          depthWrite: false,
        })
      );
      shieldSphereBubble.position.set(0, 0.86, 0);
      spawnShieldGroup.add(shieldSphereBubble);

      // Child 1: Counter-Rotating Geodesic Icosahedron Lattice Cage
      const shieldGeoCage = new THREE.Mesh(
        new THREE.IcosahedronGeometry(0.99, 1),
        new THREE.MeshBasicMaterial({
          color: '#FEF08A',
          wireframe: true,
          transparent: true,
          opacity: 0.22,
          depthWrite: false,
        })
      );
      shieldGeoCage.position.set(0, 0.86, 0);
      spawnShieldGroup.add(shieldGeoCage);

      // Child 2: Tilted Gyroscopic Energy Orbit Ring A
      const shieldGyroRingA = new THREE.Mesh(
        new THREE.TorusGeometry(1.03, 0.022, 8, 48),
        new THREE.MeshBasicMaterial({
          color: '#FACC15',
          transparent: true,
          opacity: 0.45,
          depthWrite: false,
        })
      );
      shieldGyroRingA.position.set(0, 0.86, 0);
      shieldGyroRingA.rotation.x = Math.PI * 0.32;
      spawnShieldGroup.add(shieldGyroRingA);

      // Child 3: Counter-Tilted Gyroscopic Energy Orbit Ring B
      const shieldGyroRingB = new THREE.Mesh(
        new THREE.TorusGeometry(1.05, 0.018, 8, 48),
        new THREE.MeshBasicMaterial({
          color: '#FEF08A',
          transparent: true,
          opacity: 0.38,
          depthWrite: false,
        })
      );
      shieldGyroRingB.position.set(0, 0.86, 0);
      shieldGyroRingB.rotation.x = -Math.PI * 0.32;
      spawnShieldGroup.add(shieldGyroRingB);

      // Child 4: Vertical Scanning Forcefield Pulse Ring (Sweeps bottom-to-top along the sphere contour!)
      const shieldScanRing = new THREE.Mesh(
        new THREE.TorusGeometry(0.96, 0.026, 8, 48),
        new THREE.MeshBasicMaterial({
          color: '#FEF9C3',
          transparent: true,
          opacity: 0.52,
          depthWrite: false,
        })
      );
      shieldScanRing.rotation.x = Math.PI / 2;
      shieldScanRing.position.set(0, 0.86, 0);
      spawnShieldGroup.add(shieldScanRing);

      // Child 5: Glowing Ground Protection Aura Ring at Feet
      const shieldCircleRing = new THREE.Mesh(
        new THREE.RingGeometry(0.72, 0.88, 40),
        new THREE.MeshBasicMaterial({
          color: '#FACC15',
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.42,
          depthWrite: false,
        })
      );
      shieldCircleRing.rotation.x = -Math.PI / 2;
      shieldCircleRing.position.set(0, 0.05, 0);
      spawnShieldGroup.add(shieldCircleRing);

      charGroup.add(spawnShieldGroup);

      // Overhead 3D Health Bar (HIDDEN by default — ONLY shown when hit!)
      const hpBgGeo = new THREE.PlaneGeometry(1.18, 0.16);
      const hpBgMat = new THREE.MeshBasicMaterial({
        color: '#09192B',
        side: THREE.DoubleSide,
        depthTest: false,
      });
      const hpBarBg = new THREE.Mesh(hpBgGeo, hpBgMat);
      hpBarBg.position.set(0, 1.98, 0);
      hpBarBg.renderOrder = 10;
      hpBarBg.visible = false;
      charGroup.add(hpBarBg);

      const hpFillGeo = new THREE.PlaneGeometry(1.1, 0.11);
      const hpFillMat = new THREE.MeshBasicMaterial({
        color: isPlayer ? '#4ADE80' : dressHex,
        side: THREE.DoubleSide,
        depthTest: false,
      });
      const hpBarFill = new THREE.Mesh(hpFillGeo, hpFillMat);
      hpBarFill.position.set(0, 1.98, 0.01);
      hpBarFill.renderOrder = 11;
      hpBarFill.visible = false;
      charGroup.add(hpBarFill);

      const sp = SOLO_SPAWN_POINTS[spawnIdx % SOLO_SPAWN_POINTS.length];
      charGroup.position.set(sp.x, sp.y, sp.z);
      charGroup.rotation.y = sp.yaw;
      scene.add(charGroup);

      // Higher HP so gunfights last longer and reward sustained aim & movement!
      const startHp = isPlayer ? 290 : 260;

      return {
        id,
        name,
        isPlayer,
        charConfig: customizedChar,
        dressColor: dressHex,
        dressLabel: isPlayer ? 'YOU' : dressOverride.label,
        rig,
        group: charGroup,
        gunGroup,
        assaultMeshGroup,
        shotgunMeshGroup,
        fireMeshGroup,
        muzzleFlashMesh,
        hitHaloMesh,
        spawnShieldGroup,
        hpBarFill,
        hpBarBg,
        weaponType: 'assault',
        weaponTimer: 0,
        burnTimer: 0,
        burnTickTimer: 0,
        burnedById: null,
        x: sp.x,
        y: sp.y,
        visualY: sp.y,
        z: sp.z,
        vx: 0,
        vy: 0,
        vz: 0,
        prevVx: 0,
        prevVz: 0,
        jiggleY: 0,
        jiggleVelY: 0,
        jiggleRoll: 0,
        jiggleVelRoll: 0,
        jiggleIntensity: 0,
        killStreak: 0,
        knockVx: 0,
        knockVz: 0,
        facingYaw: sp.yaw,
        targetFacingYaw: sp.yaw,
        aimHoldTimer: 0,
        walkPhase: Math.random() * Math.PI * 2,
        hitFlashTimer: 0,
        speedBoostTimer: 0,
        grounded: true,
        hp: startHp,
        maxHp: startHp,
        kills: 0,
        deaths: 0,
        fireCooldown: 0,
        gunRecoil: 0,
        dashCooldown: 0,
        dashActiveTimer: 0,
        superCharge: 0,
        respawnTimer: 0,
        invulnTimer: 0,
        timeSinceLastHit: 999,
        spawnIndex: spawnIdx,
        aiTargetId: null,
        aiStrafeDir: spawnIdx % 2 === 0 ? 1 : -1,
        aiStrafeTimer: 0.65 + Math.random() * 0.6,
        aiJumpTimer: 1.5 + Math.random() * 1.8,
        aiGoalTimer: 0,
        aiGoalX: 0,
        aiGoalZ: 1.6,
        aiTactic:
          spawnIdx % 3 === 0
            ? 'flank_rush'
            : spawnIdx % 3 === 1
              ? 'jiggle_duel'
              : 'cover_peek',
        aiTacticTimer: 2.5 + Math.random() * 2.5,
        lastDamagedById: null,
        remotePlayerId: null,
        lastRemoteTickAt: 0,
      };
    };

    // Determine active slots (up to 5 fighters in Custom Gun Fight, or 4 in standard Solo Gun Fight)
    const activeCustomSlots = customSlots
      ? customSlots.filter((s) => s.occupiedBy !== 'empty').slice(0, 5)
      : null;
    const myCustomSlot = activeCustomSlots
      ? activeCustomSlots.find((s) => s.playerId === multiplayerClient.playerId) ||
        activeCustomSlots.find((s) => s.playerName === playerDisplayName)
      : null;
    const mySpawnIndex = myCustomSlot ? myCustomSlot.slotIndex : 0;

    // 1. Main Player (YOU) — Spawns at their assigned slot's spawn index so human players never spawn on top of each other!
    fighters.push(
      createFighterInstance(
        'player_main',
        playerDisplayName || playerChar.name,
        true,
        playerChar,
        {
          outfitId: playerActiveOutfitId,
          primaryColor: playerDressHex,
          secondaryColor: playerActiveOutfit.secondaryColor,
          accentColor: playerActiveOutfit.accentColor,
          label: 'YOU',
        },
        mySpawnIndex
      )
    );

    // 2. Up to 4 Rivals (Remote Human Players + AI Bots, up to 5 Fighters total in Custom Gun Fight!)
    const otherCustomSlots = activeCustomSlots
      ? activeCustomSlots.filter(
          (s) =>
            (myCustomSlot ? s.slotIndex !== myCustomSlot.slotIndex : s.playerId !== multiplayerClient.playerId)
        )
      : [];
    const totalRivalsCount = activeCustomSlots
      ? Math.max(1, Math.min(4, otherCustomSlots.length))
      : 3;

    for (let i = 0; i < totalRivalsCount; i++) {
      const slotOverride = otherCustomSlots[i];
      const baseC = slotOverride
        ? CRAYON_CHARACTERS.find((ch) => ch.id === slotOverride.charId) ||
          distinctAiChars[i % distinctAiChars.length]
        : distinctAiChars[i % distinctAiChars.length];
      const c: CharacterConfig = slotOverride
        ? {
            ...baseC,
            faceId: slotOverride.faceId || baseC.faceId,
            outfitId: slotOverride.outfitId || baseC.outfitId,
          }
        : baseC;
      const dressPalette = uniqueAiPalettes[i % uniqueAiPalettes.length];
      const rivalSpawnIdx = slotOverride ? slotOverride.slotIndex : i + 1;
      const rivalFighter = createFighterInstance(
        slotOverride?.playerId ? `remote_${slotOverride.playerId}` : `solo_ai_${i + 1}`,
        slotOverride?.playerName || c.name,
        false,
        c,
        dressPalette,
        rivalSpawnIdx
      );
      if (slotOverride?.occupiedBy === 'human' && slotOverride.playerId) {
        rivalFighter.remotePlayerId = slotOverride.playerId;
      }
      fighters.push(rivalFighter);
    }

    const playerFighter = fighters[0];

    // 5. Keyboard Controls
    const keys: Record<string, boolean> = {};
    const handleKeyDown = (e: KeyboardEvent) => {
      keys[e.code] = true;
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight' || e.code === 'KeyE') {
        actionTriggerRef.current.diveRequested = true;
      }
      if (e.code === 'KeyQ') {
        actionTriggerRef.current.spikeRequested = true;
      }
      if (e.code === 'Space') {
        actionTriggerRef.current.jumpRequested = true;
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      keys[e.code] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || window.innerWidth;
      const h = Math.max(1, container.clientHeight || window.innerHeight);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      postPipeline.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);
    const resizeObserver = new ResizeObserver(() => {
      handleResize();
    });
    resizeObserver.observe(container);

    // 6. True 3D Line-of-Sight Check (`hasLineOfSight`) — Auto-Shoot ONLY when Enemy is in Sight!
    const hasLineOfSight = (
      x1: number,
      y1: number,
      z1: number,
      x2: number,
      y2: number,
      z2: number
    ): boolean => {
      const dx = x2 - x1;
      const dy = y2 - y1;
      const dz = z2 - z1;
      const dist = Math.hypot(dx, dz);
      // Close-range fighters (< 3.2m) always have direct line of sight so they never fail to fight up close!
      if (dist < 3.2) return true;

      const steps = Math.max(8, Math.ceil(dist * 1.8));
      for (let s = 1; s < steps; s++) {
        const t = s / steps;
        const px = x1 + dx * t;
        const py = y1 + dy * t;
        const pz = z1 + dz * t;

        for (let i = 0; i < solidColliders.length; i++) {
          const sc = solidColliders[i];
          if (sc.blocksSight === false) continue;
          if (
            Math.abs(px - sc.x) <= sc.w * 0.5 + 0.15 &&
            Math.abs(pz - sc.z) <= sc.d * 0.5 + 0.15 &&
            py >= sc.y - sc.h * 0.5 &&
            py <= sc.y + sc.h * 0.5
          ) {
            return false;
          }
        }

        for (let i = 0; i < cylinderColliders.length; i++) {
          const cyl = cylinderColliders[i];
          if (cyl.blocksSight === false) continue;
          if (
            Math.hypot(px - cyl.x, pz - cyl.z) <= cyl.radius * 0.85 &&
            py <= cyl.height
          ) {
            return false;
          }
        }
      }

      return true;
    };

    // Check if an enemy is visibly inside the Player's Camera Sights (On-Screen Frustum)!
    const tempProjVec = new THREE.Vector3();
    const isInCameraSights = (wx: number, wy: number, wz: number): boolean => {
      tempProjVec.set(wx, wy, wz).project(camera);
      return (
        tempProjVec.z >= 0 &&
        tempProjVec.z <= 1.0 &&
        Math.abs(tempProjVec.x) <= 0.94 &&
        Math.abs(tempProjVec.y) <= 0.92
      );
    };

    // 7. Stylized 3D Hit & Kill Effects (Shockwave Rings, Speed Streaks, Starbursts & Light Pillars)
    let screenShakeMag = 0;

    const spawnBloodHitEffect = (
      hx: number,
      hy: number,
      hz: number,
      floorY: number,
      dirX: number = 0,
      dirZ: number = 0,
      intensity: number = 1.0
    ) => {
      if (!enableVfxRef.current) return;

      const bloodColors = ['#DC2626', '#EF4444', '#B91C1C', '#991B1B'];

      // 1. Expanding Crimson Blood Mist Burst at wound point
      const mistGeo = new THREE.SphereGeometry(0.22 * intensity, 10, 8);
      const mistMat = new THREE.MeshBasicMaterial({
        color: '#DC2626',
        transparent: true,
        opacity: 0.72,
        depthWrite: false,
      });
      const mistMesh = new THREE.Mesh(mistGeo, mistMat);
      mistMesh.position.set(hx, hy, hz);
      scene.add(mistMesh);
      vfxParticles.push({
        mesh: mistMesh,
        vx: dirX * 1.4,
        vy: 0.6,
        vz: dirZ * 1.4,
        life: 0.26,
        maxLife: 0.26,
        kind: 'blood_mist',
      });

      // 2. 3D Glossy Crimson Blood Droplets flying out & arcing to the floor
      const dropCount = Math.round(10 * intensity);
      for (let i = 0; i < dropCount; i++) {
        const randAng = Math.random() * Math.PI * 2;
        const spreadSpd = (2.2 + Math.random() * 4.8) * intensity;
        const bvx = dirX * (3.2 + Math.random() * 3.5) + Math.cos(randAng) * spreadSpd;
        const bvz = dirZ * (3.2 + Math.random() * 3.5) + Math.sin(randAng) * spreadSpd;
        const bvy = 1.8 + Math.random() * 4.2 * intensity;

        const dropRadius = (0.048 + Math.random() * 0.045) * Math.min(1.35, intensity);
        const dropGeo = new THREE.SphereGeometry(dropRadius, 7, 6);
        dropGeo.scale(0.85, 1.35, 0.85);
        const dropMat = new THREE.MeshBasicMaterial({
          color: bloodColors[i % bloodColors.length],
        });
        const dropMesh = new THREE.Mesh(dropGeo, dropMat);
        dropMesh.position.set(
          hx + (Math.random() - 0.5) * 0.22,
          hy + (Math.random() - 0.5) * 0.22,
          hz + (Math.random() - 0.5) * 0.22
        );
        scene.add(dropMesh);

        vfxParticles.push({
          mesh: dropMesh,
          vx: bvx,
          vy: bvy,
          vz: bvz,
          life: 0.42 + Math.random() * 0.22,
          maxLife: 0.64,
          kind: 'blood_drop',
          floorY: floorY + 0.032,
        });
      }

      // 3. Persistent Crimson Blood Splatter Puddles on Floor
      const splatCount = intensity >= 1.3 ? 3 : 2;
      for (let s = 0; s < splatCount; s++) {
        const splatRadius = (0.22 + Math.random() * 0.24) * Math.min(1.4, intensity);
        const splatGeo = new THREE.CircleGeometry(splatRadius, 14);
        splatGeo.rotateX(-Math.PI / 2);
        const splatMat = new THREE.MeshBasicMaterial({
          color: s % 2 === 0 ? '#B91C1C' : '#DC2626',
          transparent: true,
          opacity: 0.82,
          depthWrite: false,
        });
        const splatMesh = new THREE.Mesh(splatGeo, splatMat);
        const offsetAng = Math.random() * Math.PI * 2;
        const offsetDist = Math.random() * 0.55;
        splatMesh.position.set(
          hx + dirX * 0.35 + Math.cos(offsetAng) * offsetDist,
          floorY + 0.032 + s * 0.002,
          hz + dirZ * 0.35 + Math.sin(offsetAng) * offsetDist
        );
        splatMesh.scale.set(
          0.75 + Math.random() * 0.5,
          1,
          0.75 + Math.random() * 0.5
        );
        scene.add(splatMesh);

        vfxParticles.push({
          mesh: splatMesh,
          vx: 0,
          vy: 0,
          vz: 0,
          life: 2.8 + Math.random() * 1.2,
          maxLife: 4.0,
          kind: 'blood_splat',
        });
      }
    };

    const spawnStylizedHitEffect = (
      hx: number,
      hy: number,
      hz: number,
      colorHex: string
    ) => {
      if (!enableVfxRef.current) return;

      const rGeo = new THREE.RingGeometry(0.18, 0.36, 24);
      rGeo.rotateX(-Math.PI / 2);
      const rMat = new THREE.MeshBasicMaterial({
        color: colorHex,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.92,
      });
      const rMesh = new THREE.Mesh(rGeo, rMat);
      rMesh.position.set(hx, hy, hz);
      scene.add(rMesh);
      vfxParticles.push({
        mesh: rMesh,
        vx: 0,
        vy: 0,
        vz: 0,
        life: 0.28,
        maxLife: 0.28,
        kind: 'ring',
      });

      const streakMat = new THREE.MeshBasicMaterial({ color: '#FEF08A' });
      const accentMat = new THREE.MeshBasicMaterial({ color: colorHex });
      for (let i = 0; i < 7; i++) {
        const ang = (i / 7) * Math.PI * 2 + Math.random() * 0.4;
        const spd = 4.5 + Math.random() * 5.5;
        const vy = 1.5 + Math.random() * 3.8;
        const vx = Math.cos(ang) * spd;
        const vz = Math.sin(ang) * spd;

        const sGeo = new THREE.ConeGeometry(0.065, 0.42, 6);
        sGeo.rotateX(Math.PI / 2);
        const sMesh = new THREE.Mesh(sGeo, i % 2 === 0 ? streakMat : accentMat);
        sMesh.position.set(hx, hy, hz);
        sMesh.lookAt(hx + vx, hy + vy, hz + vz);
        scene.add(sMesh);

        vfxParticles.push({
          mesh: sMesh,
          vx,
          vy,
          vz,
          life: 0.26 + Math.random() * 0.12,
          maxLife: 0.38,
          kind: 'streak',
        });
      }
    };

    const spawnStylizedKillEffect = (
      kx: number,
      ky: number,
      kz: number,
      dressColorHex: string
    ) => {
      if (!enableVfxRef.current) return;

      ['#FACC15', dressColorHex].forEach((col, idx) => {
        const rGeo = new THREE.RingGeometry(
          0.35 + idx * 0.15,
          0.68 + idx * 0.2,
          32
        );
        rGeo.rotateX(-Math.PI / 2);
        const rMat = new THREE.MeshBasicMaterial({
          color: col,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.95,
        });
        const rMesh = new THREE.Mesh(rGeo, rMat);
        rMesh.position.set(kx, ky + 0.08 + idx * 0.05, kz);
        scene.add(rMesh);
        vfxParticles.push({
          mesh: rMesh,
          vx: 0,
          vy: 0,
          vz: 0,
          life: 0.48 + idx * 0.1,
          maxLife: 0.48 + idx * 0.1,
          kind: 'ring',
        });
      });

      const pillarGeo = new THREE.CylinderGeometry(0.45, 0.85, 6.5, 16, 1, true);
      const pillarMat = new THREE.MeshBasicMaterial({
        color: '#FEF08A',
        transparent: true,
        opacity: 0.75,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const pillarMesh = new THREE.Mesh(pillarGeo, pillarMat);
      pillarMesh.position.set(kx, ky + 3.2, kz);
      scene.add(pillarMesh);
      vfxParticles.push({
        mesh: pillarMesh,
        vx: 0,
        vy: 0,
        vz: 0,
        life: 0.45,
        maxLife: 0.45,
        kind: 'pillar',
      });

      const starColors = ['#FACC15', '#38BDF8', dressColorHex, '#FFFFFF'];
      for (let i = 0; i < 12; i++) {
        const ang = (i / 12) * Math.PI * 2;
        const spd = 3.2 + (i % 3) * 2.2;
        const starGeo =
          i % 2 === 0
            ? new THREE.OctahedronGeometry(0.22, 0)
            : new THREE.CapsuleGeometry(0.08, 0.28, 6, 8);
        const starMat = new THREE.MeshBasicMaterial({
          color: starColors[i % starColors.length],
        });
        const starMesh = new THREE.Mesh(starGeo, starMat);
        starMesh.position.set(kx, ky + 0.8, kz);
        scene.add(starMesh);

        vfxParticles.push({
          mesh: starMesh,
          vx: Math.cos(ang) * spd,
          vy: 4.5 + (i % 4) * 1.6,
          vz: Math.sin(ang) * spd,
          life: 0.55,
          maxLife: 0.55,
          kind: 'star',
          rotSpeed: 8 + (i % 5) * 3,
        });
      }
    };

    const awardElimination = (victim: ArenaFighter, killerId: string | null) => {
      victim.deaths += 1;
      victim.hp = 0;
      victim.killStreak = 0;
      victim.respawnTimer = victim.isPlayer ? 1.5 : 2.0;
      victim.group.visible = false;
      const vFloorY = getFloorHeightAt(victim.x, victim.z, victim.y);
      spawnBloodHitEffect(
        victim.x,
        victim.y + 0.9,
        victim.z,
        vFloorY,
        0,
        0,
        1.65
      );
      spawnStylizedKillEffect(victim.x, victim.y, victim.z, victim.dressColor);

      const killer = fighters.find((f) => f.id === killerId);
      const isPlayerKill = Boolean(killer && killer.id !== victim.id && killer.isPlayer);
      if (killer && killer.id !== victim.id) {
        killer.kills += 1;
        killer.killStreak += 1;
        // Skill-based reward: each elimination heals +32 HP (Skill Vampirism), boosts speed briefly, and charges Super!
        killer.hp = Math.min(killer.maxHp, killer.hp + (killer.isPlayer ? 34 : 22));
        killer.speedBoostTimer = Math.max(killer.speedBoostTimer, 2.2);
        killer.superCharge = Math.min(100, killer.superCharge + 35);
        killer.jiggleVelY += 4.2;

        if (killer.isPlayer && enableShakeRef.current) {
          screenShakeMag = 0.35;
        }
      }
      // Play expressive KO / Death sound for player deaths, player kills, and arena KOs!
      crayonAudio.playDeathSound(
        victim.isPlayer,
        isPlayerKill,
        victim.charConfig.id
      );
    };

    const setFighterEquippedWeapon = (
      fighter: ArenaFighter,
      wType: ArenaWeaponType,
      durationSec: number
    ) => {
      fighter.weaponType = wType;
      fighter.weaponTimer = durationSec;
      fighter.assaultMeshGroup.visible = wType === 'assault';
      fighter.shotgunMeshGroup.visible = wType === 'shotgun';
      fighter.fireMeshGroup.visible = wType === 'fire';
    };

    const fireFighterBlaster = (
      fighter: ArenaFighter,
      targetYaw: number,
      targetY?: number,
      targetDist?: number
    ) => {
      fighter.targetFacingYaw = targetYaw;
      fighter.aimHoldTimer = 0.45;

      const wType = fighter.weaponType;
      const aiRateMult = Math.max(0.75, Math.min(1.25, diffConfig.rushSpeedMult));
      // Player skill bonus: active jiggle-strafing, jumping, or killstreaks speed up fire cadence & boost crit damage!
      const playerStreakRateBonus = fighter.isPlayer
        ? 1 + Math.min(0.22, fighter.killStreak * 0.06)
        : 1.0;
      const isSkillShot =
        fighter.isPlayer &&
        (!fighter.grounded ||
          fighter.jiggleIntensity > 0.32 ||
          fighter.dashActiveTimer > 0);
      const skillDmgMult = isSkillShot ? 1.24 : 1.0;

      // Inject bouncy jiggle impulse when firing!
      fighter.jiggleVelY -= wType === 'shotgun' ? 2.6 : wType === 'fire' ? 0.65 : 1.45;

      if (wType === 'shotgun') {
        fighter.fireCooldown = fighter.isPlayer
          ? 0.56 / playerStreakRateBonus
          : 0.76 / aiRateMult;
        fighter.gunRecoil = 0.34;
        crayonAudio.playShotgunBlast(fighter.isPlayer);
      } else if (wType === 'fire') {
        fighter.fireCooldown = fighter.isPlayer
          ? 0.092 / playerStreakRateBonus
          : 0.13 / aiRateMult;
        fighter.gunRecoil = 0.09;
        crayonAudio.playFlamethrowerWhoosh(fighter.isPlayer);
      } else {
        fighter.fireCooldown = fighter.isPlayer
          ? 0.21 / playerStreakRateBonus
          : 0.36 / aiRateMult;
        fighter.gunRecoil = 0.2;
        crayonAudio.playGunShot(fighter.isPlayer);
      }

      const flashMat = fighter.muzzleFlashMesh.material as THREE.MeshBasicMaterial;
      flashMat.color.set(wType === 'fire' ? '#F97316' : '#FEF08A');
      flashMat.opacity = 0.95;

      const baseDirX = Math.sin(targetYaw);
      const baseDirZ = Math.cos(targetYaw);
      // Scale forward bullet spawn offset down when an enemy is at close range so point-blank shots never spawn behind the target!
      const forwardOffset =
        targetDist !== undefined
          ? Math.min(0.85, Math.max(0.28, targetDist * 0.38))
          : 0.75;
      const spawnX =
        fighter.x + baseDirX * forwardOffset + Math.cos(targetYaw) * 0.12;
      const spawnY = fighter.y + 0.98;
      const spawnZ =
        fighter.z + baseDirZ * forwardOffset - Math.sin(targetYaw) * 0.12;

      if (enableVfxRef.current && fighter.isPlayer && wType !== 'fire') {
        const shellGeo = new THREE.CylinderGeometry(0.032, 0.032, 0.11, 6);
        const shellMat = new THREE.MeshBasicMaterial({
          color: wType === 'shotgun' ? '#EF4444' : '#FACC15',
        });
        const shellMesh = new THREE.Mesh(shellGeo, shellMat);
        shellMesh.position.set(
          fighter.x + Math.cos(targetYaw) * 0.34,
          fighter.y + 1.05,
          fighter.z - Math.sin(targetYaw) * 0.34
        );
        scene.add(shellMesh);
        vfxParticles.push({
          mesh: shellMesh,
          vx: Math.cos(targetYaw) * (2.2 + Math.random() * 1.5),
          vy: 2.4 + Math.random() * 1.3,
          vz: -Math.sin(targetYaw) * (2.2 + Math.random() * 1.5),
          life: 0.35,
          maxLife: 0.35,
          kind: 'shell',
        });
      }

      // Spawn Projectiles per Weapon Type!
      if (wType === 'shotgun') {
        // 7-Pellet Heavy Buckshot Fan Spread Cone (High Spawn-Weapon Damage!)
        const pelletCount = 7;
        const bulletSpeed = fighter.isPlayer ? 29.0 : 25.0;
        let baseVy = 0;
        if (targetY !== undefined && targetDist !== undefined && targetDist > 1.0) {
          const timeToTarget = targetDist / bulletSpeed;
          baseVy = THREE.MathUtils.clamp((targetY - spawnY) / timeToTarget, -8.0, 8.0);
        }

        const spreadWidth = isSkillShot ? 0.21 : 0.26;
        for (let p = 0; p < pelletCount; p++) {
          const spreadAngle =
            ((p / (pelletCount - 1)) - 0.5) * spreadWidth +
            (Math.random() - 0.5) * 0.03;
          const pYaw = targetYaw + spreadAngle;
          const pdx = Math.sin(pYaw);
          const pdz = Math.cos(pYaw);

          const bGrp = new THREE.Group();
          bGrp.position.set(spawnX, spawnY, spawnZ);
          bGrp.rotation.y = pYaw;

          const pelletMesh = new THREE.Mesh(
            new THREE.SphereGeometry(0.13, 8, 8),
            new THREE.MeshBasicMaterial({ color: '#FACC15' })
          );
          bGrp.add(pelletMesh);

          const trailMesh = new THREE.Mesh(
            new THREE.CapsuleGeometry(0.08, 0.28, 6, 6),
            new THREE.MeshBasicMaterial({
              color: '#F97316',
              transparent: true,
              opacity: 0.82,
            })
          );
          trailMesh.rotation.x = Math.PI / 2;
          bGrp.add(trailMesh);
          scene.add(bGrp);

          bullets.push({
            mesh: bGrp,
            ownerId: fighter.id,
            weaponType: 'shotgun',
            x: spawnX,
            y: spawnY,
            z: spawnZ,
            vx: pdx * bulletSpeed,
            vy: baseVy + (Math.random() - 0.5) * 1.1,
            vz: pdz * bulletSpeed,
            damage: (fighter.isPlayer ? 22.5 : 16.5) * skillDmgMult,
            knockback: fighter.isPlayer ? 3.8 : 2.6,
            radius: 0.34,
            life: 0.72,
            maxLife: 0.72,
            colorHex: '#FACC15',
          });
        }
      } else if (wType === 'fire') {
        // Blazing Flamethrower Fireball Stream (High Spawn-Weapon Damage + Heavy Burn!)
        const flameSpeed = fighter.isPlayer ? 22.0 : 19.5;
        const jitterYaw = targetYaw + (Math.random() - 0.5) * 0.13;
        const fdx = Math.sin(jitterYaw);
        const fdz = Math.cos(jitterYaw);
        let flameVy = (Math.random() - 0.35) * 1.1;
        if (targetY !== undefined && targetDist !== undefined && targetDist > 1.0) {
          const timeToTarget = targetDist / flameSpeed;
          flameVy += THREE.MathUtils.clamp((targetY - spawnY) / timeToTarget, -6.0, 6.0);
        }

        const bGrp = new THREE.Group();
        bGrp.position.set(spawnX, spawnY, spawnZ);

        const innerCore = new THREE.Mesh(
          new THREE.DodecahedronGeometry(0.21, 0),
          new THREE.MeshBasicMaterial({ color: '#FEF08A' })
        );
        bGrp.add(innerCore);

        const outerFlame = new THREE.Mesh(
          new THREE.SphereGeometry(0.32, 10, 8),
          new THREE.MeshBasicMaterial({
            color: Math.random() < 0.5 ? '#F97316' : '#EF4444',
            transparent: true,
            opacity: 0.82,
          })
        );
        bGrp.add(outerFlame);
        scene.add(bGrp);

        bullets.push({
          mesh: bGrp,
          ownerId: fighter.id,
          weaponType: 'fire',
          x: spawnX,
          y: spawnY,
          z: spawnZ,
          vx: fdx * flameSpeed,
          vy: flameVy,
          vz: fdz * flameSpeed,
          damage: (fighter.isPlayer ? 19.5 : 14.5) * skillDmgMult,
          knockback: 1.8,
          radius: 0.52,
          life: 0.56,
          maxLife: 0.56,
          colorHex: '#F97316',
        });
      } else {
        // Default Assault Blaster Bolt
        const bGrp = new THREE.Group();
        bGrp.position.set(spawnX, spawnY, spawnZ);
        bGrp.rotation.y = targetYaw;

        const bulletColor = fighter.isPlayer
          ? isSkillShot
            ? '#FACC15'
            : '#FEF08A'
          : fighter.dressColor;
        const coreGeo = new THREE.CapsuleGeometry(0.11, 0.34, 6, 8);
        coreGeo.rotateX(Math.PI / 2);
        const coreMat = new THREE.MeshBasicMaterial({ color: bulletColor });
        const coreMesh = new THREE.Mesh(coreGeo, coreMat);
        addCrayonOutline(coreMesh, 0.025);
        bGrp.add(coreMesh);

        scene.add(bGrp);

        const bulletSpeed = fighter.isPlayer ? 29.5 : 24.5;
        let bulletVy = 0;
        if (targetY !== undefined && targetDist !== undefined && targetDist > 1.0) {
          const timeToTarget = targetDist / bulletSpeed;
          bulletVy = THREE.MathUtils.clamp(
            (targetY - spawnY) / timeToTarget,
            -8.0,
            8.0
          );
        }

        bullets.push({
          mesh: bGrp,
          ownerId: fighter.id,
          weaponType: 'assault',
          x: spawnX,
          y: spawnY,
          z: spawnZ,
          vx: baseDirX * bulletSpeed,
          vy: bulletVy,
          vz: baseDirZ * bulletSpeed,
          damage: (fighter.isPlayer ? 26 : 19) * skillDmgMult,
          knockback: fighter.isPlayer ? 4.8 : 3.2,
          radius: 0.32,
          life: 1.35,
          maxLife: 1.35,
          colorHex: bulletColor,
        });
      }
    };

    const getFloorHeightAt = (fx: number, fz: number, currentY: number): number => {
      let highestFloor = 0.02;
      const footRadius = 0.44;
      for (let i = 0; i < solidColliders.length; i++) {
        const sc = solidColliders[i];
        if (!sc.walkable) continue;
        const topY = sc.y + sc.h * 0.5;
        if (
          Math.abs(fx - sc.x) <= sc.w * 0.5 + footRadius &&
          Math.abs(fz - sc.z) <= sc.d * 0.5 + footRadius
        ) {
          if (currentY >= topY - 0.65 && topY > highestFloor) {
            highestFloor = topY;
          }
        }
      }
      return highestFloor;
    };

    const resolveFighterEnvironmentCollisions = (f: ArenaFighter) => {
      const charRadius = 0.72;

      for (let i = 0; i < solidColliders.length; i++) {
        const sc = solidColliders[i];
        const topY = sc.y + sc.h * 0.5;
        const bottomY = sc.y - sc.h * 0.5;

        if (f.y + 1.5 <= bottomY || f.y >= topY - 0.08) {
          continue;
        }

        if (sc.walkable && topY - f.y <= 0.56 && f.vy <= 0.5) {
          const insideX = Math.abs(f.x - sc.x) <= sc.w * 0.5 + charRadius * 0.72;
          const insideZ = Math.abs(f.z - sc.z) <= sc.d * 0.5 + charRadius * 0.72;
          if (insideX && insideZ) {
            f.y = topY;
            f.grounded = true;
            continue;
          }
        }

        const halfW = sc.w * 0.5;
        const halfD = sc.d * 0.5;
        const closestX = THREE.MathUtils.clamp(f.x, sc.x - halfW, sc.x + halfW);
        const closestZ = THREE.MathUtils.clamp(f.z, sc.z - halfD, sc.z + halfD);
        const dx = f.x - closestX;
        const dz = f.z - closestZ;
        const distSq = dx * dx + dz * dz;

        if (distSq < charRadius * charRadius) {
          if (distSq > 0.00001) {
            const dist = Math.sqrt(distSq);
            const nx = dx / dist;
            const nz = dz / dist;
            const overlap = charRadius - dist;
            f.x += nx * overlap;
            f.z += nz * overlap;

            const vn = f.vx * nx + f.vz * nz;
            if (vn < 0) {
              f.vx -= vn * nx;
              f.vz -= vn * nz;
            }
          } else {
            const penX = halfW + charRadius - Math.abs(f.x - sc.x);
            const penZ = halfD + charRadius - Math.abs(f.z - sc.z);
            if (penX < penZ) {
              const sx = f.x >= sc.x ? 1 : -1;
              f.x = sc.x + sx * (halfW + charRadius);
              f.vx = 0;
            } else {
              const sz = f.z >= sc.z ? 1 : -1;
              f.z = sc.z + sz * (halfD + charRadius);
              f.vz = 0;
            }
          }
        }
      }

      for (let i = 0; i < cylinderColliders.length; i++) {
        const cyl = cylinderColliders[i];
        if (f.y >= cyl.height) continue;
        const dx = f.x - cyl.x;
        const dz = f.z - cyl.z;
        const dist = Math.hypot(dx, dz);
        const minDist = cyl.radius + charRadius;
        if (dist < minDist && dist > 0.0001) {
          const nx = dx / dist;
          const nz = dz / dist;
          const overlap = minDist - dist;
          f.x += nx * overlap;
          f.z += nz * overlap;
          const vn = f.vx * nx + f.vz * nz;
          if (vn < 0) {
            f.vx -= vn * nx;
            f.vz -= vn * nz;
          }
        }
      }

      if (f.x < ARENA_MIN_X) {
        f.x = ARENA_MIN_X;
        if (f.vx < 0) f.vx = 0;
      } else if (f.x > ARENA_MAX_X) {
        f.x = ARENA_MAX_X;
        if (f.vx > 0) f.vx = 0;
      }
      if (f.z < ARENA_MIN_Z) {
        f.z = ARENA_MIN_Z;
        if (f.vz < 0) f.vz = 0;
      } else if (f.z > ARENA_MAX_Z) {
        f.z = ARENA_MAX_Z;
        if (f.vz > 0) f.vz = 0;
      }
    };

    const resolveFighterBodyCollisions = () => {
      const minSep = 1.45;
      for (let i = 0; i < fighters.length; i++) {
        const a = fighters[i];
        if (a.respawnTimer > 0) continue;
        for (let j = i + 1; j < fighters.length; j++) {
          const b = fighters[j];
          if (b.respawnTimer > 0) continue;
          if (Math.abs(a.y - b.y) > 1.5) continue;
          const dx = b.x - a.x;
          const dz = b.z - a.z;
          const dist = Math.hypot(dx, dz);
          if (dist < minSep && dist > 0.001) {
            const push = (minSep - dist) * 0.5;
            const nx = dx / dist;
            const nz = dz / dist;
            a.x -= nx * push;
            a.z -= nz * push;
            b.x += nx * push;
            b.z += nz * push;
          }
        }
      }
    };

    // 8. Main Animation & Physics Loop
    let animId = 0;
    let lastTime = performance.now();
    let countdownSec = 3.0;
    let matchElapsedSec = 0;
    let effectiveMatchDurationSec = matchDurationSec;
    let isOvertimeRound = false;
    let hudSyncAccum = 0;
    let netSyncAccum = 0;
    let matchEnded = false;
    let capturedLiveThumb = false;

    // Subscribe to real-time remote player state ticks & weapon fire events
    const unsubRemoteTick = multiplayerClient.onRemoteTick((pkt) => {
      const remoteF =
        fighters.find((f) => !f.isPlayer && f.remotePlayerId === pkt.senderId) ||
        fighters.find((f) => !f.isPlayer && f.spawnIndex === pkt.slotIndex);
      if (!remoteF) return;
      remoteF.remotePlayerId = pkt.senderId;
      remoteF.lastRemoteTickAt = performance.now();
      remoteF.x = THREE.MathUtils.lerp(remoteF.x, pkt.x, 0.55);
      remoteF.y = THREE.MathUtils.lerp(remoteF.y, pkt.y, 0.55);
      remoteF.z = THREE.MathUtils.lerp(remoteF.z, pkt.z, 0.55);
      remoteF.vx = pkt.vx;
      remoteF.vy = pkt.vy;
      remoteF.vz = pkt.vz;
      remoteF.targetFacingYaw = pkt.yaw;
      if (typeof pkt.kills === 'number') {
        remoteF.kills = Math.max(remoteF.kills, pkt.kills);
      }
      if (typeof pkt.deaths === 'number') {
        remoteF.deaths = Math.max(remoteF.deaths, pkt.deaths);
      }
    });

    const unsubRemoteEvent = multiplayerClient.onRemoteEvent((evt) => {
      if (evt.eventKind === 'gun:fire' && evt.payload) {
        const remoteF =
          fighters.find((f) => !f.isPlayer && f.remotePlayerId === evt.senderId) ||
          fighters.find((f) => !f.isPlayer && f.spawnIndex === evt.payload.slotIndex);
        if (remoteF && remoteF.respawnTimer <= 0) {
          remoteF.targetFacingYaw = Number(evt.payload.aimYaw) || remoteF.facingYaw;
          fireFighterBlaster(
            remoteF,
            Number(evt.payload.aimYaw) || remoteF.facingYaw,
            evt.payload.targetY,
            evt.payload.dist
          );
        }
      }
    });

    const animate = (now: number) => {
      animId = requestAnimationFrame(animate);

      const rawDt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;

      if (gameStateRef.current !== 'PLAYING') {
        postPipeline.render();
        if (!capturedLiveThumb) {
          capturedLiveThumb = true;
          try {
            setLiveRushMapThumbnail(
              rushMap.id,
              renderer.domElement.toDataURL('image/jpeg', 0.88)
            );
          } catch {
            // ignore
          }
        }
        return;
      }

      const dt = rawDt * speedMultRef.current;

      const aspect = camera.aspect || 1;
      // Only apply portrait pull-back on true vertical portrait viewports (aspect < 0.95) so PC/desktop & landscape stay crisp!
      const portraitFactor =
        aspect < 0.95
          ? THREE.MathUtils.clamp((0.95 - aspect) / 0.45, 0, 1.15)
          : 0;
      const effectiveFov = fovRef.current + portraitFactor * 14;
      if (Math.abs(camera.fov - effectiveFov) > 0.1) {
        camera.fov = effectiveFov;
        camera.updateProjectionMatrix();
      }

      // Stylized Ocean Wave Undulation, Lagoon Caustic Drift, Shoreline Surf & Flowing Waterfalls
      const tSec = now * 0.001;
      deepOceanTex.offset.x = (tSec * 0.042) % 1;
      deepOceanTex.offset.y = (tSec * 0.028) % 1;
      lagoonTex.offset.x = (-tSec * 0.025) % 1;
      lagoonTex.offset.y = (tSec * 0.034) % 1;
      lagoonMesh.position.y = -3.92 + Math.sin(tSec * 1.8) * 0.045;

      animatedWaveRings.forEach((wr, idx) => {
        const s = 1 + Math.sin(tSec * 2.2 + idx * 1.4) * 0.018;
        wr.scale.set(s, s, 1);
        const mat = wr.material as THREE.MeshBasicMaterial;
        const baseOp = idx === 0 ? 0.62 : idx === 1 ? 0.4 : 0.22;
        mat.opacity = baseOp + Math.sin(tSec * 2.2 + idx * 1.4) * 0.1;
      });

      waterfallTextures.forEach((wfTex) => {
        wfTex.offset.y = (tSec * 1.55) % 1;
      });
      waterfallFoamPuffs.forEach((foam, idx) => {
        const pulse = 0.92 + Math.sin(tSec * 6.5 + idx * 1.1) * 0.14;
        foam.scale.setScalar(pulse);
      });
      skyVehiclePropellers.forEach((prop) => {
        prop.rotation.x += rawDt * 22.0;
      });
      skyVehicles.forEach((sv) => {
        const ang = tSec * sv.speed + sv.phase;
        const nx = sv.baseX + Math.cos(ang) * sv.orbitR;
        const nz = sv.baseZ + Math.sin(ang * 2) * (sv.orbitR * 0.42);
        const vx = -Math.sin(ang) * sv.orbitR * sv.speed;
        const vz = Math.cos(ang * 2) * (sv.orbitR * 0.84) * sv.speed;
        sv.group.position.set(
          nx,
          sv.baseY + Math.sin(tSec * 1.6 + sv.phase) * 0.45,
          nz
        );
        sv.group.rotation.y = Math.atan2(-vz, vx);
        sv.group.rotation.z = Math.sin(ang) * 0.08;
      });
      medkits.forEach((mk, idx) => {
        if (!mk.active) {
          mk.respawnTimer -= rawDt;
          if (mk.respawnTimer <= 0) {
            // Relocate to a newly chosen RANDOM court coordinate on respawn!
            const newSpotIdx = pickRandomFreeMedkitSpot(mk.spotIndex);
            const newSpot = MEDKIT_CANDIDATE_SPOTS[newSpotIdx];
            mk.spotIndex = newSpotIdx;
            mk.x = newSpot.x;
            mk.y = newSpot.y;
            mk.z = newSpot.z;
            mk.mesh.position.set(mk.x, mk.y + 0.58, mk.z);
            mk.ringMesh.position.set(mk.x, mk.y + 0.04, mk.z);
            mk.active = true;
            mk.mesh.visible = true;
            mk.ringMesh.visible = true;
          }
        } else {
          mk.mesh.rotation.y = now * 0.0024 + idx;
          mk.mesh.position.y = mk.y + 0.58 + Math.sin(now * 0.0045 + idx) * 0.12;
          const rScale = 0.92 + Math.sin(now * 0.005 + idx) * 0.1;
          mk.ringMesh.scale.set(rScale, rScale, 1);
        }
      });

      weaponPickups.forEach((wp, idx) => {
        if (!wp.active) {
          wp.respawnTimer -= rawDt;
          if (wp.respawnTimer <= 0) {
            const newSpotIdx = pickRandomFreeWeaponSpot(wp.spotIndex);
            const newSpot = WEAPON_SPAWN_SPOTS[newSpotIdx];
            const nextType: 'shotgun' | 'fire' =
              Math.random() < 0.5 ? 'shotgun' : 'fire';
            wp.spotIndex = newSpotIdx;
            wp.weaponType = nextType;
            wp.x = newSpot.x;
            wp.y = newSpot.y;
            wp.z = newSpot.z;
            wp.shotgunVisual.visible = nextType === 'shotgun';
            wp.fireVisual.visible = nextType === 'fire';
            const rMat = wp.ringMesh.material as THREE.MeshBasicMaterial;
            rMat.color.set(nextType === 'fire' ? '#F97316' : '#FACC15');
            wp.mesh.position.set(wp.x, wp.y + 0.68, wp.z);
            wp.ringMesh.position.set(wp.x, wp.y + 0.04, wp.z);
            wp.active = true;
            wp.mesh.visible = true;
            wp.ringMesh.visible = true;
          }
        } else {
          wp.mesh.rotation.y = now * 0.0028 + idx * 1.8;
          wp.mesh.position.y = wp.y + 0.68 + Math.sin(now * 0.005 + idx) * 0.14;
          const rScale = 0.94 + Math.sin(now * 0.006 + idx) * 0.12;
          wp.ringMesh.scale.set(rScale, rScale, 1);
        }
      });

      jumpPads.forEach((jp, idx) => {
        const pulse = 0.92 + Math.sin(now * 0.005 + idx) * 0.12;
        jp.ringMesh.scale.setScalar(pulse);
      });

      if (countdownSec > 0) {
        const prevCeil = Math.ceil(countdownSec);
        countdownSec = Math.max(0, countdownSec - rawDt);
        const nextCeil = Math.ceil(countdownSec);
        if (nextCeil !== prevCeil) {
          crayonAudio.playCountdownBeep(nextCeil === 0);
        }
        if (countdownSec <= 0) {
          // NEVER activate Spawn Shield at game start — ONLY on death respawn!
          fighters.forEach((f) => {
            f.invulnTimer = 0;
            f.spawnShieldGroup.visible = false;
          });
        } else {
          fighters.forEach((f) => {
            f.spawnShieldGroup.visible = false;
          });
        }
      } else if (!matchEnded) {
        matchElapsedSec += dt;
        const timeRemaining = Math.max(0, effectiveMatchDurationSec - matchElapsedSec);

        if (timeRemaining <= 0) {
          const sortedByKills = [...fighters].sort(
            (a, b) => b.kills - a.kills || a.deaths - b.deaths
          );
          const topTwoTied =
            sortedByKills.length >= 2 &&
            sortedByKills[0].kills === sortedByKills[1].kills;
          const playerTiedWithAnyone =
            !isOvertimeRound &&
            fighters.some(
              (other) =>
                other.id !== playerFighter.id &&
                other.kills === playerFighter.kills
            );

          // If 2 people have the same kill count, add a 30-second extra round (Overtime)!
          if (topTwoTied || playerTiedWithAnyone) {
            effectiveMatchDurationSec += 30;
            isOvertimeRound = true;
            crayonAudio.playCountdownBeep(true);
          } else {
            matchEnded = true;
            const topFighter = sortedByKills[0];
            const didPlayerWin = topFighter.isPlayer;

            if (didPlayerWin) {
              crayonAudio.playVictoryFanfare();
            } else {
              crayonAudio.playLoseStinger();
            }

            onRaceFinished(
              didPlayerWin ? 'player' : 'ai',
              didPlayerWin
                ? `Solo Champion! #1 with ${playerFighter.kills} Kills!`
                : `${topFighter.name} won with ${topFighter.kills} Kills! (You: ${playerFighter.kills} Kills)`,
              matchElapsedSec,
              0,
              playerFighter.deaths,
              playerFighter.kills,
              100,
              sortedByKills.map((f) => ({
                id: f.id,
                name: f.isPlayer ? `${f.name} (YOU)` : f.name,
                kills: f.kills,
                deaths: f.deaths,
                isPlayer: f.isPlayer,
                charId: f.charConfig.id,
              }))
            );
          }
        }

        // Update all 4 Solo Fighters
        fighters.forEach((f) => {
          if (f.respawnTimer > 0) {
            f.respawnTimer -= dt;
            if (f.respawnTimer <= 0) {
              f.respawnTimer = 0;
              f.hp = f.maxHp;
              f.invulnTimer = 1.5; // 1.5 Seconds of Shield Protection ONLY after death respawn!
              f.timeSinceLastHit = 999;
              f.hpBarBg.visible = false;
              f.hpBarFill.visible = false;
              f.burnTimer = 0;
              setFighterEquippedWeapon(f, 'assault', 0);

              // Pick the safest spawn point farthest from all currently living fighters so characters NEVER spawn on top of each other!
              let bestSp = SOLO_SPAWN_POINTS[0];
              let bestMinDist = -1;
              for (let sIdx = 0; sIdx < SOLO_SPAWN_POINTS.length; sIdx++) {
                const candidate =
                  SOLO_SPAWN_POINTS[
                    (f.spawnIndex + f.deaths + sIdx) % SOLO_SPAWN_POINTS.length
                  ];
                let minDistToOther = 999;
                for (let oIdx = 0; oIdx < fighters.length; oIdx++) {
                  const other = fighters[oIdx];
                  if (other.id !== f.id && other.respawnTimer <= 0) {
                    const d = Math.hypot(
                      other.x - candidate.x,
                      other.z - candidate.z
                    );
                    if (d < minDistToOther) minDistToOther = d;
                  }
                }
                if (minDistToOther > bestMinDist) {
                  bestMinDist = minDistToOther;
                  bestSp = candidate;
                }
              }

              // Face toward the nearest active opponent immediately upon spawning so AI & Player are ready to fight!
              let spawnYaw = bestSp.yaw;
              let closestEnemyDist = 999;
              fighters.forEach((other) => {
                if (other.id !== f.id && other.respawnTimer <= 0) {
                  const d = Math.hypot(other.x - bestSp.x, other.z - bestSp.z);
                  if (d < closestEnemyDist) {
                    closestEnemyDist = d;
                    spawnYaw = Math.atan2(other.x - bestSp.x, other.z - bestSp.z);
                  }
                }
              });

              f.x = bestSp.x;
              f.y = bestSp.y;
              f.visualY = bestSp.y;
              f.z = bestSp.z;
              f.vx = 0;
              f.vy = 0;
              f.vz = 0;
              f.knockVx = 0;
              f.knockVz = 0;
              f.facingYaw = spawnYaw;
              f.targetFacingYaw = spawnYaw;
              f.group.position.set(f.x, f.y, f.z);
              f.group.visible = true;
              f.spawnShieldGroup.visible = true;
              if (f.isPlayer) {
                crayonAudio.playRespawnSound();
              }
            }
            return;
          }

          if (f.invulnTimer > 0) {
            f.invulnTimer = Math.max(0, f.invulnTimer - dt);
            f.burnTimer = 0; // Immune to burn while 1.5s Sphere Protection is active!
            f.spawnShieldGroup.visible = true;

            const elapsedShield = 1.5 - f.invulnTimer;
            // Smooth pop-in expansion during first 0.18s + gentle breathing + smooth dissolve expansion in last 0.32s
            const popIn =
              elapsedShield < 0.18
                ? 0.45 + 0.55 * (1 - Math.pow(1 - elapsedShield / 0.18, 3))
                : 1.0;
            const fadeOutScale =
              f.invulnTimer < 0.32
                ? 1.0 + (1 - f.invulnTimer / 0.32) * 0.14
                : 1.0;
            const fadeAlpha =
              f.invulnTimer < 0.32 ? Math.max(0, f.invulnTimer / 0.32) : 1.0;
            const breath = 1.0 + Math.sin(tSec * 9.0) * 0.028;
            f.spawnShieldGroup.scale.setScalar(popIn * fadeOutScale * breath);

            const bubbleMesh = f.spawnShieldGroup.children[0] as THREE.Mesh | undefined;
            const cageMesh = f.spawnShieldGroup.children[1] as THREE.Mesh | undefined;
            const gyroA = f.spawnShieldGroup.children[2] as THREE.Mesh | undefined;
            const gyroB = f.spawnShieldGroup.children[3] as THREE.Mesh | undefined;
            const scanRing = f.spawnShieldGroup.children[4] as THREE.Mesh | undefined;
            const baseRing = f.spawnShieldGroup.children[5] as THREE.Mesh | undefined;

            if (bubbleMesh) {
              bubbleMesh.rotation.y = tSec * 1.4;
              (bubbleMesh.material as THREE.MeshBasicMaterial).opacity =
                0.22 * fadeAlpha;
            }
            if (cageMesh) {
              cageMesh.rotation.y = -tSec * 1.9;
              cageMesh.rotation.z = tSec * 1.1;
              (cageMesh.material as THREE.MeshBasicMaterial).opacity =
                0.22 * fadeAlpha;
            }
            if (gyroA) {
              gyroA.rotation.y = tSec * 3.4;
              gyroA.rotation.z = Math.sin(tSec * 2.4) * 0.45;
              (gyroA.material as THREE.MeshBasicMaterial).opacity =
                0.46 * fadeAlpha;
            }
            if (gyroB) {
              gyroB.rotation.y = -tSec * 3.1;
              gyroB.rotation.z = Math.cos(tSec * 2.2) * 0.45;
              (gyroB.material as THREE.MeshBasicMaterial).opacity =
                0.38 * fadeAlpha;
            }
            if (scanRing) {
              const scanPhase = (elapsedShield * 2.1) % 1;
              const ny = -0.78 + scanPhase * 1.56;
              const rProfile = Math.sqrt(Math.max(0.08, 1 - ny * ny));
              scanRing.position.y = 0.86 + ny * 0.92;
              scanRing.scale.set(rProfile, rProfile, 1);
              (scanRing.material as THREE.MeshBasicMaterial).opacity =
                Math.sin(scanPhase * Math.PI) * 0.56 * fadeAlpha;
            }
            if (baseRing) {
              const footPulse = 0.94 + Math.sin(tSec * 8.0) * 0.08;
              baseRing.scale.set(footPulse, footPulse, 1);
              (baseRing.material as THREE.MeshBasicMaterial).opacity =
                0.42 * fadeAlpha;
            }
          } else {
            f.spawnShieldGroup.visible = false;
          }
          if (f.fireCooldown > 0) f.fireCooldown = Math.max(0, f.fireCooldown - dt);
          if (f.dashCooldown > 0) f.dashCooldown = Math.max(0, f.dashCooldown - dt);
          if (f.dashActiveTimer > 0)
            f.dashActiveTimer = Math.max(0, f.dashActiveTimer - dt);
          if (f.aimHoldTimer > 0) f.aimHoldTimer = Math.max(0, f.aimHoldTimer - dt);
          if (f.speedBoostTimer > 0)
            f.speedBoostTimer = Math.max(0, f.speedBoostTimer - dt);

          // Power Weapon Duration Countdown (Reverts to Assault Blaster when expired)
          if (f.weaponType !== 'assault') {
            f.weaponTimer -= dt;
            if (f.weaponTimer <= 0) {
              setFighterEquippedWeapon(f, 'assault', 0);
            }
          }

          // Fire Blaster Burn Damage-Over-Time (DoT)
          if (f.burnTimer > 0 && f.invulnTimer <= 0) {
            f.burnTimer = Math.max(0, f.burnTimer - dt);
            f.burnTickTimer -= dt;
            if (f.burnTickTimer <= 0) {
              f.burnTickTimer = 0.32;
              f.hp -= 11.0;
              f.hitFlashTimer = 0.14;
              f.timeSinceLastHit = 0;
              const burnFloorY = getFloorHeightAt(f.x, f.z, f.y);
              spawnBloodHitEffect(
                f.x + (Math.random() - 0.5) * 0.3,
                f.y + 0.9,
                f.z + (Math.random() - 0.5) * 0.3,
                burnFloorY,
                0,
                0,
                0.75
              );
              spawnStylizedHitEffect(
                f.x + (Math.random() - 0.5) * 0.4,
                f.y + 0.9,
                f.z + (Math.random() - 0.5) * 0.4,
                '#F97316'
              );
              if (f.hp <= 0) {
                awardElimination(f, f.burnedById);
                return;
              }
              if (f.isPlayer) {
                crayonAudio.playPlayerHurt(f.charConfig.id);
              } else if (f.burnedById === playerFighter.id) {
                crayonAudio.playEnemyHurt(f.charConfig.id);
              }
            }
          }

          f.superCharge = Math.min(100, f.superCharge + dt * 5.5);
          f.timeSinceLastHit += dt;

          // 1. Collect Scarce Random 3D Medkit Pickups (NO Auto Health Recovery!)
          if (f.hp < f.maxHp) {
            for (let m = 0; m < medkits.length; m++) {
              const mk = medkits[m];
              if (!mk.active) continue;
              if (
                Math.hypot(f.x - mk.x, f.z - mk.z) < 1.5 &&
                Math.abs(f.y - mk.y) < 1.4
              ) {
                mk.active = false;
                // Random Respawn Cooldown (13s to 18s) so Medkits are scarce and valuable!
                mk.respawnTimer = 13.0 + Math.random() * 5.0;
                mk.mesh.visible = false;
                mk.ringMesh.visible = false;
                f.hp = Math.min(f.maxHp, f.hp + 95);
                f.burnTimer = 0; // Medkit also extinguishes fire burn!
                f.jiggleVelY += 3.8;
                if (f.isPlayer) {
                  crayonAudio.playMedkitPickup();
                }
                spawnStylizedHitEffect(mk.x, mk.y + 0.5, mk.z, '#4ADE80');
                break;
              }
            }
          }

          // 2. Collect Spawning Power Weapon Crates (PUMP SHOTGUN & FIRE BLASTER!)
          for (let w = 0; w < weaponPickups.length; w++) {
            const wp = weaponPickups[w];
            if (!wp.active) continue;
            if (
              Math.hypot(f.x - wp.x, f.z - wp.z) < 1.55 &&
              Math.abs(f.y - wp.y) < 1.45
            ) {
              wp.active = false;
              wp.respawnTimer = 11.0 + Math.random() * 4.5;
              wp.mesh.visible = false;
              wp.ringMesh.visible = false;
              setFighterEquippedWeapon(f, wp.weaponType, 18.0);
              f.speedBoostTimer = 2.5;
              f.jiggleVelY += 4.2;
              if (f.isPlayer) {
                crayonAudio.playWeaponPickup();
              }
              spawnStylizedHitEffect(
                wp.x,
                wp.y + 0.6,
                wp.z,
                wp.weaponType === 'fire' ? '#F97316' : '#FACC15'
              );
              break;
            }
          }

          if (f.hitFlashTimer > 0) {
            f.hitFlashTimer = Math.max(0, f.hitFlashTimer - dt);
          }
          f.hitHaloMesh.visible = false;

          if (f.gunRecoil > 0) {
            f.gunRecoil = Math.max(0, f.gunRecoil - dt * 1.4);
          }
          f.gunGroup.position.z = 0.27 - f.gunRecoil * 0.4;
          f.gunGroup.rotation.x = -f.gunRecoil * 0.24;
          f.rig.rightArm.rotation.x = -1.12 - f.gunRecoil * 0.2;
          f.rig.leftArm.rotation.x = -1.18 - f.gunRecoil * 0.2;

          const flashMat = f.muzzleFlashMesh.material as THREE.MeshBasicMaterial;
          if (flashMat.opacity > 0) {
            flashMat.opacity = Math.max(0, flashMat.opacity - dt * 14);
          }

          let moveX = 0;
          let moveZ = 0;
          let wantsJump = false;

          if (f.isPlayer) {
            if (keys['KeyA'] || keys['ArrowLeft']) moveX -= 1;
            if (keys['KeyD'] || keys['ArrowRight']) moveX += 1;
            if (keys['KeyW'] || keys['ArrowUp']) moveZ -= 1;
            if (keys['KeyS'] || keys['ArrowDown']) moveZ += 1;

            if (
              actionTriggerRef.current.joystickActive &&
              (Math.abs(actionTriggerRef.current.joystickX || 0) > 0.05 ||
                Math.abs(actionTriggerRef.current.joystickY || 0) > 0.05)
            ) {
              moveX = actionTriggerRef.current.joystickX || 0;
              moveZ = actionTriggerRef.current.joystickY || 0;
            }

            // Dash / Quick Dodge Jiggle Burst on Shift / E / Swipe Down
            if (actionTriggerRef.current.diveRequested && f.dashCooldown <= 0) {
              actionTriggerRef.current.diveRequested = false;
              f.dashCooldown = 1.65;
              f.dashActiveTimer = 0.24;
              const dLen = Math.hypot(moveX, moveZ);
              const dX = dLen > 0.05 ? moveX / dLen : Math.sin(f.facingYaw);
              const dZ = dLen > 0.05 ? moveZ / dLen : Math.cos(f.facingYaw);
              f.knockVx += dX * 8.2;
              f.knockVz += dZ * 8.2;
              f.jiggleVelY -= 3.2;
              f.jiggleVelRoll += dX * 6.0;
              crayonAudio.playDive();
            } else {
              actionTriggerRef.current.diveRequested = false;
            }

            if (actionTriggerRef.current.jumpRequested) {
              wantsJump = true;
              actionTriggerRef.current.jumpRequested = false;
            }
          } else if (
            f.remotePlayerId &&
            f.lastRemoteTickAt &&
            now - f.lastRemoteTickAt < 3500
          ) {
            // Driven by live network ticks from the remote human player!
            moveX = f.vx / 8.8;
            moveZ = f.vz / 8.8;
          } else {
            // =========================================================================
            // DYNAMIC TACTICAL 4P SOLO AI BRAIN (Adaptive Tactics, Jiggle-Peeking, Evasion)
            // =========================================================================
            // 1. Dynamic Tactical Role Switching so AI never plays in a fixed pattern!
            f.aiTacticTimer -= dt;
            if (f.aiTacticTimer <= 0) {
              const tactics: Array<ArenaFighter['aiTactic']> = [
                'jiggle_duel',
                'flank_rush',
                'cover_peek',
                'high_ground',
              ];
              // Weight tactic by weapon & health
              if (f.weaponType !== 'assault' || f.hp > 155) {
                f.aiTactic = Math.random() < 0.55 ? 'flank_rush' : 'jiggle_duel';
              } else if (f.hp < 95) {
                f.aiTactic = Math.random() < 0.6 ? 'cover_peek' : 'high_ground';
              } else {
                f.aiTactic = tactics[Math.floor(Math.random() * tactics.length)];
              }
              f.aiTacticTimer = 2.4 + Math.random() * 2.8;
            }

            // 2. Smart Target Evaluation (Proximity + LOS + Low-HP Finisher + Match Leader Priority)
            let bestEnemy: ArenaFighter | null = null;
            let bestTargetScore = -9999;
            const maxKillsInMatch = Math.max(...fighters.map((fi) => fi.kills));

            fighters.forEach((other) => {
              if (other.id !== f.id && other.respawnTimer <= 0) {
                const d = Math.hypot(other.x - f.x, other.z - f.z);
                const los = hasLineOfSight(
                  f.x,
                  f.y + 0.98,
                  f.z,
                  other.x,
                  other.y + 0.98,
                  other.z
                );
                let score = -d * 1.38;
                if (d < 8.5) score += (8.5 - d) * 3.5;
                if (los) score += 11.5;
                if (other.hp < 75) score += 7.5; // High priority to finish off weak targets!
                if (other.kills === maxKillsInMatch && maxKillsInMatch > 0) {
                  score += 3.5; // Challenge the current match leader!
                }
                if (other.id === f.lastDamagedById) score += 6.5;
                if (other.invulnTimer > 0.15) score -= 12.0;
                if (score > bestTargetScore) {
                  bestTargetScore = score;
                  bestEnemy = other;
                }
              }
            });

            // 3. Fast Jiggle-Strafing & Reactive Bullet Dodge Evasion
            f.aiStrafeTimer -= dt;
            const rapidJiggleCadence =
              f.aiTactic === 'jiggle_duel'
                ? 0.28 + Math.random() * 0.36
                : 0.55 + Math.random() * 0.65;
            if (f.aiStrafeTimer <= 0 || f.hitFlashTimer > 0.15) {
              f.aiStrafeDir = -f.aiStrafeDir || (Math.random() < 0.5 ? -1 : 1);
              f.aiStrafeTimer = rapidJiggleCadence;
              f.jiggleVelRoll += f.aiStrafeDir * 3.8;
            }

            // Detect incoming bullets heading toward this AI and dodge-jump or dash!
            let incomingThreat = false;
            for (let bIdx = 0; bIdx < bullets.length; bIdx++) {
              const b = bullets[bIdx];
              if (b.ownerId === f.id) continue;
              const bdx = f.x - b.x;
              const bdz = f.z - b.z;
              const bDist = Math.hypot(bdx, bdz);
              if (bDist < 5.5) {
                const dot = (bdx * b.vx + bdz * b.vz) / Math.max(0.1, bDist * 30);
                if (dot > 0.72) {
                  incomingThreat = true;
                  break;
                }
              }
            }

            f.aiJumpTimer -= dt;
            if (
              f.aiJumpTimer <= 0 ||
              (incomingThreat && f.grounded && Math.random() < 0.45) ||
              (f.hitFlashTimer > 0.16 && f.grounded && Math.random() < 0.4)
            ) {
              wantsJump = true;
              f.aiJumpTimer = 1.45 + Math.random() * 1.85;
            }

            if (incomingThreat && f.dashCooldown <= 0 && Math.random() < 0.35) {
              f.dashCooldown = 2.0;
              f.dashActiveTimer = 0.22;
              f.knockVx += f.aiStrafeDir * 6.2;
              f.jiggleVelY -= 2.5;
            }

            if (bestEnemy) {
              const target = bestEnemy as ArenaFighter;
              const dx = target.x - f.x;
              const dz = target.z - f.z;
              const dist = Math.hypot(dx, dz);
              const dirToEnemyX = dx / Math.max(0.01, dist);
              const dirToEnemyZ = dz / Math.max(0.01, dist);

              const inSight = hasLineOfSight(
                f.x,
                f.y + 0.98,
                f.z,
                target.x,
                target.y + 0.98,
                target.z
              );

              // Check if AI needs an active Medkit (< 58% HP and not in point-blank duel)
              let nearestMedkit: MedkitPickup | null = null;
              let nearestMedDist = 999;
              if (f.hp < f.maxHp * 0.58 && dist > 4.8) {
                for (let m = 0; m < medkits.length; m++) {
                  const mk = medkits[m];
                  if (!mk.active) continue;
                  const md = Math.hypot(mk.x - f.x, mk.z - f.z);
                  if (md < nearestMedDist) {
                    nearestMedDist = md;
                    nearestMedkit = mk;
                  }
                }
              }

              // Check if AI should grab a nearby Power Weapon
              let nearestWeapon: WeaponPickup | null = null;
              let nearestWeaponDist = 14.5;
              if (f.weaponType === 'assault' && (dist > 8.5 || !inSight)) {
                for (let w = 0; w < weaponPickups.length; w++) {
                  const wp = weaponPickups[w];
                  if (!wp.active) continue;
                  const wd = Math.hypot(wp.x - f.x, wp.z - f.z);
                  if (wd < nearestWeaponDist) {
                    nearestWeaponDist = wd;
                    nearestWeapon = wp;
                  }
                }
              }

              // Check nearest jump pad if tactic is 'high_ground'
              let nearestJumpPad: JumpPadZone | null = null;
              let nearestPadDist = 9.0;
              if (f.aiTactic === 'high_ground' && f.y < 0.5) {
                for (let j = 0; j < jumpPads.length; j++) {
                  const jp = jumpPads[j];
                  const jd = Math.hypot(jp.x - f.x, jp.z - f.z);
                  if (jd < nearestPadDist) {
                    nearestPadDist = jd;
                    nearestJumpPad = jp;
                  }
                }
              }

              if (nearestMedkit) {
                const hdx = nearestMedkit.x - f.x;
                const hdz = nearestMedkit.z - f.z;
                const hLen = Math.max(0.01, Math.hypot(hdx, hdz));
                moveX = hdx / hLen + -dirToEnemyZ * f.aiStrafeDir * 0.42;
                moveZ = hdz / hLen + dirToEnemyX * f.aiStrafeDir * 0.42;
                if (nearestMedkit.y > f.y + 0.5 && nearestMedDist < 5.0 && f.grounded) {
                  wantsJump = true;
                }
              } else if (nearestWeapon && (nearestWeaponDist < 8.5 || !inSight)) {
                const wdx = nearestWeapon.x - f.x;
                const wdz = nearestWeapon.z - f.z;
                const wLen = Math.max(0.01, Math.hypot(wdx, wdz));
                moveX = wdx / wLen + -dirToEnemyZ * f.aiStrafeDir * 0.32;
                moveZ = wdz / wLen + dirToEnemyX * f.aiStrafeDir * 0.32;
                if (nearestWeapon.y > f.y + 0.5 && nearestWeaponDist < 5.0 && f.grounded) {
                  wantsJump = true;
                }
              } else if (nearestJumpPad && nearestPadDist < 7.5 && dist > 6.5) {
                const jdx = nearestJumpPad.x - f.x;
                const jdz = nearestJumpPad.z - f.z;
                const jLen = Math.max(0.01, Math.hypot(jdx, jdz));
                moveX = jdx / jLen;
                moveZ = jdz / jLen;
              } else if (!inSight) {
                const toCenterX = -f.x * 0.04;
                const toCenterZ = (1.5 - f.z) * 0.04;
                moveX = dirToEnemyX * 0.8 + -dirToEnemyZ * f.aiStrafeDir * 0.78 + toCenterX;
                moveZ = dirToEnemyZ * 0.8 + dirToEnemyX * f.aiStrafeDir * 0.78 + toCenterZ;
              } else {
                const idealDist =
                  f.weaponType === 'shotgun'
                    ? 3.5
                    : f.weaponType === 'fire'
                      ? 4.8
                      : f.aiTactic === 'flank_rush'
                        ? 5.6
                        : f.aiTactic === 'cover_peek'
                          ? 10.2
                          : 7.8;

                const nearPerimeter =
                  Math.abs(f.x) > 15.2 || f.z < -8.0 || f.z > 11.5;

                if (dist > idealDist + 1.6) {
                  const flankWeave = f.aiTactic === 'flank_rush' ? 0.72 : 0.54;
                  moveX = dirToEnemyX * 0.86 + -dirToEnemyZ * f.aiStrafeDir * flankWeave;
                  moveZ = dirToEnemyZ * 0.86 + dirToEnemyX * f.aiStrafeDir * flankWeave;
                } else if (dist < idealDist - 1.5 && !nearPerimeter) {
                  moveX = -dirToEnemyX * 0.65 + -dirToEnemyZ * f.aiStrafeDir * 0.94;
                  moveZ = -dirToEnemyZ * 0.65 + dirToEnemyX * f.aiStrafeDir * 0.94;
                } else {
                  const pullCenterX = nearPerimeter ? -Math.sign(f.x) * 0.45 : 0;
                  const pullCenterZ = nearPerimeter ? Math.sign(1.5 - f.z) * 0.45 : 0;
                  moveX = -dirToEnemyZ * f.aiStrafeDir + pullCenterX;
                  moveZ = dirToEnemyX * f.aiStrafeDir + pullCenterZ;
                }
              }

              // Keep AI cleanly inside the court perimeter
              if (Math.abs(f.x) > 18.8) moveX = -Math.sign(f.x);
              if (f.z < -10.2) moveZ = 1;
              if (f.z > 14.5) moveZ = -1;

              // Predictive Lead-Aiming with Player Jiggle-Evasion Reward!
              // If the player skillfully jiggles/strafes/jumps, AI lead-aim has realistic tracking error so player skill wins duels!
              const maxFireRange =
                f.weaponType === 'fire'
                  ? 12.2
                  : f.weaponType === 'shotgun'
                    ? 16.0
                    : 24.5;

              if (dist < maxFireRange && (inSight || dist < 4.2)) {
                const leadTime = Math.min(0.32, dist / 33.0);
                // If target is actively jiggle-strafing or airborne, reduce AI lead lock-on
                const targetEvasionFactor =
                  target.jiggleIntensity * 0.14 + (!target.grounded ? 0.08 : 0);
                const leadScale = Math.max(0.25, 0.72 - targetEvasionFactor * 1.5);
                const predX = target.x + target.vx * leadTime * leadScale;
                const predZ = target.z + target.vz * leadTime * leadScale;
                const aimYaw = Math.atan2(predX - f.x, predZ - f.z);
                f.targetFacingYaw = aimYaw;
                f.aimHoldTimer = 0.45;
                if (f.fireCooldown <= 0) {
                  const baseSpread =
                    f.weaponType === 'shotgun'
                      ? 0.05
                      : Math.max(0.038, 0.105 / diffConfig.rushSpeedMult);
                  const spread = baseSpread + targetEvasionFactor;
                  const aimJitter = (Math.random() - 0.5) * spread;
                  fireFighterBlaster(f, aimYaw + aimJitter, target.y + 0.95, dist);
                }
              }
            }
          }

          // Balanced Athletic Movement Speed (Controlled speed while jumping in the air!)
          const moveLen = Math.hypot(moveX, moveZ);
          const speedBoostMult = f.speedBoostTimer > 0 ? 1.12 : 1.0;
          const airSpeedMult = f.grounded ? 1.0 : 0.82;
          const baseMoveSpeed =
            (f.isPlayer
              ? 8.8
              : 8.2 * Math.min(1.1, Math.max(0.88, diffConfig.rushSpeedMult))) *
            speedBoostMult *
            airSpeedMult;

          f.prevVx = f.vx;
          f.prevVz = f.vz;

          if (moveLen > 0.01) {
            const clampedLen = Math.min(1, moveLen);
            const dirX = moveX / moveLen;
            const dirZ = moveZ / moveLen;
            const desiredVx = dirX * baseMoveSpeed * clampedLen;
            const desiredVz = dirZ * baseMoveSpeed * clampedLen;
            const accelAlpha = Math.min(
              1,
              dt * (f.grounded ? (f.isPlayer ? 14.0 : 12.0) : 7.5)
            );
            f.vx += (desiredVx - f.vx) * accelAlpha;
            f.vz += (desiredVz - f.vz) * accelAlpha;

            if (f.aimHoldTimer <= 0) {
              f.targetFacingYaw = Math.atan2(dirX, dirZ);
            }
          } else {
            f.vx *= Math.pow(0.008, dt);
            f.vz *= Math.pow(0.008, dt);
          }

          // Measure lateral jiggle-strafe acceleration to drive 3D Jiggle Physics & Player Skill Evasion!
          const dvx = f.vx - f.prevVx;
          const dvz = f.vz - f.prevVz;
          const accelImpulse = Math.hypot(dvx, dvz);
          if (accelImpulse > 1.8) {
            f.jiggleIntensity = Math.min(1.0, f.jiggleIntensity + accelImpulse * 0.045);
            f.jiggleVelRoll += THREE.MathUtils.clamp(-dvx * 0.45, -3.5, 3.5);
            f.jiggleVelY -= Math.min(1.6, accelImpulse * 0.08);
          } else {
            f.jiggleIntensity = Math.max(0, f.jiggleIntensity - dt * 1.8);
          }

          f.knockVx *= Math.pow(0.06, dt);
          f.knockVz *= Math.pow(0.06, dt);

          const moveSteps = 2;
          const stepDt = dt / moveSteps;
          for (let ms = 0; ms < moveSteps; ms++) {
            f.x += (f.vx + f.knockVx) * stepDt;
            f.z += (f.vz + f.knockVz) * stepDt;
            resolveFighterEnvironmentCollisions(f);
          }

          // Check Interactive Corner Jump-Pads (Spring Launch Trampolines!)
          for (let j = 0; j < jumpPads.length; j++) {
            const jp = jumpPads[j];
            const lastTrig = jp.cooldownMap[f.id] || 0;
            if (
              now - lastTrig > 950 &&
              f.y < 0.65 &&
              Math.hypot(f.x - jp.x, f.z - jp.z) < jp.radius
            ) {
              jp.cooldownMap[f.id] = now;
              f.vy = 16.2;
              f.grounded = false;
              f.jiggleVelY += 5.5;
              if (f.isPlayer) crayonAudio.playSpringPadBoing();
              spawnStylizedHitEffect(jp.x, 0.35, jp.z, '#38BDF8');
            }
          }

          // Jump & Vertical Gravity
          const wasGrounded = f.grounded;
          const floorY = getFloorHeightAt(f.x, f.z, f.y);
          if (wantsJump && f.grounded) {
            f.vy = 10.4;
            f.grounded = false;
            f.jiggleVelY += 4.2; // Stretch upward on jump takeoff!
            if (f.isPlayer) crayonAudio.playJumpBoing();
          }

          const preLandVy = f.vy;
          f.vy -= 23.5 * dt;
          f.y += f.vy * dt;

          if (f.y <= floorY) {
            f.y = floorY;
            if (!wasGrounded && preLandVy < -2.5) {
              // Bouncy squash jiggle on landing!
              f.jiggleVelY -= Math.min(5.2, Math.abs(preLandVy) * 0.38);
            }
            f.vy = 0;
            f.grounded = true;
          }

          // Player Auto-Aim & Auto-Shoot ONLY When Enemy is in Camera Sights AND Clear Line of Sight!
          if (f.isPlayer) {
            let bestTarget: ArenaFighter | null = null;
            let bestDist = 24.0;
            fighters.forEach((other) => {
              if (other.id !== f.id && other.respawnTimer <= 0) {
                const d = Math.hypot(other.x - f.x, other.z - f.z);
                if (
                  d < bestDist &&
                  isInCameraSights(other.x, other.y + 0.98, other.z) &&
                  hasLineOfSight(
                    f.x,
                    f.y + 0.98,
                    f.z,
                    other.x,
                    other.y + 0.98,
                    other.z
                  )
                ) {
                  bestDist = d;
                  bestTarget = other;
                }
              }
            });

            if (bestTarget) {
              const target = bestTarget as ArenaFighter;
              // Slight predictive lead on moving targets so skilled player movement connects cleanly!
              const leadT = Math.min(0.22, bestDist / 37.5);
              const aimX = target.x + target.vx * leadT * 0.45;
              const aimZ = target.z + target.vz * leadT * 0.45;
              const aimYaw = Math.atan2(aimX - f.x, aimZ - f.z);
              f.targetFacingYaw = aimYaw;
              f.aimHoldTimer = 0.45;
              if (f.fireCooldown <= 0) {
                fireFighterBlaster(f, aimYaw, target.y + 0.95, bestDist);
                multiplayerClient.sendGameEvent('gun:fire', {
                  slotIndex: f.spawnIndex,
                  aimYaw,
                  targetY: target.y + 0.95,
                  dist: bestDist,
                });
              }
            }
          }
        });

        // Broadcast local player real-time state at ~28Hz to connected custom room peers
        netSyncAccum += rawDt;
        if (netSyncAccum >= 0.036) {
          netSyncAccum = 0;
          multiplayerClient.sendPlayerTick({
            slotIndex: playerFighter.spawnIndex,
            x: playerFighter.x,
            y: playerFighter.y,
            z: playerFighter.z,
            vx: playerFighter.vx,
            vy: playerFighter.vy,
            vz: playerFighter.vz,
            yaw: playerFighter.facingYaw,
            hp: Math.round(playerFighter.hp),
            maxHp: playerFighter.maxHp,
            kills: playerFighter.kills,
            deaths: playerFighter.deaths,
            weapon: playerFighter.weaponType,
          });
        }

        resolveFighterBodyCollisions();

        // Smooth Visual Transform, Walk Stride & Spring-Dampened 3D Jiggle Physics!
        fighters.forEach((f) => {
          if (f.respawnTimer > 0) return;

          f.visualY += (f.y - f.visualY) * Math.min(1, dt * 20);
          f.facingYaw = lerpAngleShortest(
            f.facingYaw,
            f.targetFacingYaw,
            Math.min(1, dt * 15)
          );

          f.group.position.set(f.x, f.visualY, f.z);
          f.group.rotation.y = f.facingYaw;

          // Update Spring-Damper Jiggle Oscillators (Torso Squash/Stretch + Head/Belly Wobble)
          const springStiff = 195;
          const springDamp = 10.5;
          f.jiggleVelY += (-springStiff * f.jiggleY - springDamp * f.jiggleVelY) * dt;
          f.jiggleY = THREE.MathUtils.clamp(
            f.jiggleY + f.jiggleVelY * dt,
            -0.32,
            0.32
          );

          f.jiggleVelRoll +=
            (-160 * f.jiggleRoll - 9.5 * f.jiggleVelRoll) * dt;
          f.jiggleRoll = THREE.MathUtils.clamp(
            f.jiggleRoll + f.jiggleVelRoll * dt,
            -0.28,
            0.28
          );

          const speedMag = Math.hypot(f.vx, f.vz);
          const runBounce =
            speedMag > 0.6 && f.grounded
              ? Math.sin(f.walkPhase * 2) * 0.045
              : 0;
          const totalJiggleY = f.jiggleY + runBounce;

          if (f.rig.bodyGroup) {
            const sx = 1 - totalJiggleY * 0.24;
            const sy = 1 + totalJiggleY * 0.32;
            const sz = 1 - totalJiggleY * 0.24;
            f.rig.bodyGroup.scale.set(sx, sy, sz);
            f.rig.bodyGroup.rotation.z = f.jiggleRoll * 0.65;
          }

          if (f.rig.headGroup) {
            const headSquash = 1 - totalJiggleY * 0.16;
            const headStretch = 1 + totalJiggleY * 0.2;
            f.rig.headGroup.scale.set(headStretch, headSquash, headStretch);
            f.rig.headGroup.rotation.z = -f.jiggleRoll * 0.85;
            f.rig.headGroup.rotation.x =
              -f.gunRecoil * 0.28 + totalJiggleY * 0.25;
          }

          if (speedMag > 0.6 && f.grounded) {
            if (f.isPlayer) {
              crayonAudio.playFootstep();
            }
            f.walkPhase += dt * Math.min(14, speedMag * 1.45);
            const stride = Math.sin(f.walkPhase) * 0.42;
            if (f.rig.leftFoot) f.rig.leftFoot.rotation.x = stride;
            if (f.rig.rightFoot) f.rig.rightFoot.rotation.x = -stride;
            if (f.rig.bodyGroup) {
              f.rig.bodyGroup.position.y = Math.abs(Math.sin(f.walkPhase)) * 0.036;
            }
          } else {
            if (f.rig.leftFoot) f.rig.leftFoot.rotation.x *= 0.82;
            if (f.rig.rightFoot) f.rig.rightFoot.rotation.x *= 0.82;
            if (f.rig.bodyGroup) f.rig.bodyGroup.position.y *= 0.82;
          }

          // ONLY show the overhead 3D Health Bar for 2.2 seconds when the character is actually hit!
          const showHpOnHit =
            f.hp > 0 &&
            (f.hitFlashTimer > 0 || (f.timeSinceLastHit < 2.2 && f.hp < f.maxHp));
          f.hpBarBg.visible = showHpOnHit;
          f.hpBarFill.visible = showHpOnHit;
          if (showHpOnHit) {
            f.hpBarBg.quaternion.copy(camera.quaternion);
            f.hpBarFill.quaternion.copy(camera.quaternion);
            const hpRatio = Math.max(0.01, Math.min(1, f.hp / f.maxHp));
            f.hpBarFill.scale.x = hpRatio;
          }
        });

        // Update Bullets with 4x Sub-Stepped Swept Collision
        for (let i = bullets.length - 1; i >= 0; i--) {
          const b = bullets[i];
          b.life -= dt;
          let hitSomething = false;

          const subSteps = 4;
          const subDt = dt / subSteps;

          for (let step = 0; step < subSteps; step++) {
            b.x += b.vx * subDt;
            b.y += b.vy * subDt;
            b.z += b.vz * subDt;

            for (let j = 0; j < fighters.length; j++) {
              const target = fighters[j];
              if (target.id === b.ownerId || target.respawnTimer > 0) {
                continue;
              }
              const dx = b.x - target.x;
              const dz = b.z - target.z;
              const dy = b.y - (target.y + 1.0);
              if (Math.hypot(dx, dz) < 0.86 + b.radius && Math.abs(dy) < 1.35) {
                // If target has 1.5-Second Yellow Spawn Shield active, deflect bullet with ZERO damage!
                if (target.invulnTimer > 0) {
                  spawnStylizedHitEffect(b.x, b.y, b.z, '#FACC15');
                  target.jiggleVelY -= 1.8;
                  hitSomething = true;
                  break;
                }

                target.hp -= b.damage;
                target.hitFlashTimer = 0.22;
                target.timeSinceLastHit = 0;
                target.lastDamagedById = b.ownerId;

                // Jiggle impulse when hit by a projectile!
                target.jiggleVelY -= 3.4;
                const bLen = Math.hypot(b.vx, b.vz) || 1;
                const hitDirX = b.vx / bLen;
                const hitDirZ = b.vz / bLen;
                target.jiggleVelRoll += hitDirX * 4.5;

                // Fire Blaster ignites enemies with Burn Damage-Over-Time!
                if (b.weaponType === 'fire') {
                  target.burnTimer = 2.6;
                  target.burnTickTimer = 0.32;
                  target.burnedById = b.ownerId;
                }

                target.knockVx += hitDirX * b.knockback;
                target.knockVz += hitDirZ * b.knockback;

                // Spawn 3D Blood Splatter & Droplets on Fighter Hit!
                const targetFloorY = getFloorHeightAt(target.x, target.z, target.y);
                const bloodIntensity =
                  b.damage >= 28 ? 1.35 : b.weaponType === 'shotgun' ? 0.85 : 1.05;
                spawnBloodHitEffect(
                  b.x,
                  b.y,
                  b.z,
                  targetFloorY,
                  hitDirX,
                  hitDirZ,
                  bloodIntensity
                );

                if (b.ownerId === playerFighter.id) {
                  crayonAudio.playHitMarker();
                  if (target.hp > 0) {
                    crayonAudio.playEnemyHurt(target.charConfig.id);
                  }
                  playerFighter.superCharge = Math.min(
                    100,
                    playerFighter.superCharge + 10
                  );
                } else if (target.isPlayer && target.hp > 0) {
                  crayonAudio.playPlayerHurt(target.charConfig.id);
                }

                if (target.hp <= 0) {
                  awardElimination(target, b.ownerId);
                }
                hitSomething = true;
                break;
              }
            }
            if (hitSomething) break;

            for (let j = 0; j < solidColliders.length; j++) {
              const sc = solidColliders[j];
              if (
                Math.abs(b.x - sc.x) <= sc.w * 0.5 + 0.12 &&
                Math.abs(b.z - sc.z) <= sc.d * 0.5 + 0.12 &&
                b.y >= sc.y - sc.h * 0.5 &&
                b.y <= sc.y + sc.h * 0.5
              ) {
                spawnStylizedHitEffect(b.x, b.y, b.z, '#CBD5E1');
                if (b.ownerId === playerFighter.id) {
                  crayonAudio.playWallRicochet();
                }
                hitSomething = true;
                break;
              }
            }
            if (hitSomething) break;

            for (let j = 0; j < cylinderColliders.length; j++) {
              const cyl = cylinderColliders[j];
              if (
                Math.hypot(b.x - cyl.x, b.z - cyl.z) <= cyl.radius &&
                b.y <= cyl.height
              ) {
                spawnStylizedHitEffect(b.x, b.y, b.z, '#86EFAC');
                if (b.ownerId === playerFighter.id) {
                  crayonAudio.playWallRicochet();
                }
                hitSomething = true;
                break;
              }
            }
            if (hitSomething) break;
          }

          b.mesh.position.set(b.x, b.y, b.z);
          if (b.weaponType === 'fire') {
            const fireProgress = 1 - Math.max(0, b.life / b.maxLife);
            b.mesh.scale.setScalar(1 + fireProgress * 1.45);
            b.mesh.rotation.x += dt * 12;
            b.mesh.rotation.y += dt * 14;
          }

          if (
            hitSomething ||
            b.life <= 0 ||
            Math.abs(b.x) > 36 ||
            Math.abs(b.z) > 30
          ) {
            scene.remove(b.mesh);
            bullets.splice(i, 1);
          }
        }
      }

      // Update Stylized 3D VFX Particles (Including 3D Blood Droplets, Mist & Floor Splatters!)
      for (let i = vfxParticles.length - 1; i >= 0; i--) {
        const p = vfxParticles[i];
        p.life -= dt;
        const progress = 1 - Math.max(0, p.life / p.maxLife);

        if (p.kind === 'ring') {
          const s = 1 + progress * 4.2;
          p.mesh.scale.set(s, s, 1);
          const m = (p.mesh as THREE.Mesh).material as THREE.MeshBasicMaterial;
          m.opacity = Math.max(0, 1 - progress);
        } else if (p.kind === 'pillar') {
          const sXZ = Math.max(0.05, 1 - progress * 0.85);
          p.mesh.scale.set(sXZ, 1 + progress * 0.5, sXZ);
          const m = (p.mesh as THREE.Mesh).material as THREE.MeshBasicMaterial;
          m.opacity = Math.max(0, (1 - progress) * 0.75);
        } else if (p.kind === 'streak') {
          p.mesh.position.x += p.vx * dt;
          p.mesh.position.y += p.vy * dt;
          p.mesh.position.z += p.vz * dt;
          p.vy -= 12.0 * dt;
          p.mesh.scale.setScalar(Math.max(0.05, 1 - progress));
        } else if (p.kind === 'star' || p.kind === 'shell') {
          p.mesh.position.x += p.vx * dt;
          p.mesh.position.y += p.vy * dt;
          p.mesh.position.z += p.vz * dt;
          p.vy -= 14.0 * dt;
          p.mesh.rotation.x += (p.rotSpeed || 10) * dt;
          p.mesh.rotation.y += (p.rotSpeed || 10) * dt;
          p.mesh.scale.setScalar(Math.max(0.05, 1 - progress * 0.8));
        } else if (p.kind === 'blood_mist') {
          p.mesh.position.x += p.vx * dt;
          p.mesh.position.y += p.vy * dt;
          p.mesh.position.z += p.vz * dt;
          const s = 1 + progress * 2.6;
          p.mesh.scale.setScalar(s);
          const m = (p.mesh as THREE.Mesh).material as THREE.MeshBasicMaterial;
          m.opacity = Math.max(0, (1 - progress) * 0.68);
        } else if (p.kind === 'blood_drop') {
          p.mesh.position.x += p.vx * dt;
          p.mesh.position.y += p.vy * dt;
          p.mesh.position.z += p.vz * dt;
          p.vy -= 18.5 * dt;
          const fY = p.floorY ?? 0.04;
          if (p.mesh.position.y <= fY) {
            p.mesh.position.y = fY;
            p.vx *= 0.25;
            p.vz *= 0.25;
            p.vy = 0;
            p.mesh.scale.set(1.4, 0.25, 1.4);
          } else {
            p.mesh.scale.setScalar(Math.max(0.15, 1 - progress * 0.55));
          }
        } else if (p.kind === 'blood_splat') {
          const m = (p.mesh as THREE.Mesh).material as THREE.MeshBasicMaterial;
          const fadeStart = 0.65;
          m.opacity =
            progress < fadeStart
              ? 0.82
              : Math.max(0, 0.82 * (1 - (progress - fadeStart) / (1 - fadeStart)));
        }

        if (p.life <= 0) {
          scene.remove(p.mesh);
          vfxParticles.splice(i, 1);
        }
      }

      // Camera Tracking (Defaults to Follow Camera)
      if (screenShakeMag > 0) {
        screenShakeMag = Math.max(0, screenShakeMag - dt * 2.2);
      }
      const shakeX = (Math.random() - 0.5) * screenShakeMag;
      const shakeY = (Math.random() - 0.5) * screenShakeMag;

      // Permanent Locked Follow Camera View (Adapts smoothly to Portrait & Landscape Mobile/Tablets!)
      const camTargetX = playerFighter.x * (0.82 - portraitFactor * 0.12);
      const camTargetY =
        10.6 + portraitFactor * 3.4 + playerFighter.visualY * 0.55;
      const camTargetZ = playerFighter.z + 11.4 + portraitFactor * 3.8;
      const lookX = playerFighter.x * 0.94;
      const lookY = playerFighter.visualY + 1.3;
      const lookZ = playerFighter.z - 2.2 - portraitFactor * 0.6;

      camera.position.x += (camTargetX + shakeX - camera.position.x) * Math.min(1, dt * 8);
      camera.position.y += (camTargetY + shakeY - camera.position.y) * Math.min(1, dt * 8);
      camera.position.z += (camTargetZ - camera.position.z) * Math.min(1, dt * 8);
      camera.lookAt(lookX, lookY, lookZ);

      // Periodic HUD State Sync (throttled to 4Hz for locked 120 FPS!)
      hudSyncAccum += rawDt;
      if (hudSyncAccum >= 0.25) {
        hudSyncAccum = 0;
        const sortedStandings = [...fighters]
          .sort((a, b) => b.kills - a.kills || a.deaths - b.deaths)
          .map((f) => ({
            id: f.id,
            name: f.name,
            kills: f.kills,
            deaths: f.deaths,
            isPlayer: f.isPlayer,
            charId: f.charConfig.id,
            dressColor: f.dressColor,
          }));
        const pRank =
          sortedStandings.findIndex((s) => s.id === playerFighter.id) + 1;
        const timeRemainingSec = Math.max(
          0,
          effectiveMatchDurationSec - matchElapsedSec
        );

        onHudUpdate({
          countdown: Math.ceil(countdownSec),
          raceTimeSec: matchElapsedSec,
          timeRemainingSec,
          playerProgressPct: Math.min(
            100,
            Math.round((matchElapsedSec / effectiveMatchDurationSec) * 100)
          ),
          sectionName: rushMap?.name || '4P Solo Gun Fight',
          stageIndex: 1,
          fallsCount: playerFighter.deaths,
          maxFalls: playerFighter.kills,
          isOvertime: isOvertimeRound,
          playerHp: Math.max(0, Math.round(playerFighter.hp)),
          playerMaxHp: playerFighter.maxHp,
          playerKills: playerFighter.kills,
          playerDeaths: playerFighter.deaths,
          playerRank: pRank,
          weaponName:
            playerFighter.weaponType === 'shotgun'
              ? 'SHOTGUN'
              : playerFighter.weaponType === 'fire'
                ? 'FIRE'
                : 'ASSAULT',
          weaponTimerSec: playerFighter.weaponTimer,
          dashCooldownPct: Math.round(
            (1 - playerFighter.dashCooldown / 1.5) * 100
          ),
          superChargePct: Math.round(playerFighter.superCharge),
          standings: sortedStandings,
        });
      }

      postPipeline.render();
      if (!capturedLiveThumb) {
        capturedLiveThumb = true;
        try {
          setLiveRushMapThumbnail(
            rushMap.id,
            renderer.domElement.toDataURL('image/jpeg', 0.88)
          );
        } catch {
          // ignore
        }
      }
    };

    animId = requestAnimationFrame(animate);

    return () => {
      unsubRemoteTick();
      unsubRemoteEvent();
      cancelAnimationFrame(animId);
      resizeObserver.disconnect();
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('resize', handleResize);
      postPipeline.dispose();
      renderer.dispose();
    };
  }, [
    playerChar,
    rushMap,
    difficulty,
    matchDurationSec,
    actionTriggerRef,
    onHudUpdate,
    onRaceFinished,
  ]);

  return (
    <div
      ref={mountRef}
      className="fixed inset-0 w-full h-full overflow-hidden select-none"
    />
  );
};
