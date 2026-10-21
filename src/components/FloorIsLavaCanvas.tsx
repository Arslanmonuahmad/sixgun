import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import {
  AIDifficulty,
  CameraPreset,
  CharacterConfig,
  CHARACTER_OUTFITS,
  CRAYON_CHARACTERS,
  DIFFICULTY_LEVELS,
  FloorIsLavaMapId,
  FLOOR_IS_LAVA_MAPS,
  GameState,
} from '../types/game';
import {
  createCrayonCharacter,
  createLushGrassBorderCluster,
  createSculptedAlpineMountainPeak,
  createStylizedSkyVehicle,
} from '../three/crayonModels';
import {
  addCrayonOutline,
  createCourtFloorTexture,
  createCrayonToonMaterial,
  createCrayonWoodTexture,
  createLushGrassTurfTexture,
  createStylizedRoofTileTexture,
  createStylizedSkyDomeTexture,
  createStylizedStoneWallTexture,
  createStylizedWaterTexture,
  createWaterfallStreamTexture,
  getToonGradientMap,
} from '../three/crayonMaterials';
import { createStylizedPostPipeline } from '../three/postProcessing';
import { crayonAudio } from '../audio/crayonAudio';
import { CustomSlotInfo, multiplayerClient } from '../network/multiplayerClient';

export interface FloorIsLavaHudState {
  countdown: number;
  aliveCount: number;
  totalPlayers: number;
  survivalTimeSec: number;
  timeRemainingSec?: number;
  playerLives?: number;
  playerHp?: number;
  playerMaxHp?: number;
  blueAliveCount?: number;
  redAliveCount?: number;
  playerKills?: number;
  holdingBallType?: 'none' | 'crimson' | 'gold' | 'turbo';
  superReady?: boolean;
  currentRound?: number;
  maxRounds?: number;
  isExtraRound?: boolean;
  playerRoundWins?: number;
  roundStandings?: Array<{
    id: string;
    name: string;
    roundWins: number;
    kills: number;
    hp?: number;
    maxHp?: number;
    alive: boolean;
    isPlayer: boolean;
    colorHex: string;
  }>;
  lavaLevelMeters: number;
  lavaWarningState: 'STABLE' | 'RISING!' | 'ERUPTING!';
  tilesCrumbled: number;
  currentTier: number;
  eliminationBanner: string | null;
}

interface FloorIsLavaCanvasProps {
  gameState: GameState;
  playerCharacter: CharacterConfig;
  playerDisplayName?: string;
  customSlots?: CustomSlotInfo[];
  aiDifficulty: AIDifficulty;
  cameraPreset: CameraPreset;
  lavaMapId?: FloorIsLavaMapId;
  matchDurationSec?: number;
  gameSpeedMultiplier?: number;
  cameraFov?: number;
  onHudUpdate: (hud: FloorIsLavaHudState) => void;
  onCallout?: (text: string, color?: string) => void;
  onGameOver: (
    winner: 'player' | 'ai',
    stats: {
      playerScore: number;
      aiScore: number;
      bestRally: number;
      perfectSpikes: number;
      lastPointWinner: 'player' | 'ai';
      lastPointReason: string;
      raceTimeSec: number;
      raceMaxFalls: number;
      raceProgressPct: number;
    }
  ) => void;
}

type DodgeballKind = 'crimson' | 'gold' | 'turbo';

interface DodgeballObject {
  id: number;
  kind: DodgeballKind;
  mesh: THREE.Group;
  ballSphere: THREE.Mesh;
  floorRing: THREE.Mesh;
  beaconArrow: THREE.Mesh;
  trailMeshes: THREE.Mesh[];
  trailHistory: Array<{ x: number; y: number; z: number }>;
  state: 'free' | 'held' | 'thrown';
  holderId: string | null;
  targetId: string | null;
  isSuperThrow: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  homeX: number;
  homeZ: number;
  idleTimer: number;
  pickupCooldown: number;
  lastHitVictimId: string | null;
}

interface DodgeballAthlete {
  id: string;
  name: string;
  colorHex: string;
  isPlayer: boolean;
  config: CharacterConfig;
  rig: ReturnType<typeof createCrayonCharacter>;
  group: THREE.Group;
  hpBarBg: THREE.Mesh;
  hpBarFill: THREE.Mesh;
  shieldMesh: THREE.Mesh;
  heldBallId: number | null;
  spawnX: number;
  spawnZ: number;
  spawnYaw: number;
  x: number;
  y: number;
  z: number;
  visualY: number;
  vx: number;
  vy: number;
  vz: number;
  knockVx: number;
  knockVz: number;
  grounded: boolean;
  hp: number;
  maxHp: number;
  eliminated: boolean;
  roundWins: number;
  kills: number;
  hitsScored: number;
  catchesMade: number;
  superCharge: number;
  throwSwingTimer: number;
  dodgeCooldown: number;
  dodgeActiveTimer: number;
  catchWindowTimer: number;
  invulnTimer: number;
  hitFlashTimer: number;
  facingYaw: number;
  targetYaw: number;
  walkCycle: number;
  jiggleY: number;
  jiggleVelY: number;
  jiggleRoll: number;
  jiggleVelRoll: number;
  aiThinkTimer: number;
  aiHoldTimer: number;
  aiStrafeDir: number;
  aiRole: 'rusher' | 'flanker' | 'tactician';
  aiGoalX: number;
  aiGoalZ: number;
  aiGoalTimer: number;
  aiThrowDelay: number;
  aiSpeedVar: number;
  aiSpeedTrait?: number;
  slotIndex?: number;
  remotePlayerId?: string | null;
  lastRemoteTickAt?: number;
}

interface VfxBurst {
  mesh: THREE.Object3D;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
  kind: 'ring' | 'star' | 'blood_drop' | 'blood_mist' | 'blood_splat';
  floorY?: number;
}

function createCleanToonMaterial(hexColor: string): THREE.MeshToonMaterial {
  return new THREE.MeshToonMaterial({
    color: new THREE.Color(hexColor),
    gradientMap: getToonGradientMap(),
  });
}

const nukeStoneTexCache = new Map<string, THREE.CanvasTexture>();

/**
 * Smooth, Zero-Glitter Hand-Inked Stone Wall Texture (No procedural grain or mipmap shimmer!)
 */
function createCleanCastleStoneTexture(
  baseHex: string,
  mortarHex: string
): THREE.CanvasTexture {
  const cacheKey = `${baseHex}_${mortarHex}`;
  const cached = nukeStoneTexCache.get(cacheKey);
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
  nukeStoneTexCache.set(cacheKey, tex);
  return tex;
}

function createRoundedRectShape(
  width: number,
  height: number,
  radius: number
): THREE.Shape {
  const shape = new THREE.Shape();
  const x = -width / 2;
  const y = -height / 2;
  const r = Math.min(radius, width / 2, height / 2);

  shape.moveTo(x + r, y);
  shape.lineTo(x + width - r, y);
  shape.quadraticCurveTo(x + width, y, x + width, y + r);
  shape.lineTo(x + width, y + height - r);
  shape.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  shape.lineTo(x + r, y + height);
  shape.quadraticCurveTo(x, y + height, x, y + height - r);
  shape.lineTo(x, y + r);
  shape.quadraticCurveTo(x, y, x + r, y);
  return shape;
}

function createDodgeballTexture(
  primaryHex: string,
  stripeHex: string
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = primaryHex;
    ctx.fillRect(0, 0, 256, 256);

    // Classic Pro Nuke Equatorial Core Band & Seam Lines
    ctx.fillStyle = stripeHex;
    ctx.fillRect(0, 102, 256, 52);

    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(0, 102);
    ctx.lineTo(256, 102);
    ctx.moveTo(0, 154);
    ctx.lineTo(256, 154);
    ctx.stroke();

    // Grip Dimple Dots
    ctx.fillStyle = 'rgba(255,255,255,0.34)';
    for (let x = 24; x < 256; x += 48) {
      ctx.beginPath();
      ctx.arc(x, 62, 9, 0, Math.PI * 2);
      ctx.arc(x, 194, 9, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  return tex;
}

function lerpAngleShortest(a: number, b: number, t: number): number {
  const diff =
    THREE.MathUtils.euclideanModulo(b - a + Math.PI, Math.PI * 2) - Math.PI;
  return a + diff * t;
}

export const FloorIsLavaCanvas: React.FC<FloorIsLavaCanvasProps> = ({
  gameState,
  playerCharacter,
  playerDisplayName,
  customSlots,
  aiDifficulty,
  lavaMapId = 'volcano_summit',
  matchDurationSec = 180,
  gameSpeedMultiplier = 1.0,
  cameraFov = 45,
  onHudUpdate,
  onCallout,
  onGameOver,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const gameStateRef = useRef<GameState>(gameState);
  gameStateRef.current = gameState;

  const speedMultRef = useRef<number>(gameSpeedMultiplier);
  speedMultRef.current = gameSpeedMultiplier;

  const fovRef = useRef<number>(cameraFov);
  fovRef.current = cameraFov;

  const onHudUpdateRef = useRef(onHudUpdate);
  onHudUpdateRef.current = onHudUpdate;

  const onCalloutRef = useRef(onCallout);
  onCalloutRef.current = onCallout;

  const onGameOverRef = useRef(onGameOver);
  onGameOverRef.current = onGameOver;

  // Controls:
  // Left Half = Floating Movement Joystick | Right Half / Mouse = Screen Rotation (camYaw & camPitch) + Throw/Catch
  const joystickRef = useRef<{ x: number; y: number; active: boolean }>({
    x: 0,
    y: 0,
    active: false,
  });
  const rightActionQueuedRef = useRef<boolean>(false);
  const dodgeQueuedRef = useRef<boolean>(false);
  const jumpQueuedRef = useRef<boolean>(false);
  const screenHeldRef = useRef<boolean>(false);
  const camYawOffsetRef = useRef<number>(0);
  const camPitchOffsetRef = useRef<number>(0.18);

  const joyContainerRef = useRef<HTMLDivElement | null>(null);
  const joyKnobRef = useRef<HTMLDivElement | null>(null);

  const joyPointerIdRef = useRef<number | null>(null);
  const joyOriginRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const lookPointerRef = useRef<{
    id: number | null;
    startX: number;
    startY: number;
    lastX: number;
    lastY: number;
    maxDrag: number;
    downTime: number;
  }>({
    id: null,
    startX: 0,
    startY: 0,
    lastX: 0,
    lastY: 0,
    maxDrag: 0,
    downTime: 0,
  });
  const lastMousePosRef = useRef<{ x: number; y: number; initialized: boolean }>({
    x: 0,
    y: 0,
    initialized: false,
  });
  const lastTapTimeRef = useRef<number>(0);
  const tapStreakRef = useRef<number>(0);

  // Compact Pro-Shooter Micro Crosshair Refs
  const crosshairRingRef = useRef<HTMLDivElement | null>(null);
  const crosshairDotRef = useRef<HTMLDivElement | null>(null);
  const crosshairLabelRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const mapConfig =
      FLOOR_IS_LAVA_MAPS.find((m) => m.id === lavaMapId) ||
      FLOOR_IS_LAVA_MAPS[0];
    const isJungleMap = mapConfig.id === 'hex_colosseum';

    const diffObj =
      DIFFICULTY_LEVELS.find((d) => d.id === aiDifficulty) ||
      DIFFICULTY_LEVELS[1];

    const width = container.clientWidth || window.innerWidth;
    const height = Math.max(1, container.clientHeight || window.innerHeight);

    const scene = new THREE.Scene();
    const fogHex = isJungleMap ? '#6EE7B7' : '#7DD3FC';
    scene.background = new THREE.Color(fogHex);
    scene.fog = new THREE.FogExp2(fogHex, 0.0036);

    const camera = new THREE.PerspectiveCamera(
      fovRef.current,
      width / height,
      0.5,
      260
    );
    camera.position.set(0, 6.8, 16.5);
    camera.lookAt(0, 1.2, 0);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setSize(width, height);
    // Cap pixel ratio at 1.85 for locked 60/120 FPS with zero lag or shimmer!
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.85));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.96;

    const maxAnisotropy = Math.min(
      16,
      renderer.capabilities.getMaxAnisotropy() || 8
    );

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const postPipeline = createStylizedPostPipeline(
      renderer,
      scene,
      camera,
      width,
      height,
      {
        bloomStrength: 0.2,
        bloomRadius: 0.4,
        bloomThreshold: 0.88,
        vignetteIntensity: 0.22,
      }
    );

    // 3D Stylized Painted Sky Dome with Sunbeams & Cirrus Clouds
    const skyTexture = createStylizedSkyDomeTexture(
      isJungleMap ? '#0284C7' : '#1D4ED8',
      isJungleMap ? '#A7F3D0' : '#93C5FD',
      '#FEF08A'
    );
    const skyDomeMesh = new THREE.Mesh(
      new THREE.SphereGeometry(230, 24, 16),
      new THREE.MeshBasicMaterial({
        map: skyTexture,
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
      })
    );
    skyDomeMesh.position.y = -8;
    scene.add(skyDomeMesh);

    // Crisp Cool-Sky & High-Contrast Daylight Lighting Rig (100% Zero Shadow Acne Glitter!)
    const hemiLight = new THREE.HemisphereLight(
      isJungleMap ? 0xdcfce7 : 0xcbd5e1,
      isJungleMap ? 0x15803d : 0x64748b,
      0.88
    );
    hemiLight.position.set(0, 32, 0);
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xf8fafc, 1.26);
    dirLight.position.set(22, 46, 28);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    dirLight.shadow.camera.near = 2;
    dirLight.shadow.camera.far = 130;
    const d = 32;
    dirLight.shadow.camera.left = -d;
    dirLight.shadow.camera.right = d;
    dirLight.shadow.camera.top = d;
    dirLight.shadow.camera.bottom = -d;
    // CRITICAL: normalBias + bias completely eliminates shadow acne glitter on flat floors!
    dirLight.shadow.bias = -0.0006;
    dirLight.shadow.normalBias = 0.045;
    scene.add(dirLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 0.45);
    rimLight.position.set(-26, 22, -22);
    scene.add(rimLight);

    const worldGroup = new THREE.Group();
    scene.add(worldGroup);

    // Smooth, Grain-Free Cel-Shaded Materials (100% Zero Glitter / Zero Shimmer!)
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
    const alpineRockMat = createCleanToonMaterial(isJungleMap ? '#57534E' : '#475569');
    const lightGraniteMat = createCleanToonMaterial(isJungleMap ? '#78716C' : '#64748B');
    const islandGrassTex = createLushGrassTurfTexture(
      isJungleMap ? '#16A34A' : '#22C55E',
      maxAnisotropy,
      6
    );
    const islandGrassMat = new THREE.MeshToonMaterial({
      color: 0xffffff,
      map: islandGrassTex,
      gradientMap: getToonGradientMap(),
    });
    const whiteMat = createCleanToonMaterial('#CBD5E1');
    const redMat = createCleanToonMaterial('#EF4444');
    const blueMat = createCleanToonMaterial('#2563EB');
    const goldMat = createCleanToonMaterial('#FACC15');
    const slateIronMat = createCleanToonMaterial('#1E293B');

    // =========================================================================
    // 1. SAME PRO COURT GROUND TEXTURE AS OTHER GAMES + SCENIC OUTER ENVIRONMENT
    //    (Sculpted Island, Snow-Capped Alpine Mountains, Lighthouse Cove,
    //     North Citadel / Mayan Pyramid Temple, Waterfalls & Sky Vehicles!)
    // =========================================================================
    const COURT_HALF_W = 16.4; // Total Playable Width = 32.8m
    const COURT_HALF_D = 16.4; // Total Playable Depth = 32.8m

    // A. Deep Sapphire Ocean & Glowing Turquoise Lagoon Shelf
    const deepOceanGeo = new THREE.PlaneGeometry(460, 460, 1, 1);
    deepOceanGeo.rotateX(-Math.PI / 2);
    const deepOceanTex = createStylizedWaterTexture(
      isJungleMap ? '#0D9488' : '#0284C7',
      maxAnisotropy,
      16
    );
    const deepOceanMesh = new THREE.Mesh(
      deepOceanGeo,
      new THREE.MeshToonMaterial({
        color: 0xffffff,
        map: deepOceanTex,
        gradientMap: getToonGradientMap(),
      })
    );
    deepOceanMesh.position.y = -4.2;
    deepOceanMesh.matrixAutoUpdate = false;
    deepOceanMesh.updateMatrix();
    worldGroup.add(deepOceanMesh);

    const lagoonShape = createRoundedRectShape(92, 86, 22);
    const lagoonGeo = new THREE.ShapeGeometry(lagoonShape, 28);
    lagoonGeo.rotateX(-Math.PI / 2);
    const lagoonTex = createStylizedWaterTexture(
      isJungleMap ? '#2DD4BF' : '#38BDF8',
      maxAnisotropy,
      5
    );
    const lagoonMesh = new THREE.Mesh(
      lagoonGeo,
      new THREE.MeshBasicMaterial({
        map: lagoonTex,
        transparent: true,
        opacity: 0.74,
      })
    );
    lagoonMesh.position.y = -3.92;
    worldGroup.add(lagoonMesh);

    const animatedWaveRings: THREE.Mesh[] = [];
    [0, 1, 2].forEach((idx) => {
      const surfShape = createRoundedRectShape(
        70.5 + idx * 4.2,
        64.5 + idx * 4.2,
        14 + idx * 1.2
      );
      const surfGeo = new THREE.ShapeGeometry(surfShape, 24);
      surfGeo.rotateX(-Math.PI / 2);
      const surfMesh = new THREE.Mesh(
        surfGeo,
        new THREE.MeshBasicMaterial({
          color: idx === 0 ? 0xe0f2fe : idx === 1 ? 0xbae6fd : 0x7dd3fc,
          transparent: true,
          opacity: idx === 0 ? 0.68 : idx === 1 ? 0.42 : 0.24,
        })
      );
      surfMesh.position.y = -3.82 + idx * 0.03;
      worldGroup.add(surfMesh);
      animatedWaveRings.push(surfMesh);
    });

    // B. Sculpted Rounded-Rectangle Island Cliff Base & Lush Emerald Turf Plateau (Well below y = 0.0 for zero Z-fighting!)
    const cliffShape = createRoundedRectShape(66, 60, 11);
    const cliffGeo = new THREE.ExtrudeGeometry(cliffShape, {
      depth: 3.0,
      bevelEnabled: true,
      bevelThickness: 0.4,
      bevelSize: 1.0,
      bevelSegments: 3,
      curveSegments: 20,
    });
    cliffGeo.rotateX(Math.PI / 2);
    const cliffMesh = new THREE.Mesh(cliffGeo, lightGraniteMat);
    cliffMesh.position.y = -1.2;
    cliffMesh.receiveShadow = true;
    worldGroup.add(cliffMesh);

    const turfShape = createRoundedRectShape(60, 54, 9);
    const turfGeo = new THREE.ExtrudeGeometry(turfShape, {
      depth: 1.2,
      bevelEnabled: false,
      curveSegments: 20,
    });
    turfGeo.rotateX(Math.PI / 2);
    const turfMesh = new THREE.Mesh(turfGeo, islandGrassMat);
    turfMesh.position.y = -0.35;
    turfMesh.receiveShadow = true;
    worldGroup.add(turfMesh);

    // C. EXACT SAME GROUND TEXTURE AS VOLLEYBALL & GUN FIGHT (`createCourtFloorTexture`)!
    const courtBaseSlab = new THREE.Mesh(
      new THREE.BoxGeometry(36.8, 0.38, 36.8),
      createCleanToonMaterial(isJungleMap ? '#15803D' : '#10B981')
    );
    courtBaseSlab.position.set(0, -0.25, 0);
    courtBaseSlab.receiveShadow = true;
    worldGroup.add(courtBaseSlab);

    const courtDeckTex = createCourtFloorTexture(
      isJungleMap ? '#22C55E' : '#38BDF8',
      isJungleMap ? '#15803D' : '#10B981',
      isJungleMap ? '#ECFDF5' : '#E2E8F0',
      maxAnisotropy
    );
    const courtPlaneGeo = new THREE.PlaneGeometry(35.2, 35.2);
    courtPlaneGeo.rotateX(-Math.PI / 2);
    const courtPlaneMat = new THREE.MeshToonMaterial({
      color: 0xffffff,
      map: courtDeckTex,
      gradientMap: getToonGradientMap(),
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });
    const courtPlane = new THREE.Mesh(courtPlaneGeo, courtPlaneMat);
    courtPlane.position.set(0, 0.018, 0);
    courtPlane.receiveShadow = true;
    worldGroup.add(courtPlane);

    // Crisp Center Nuke Pedestal Ring on the Court
    const centerShowdownRing = new THREE.Mesh(
      new THREE.RingGeometry(1.45, 1.72, 32),
      new THREE.MeshBasicMaterial({
        color: 0xfef08a,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.72,
      })
    );
    centerShowdownRing.rotation.x = -Math.PI / 2;
    centerShowdownRing.position.set(0, 0.026, 0);
    worldGroup.add(centerShowdownRing);

    // D. Cascading Crystal Waterfalls pouring off the Island Cliffs into the Lagoon
    const waterfallTextures: THREE.Texture[] = [];
    const waterfallFoamPuffs: THREE.Mesh[] = [];
    const buildWaterfall = (
      x: number,
      z: number,
      w: number,
      rotY: number
    ) => {
      const wf = new THREE.Group();
      const wfTex = createWaterfallStreamTexture('#7DD3FC', maxAnisotropy);
      waterfallTextures.push(wfTex);
      const wfMat = new THREE.MeshBasicMaterial({
        map: wfTex,
        transparent: true,
        opacity: 0.92,
      });
      const stream = new THREE.Mesh(
        new THREE.BoxGeometry(w, 3.8, 0.35),
        wfMat
      );
      stream.position.y = -2.1;
      wf.add(stream);

      [-w * 0.32, 0, w * 0.32].forEach((fx, i) => {
        const topFoam = new THREE.Mesh(
          new THREE.SphereGeometry(0.42 + (i % 2) * 0.12, 10, 8),
          whiteMat
        );
        topFoam.position.set(fx, -0.22, 0.2);
        wf.add(topFoam);
        waterfallFoamPuffs.push(topFoam);

        const botFoam = new THREE.Mesh(
          new THREE.SphereGeometry(0.62 + (i % 2) * 0.16, 10, 8),
          whiteMat
        );
        botFoam.position.set(fx, -3.75, 0.28);
        wf.add(botFoam);
        waterfallFoamPuffs.push(botFoam);
      });
      wf.position.set(x, -0.2, z);
      wf.rotation.y = rotY;
      worldGroup.add(wf);
    };
    buildWaterfall(-30.2, 0.0, 3.4, -Math.PI / 2);
    buildWaterfall(30.2, 0.0, 3.4, Math.PI / 2);
    buildWaterfall(-13.0, 27.2, 3.2, 0);
    buildWaterfall(13.0, 27.2, 3.2, 0);

    // E. Iconic Red-and-White Striped Coastal Lighthouse on the East Cove
    const lighthouse = new THREE.Group();
    const lhBase = new THREE.Mesh(
      new THREE.CylinderGeometry(2.2, 2.6, 1.2, 16),
      alpineRockMat
    );
    lhBase.position.y = 0.6;
    addCrayonOutline(lhBase, 0.024);
    lighthouse.add(lhBase);
    for (let i = 0; i < 4; i++) {
      const seg = new THREE.Mesh(
        new THREE.CylinderGeometry(1.5 - i * 0.16, 1.66 - i * 0.16, 2.2, 16),
        i % 2 === 0 ? redMat : whiteMat
      );
      seg.position.y = 2.1 + i * 2.2;
      seg.castShadow = true;
      addCrayonOutline(seg, 0.024);
      lighthouse.add(seg);
    }
    const lhRoof = new THREE.Mesh(
      new THREE.ConeGeometry(1.35, 1.8, 16),
      redMat
    );
    lhRoof.position.y = 10.6;
    addCrayonOutline(lhRoof, 0.024);
    lighthouse.add(lhRoof);
    lighthouse.position.set(26.5, -0.35, -16.5);
    worldGroup.add(lighthouse);

    // F. Majestic Sculpted Multi-Ridge Alpine Mountains ("Pahad") with Glacier Snow Caps & Foothill Pines
    const mountainRanges = [
      { x: -56, z: -44, r: 19, h: 29, seed: 1 },
      { x: 56, z: -46, r: 21, h: 33, seed: 2 },
      { x: 0, z: -60, r: 28, h: 38, seed: 3 },
      { x: -64, z: 14, r: 17, h: 25, seed: 4 },
      { x: 64, z: 16, r: 18, h: 27, seed: 5 },
      { x: -34, z: -52, r: 16, h: 25, seed: 6 },
      { x: 34, z: -52, r: 16, h: 25, seed: 7 },
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
      [-21.5, -16.2],
      [21.5, -16.2],
      [-22.2, -6.5],
      [22.2, -6.5],
      [-22.2, 6.5],
      [22.2, 6.5],
      [-21.2, 16.5],
      [21.2, 16.5],
      [-11.5, 20.2],
      [11.5, 20.2],
      [0.0, 20.8],
    ].forEach(([gx, gz], gIdx) => {
      const grassCluster = createLushGrassBorderCluster(
        isJungleMap,
        gIdx % 2 === 0
      );
      grassCluster.position.set(gx, -0.32, gz);
      grassCluster.scale.setScalar(1.35 + (gIdx % 3) * 0.18);
      grassCluster.rotation.y = gIdx * 1.1;
      worldGroup.add(grassCluster);
    });

    // G. Tropical Coconut Palms & Puffy Canopy Trees Around the Outer Island
    const buildPalmTree = (
      x: number,
      y: number,
      z: number,
      scale = 1,
      leanDir = 1
    ) => {
      const palm = new THREE.Group();
      const segs = 5;
      for (let i = 0; i < segs; i++) {
        const t = i / segs;
        const seg = new THREE.Mesh(
          new THREE.CylinderGeometry(
            0.22 - t * 0.06,
            0.26 - t * 0.05,
            0.62,
            10
          ),
          woodMat
        );
        seg.position.set(leanDir * t * t * 0.58, 0.3 + i * 0.55, 0);
        seg.rotation.z = -leanDir * t * 0.25;
        seg.castShadow = true;
        addCrayonOutline(seg, 0.024);
        palm.add(seg);
      }
      const topX = leanDir * 0.58;
      const topY = 2.7;
      for (let f = 0; f < 7; f++) {
        const angle = (f / 7) * Math.PI * 2;
        const frondPivot = new THREE.Group();
        frondPivot.position.set(topX, topY, 0);
        frondPivot.rotation.y = angle;
        const leaf = new THREE.Mesh(
          new THREE.SphereGeometry(0.68, 12, 10),
          f % 2 === 0 ? foliage1 : foliage2
        );
        leaf.scale.set(1.38, 0.22, 0.54);
        leaf.rotation.z = -0.36;
        leaf.position.set(0.72, -0.1, 0);
        leaf.castShadow = true;
        addCrayonOutline(leaf, 0.022);
        frondPivot.add(leaf);
        palm.add(frondPivot);
      }
      palm.position.set(x, y, z);
      palm.scale.setScalar(scale);
      worldGroup.add(palm);
    };

    const buildPuffyTree = (x: number, y: number, z: number, scale = 1) => {
      const g = new THREE.Group();
      g.position.set(x, y, z);
      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.22 * scale, 0.32 * scale, 2.1 * scale, 10),
        woodMat
      );
      trunk.position.y = 1.05 * scale;
      trunk.castShadow = true;
      addCrayonOutline(trunk, 0.026);
      g.add(trunk);

      [
        { ox: 0, oy: 2.55, oz: 0, r: 1.15, mat: foliage1 },
        { ox: -0.62, oy: 2.12, oz: 0.25, r: 0.86, mat: foliage2 },
        { ox: 0.64, oy: 2.15, oz: -0.2, r: 0.88, mat: foliage2 },
        { ox: 0.1, oy: 2.08, oz: 0.62, r: 0.82, mat: foliage1 },
      ].forEach((pf) => {
        const m = new THREE.Mesh(
          new THREE.SphereGeometry(pf.r * scale, 14, 12),
          pf.mat
        );
        m.position.set(pf.ox * scale, pf.oy * scale, pf.oz * scale);
        m.scale.set(1.08, 0.92, 1.05);
        m.castShadow = true;
        addCrayonOutline(m, 0.024);
        g.add(m);
      });
      worldGroup.add(g);
    };

    buildPalmTree(-24.5, -0.35, -17.5, 1.35, -1);
    buildPalmTree(24.5, -0.35, -17.5, 1.35, 1);
    buildPalmTree(-25.5, -0.35, 16.5, 1.35, -1);
    buildPalmTree(25.5, -0.35, 16.5, 1.35, 1);
    buildPuffyTree(-25.8, -0.35, -4.0, 1.3);
    buildPuffyTree(25.8, -0.35, -4.0, 1.3);
    buildPuffyTree(-25.0, -0.35, 7.5, 1.25);
    buildPuffyTree(25.0, -0.35, 7.5, 1.25);
    buildPuffyTree(-15.5, -0.35, 22.0, 1.2);
    buildPuffyTree(15.5, -0.35, 22.0, 1.2);

    // H. High Sky Puffy Cumulus Clouds
    [
      [-38, 25, -48, 2.5],
      [0, 28, -56, 2.9],
      [38, 25, -48, 2.5],
      [-48, 21, -12, 2.2],
      [48, 21, -12, 2.2],
    ].forEach(([cx, cy, cz, sc]) => {
      const cg = new THREE.Group();
      const p1 = new THREE.Mesh(
        new THREE.SphereGeometry(0.95, 14, 12),
        whiteMat
      );
      addCrayonOutline(p1, 0.028);
      const p2 = new THREE.Mesh(
        new THREE.SphereGeometry(0.74, 12, 10),
        whiteMat
      );
      p2.position.set(0.78, -0.1, 0.1);
      addCrayonOutline(p2, 0.028);
      const p3 = new THREE.Mesh(
        new THREE.SphereGeometry(0.68, 12, 10),
        whiteMat
      );
      p3.position.set(-0.74, -0.12, -0.1);
      addCrayonOutline(p3, 0.028);
      cg.add(p1, p2, p3);
      cg.position.set(cx, cy, cz);
      cg.scale.setScalar(sc);
      worldGroup.add(cg);
    });

    // I. Stylized Textured Sky Biplane & Dirigible Airship Soaring Across the Sky!
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
        x: -16,
        y: 20.5,
        z: -34,
        scale: 2.25,
        base: '#2563EB',
        stripe: '#FACC15',
        accent: '#EF4444',
        orbitR: 11.0,
        speed: 0.38,
        phase: 0,
      },
      {
        variant: 'airship' as const,
        x: 18,
        y: 23.5,
        z: -40,
        scale: 2.1,
        base: isJungleMap ? '#10B981' : '#0284C7',
        stripe: '#FDE047',
        accent: '#F43F5E',
        orbitR: 8.5,
        speed: 0.24,
        phase: 1.8,
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

    // J. Architectural Stadium Fencing around the Court Perimeter
    const buildStadiumWall = (
      x1: number,
      z1: number,
      x2: number,
      z2: number,
      bays: number
    ) => {
      const dx = x2 - x1;
      const dz = z2 - z1;
      const totalLen = Math.hypot(dx, dz);
      const angle = Math.atan2(dx, dz);
      const midX = (x1 + x2) * 0.5;
      const midZ = (z1 + z2) * 0.5;

      const curb = new THREE.Mesh(
        new THREE.BoxGeometry(0.6, 0.48, totalLen),
        warmStoneMat
      );
      curb.position.set(midX, 0.24, midZ);
      curb.rotation.y = angle;
      curb.receiveShadow = true;
      curb.castShadow = true;
      worldGroup.add(curb);

      [0.88, 1.45].forEach((rh, idx) => {
        const rail = new THREE.Mesh(
          new THREE.BoxGeometry(0.16, 0.14, totalLen),
          idx === 1 ? goldMat : slateIronMat
        );
        rail.position.set(midX, rh, midZ);
        rail.rotation.y = angle;
        worldGroup.add(rail);
      });

      for (let i = 0; i <= bays; i++) {
        const t = i / bays;
        const px = x1 + dx * t;
        const pz = z1 + dz * t;
        const pillar = new THREE.Mesh(
          new THREE.CylinderGeometry(0.26, 0.3, 1.85, 12),
          darkStoneMat
        );
        pillar.position.set(px, 0.925, pz);
        pillar.castShadow = true;
        worldGroup.add(pillar);

        const cap = new THREE.Mesh(
          new THREE.SphereGeometry(0.3, 12, 10),
          goldMat
        );
        cap.position.set(px, 1.92, pz);
        worldGroup.add(cap);
      }
    };

    buildStadiumWall(-17.8, -17.8, -17.8, 17.8, 7);
    buildStadiumWall(17.8, -17.8, 17.8, 17.8, 7);
    buildStadiumWall(-17.8, 17.8, 17.8, 17.8, 7);
    buildStadiumWall(-17.8, -17.8, 17.8, -17.8, 7);

    // K. High-Detail Sculpted Royal Medieval Castle Citadel OR Grand Mayan Pyramid Temple + East & West Bastions
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
    const timberPlasterMat = createCleanToonMaterial('#FEF3C7');

    const northGrandstand = new THREE.Mesh(
      new THREE.BoxGeometry(36.0, 3.8, 4.0),
      castleWallMat
    );
    northGrandstand.position.set(0, 1.9, -20.4);
    northGrandstand.castShadow = true;
    northGrandstand.receiveShadow = true;
    addCrayonOutline(northGrandstand, 0.022);
    worldGroup.add(northGrandstand);

    const northTrim = new THREE.Mesh(
      new THREE.BoxGeometry(36.6, 0.32, 4.4),
      warmStoneMat
    );
    northTrim.position.set(0, 3.85, -20.4);
    addCrayonOutline(northTrim, 0.02);
    worldGroup.add(northTrim);

    // Sculpted Castle Battlement Merlons (Crenellations) along the North Curtain Wall
    for (let mx = -16.5; mx <= 16.5; mx += 2.2) {
      if (Math.abs(mx) < 4.5) continue;
      const merlon = new THREE.Mesh(
        new THREE.BoxGeometry(1.25, 0.78, 0.95),
        warmStoneMat
      );
      merlon.position.set(mx, 4.35, -18.7);
      merlon.castShadow = true;
      addCrayonOutline(merlon, 0.02);
      worldGroup.add(merlon);
    }

    if (isJungleMap) {
      // Stepped Mayan Temple Pyramid + Carved Stone Stairway + Flaming Golden Braziers
      [
        { w: 18.0, h: 2.2, d: 5.6, y: 4.9, mat: darkStoneMat },
        { w: 13.2, h: 2.0, d: 4.6, y: 7.0, mat: castleWallMat },
        { w: 8.8, h: 1.8, d: 3.8, y: 8.9, mat: warmStoneMat },
      ].forEach((tier) => {
        const tierMesh = new THREE.Mesh(
          new THREE.BoxGeometry(tier.w, tier.h, tier.d),
          tier.mat
        );
        tierMesh.position.set(0, tier.y, -20.8);
        tierMesh.castShadow = true;
        addCrayonOutline(tierMesh, 0.022);
        worldGroup.add(tierMesh);
      });

      const templeStairs = new THREE.Mesh(
        new THREE.BoxGeometry(3.6, 6.4, 2.0),
        warmStoneMat
      );
      templeStairs.position.set(0, 6.2, -18.4);
      templeStairs.rotation.x = -0.35;
      addCrayonOutline(templeStairs, 0.022);
      worldGroup.add(templeStairs);

      const shrine = new THREE.Mesh(
        new THREE.BoxGeometry(5.2, 2.4, 3.0),
        goldMat
      );
      shrine.position.set(0, 10.9, -20.9);
      addCrayonOutline(shrine, 0.022);
      worldGroup.add(shrine);

      const shrineDoor = new THREE.Mesh(
        new THREE.BoxGeometry(1.8, 1.7, 0.3),
        slateIronMat
      );
      shrineDoor.position.set(0, 10.6, -19.4);
      worldGroup.add(shrineDoor);

      [-12.5, 12.5].forEach((bx) => {
        const pillar = new THREE.Mesh(
          new THREE.CylinderGeometry(1.3, 1.6, 4.8, 12),
          darkStoneMat
        );
        pillar.position.set(bx, 2.4, -20.2);
        addCrayonOutline(pillar, 0.02);
        worldGroup.add(pillar);

        const bowl = new THREE.Mesh(
          new THREE.CylinderGeometry(1.5, 1.0, 0.85, 12),
          goldMat
        );
        bowl.position.set(bx, 5.1, -20.2);
        addCrayonOutline(bowl, 0.02);
        worldGroup.add(bowl);

        const flame = new THREE.Mesh(
          new THREE.ConeGeometry(1.05, 2.3, 12),
          createCleanToonMaterial('#F97316')
        );
        flame.position.set(bx, 6.5, -20.2);
        addCrayonOutline(flame, 0.02);
        worldGroup.add(flame);
      });
    } else {
      // Grand Royal Medieval Castle Gatehouse Keep + 4 Turret Watchtowers + Timber Gables & Portcullis
      const keepMesh = new THREE.Mesh(
        new THREE.BoxGeometry(8.8, 5.6, 4.6),
        darkStoneMat
      );
      keepMesh.position.set(0, 6.2, -20.6);
      keepMesh.castShadow = true;
      addCrayonOutline(keepMesh, 0.022);
      worldGroup.add(keepMesh);

      // Arched Castle Gatehouse Portal & Iron Portcullis Grate
      const gateArch = new THREE.Mesh(
        new THREE.CylinderGeometry(2.1, 2.1, 0.6, 18, 1, false, 0, Math.PI),
        warmStoneMat
      );
      gateArch.rotation.z = -Math.PI / 2;
      gateArch.rotation.x = Math.PI / 2;
      gateArch.position.set(0, 2.2, -18.35);
      addCrayonOutline(gateArch, 0.02);
      worldGroup.add(gateArch);

      const gateOpening = new THREE.Mesh(
        new THREE.BoxGeometry(3.4, 3.2, 0.35),
        slateIronMat
      );
      gateOpening.position.set(0, 1.6, -18.38);
      worldGroup.add(gateOpening);

      // Timber-Framed Royal Upper Hall & Gabled Tile Roof atop Central Keep
      const upperHall = new THREE.Mesh(
        new THREE.BoxGeometry(7.2, 2.4, 3.8),
        timberPlasterMat
      );
      upperHall.position.set(0, 10.1, -20.6);
      addCrayonOutline(upperHall, 0.022);
      worldGroup.add(upperHall);

      const keepRoof = new THREE.Mesh(
        new THREE.ConeGeometry(5.6, 2.8, 4),
        roofBlueMat
      );
      keepRoof.rotation.y = Math.PI / 4;
      keepRoof.scale.set(1.15, 1.0, 0.72);
      keepRoof.position.set(0, 12.6, -20.6);
      addCrayonOutline(keepRoof, 0.022);
      worldGroup.add(keepRoof);

      // 4 Sculpted Cylindrical Castle Towers (Inner Gatehouse Towers + Outer Corner Bastion Turrets)
      [
        { tx: -5.4, tz: -19.6, r: 1.55, h: 7.8, roofMat: roofRedMat, roofH: 2.6 },
        { tx: 5.4, tz: -19.6, r: 1.55, h: 7.8, roofMat: roofRedMat, roofH: 2.6 },
        { tx: -15.2, tz: -20.2, r: 2.15, h: 7.2, roofMat: roofBlueMat, roofH: 3.0 },
        { tx: 15.2, tz: -20.2, r: 2.15, h: 7.2, roofMat: roofRedMat, roofH: 3.0 },
      ].forEach((tw, idx) => {
        const tower = new THREE.Mesh(
          new THREE.CylinderGeometry(tw.r * 0.92, tw.r, tw.h, 18),
          castleWallMat
        );
        tower.position.set(tw.tx, tw.h * 0.5, tw.tz);
        tower.castShadow = true;
        addCrayonOutline(tower, 0.022);
        worldGroup.add(tower);

        const corbelRing = new THREE.Mesh(
          new THREE.CylinderGeometry(tw.r * 1.08, tw.r * 0.96, 0.55, 18),
          warmStoneMat
        );
        corbelRing.position.set(tw.tx, tw.h + 0.15, tw.tz);
        addCrayonOutline(corbelRing, 0.02);
        worldGroup.add(corbelRing);

        const roof = new THREE.Mesh(
          new THREE.ConeGeometry(tw.r * 1.25, tw.roofH, 18),
          tw.roofMat
        );
        roof.position.set(tw.tx, tw.h + 0.42 + tw.roofH * 0.5, tw.tz);
        roof.castShadow = true;
        addCrayonOutline(roof, 0.022);
        worldGroup.add(roof);

        const finial = new THREE.Mesh(
          new THREE.SphereGeometry(0.24, 10, 8),
          goldMat
        );
        finial.position.set(tw.tx, tw.h + 0.42 + tw.roofH + 0.14, tw.tz);
        worldGroup.add(finial);

        // Royal Heraldic Banner hanging on Tower Front
        const banner = new THREE.Mesh(
          new THREE.BoxGeometry(0.95, 2.2, 0.12),
          idx % 2 === 0 ? blueMat : redMat
        );
        banner.position.set(tw.tx, tw.h * 0.58, tw.tz + tw.r * 0.95);
        addCrayonOutline(banner, 0.018);
        worldGroup.add(banner);
      });
    }

    // East & West Outer Stadium Stone Bastion Forts with Crenellations & Turrets
    [-20.8, 20.8].forEach((bx, idx) => {
      const bastion = new THREE.Mesh(
        new THREE.BoxGeometry(3.2, 2.5, 14.6),
        castleWallMat
      );
      bastion.position.set(bx, 1.25, 0);
      bastion.castShadow = true;
      bastion.receiveShadow = true;
      addCrayonOutline(bastion, 0.022);
      worldGroup.add(bastion);

      const bTrim = new THREE.Mesh(
        new THREE.BoxGeometry(3.5, 0.28, 15.0),
        warmStoneMat
      );
      bTrim.position.set(bx, 2.55, 0);
      addCrayonOutline(bTrim, 0.018);
      worldGroup.add(bTrim);

      for (let mz = -5.6; mz <= 5.6; mz += 2.8) {
        const merlon = new THREE.Mesh(
          new THREE.BoxGeometry(0.75, 0.62, 1.2),
          warmStoneMat
        );
        merlon.position.set(bx - Math.sign(bx) * 1.1, 2.95, mz);
        addCrayonOutline(merlon, 0.018);
        worldGroup.add(merlon);
      }

      const sidePavilionRoof = new THREE.Mesh(
        new THREE.ConeGeometry(2.3, 2.1, 4),
        idx === 0 ? roofBlueMat : roofRedMat
      );
      sidePavilionRoof.rotation.y = Math.PI / 4;
      sidePavilionRoof.scale.set(0.9, 1.0, 2.2);
      sidePavilionRoof.position.set(bx + Math.sign(bx) * 0.4, 3.7, 0);
      addCrayonOutline(sidePavilionRoof, 0.02);
      worldGroup.add(sidePavilionRoof);
    });

    // =========================================================================
    // 3. DUAL CHAMPIONSHIP DODGEBALLS IN ALL 3 ROUNDS ("2 ball rakhe hai round 1 me round 2 me bhi 2 and round 3 me")
    // =========================================================================
    const crimsonBallTex = createDodgeballTexture('#EF4444', '#FEF08A');
    const goldBallTex = createDodgeballTexture('#F59E0B', '#FEF9C3');

    const dodgeballs: DodgeballObject[] = [];
    const TRAIL_LEN = 10;

    const BALL_CONFIGS: Array<{
      id: number;
      kind: DodgeballKind;
      homeX: number;
      homeZ: number;
      tex: THREE.CanvasTexture;
      ringHex: number;
    }> = [
      {
        id: 0,
        kind: 'crimson',
        homeX: -2.2,
        homeZ: 0.0,
        tex: crimsonBallTex,
        ringHex: 0xfacc15,
      },
      {
        id: 1,
        kind: 'gold',
        homeX: 2.2,
        homeZ: 0.0,
        tex: goldBallTex,
        ringHex: 0x38bdf8,
      },
    ];

    BALL_CONFIGS.forEach((bCfg) => {
      const bMat = new THREE.MeshToonMaterial({
        color: 0xffffff,
        map: bCfg.tex,
        gradientMap: getToonGradientMap(),
      });

      const ballGrp = new THREE.Group();
      ballGrp.position.set(bCfg.homeX, 0.54, bCfg.homeZ);

      const ballSphere = new THREE.Mesh(
        new THREE.SphereGeometry(0.5, 20, 16),
        bMat
      );
      ballSphere.castShadow = true;
      addCrayonOutline(ballSphere, 0.036);
      ballGrp.add(ballSphere);

      const floorRing = new THREE.Mesh(
        new THREE.RingGeometry(0.66, 0.94, 28),
        new THREE.MeshBasicMaterial({
          color: bCfg.ringHex,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.88,
        })
      );
      floorRing.rotation.x = -Math.PI / 2;
      floorRing.position.set(bCfg.homeX, 0.042, bCfg.homeZ);
      scene.add(floorRing);

      const beaconArrow = new THREE.Mesh(
        new THREE.ConeGeometry(0.26, 0.48, 12),
        new THREE.MeshBasicMaterial({ color: bCfg.ringHex })
      );
      beaconArrow.rotation.x = Math.PI;
      beaconArrow.position.set(bCfg.homeX, 1.65, bCfg.homeZ);
      addCrayonOutline(beaconArrow, 0.028);
      scene.add(beaconArrow);

      const trailMeshes: THREE.Mesh[] = [];
      const trailHistory: Array<{ x: number; y: number; z: number }> = [];
      for (let t = 0; t < TRAIL_LEN; t++) {
        const tm = new THREE.Mesh(
          new THREE.SphereGeometry(0.32 * (1 - t / TRAIL_LEN), 8, 6),
          new THREE.MeshBasicMaterial({
            color: t % 2 === 0 ? 0xfacc15 : 0xf97316,
            transparent: true,
            opacity: 0.72 * (1 - t / TRAIL_LEN),
          })
        );
        tm.visible = false;
        scene.add(tm);
        trailMeshes.push(tm);
        trailHistory.push({ x: bCfg.homeX, y: 0.54, z: bCfg.homeZ });
      }

      scene.add(ballGrp);
      dodgeballs.push({
        id: bCfg.id,
        kind: bCfg.kind,
        mesh: ballGrp,
        ballSphere,
        floorRing,
        beaconArrow,
        trailMeshes,
        trailHistory,
        state: 'free',
        holderId: null,
        targetId: null,
        isSuperThrow: false,
        x: bCfg.homeX,
        y: 0.54,
        z: bCfg.homeZ,
        vx: 0,
        vy: 0,
        vz: 0,
        homeX: bCfg.homeX,
        homeZ: bCfg.homeZ,
        idleTimer: 0,
        pickupCooldown: 0,
        lastHitVictimId: null,
      });
    });

    // =========================================================================
    // 4. SPAWN 4 SOLO DODGEBALL ATHLETES WITH DISTINCT AI PERSONALITIES
    // =========================================================================
    const athletes: DodgeballAthlete[] = [];
    const aiPool = CRAYON_CHARACTERS.filter((c) => c.id !== playerCharacter.id);

    const SPAWN_POSITIONS_POOL: Array<{
      x: number;
      z: number;
      yaw: number;
      outfitIdx: number;
      colorHex: string;
    }> = [
      { x: 0.0, z: 8.6, yaw: Math.PI, outfitIdx: 0, colorHex: '#4ADE80' },
      { x: 0.0, z: -8.6, yaw: 0, outfitIdx: 3, colorHex: '#FB7185' },
      { x: -8.6, z: 0.0, yaw: Math.PI / 2, outfitIdx: 5, colorHex: '#38BDF8' },
      { x: 8.6, z: 0.0, yaw: -Math.PI / 2, outfitIdx: 2, colorHex: '#FACC15' },
      { x: -6.4, z: -6.4, yaw: Math.PI * 0.25, outfitIdx: 4, colorHex: '#C084FC' },
    ];

    const activeCustomSlots = customSlots
      ? customSlots.filter((s) => s.occupiedBy !== 'empty').slice(0, 5)
      : null;
    const myCustomSlot = activeCustomSlots
      ? activeCustomSlots.find((s) => s.playerId === multiplayerClient.playerId) ||
        activeCustomSlots.find((s) => s.playerName === playerDisplayName)
      : null;
    const mySlotIdx = myCustomSlot ? myCustomSlot.slotIndex : 0;
    const otherCustomSlots = activeCustomSlots
      ? activeCustomSlots.filter((s) =>
          myCustomSlot
            ? s.slotIndex !== myCustomSlot.slotIndex
            : s.playerId !== multiplayerClient.playerId
        )
      : [];

    const FOUR_PLAYER_SPAWNS: Array<{
      id: string;
      isPlayer: boolean;
      slotIndex: number;
      remotePlayerId: string | null;
      playerNameOverride?: string;
      x: number;
      z: number;
      yaw: number;
      charConfig: CharacterConfig;
      outfitIdx: number;
      colorHex: string;
    }> = [
      {
        id: 'p1_you',
        isPlayer: true,
        slotIndex: mySlotIdx,
        remotePlayerId: null,
        x: SPAWN_POSITIONS_POOL[mySlotIdx % SPAWN_POSITIONS_POOL.length].x,
        z: SPAWN_POSITIONS_POOL[mySlotIdx % SPAWN_POSITIONS_POOL.length].z,
        yaw: SPAWN_POSITIONS_POOL[mySlotIdx % SPAWN_POSITIONS_POOL.length].yaw,
        charConfig: playerCharacter,
        outfitIdx: 0,
        colorHex: '#4ADE80',
      },
      ...(activeCustomSlots
        ? otherCustomSlots.map((s, idx) => {
            const pos =
              SPAWN_POSITIONS_POOL[s.slotIndex % SPAWN_POSITIONS_POOL.length];
            const baseC =
              CRAYON_CHARACTERS.find((c) => c.id === s.charId) ||
              aiPool[idx % aiPool.length] ||
              CRAYON_CHARACTERS[(idx + 1) % CRAYON_CHARACTERS.length];
            return {
              id: s.playerId ? `remote_${s.playerId}` : `p${idx + 2}_rival`,
              isPlayer: false,
              slotIndex: s.slotIndex,
              remotePlayerId: s.occupiedBy === 'human' ? s.playerId : null,
              playerNameOverride: s.playerName,
              x: pos.x,
              z: pos.z,
              yaw: pos.yaw,
              charConfig: {
                ...baseC,
                faceId: s.faceId || baseC.faceId,
                outfitId: s.outfitId || baseC.outfitId,
              },
              outfitIdx: pos.outfitIdx,
              colorHex: pos.colorHex,
            };
          })
        : [
            {
              id: 'p2_rival',
              isPlayer: false,
              slotIndex: 1,
              remotePlayerId: null,
              x: 0.0,
              z: -8.6,
              yaw: 0,
              charConfig: aiPool[0] || CRAYON_CHARACTERS[1],
              outfitIdx: 3,
              colorHex: '#FB7185',
            },
            {
              id: 'p3_rival',
              isPlayer: false,
              slotIndex: 2,
              remotePlayerId: null,
              x: -8.6,
              z: 0.0,
              yaw: Math.PI / 2,
              charConfig: aiPool[1] || CRAYON_CHARACTERS[2],
              outfitIdx: 5,
              colorHex: '#38BDF8',
            },
            {
              id: 'p4_rival',
              isPlayer: false,
              slotIndex: 3,
              remotePlayerId: null,
              x: 8.6,
              z: 0.0,
              yaw: -Math.PI / 2,
              charConfig: aiPool[2] || CRAYON_CHARACTERS[3],
              outfitIdx: 2,
              colorHex: '#FACC15',
            },
          ]),
    ];

    FOUR_PLAYER_SPAWNS.forEach((sp) => {
      const outfit =
        CHARACTER_OUTFITS[sp.outfitIdx % CHARACTER_OUTFITS.length];
      const customizedChar: CharacterConfig = sp.isPlayer
        ? sp.charConfig
        : {
            ...sp.charConfig,
            outfitId: sp.charConfig.outfitId || outfit.id,
          };
      const resolvedName = sp.isPlayer
        ? playerDisplayName
          ? `${playerDisplayName} (YOU)`
          : `${sp.charConfig.name} (YOU)`
        : sp.playerNameOverride || customizedChar.name;

      const rig = createCrayonCharacter(
        customizedChar,
        maxAnisotropy,
        1,
        sp.isPlayer
      );
      const charGroup = rig.root;
      charGroup.scale.setScalar(1.46);
      charGroup.position.set(sp.x, 0.02, sp.z);
      charGroup.rotation.y = sp.yaw;

      // Subtle Clean Ground Marker Ring (No additive glow)
      const ringGeo = new THREE.RingGeometry(
        sp.isPlayer ? 0.54 : 0.45,
        sp.isPlayer ? 0.72 : 0.58,
        28
      );
      ringGeo.rotateX(-Math.PI / 2);
      const ringMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(sp.colorHex),
        side: THREE.DoubleSide,
        transparent: true,
        opacity: sp.isPlayer ? 0.85 : 0.68,
      });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.position.y = 0.03;
      charGroup.add(ringMesh);

      // Overhead 3D Health Bar — ONLY visible when hit!
      const hpBgGeo = new THREE.PlaneGeometry(1.18, 0.16);
      const hpBgMat = new THREE.MeshBasicMaterial({
        color: 0x09192b,
        side: THREE.DoubleSide,
        depthTest: false,
      });
      const hpBarBg = new THREE.Mesh(hpBgGeo, hpBgMat);
      hpBarBg.position.set(0, 1.96, 0);
      hpBarBg.renderOrder = 10;
      hpBarBg.visible = false;
      charGroup.add(hpBarBg);

      const hpFillGeo = new THREE.PlaneGeometry(1.1, 0.11);
      const hpFillMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(sp.colorHex),
        side: THREE.DoubleSide,
        depthTest: false,
      });
      const hpBarFill = new THREE.Mesh(hpFillGeo, hpFillMat);
      hpBarFill.position.set(0, 1.96, 0.01);
      hpBarFill.renderOrder = 11;
      hpBarFill.visible = false;
      charGroup.add(hpBarFill);

      // Shield Mesh (Kept hidden at start — never shown on game start)
      const shieldMesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.88, 16, 14),
        new THREE.MeshBasicMaterial({
          color: new THREE.Color(sp.colorHex),
          transparent: true,
          opacity: 0.32,
          depthWrite: false,
        })
      );
      shieldMesh.position.y = 0.78;
      shieldMesh.visible = false;
      charGroup.add(shieldMesh);

      scene.add(charGroup);

      const startHp = 160;
      athletes.push({
        id: sp.id,
        name: resolvedName,
        colorHex: sp.colorHex,
        isPlayer: sp.isPlayer,
        config: customizedChar,
        rig,
        group: charGroup,
        hpBarBg,
        hpBarFill,
        shieldMesh,
        heldBallId: null,
        spawnX: sp.x,
        spawnZ: sp.z,
        spawnYaw: sp.yaw,
        x: sp.x,
        y: 0.02,
        z: sp.z,
        visualY: 0.02,
        vx: 0,
        vy: 0,
        vz: 0,
        knockVx: 0,
        knockVz: 0,
        grounded: true,
        hp: startHp,
        maxHp: startHp,
        eliminated: false,
        roundWins: 0,
        kills: 0,
        hitsScored: 0,
        catchesMade: 0,
        superCharge: 0,
        throwSwingTimer: 0,
        dodgeCooldown: 0,
        dodgeActiveTimer: 0,
        catchWindowTimer: 0,
        invulnTimer: 0,
        hitFlashTimer: 0,
        facingYaw: sp.yaw,
        targetYaw: sp.yaw,
        walkCycle: Math.random() * Math.PI * 2,
        jiggleY: 0,
        jiggleVelY: 0,
        jiggleRoll: 0,
        jiggleVelRoll: 0,
        aiThinkTimer: Math.random() * 0.25,
        aiHoldTimer: 0,
        aiStrafeDir: sp.id === 'p2_rival' ? 1 : sp.id === 'p3_rival' ? -1 : 1,
        aiRole:
          sp.id === 'p2_rival'
            ? 'rusher'
            : sp.id === 'p3_rival'
              ? 'flanker'
              : 'tactician',
        aiGoalX: sp.x,
        aiGoalZ: sp.z,
        aiGoalTimer: 0.2 + Math.random() * 0.6,
        aiThrowDelay:
          sp.id === 'p2_rival' ? 0.28 : sp.id === 'p3_rival' ? 0.45 : 0.36,
        aiSpeedVar:
          sp.id === 'p2_rival' ? 1.07 : sp.id === 'p3_rival' ? 1.02 : 0.97,
        slotIndex: sp.slotIndex,
        remotePlayerId: sp.remotePlayerId,
        lastRemoteTickAt: 0,
      });
    });

    const playerAthlete = athletes[0];

    const vfxBursts: VfxBurst[] = [];
    let screenShakeMag = 0;

    const spawnBloodSplatter = (
      hx: number,
      hy: number,
      hz: number,
      dirX: number = 0,
      dirZ: number = 0,
      intensity: number = 1.0
    ) => {
      const bloodColors = ['#DC2626', '#B91C1C', '#EF4444', '#991B1B', '#7F1D1D'];

      const mistMesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.28 * intensity, 10, 8),
        new THREE.MeshBasicMaterial({
          color: '#DC2626',
          transparent: true,
          opacity: 0.78,
          depthWrite: false,
        })
      );
      mistMesh.position.set(hx, hy, hz);
      scene.add(mistMesh);
      vfxBursts.push({
        mesh: mistMesh,
        vx: dirX * 1.6,
        vy: 0.7,
        vz: dirZ * 1.6,
        life: 0.28,
        maxLife: 0.28,
        kind: 'blood_mist',
      });

      const dropCount = Math.round(18 * intensity);
      for (let i = 0; i < dropCount; i++) {
        const randAng = Math.random() * Math.PI * 2;
        const spreadSpd = (2.6 + Math.random() * 5.6) * intensity;
        const bvx = dirX * (3.6 + Math.random() * 4.2) + Math.cos(randAng) * spreadSpd;
        const bvz = dirZ * (3.6 + Math.random() * 4.2) + Math.sin(randAng) * spreadSpd;
        const bvy = 2.2 + Math.random() * 4.8 * intensity;

        const dropRadius = (0.055 + Math.random() * 0.05) * Math.min(1.4, intensity);
        const dropGeo = new THREE.SphereGeometry(dropRadius, 7, 6);
        dropGeo.scale(0.85, 1.35, 0.85);
        const dropMesh = new THREE.Mesh(
          dropGeo,
          new THREE.MeshBasicMaterial({
            color: bloodColors[i % bloodColors.length],
          })
        );
        dropMesh.position.set(
          hx + (Math.random() - 0.5) * 0.25,
          hy + (Math.random() - 0.5) * 0.25,
          hz + (Math.random() - 0.5) * 0.25
        );
        scene.add(dropMesh);
        vfxBursts.push({
          mesh: dropMesh,
          vx: bvx,
          vy: bvy,
          vz: bvz,
          life: 0.48 + Math.random() * 0.24,
          maxLife: 0.72,
          kind: 'blood_drop',
          floorY: 0.035,
        });
      }

      const splatCount = intensity >= 1.25 ? 4 : 3;
      for (let s = 0; s < splatCount; s++) {
        const splatRadius = (0.26 + Math.random() * 0.28) * Math.min(1.45, intensity);
        const splatGeo = new THREE.CircleGeometry(splatRadius, 14);
        splatGeo.rotateX(-Math.PI / 2);
        const splatMesh = new THREE.Mesh(
          splatGeo,
          new THREE.MeshBasicMaterial({
            color: s % 2 === 0 ? '#991B1B' : '#DC2626',
            transparent: true,
            opacity: 0.86,
            depthWrite: false,
          })
        );
        const offsetAng = Math.random() * Math.PI * 2;
        const offsetDist = Math.random() * 0.65;
        splatMesh.position.set(
          hx + dirX * 0.4 + Math.cos(offsetAng) * offsetDist,
          0.032 + s * 0.002,
          hz + dirZ * 0.4 + Math.sin(offsetAng) * offsetDist
        );
        splatMesh.scale.set(
          0.75 + Math.random() * 0.5,
          1,
          0.75 + Math.random() * 0.5
        );
        scene.add(splatMesh);
        vfxBursts.push({
          mesh: splatMesh,
          vx: 0,
          vy: 0,
          vz: 0,
          life: 3.5 + Math.random() * 1.5,
          maxLife: 5.0,
          kind: 'blood_splat',
        });
      }
    };

    const spawnHitExplosion = (
      hx: number,
      hy: number,
      hz: number,
      colorHex: string,
      isBig = false
    ) => {
      const ringGeo = new THREE.RingGeometry(0.24, isBig ? 0.64 : 0.44, 24);
      ringGeo.rotateX(-Math.PI / 2);
      const ringMat = new THREE.MeshBasicMaterial({
        color: colorHex,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.85,
      });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.position.set(hx, Math.max(0.05, hy), hz);
      scene.add(ringMesh);
      vfxBursts.push({
        mesh: ringMesh,
        vx: 0,
        vy: 0,
        vz: 0,
        life: 0.28,
        maxLife: 0.28,
        kind: 'ring',
      });
    };

    const findBestEnemyTarget = (
      thrower: DodgeballAthlete
    ): DodgeballAthlete | null => {
      let bestTarget: DodgeballAthlete | null = null;
      let bestScore = -9999;
      const fwdX = Math.sin(thrower.facingYaw);
      const fwdZ = Math.cos(thrower.facingYaw);

      for (const other of athletes) {
        if (other.id === thrower.id || other.eliminated) {
          continue;
        }
        const dx = other.x - thrower.x;
        const dz = other.z - thrower.z;
        const dist = Math.hypot(dx, dz);
        if (dist < 0.01) continue;
        const dot = (dx / dist) * fwdX + (dz / dist) * fwdZ;
        const score = dot * 5.5 - dist * 0.32 - (other.hp / other.maxHp) * 1.5;
        if (score > bestScore) {
          bestScore = score;
          bestTarget = other;
        }
      }
      return bestTarget;
    };

    const getCrosshairLockedEnemy = (): DodgeballAthlete | null => {
      const yaw = camYawOffsetRef.current;
      const aimDirX = -Math.sin(yaw);
      const aimDirZ = -Math.cos(yaw);
      let lockedEnemy: DodgeballAthlete | null = null;
      let bestScore = -99999;
      for (const other of athletes) {
        if (other.id === playerAthlete.id || other.eliminated) continue;
        const dx = other.x - playerAthlete.x;
        const dz = other.z - playerAthlete.z;
        const dist = Math.hypot(dx, dz);
        if (dist < 0.2 || dist > 38) continue;
        const dot = (dx / dist) * aimDirX + (dz / dist) * aimDirZ;
        if (dot > 0.815) {
          const score = dot * 120 - dist * 0.55;
          if (score > bestScore) {
            bestScore = score;
            lockedEnemy = other;
          }
        }
      }
      return lockedEnemy;
    };

    // Helper: Throw whichever of the 2 Dodgeballs the Athlete is currently holding!
    const performThrowBall = (thrower: DodgeballAthlete) => {
      if (thrower.heldBallId === null) return false;
      const ball = dodgeballs.find((b) => b.id === thrower.heldBallId);
      if (!ball || ball.holderId !== thrower.id) {
        thrower.heldBallId = null;
        return false;
      }

      const isSuper = thrower.superCharge >= 100;
      if (isSuper) {
        thrower.superCharge = 0;
      } else {
        thrower.superCharge = Math.min(100, thrower.superCharge + 35);
      }

      const baseSpeed = isSuper ? 33.0 : 28.5;
      const throwSpeed =
        baseSpeed *
        (thrower.isPlayer ? 1.12 : 0.92 + diffObj.rushSpeedMult * 0.08);

      let aimX = Math.sin(thrower.facingYaw);
      let aimZ = Math.cos(thrower.facingYaw);
      let targetDist = 14.0;

      if (thrower.isPlayer) {
        const camYaw = camYawOffsetRef.current;
        const rawAimX = -Math.sin(camYaw);
        const rawAimZ = -Math.cos(camYaw);
        aimX = rawAimX;
        aimZ = rawAimZ;

        const lockedEnemy = getCrosshairLockedEnemy();
        if (lockedEnemy) {
          const rawDist = Math.hypot(
            lockedEnemy.x - thrower.x,
            lockedEnemy.z - thrower.z
          );
          const flightTime = rawDist / Math.max(18, throwSpeed);
          const leadX = lockedEnemy.x + lockedEnemy.vx * flightTime * 0.42;
          const leadZ = lockedEnemy.z + lockedEnemy.vz * flightTime * 0.42;
          const toEnemyX = leadX - thrower.x;
          const toEnemyZ = leadZ - thrower.z;
          const toLen = Math.max(0.01, Math.hypot(toEnemyX, toEnemyZ));
          const dirEnemyX = toEnemyX / toLen;
          const dirEnemyZ = toEnemyZ / toLen;

          const assistStrength = 0.56;
          aimX = rawAimX * (1 - assistStrength) + dirEnemyX * assistStrength;
          aimZ = rawAimZ * (1 - assistStrength) + dirEnemyZ * assistStrength;
          const norm = Math.max(0.001, Math.hypot(aimX, aimZ));
          aimX /= norm;
          aimZ /= norm;
          targetDist = THREE.MathUtils.clamp(toLen, 4.0, 28.0);
        }
        thrower.facingYaw = Math.atan2(aimX, aimZ);
        thrower.targetYaw = thrower.facingYaw;
      } else {
        const target = findBestEnemyTarget(thrower);
        if (target) {
          const rawDist = Math.hypot(target.x - thrower.x, target.z - thrower.z);
          const flightTime = rawDist / Math.max(18, throwSpeed);
          const leadMult =
            thrower.aiRole === 'tactician'
              ? 0.52
              : thrower.aiRole === 'flanker'
                ? 0.36
                : 0.2;
          const tx = target.x + target.vx * flightTime * leadMult;
          const tz = target.z + target.vz * flightTime * leadMult;
          const dx = tx - thrower.x;
          const dz = tz - thrower.z;
          const len = Math.max(0.01, Math.hypot(dx, dz));
          const baseAngle = Math.atan2(dx, dz);
          const spread = (Math.random() - 0.5) * 0.14;
          aimX = Math.sin(baseAngle + spread);
          aimZ = Math.cos(baseAngle + spread);
          targetDist = THREE.MathUtils.clamp(len, 4.0, 26.0);
          thrower.facingYaw = Math.atan2(aimX, aimZ);
          thrower.targetYaw = thrower.facingYaw;
        }
      }

      thrower.heldBallId = null;
      thrower.throwSwingTimer = 0.34;
      thrower.jiggleVelY += 3.8;

      const BALL_GRAVITY = 9.2;
      const estFlightSec = THREE.MathUtils.clamp(
        targetDist / Math.max(18, throwSpeed),
        0.16,
        0.92
      );
      const launchVy = Math.min(
        4.6,
        Math.max(1.35, 0.5 * BALL_GRAVITY * estFlightSec)
      );

      ball.state = 'thrown';
      ball.holderId = thrower.id;
      ball.targetId = null;
      ball.isSuperThrow = isSuper;
      ball.pickupCooldown = 0.28;
      ball.lastHitVictimId = null;
      ball.x = thrower.x + aimX * 0.85;
      ball.y = thrower.y + 1.12;
      ball.z = thrower.z + aimZ * 0.85;
      ball.vx = aimX * throwSpeed;
      ball.vy = launchVy;
      ball.vz = aimZ * throwSpeed;
      ball.idleTimer = 0;
      ball.floorRing.visible = false;
      ball.beaconArrow.visible = false;

      for (let t = 0; t < TRAIL_LEN; t++) {
        ball.trailHistory[t] = { x: ball.x, y: ball.y, z: ball.z };
        ball.trailMeshes[t].visible = true;
      }

      crayonAudio.playDodgeballThrow(isSuper);
      if (thrower.isPlayer) {
        if (isSuper) {
          onCalloutRef.current?.('SUPER NUKE SMASH!', '#FACC15');
        }
        multiplayerClient.sendGameEvent('nuke:throw', {
          slotIndex: thrower.slotIndex ?? 0,
          ballId: ball.id,
          x: ball.x,
          y: ball.y,
          z: ball.z,
          vx: ball.vx,
          vy: ball.vy,
          vz: ball.vz,
          isSuper,
        });
      }
      return true;
    };

    const keys: Record<string, boolean> = {};
    const onKeyDown = (e: KeyboardEvent) => {
      keys[e.code] = true;
      if (e.code === 'Space' || e.code === 'KeyF' || e.code === 'Enter') {
        e.preventDefault();
        rightActionQueuedRef.current = true;
      }
      if (
        e.code === 'ShiftLeft' ||
        e.code === 'ShiftRight' ||
        e.code === 'KeyC'
      ) {
        e.preventDefault();
        dodgeQueuedRef.current = true;
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      keys[e.code] = false;
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    const onResize = () => {
      if (!containerRef.current) return;
      const w = containerRef.current.clientWidth || window.innerWidth;
      const h = Math.max(
        1,
        containerRef.current.clientHeight || window.innerHeight
      );
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      postPipeline.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    // =========================================================================
    // 6. ELIMINATION-DRIVEN 3-ROUND SURVIVAL TOURNAMENT STATE:
    //    - Round 1: 4 Players -> Plays until 1 player is eliminated (3 survive)
    //    - Round 2: 3 Survivors -> Plays until 1 player is eliminated (2 survive)
    //    - Round 3: Final 2 Survivors -> Plays until 1 is eliminated & Survivor Wins!
    // =========================================================================
    const MAX_REGULATION_ROUNDS = 3;
    let currentRound = 1;
    let isExtraRound = false;
    let roundTransitionTimer = 0;
    let matchEndStatsDelayTimer = 0;
    let pendingMatchResult: {
      winner: 'player' | 'ai';
      stats: Parameters<FloorIsLavaCanvasProps['onGameOver']>[1];
    } | null = null;
    let countdownSec = 3.0;
    let roundTimeSec = 0;
    let totalMatchTimeSec = 0;
    let matchEnded = false;
    let overtimeAnnounced = false;
    let bannerText: string | null = 'ROUND 1 OF 3 · ELIMINATE 1 RIVAL!';
    let bannerTimer = 2.6;
    let lastHudKey = '';
    let netSyncAccum = 0;
    let lastTime = performance.now();
    let animFrameId = 0;

    const unsubRemoteTick = multiplayerClient.onRemoteTick((pkt) => {
      const remoteAt =
        athletes.find((a) => !a.isPlayer && a.remotePlayerId === pkt.senderId) ||
        athletes.find((a) => !a.isPlayer && a.slotIndex === pkt.slotIndex);
      if (!remoteAt || remoteAt.eliminated) return;
      remoteAt.remotePlayerId = pkt.senderId;
      remoteAt.lastRemoteTickAt = performance.now();
      remoteAt.x = THREE.MathUtils.lerp(remoteAt.x, pkt.x, 0.55);
      remoteAt.y = THREE.MathUtils.lerp(remoteAt.y, pkt.y, 0.55);
      remoteAt.z = THREE.MathUtils.lerp(remoteAt.z, pkt.z, 0.55);
      remoteAt.vx = pkt.vx;
      remoteAt.vy = pkt.vy;
      remoteAt.vz = pkt.vz;
      remoteAt.targetYaw = pkt.yaw;
      if (typeof pkt.kills === 'number') {
        remoteAt.kills = Math.max(remoteAt.kills, pkt.kills);
      }
    });

    const unsubRemoteEvent = multiplayerClient.onRemoteEvent((evt) => {
      if (evt.eventKind === 'nuke:throw' && evt.payload) {
        const remoteAt =
          athletes.find((a) => !a.isPlayer && a.remotePlayerId === evt.senderId) ||
          athletes.find((a) => !a.isPlayer && a.slotIndex === evt.payload.slotIndex);
        const ball = dodgeballs.find((b) => b.id === evt.payload.ballId) || dodgeballs[0];
        if (remoteAt && ball) {
          remoteAt.heldBallId = null;
          remoteAt.throwSwingTimer = 0.34;
          ball.state = 'thrown';
          ball.holderId = remoteAt.id;
          ball.isSuperThrow = Boolean(evt.payload.isSuper);
          ball.pickupCooldown = 0.28;
          ball.x = Number(evt.payload.x) || remoteAt.x;
          ball.y = Number(evt.payload.y) || remoteAt.y + 1.1;
          ball.z = Number(evt.payload.z) || remoteAt.z;
          ball.vx = Number(evt.payload.vx) || 0;
          ball.vy = Number(evt.payload.vy) || 2.0;
          ball.vz = Number(evt.payload.vz) || 0;
          crayonAudio.playDodgeballThrow(Boolean(evt.payload.isSuper));
        }
      }
    });

    const resetForNextRound = (nextRoundNum: number) => {
      currentRound = nextRoundNum;
      isExtraRound = false;
      roundTimeSec = 0;
      countdownSec = 2.4;
      overtimeAnnounced = false;

      // Only reset SURVIVING athletes (eliminated athletes stay eliminated!)
      for (const a of athletes) {
        if (a.eliminated) {
          a.heldBallId = null;
          a.group.visible = false;
          a.hpBarBg.visible = false;
          a.hpBarFill.visible = false;
          continue;
        }
        a.hp = a.maxHp;
        a.heldBallId = null;
        a.x = a.spawnX;
        a.y = 0.02;
        a.z = a.spawnZ;
        a.visualY = 0.02;
        a.vx = 0;
        a.vy = 0;
        a.vz = 0;
        a.knockVx = 0;
        a.knockVz = 0;
        a.grounded = true;
        a.facingYaw = a.spawnYaw;
        a.targetYaw = a.spawnYaw;
        a.dodgeCooldown = 0;
        a.dodgeActiveTimer = 0;
        a.catchWindowTimer = 0;
        a.invulnTimer = 0;
        a.hitFlashTimer = 0;
        a.hpBarBg.visible = false;
        a.hpBarFill.visible = false;
        a.shieldMesh.visible = false;
        a.aiHoldTimer = 0;
        a.aiGoalTimer = 0;
        a.group.visible = true;
        a.group.position.set(a.x, a.visualY, a.z);
        a.group.rotation.y = a.facingYaw;
      }

      // Reset BOTH Dodgeballs onto their pedestals for Round 1, Round 2, and Round 3!
      for (const b of dodgeballs) {
        b.state = 'free';
        b.holderId = null;
        b.targetId = null;
        b.isSuperThrow = false;
        b.x = b.homeX;
        b.y = 0.54;
        b.z = b.homeZ;
        b.vx = 0;
        b.vy = 0;
        b.vz = 0;
        b.idleTimer = 0;
        b.pickupCooldown = 0;
        b.lastHitVictimId = null;
        b.mesh.visible = true;
        b.mesh.position.set(b.homeX, 0.54, b.homeZ);
        b.floorRing.visible = true;
        b.floorRing.position.set(b.homeX, 0.042, b.homeZ);
        b.beaconArrow.visible = true;
        b.beaconArrow.position.set(b.homeX, 1.65, b.homeZ);
        b.trailMeshes.forEach((tm) => {
          tm.visible = false;
        });
      }

      const aliveCountNow = athletes.filter((a) => !a.eliminated).length;
      bannerText =
        nextRoundNum === 3
          ? `FINAL ROUND 3 · 1v1 SHOWDOWN (${aliveCountNow} LEFT)!`
          : `ROUND ${nextRoundNum} OF ${MAX_REGULATION_ROUNDS} · ${aliveCountNow} SURVIVORS LEFT!`;
      bannerTimer = 3.0;
      onCalloutRef.current?.(
        nextRoundNum === 3
          ? 'FINAL 1v1 SHOWDOWN!'
          : `ROUND ${nextRoundNum} · ${aliveCountNow} LEFT!`,
        nextRoundNum === 3 ? '#FACC15' : '#38BDF8'
      );
    };

    const animate = (now: number) => {
      animFrameId = requestAnimationFrame(animate);
      const rawDt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;

      if (keys['KeyQ']) camYawOffsetRef.current += 2.2 * rawDt;
      if (keys['KeyE']) camYawOffsetRef.current -= 2.2 * rawDt;

      if (gameStateRef.current === 'PAUSED') {
        postPipeline.render();
        return;
      }

      const dt = rawDt * speedMultRef.current;
      const tSec = now * 0.001;

      lagoonTex.offset.x = Math.sin(tSec * 0.35) * 0.04;
      lagoonTex.offset.y = Math.cos(tSec * 0.28) * 0.04;
      deepOceanTex.offset.x = (tSec * 0.02) % 1;

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

      if (bannerTimer > 0) {
        bannerTimer -= rawDt;
        if (bannerTimer <= 0 && !matchEnded) bannerText = null;
      }

      // Handle Post-Match Celebration Delay before opening Statistics Page!
      if (matchEnded && pendingMatchResult) {
        matchEndStatsDelayTimer -= rawDt;
        if (matchEndStatsDelayTimer <= 0) {
          const res = pendingMatchResult;
          pendingMatchResult = null;
          onGameOverRef.current(res.winner, res.stats);
        }
      }

      // Handle Inter-Round Transition after an Elimination
      if (roundTransitionTimer > 0 && !matchEnded) {
        roundTransitionTimer -= rawDt;
        if (roundTransitionTimer <= 0) {
          resetForNextRound(currentRound + 1);
        }
      } else if (countdownSec > 0 && !matchEnded) {
        const prevCeil = Math.ceil(countdownSec);
        countdownSec = Math.max(0, countdownSec - rawDt);
        const nextCeil = Math.ceil(countdownSec);
        if (nextCeil !== prevCeil) {
          crayonAudio.playCountdownBeep(nextCeil === 0);
        }
      } else if (!matchEnded) {
        roundTimeSec += dt;
        totalMatchTimeSec += dt;
      }

      const GRAVITY = -26.5;
      const MOVE_SPEED = 7.25;
      const JUMP_VY = 9.8;

      // Helper to find closest free dodgeball to a given coordinate
      const findNearestFreeBall = (px: number, pz: number): DodgeballObject | null => {
        let bestBall: DodgeballObject | null = null;
        let bestDist = 99999;
        for (const b of dodgeballs) {
          if (b.state !== 'free' || b.pickupCooldown > 0) continue;
          const d = Math.hypot(b.x - px, b.z - pz);
          if (d < bestDist) {
            bestDist = d;
            bestBall = b;
          }
        }
        return bestBall;
      };

      // Assign up to 2 AI bots to chase the 2 free dodgeballs without clumping on the same ball
      const ballChaserMap = new Map<number, string>();
      for (const b of dodgeballs) {
        if (b.state !== 'free') continue;
        let bestBotId: string | null = null;
        let bestDist = 99999;
        for (const bot of athletes) {
          if (bot.isPlayer || bot.eliminated || bot.heldBallId !== null) continue;
          if ([...ballChaserMap.values()].includes(bot.id)) continue;
          const d = Math.hypot(b.x - bot.x, b.z - bot.z);
          const weightedD = bot.aiRole === 'rusher' ? d * 0.82 : d;
          if (weightedD < bestDist) {
            bestDist = weightedD;
            bestBotId = bot.id;
          }
        }
        if (bestBotId) {
          ballChaserMap.set(b.id, bestBotId);
        }
      }

      for (const a of athletes) {
        if (a.eliminated) continue;

        if (a.invulnTimer > 0) {
          a.invulnTimer = Math.max(0, a.invulnTimer - dt);
        }
        if (a.catchWindowTimer > 0) {
          a.catchWindowTimer = Math.max(0, a.catchWindowTimer - dt);
        }

        a.shieldMesh.visible = false;

        if (a.dodgeCooldown > 0)
          a.dodgeCooldown = Math.max(0, a.dodgeCooldown - dt);
        if (a.dodgeActiveTimer > 0)
          a.dodgeActiveTimer = Math.max(0, a.dodgeActiveTimer - dt);
        if (a.throwSwingTimer > 0)
          a.throwSwingTimer = Math.max(0, a.throwSwingTimer - dt);
        if (a.hitFlashTimer > 0)
          a.hitFlashTimer = Math.max(0, a.hitFlashTimer - dt);

        a.superCharge = Math.min(100, a.superCharge + dt * 5.0);

        let inputX = 0;
        let inputZ = 0;
        let wantsAction = false;
        let wantsDodge = false;
        let wantsJump = false;

        if (
          countdownSec <= 0 &&
          roundTransitionTimer <= 0 &&
          !matchEnded
        ) {
          if (a.isPlayer) {
            let rawRight = 0;
            let rawForward = 0;
            if (keys['KeyA'] || keys['ArrowLeft']) rawRight -= 1;
            if (keys['KeyD'] || keys['ArrowRight']) rawRight += 1;
            if (keys['KeyW'] || keys['ArrowUp']) rawForward += 1;
            if (keys['KeyS'] || keys['ArrowDown']) rawForward -= 1;

            if (joystickRef.current.active) {
              rawRight += joystickRef.current.x;
              rawForward -= joystickRef.current.y;
            }

            const len = Math.hypot(rawRight, rawForward);
            if (len > 0.01) {
              const nr = rawRight / Math.max(1, len);
              const nf = rawForward / Math.max(1, len);
              const yaw = camYawOffsetRef.current;
              const fwdX = -Math.sin(yaw);
              const fwdZ = -Math.cos(yaw);
              const rgtX = Math.cos(yaw);
              const rgtZ = -Math.sin(yaw);
              inputX = fwdX * nf + rgtX * nr;
              inputZ = fwdZ * nf + rgtZ * nr;
            }

            const isHoldingScreen =
              screenHeldRef.current ||
              joystickRef.current.active ||
              Boolean(keys['Space']) ||
              Boolean(keys['KeyF']);

            const nearestFree = findNearestFreeBall(a.x, a.z);
            if (
              isHoldingScreen &&
              a.heldBallId === null &&
              nearestFree
            ) {
              const distToBall = Math.hypot(nearestFree.x - a.x, nearestFree.z - a.z);
              if (distToBall <= 3.85 && nearestFree.y <= 2.3) {
                nearestFree.state = 'held';
                nearestFree.holderId = a.id;
                nearestFree.lastHitVictimId = null;
                nearestFree.floorRing.visible = false;
                nearestFree.beaconArrow.visible = false;
                nearestFree.trailMeshes.forEach((tm) => {
                  tm.visible = false;
                });
                a.heldBallId = nearestFree.id;
                a.aiHoldTimer = 0;
                a.jiggleVelY += 3.2;
                crayonAudio.playWeaponPickup();
                onCalloutRef.current?.('NUKE PICKED UP!', '#FACC15');
              } else if (distToBall <= 8.5 && len < 0.15) {
                inputX = (nearestFree.x - a.x) / Math.max(0.1, distToBall);
                inputZ = (nearestFree.z - a.z) / Math.max(0.1, distToBall);
              }
            }

            if (rightActionQueuedRef.current) {
              wantsAction = true;
              rightActionQueuedRef.current = false;
            }
            if (dodgeQueuedRef.current) {
              wantsDodge = true;
              dodgeQueuedRef.current = false;
            }
            if (jumpQueuedRef.current) {
              wantsJump = true;
              jumpQueuedRef.current = false;
            }
          } else if (
            a.remotePlayerId &&
            a.lastRemoteTickAt &&
            now - a.lastRemoteTickAt < 3500
          ) {
            inputX = a.vx / 7.25;
            inputZ = a.vz / 7.25;
          } else {
            a.aiThinkTimer -= dt;
            a.aiGoalTimer -= dt;
            if (a.aiThinkTimer <= 0) {
              a.aiThinkTimer =
                a.aiRole === 'rusher'
                  ? 0.22 + Math.random() * 0.25
                  : a.aiRole === 'flanker'
                    ? 0.3 + Math.random() * 0.35
                    : 0.35 + Math.random() * 0.4;
              if (Math.random() < 0.32) a.aiStrafeDir = -a.aiStrafeDir;
            }

            if (a.aiGoalTimer <= 0) {
              a.aiGoalTimer = 1.6 + Math.random() * 1.8;
              if (a.aiRole === 'rusher') {
                const ang = Math.random() * Math.PI * 2;
                const rad = 3.5 + Math.random() * 5.5;
                a.aiGoalX = Math.cos(ang) * rad;
                a.aiGoalZ = Math.sin(ang) * rad;
              } else if (a.aiRole === 'flanker') {
                const side = Math.random() < 0.5 ? -1 : 1;
                a.aiGoalX = side * (7.5 + Math.random() * 5.0);
                a.aiGoalZ = (Math.random() - 0.5) * 18.0;
              } else {
                const refTarget = playerAthlete.eliminated ? a : playerAthlete;
                a.aiGoalX = THREE.MathUtils.clamp(
                  -refTarget.x * 0.7 + (Math.random() - 0.5) * 7.0,
                  -12,
                  12
                );
                a.aiGoalZ = THREE.MathUtils.clamp(
                  -refTarget.z * 0.7 + (Math.random() - 0.5) * 7.0,
                  -12,
                  12
                );
              }
            }

            // 1. Incoming Thrown Ball Evasion across BOTH dodgeballs
            let evadingIncoming = false;
            for (const b of dodgeballs) {
              if (b.state === 'thrown' && b.holderId !== a.id) {
                const toBotX = a.x - b.x;
                const toBotZ = a.z - b.z;
                const bDist = Math.hypot(toBotX, toBotZ);
                const bSpd = Math.max(1, Math.hypot(b.vx, b.vz));
                const dot =
                  (toBotX * b.vx + toBotZ * b.vz) /
                  (Math.max(0.1, bDist) * bSpd);
                if (bDist < 8.5 && dot > 0.74) {
                  evadingIncoming = true;
                  const perpX = -b.vz / bSpd;
                  const perpZ = b.vx / bSpd;
                  inputX = perpX * a.aiStrafeDir;
                  inputZ = perpZ * a.aiStrafeDir;
                  if (
                    a.dodgeCooldown <= 0 &&
                    bDist < 5.6 &&
                    Math.random() < 0.65
                  ) {
                    wantsDodge = true;
                  } else if (a.grounded && bDist < 4.5 && Math.random() < 0.42) {
                    wantsJump = true;
                  }
                  break;
                }
              }
            }

            if (!evadingIncoming) {
              const assignedBall = dodgeballs.find(
                (b) => b.state === 'free' && ballChaserMap.get(b.id) === a.id
              );

              if (a.heldBallId !== null) {
                a.aiHoldTimer += dt;
                const enemy = findBestEnemyTarget(a);
                if (enemy) {
                  const dx = enemy.x - a.x;
                  const dz = enemy.z - a.z;
                  const dist = Math.max(0.1, Math.hypot(dx, dz));
                  a.targetYaw = Math.atan2(dx, dz);

                  const idealDist =
                    a.aiRole === 'rusher'
                      ? 5.5
                      : a.aiRole === 'flanker'
                        ? 8.5
                        : 10.5;
                  if (dist > idealDist) {
                    inputX =
                      (dx / dist) * 0.82 +
                      (-dz / dist) * a.aiStrafeDir * 0.35;
                    inputZ =
                      (dz / dist) * 0.82 +
                      (dx / dist) * a.aiStrafeDir * 0.35;
                  } else {
                    inputX = (-dz / dist) * a.aiStrafeDir * 0.85;
                    inputZ = (dx / dist) * a.aiStrafeDir * 0.85;
                  }
                }
                if (a.aiHoldTimer >= a.aiThrowDelay) {
                  wantsAction = true;
                  a.aiHoldTimer = 0;
                  a.aiThrowDelay =
                    a.aiRole === 'rusher'
                      ? 0.34 + Math.random() * 0.24
                      : a.aiRole === 'flanker'
                        ? 0.48 + Math.random() * 0.32
                        : 0.6 + Math.random() * 0.36;
                }
              } else if (assignedBall) {
                const dx = assignedBall.x - a.x;
                const dz = assignedBall.z - a.z;
                const dist = Math.max(0.1, Math.hypot(dx, dz));
                inputX = dx / dist;
                inputZ = dz / dist;
                if (
                  dist <= 2.35 &&
                  assignedBall.pickupCooldown <= 0 &&
                  assignedBall.y <= 1.85 &&
                  (assignedBall.lastHitVictimId !== a.id ||
                    assignedBall.idleTimer > 0.45) &&
                  a.dodgeCooldown <= 0
                ) {
                  wantsDodge = true;
                }
              } else {
                const activeHolder = athletes.find(
                  (o) => !o.eliminated && o.id !== a.id && o.heldBallId !== null
                );
                const gx = a.aiGoalX - a.x;
                const gz = a.aiGoalZ - a.z;
                const gDist = Math.hypot(gx, gz);
                if (activeHolder) {
                  const hx = a.x - activeHolder.x;
                  const hz = a.z - activeHolder.z;
                  const hDist = Math.max(0.1, Math.hypot(hx, hz));
                  const perpX = -hz / hDist;
                  const perpZ = hx / hDist;
                  const retreatWeight = hDist < 7.5 ? 0.65 : 0.15;
                  const goalWeight = gDist > 1.5 ? 0.45 : 0.0;
                  inputX =
                    perpX * a.aiStrafeDir * 0.75 +
                    (hx / hDist) * retreatWeight +
                    (gx / Math.max(1, gDist)) * goalWeight;
                  inputZ =
                    perpZ * a.aiStrafeDir * 0.75 +
                    (hz / hDist) * retreatWeight +
                    (gz / Math.max(1, gDist)) * goalWeight;
                  a.targetYaw = Math.atan2(
                    activeHolder.x - a.x,
                    activeHolder.z - a.z
                  );
                } else if (gDist > 1.1) {
                  inputX = gx / gDist;
                  inputZ = gz / gDist;
                } else {
                  inputX = -Math.sin(tSec * 2 + a.spawnYaw) * 0.45;
                  inputZ = Math.cos(tSec * 2 + a.spawnYaw) * 0.45;
                }
              }
            }
          }
        }

        if (wantsAction) {
          if (a.heldBallId !== null) {
            performThrowBall(a);
          } else {
            wantsDodge = true;
          }
        }

        if (wantsDodge && a.dodgeCooldown <= 0) {
          a.dodgeCooldown = 0.68;
          a.dodgeActiveTimer = 0.34;
          a.catchWindowTimer = 0.32;

          const freeBallNearby =
            a.heldBallId === null
              ? dodgeballs.find(
                  (b) =>
                    b.state === 'free' &&
                    b.pickupCooldown <= 0 &&
                    Math.hypot(b.x - a.x, b.z - a.z) <= 3.2 &&
                    b.y <= 2.15
                )
              : undefined;

          const thrownBallNearby =
            a.heldBallId === null
              ? dodgeballs.find(
                  (b) =>
                    b.state === 'thrown' &&
                    b.holderId !== a.id &&
                    Math.hypot(b.x - a.x, b.z - a.z) <= 2.95
                )
              : undefined;

          if (freeBallNearby) {
            freeBallNearby.state = 'held';
            freeBallNearby.holderId = a.id;
            freeBallNearby.lastHitVictimId = null;
            freeBallNearby.floorRing.visible = false;
            freeBallNearby.beaconArrow.visible = false;
            freeBallNearby.trailMeshes.forEach((tm) => {
              tm.visible = false;
            });
            a.heldBallId = freeBallNearby.id;
            a.aiHoldTimer = 0;
            a.jiggleVelY += 3.2;
            if (a.isPlayer) {
              crayonAudio.playWeaponPickup();
              onCalloutRef.current?.('NUKE PICKED UP!', '#FACC15');
            }
          } else if (
            thrownBallNearby &&
            (a.isPlayer || Math.random() < 0.25)
          ) {
            thrownBallNearby.state = 'held';
            thrownBallNearby.holderId = a.id;
            thrownBallNearby.isSuperThrow = false;
            thrownBallNearby.floorRing.visible = false;
            thrownBallNearby.beaconArrow.visible = false;
            thrownBallNearby.trailMeshes.forEach((tm) => {
              tm.visible = false;
            });
            a.heldBallId = thrownBallNearby.id;
            a.catchesMade += 1;
            a.hp = Math.min(a.maxHp, a.hp + 35);
            a.superCharge = 100;
            spawnHitExplosion(a.x, a.y + 1.0, a.z, '#38BDF8', true);
            crayonAudio.playDodgeballCatch();
            if (a.isPlayer) {
              onCalloutRef.current?.('SUPER CATCH! +35 HP', '#38BDF8');
            } else {
              bannerText = `${a.name} CAUGHT THE NUKE!`;
              bannerTimer = 2.0;
            }
          } else {
            const dLen = Math.hypot(inputX, inputZ);
            const dx = dLen > 0.05 ? inputX / dLen : Math.sin(a.facingYaw);
            const dz = dLen > 0.05 ? inputZ / dLen : Math.cos(a.facingYaw);
            const dodgeImpulse = a.grounded ? 8.5 : 4.6;
            a.knockVx = dx * dodgeImpulse;
            a.knockVz = dz * dodgeImpulse;
            a.jiggleVelY -= 3.0;
            a.jiggleVelRoll += dx * 6.0;
            if (a.isPlayer) {
              crayonAudio.playDive();
            }
          }
        }

        if (wantsJump && a.grounded) {
          a.vy = JUMP_VY;
          a.grounded = false;
          a.jiggleVelY += 3.8;
          if (a.isPlayer) crayonAudio.playJumpBoing();
        }

        const airSpeedMult = a.grounded ? 1.0 : 0.88;
        const charSpeed =
          MOVE_SPEED *
          airSpeedMult *
          a.aiSpeedVar *
          (a.isPlayer ? 1.1 : 0.92 + diffObj.rushSpeedMult * 0.08);
        a.vx = THREE.MathUtils.lerp(
          a.vx,
          inputX * charSpeed,
          Math.min(1, dt * 16)
        );
        a.vz = THREE.MathUtils.lerp(
          a.vz,
          inputZ * charSpeed,
          Math.min(1, dt * 16)
        );
        a.knockVx *= Math.pow(0.025, dt);
        a.knockVz *= Math.pow(0.025, dt);

        if (a.isPlayer) {
          if (a.heldBallId !== null) {
            const camYaw = camYawOffsetRef.current;
            a.targetYaw = Math.atan2(-Math.sin(camYaw), -Math.cos(camYaw));
          } else if (Math.hypot(inputX, inputZ) > 0.08) {
            a.targetYaw = Math.atan2(inputX, inputZ);
          } else {
            const camYaw = camYawOffsetRef.current;
            a.targetYaw = Math.atan2(-Math.sin(camYaw), -Math.cos(camYaw));
          }
        } else if (Math.hypot(inputX, inputZ) > 0.08 && a.heldBallId === null) {
          a.targetYaw = Math.atan2(inputX, inputZ);
        } else if (a.heldBallId !== null) {
          const enemy = findBestEnemyTarget(a);
          if (enemy) {
            a.targetYaw = Math.atan2(enemy.x - a.x, enemy.z - a.z);
          }
        }

        a.vy += GRAVITY * dt;
        a.x += (a.vx + a.knockVx) * dt;
        a.z += (a.vz + a.knockVz) * dt;
        a.y += a.vy * dt;

        if (a.y <= 0.02) {
          if (!a.grounded && a.vy < -3.0) {
            a.jiggleVelY -= Math.min(4.5, Math.abs(a.vy) * 0.32);
          }
          a.y = 0.02;
          a.vy = 0;
          a.grounded = true;
        }

        a.x = THREE.MathUtils.clamp(
          a.x,
          -COURT_HALF_W + 0.9,
          COURT_HALF_W - 0.9
        );
        a.z = THREE.MathUtils.clamp(
          a.z,
          -COURT_HALF_D + 0.9,
          COURT_HALF_D - 0.9
        );

        // Automatic Touch Pickup for either of the 2 loose Nuke balls
        if (
          a.heldBallId === null &&
          countdownSec <= 0 &&
          roundTransitionTimer <= 0 &&
          !matchEnded
        ) {
          const pickupRadius = a.isPlayer
            ? screenHeldRef.current
              ? 3.85
              : 2.35
            : 1.65;
          for (const b of dodgeballs) {
            if (b.state !== 'free' || b.pickupCooldown > 0) continue;
            const canVictimTouch =
              b.lastHitVictimId !== a.id || b.idleTimer > 0.38;
            if (
              canVictimTouch &&
              Math.hypot(b.x - a.x, b.z - a.z) <= pickupRadius &&
              b.y <= 2.15
            ) {
              b.state = 'held';
              b.holderId = a.id;
              b.lastHitVictimId = null;
              b.floorRing.visible = false;
              b.beaconArrow.visible = false;
              b.trailMeshes.forEach((tm) => {
                tm.visible = false;
              });
              a.heldBallId = b.id;
              a.aiHoldTimer = 0;
              a.jiggleVelY += 3.0;
              if (a.isPlayer) {
                crayonAudio.playWeaponPickup();
                onCalloutRef.current?.('NUKE PICKED UP!', '#FACC15');
              }
              break;
            }
          }
        }
      }

      // 2. Athlete-to-Athlete Separation
      for (let i = 0; i < athletes.length; i++) {
        const a = athletes[i];
        if (a.eliminated) continue;
        for (let j = i + 1; j < athletes.length; j++) {
          const b = athletes[j];
          if (b.eliminated) continue;
          const dx = b.x - a.x;
          const dz = b.z - a.z;
          const dist = Math.hypot(dx, dz);
          const minSep = !a.isPlayer && !b.isPlayer ? 2.4 : 1.5;
          if (dist > 0.001 && dist < minSep) {
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

      // 3. Update BOTH Dodgeballs (Held in Hand, Swept Ballistic Flight, Ricochet & Rolling Physics!)
      for (const ball of dodgeballs) {
        if (ball.pickupCooldown > 0) {
          ball.pickupCooldown = Math.max(0, ball.pickupCooldown - dt);
        }

        if (ball.state === 'held') {
          const holder = athletes.find(
            (a) => a.id === ball.holderId && !a.eliminated
          );
          if (!holder) {
            ball.state = 'free';
            ball.holderId = null;
            ball.y = 0.54;
            ball.floorRing.visible = true;
            ball.beaconArrow.visible = true;
          } else {
            const rightX =
              Math.sin(holder.facingYaw) * 0.56 +
              Math.cos(holder.facingYaw) * 0.4;
            const rightZ =
              Math.cos(holder.facingYaw) * 0.56 -
              Math.sin(holder.facingYaw) * 0.4;
            ball.x = holder.x + rightX;
            ball.y = holder.visualY + 0.98;
            ball.z = holder.z + rightZ;
            ball.mesh.position.set(ball.x, ball.y, ball.z);
            ball.ballSphere.rotation.y += dt * 2.8;
            ball.floorRing.visible = false;
            ball.beaconArrow.visible = false;
          }
        } else if (ball.state === 'thrown') {
          const prevX = ball.x;
          const prevZ = ball.z;

          ball.vy -= 9.2 * dt;
          ball.x += ball.vx * dt;
          ball.y += ball.vy * dt;
          ball.z += ball.vz * dt;
          ball.ballSphere.rotation.x += dt * 20;
          ball.ballSphere.rotation.y += dt * 15;

          for (let t = TRAIL_LEN - 1; t > 0; t--) {
            ball.trailHistory[t] = { ...ball.trailHistory[t - 1] };
          }
          ball.trailHistory[0] = { x: ball.x, y: ball.y, z: ball.z };
          for (let t = 0; t < TRAIL_LEN; t++) {
            const pt = ball.trailHistory[t];
            ball.trailMeshes[t].position.set(pt.x, pt.y, pt.z);
            ball.trailMeshes[t].visible = true;
          }

          let hitOrCaught = false;
          const segDx = ball.x - prevX;
          const segDz = ball.z - prevZ;
          const segLenSq = segDx * segDx + segDz * segDz;

          for (const victim of athletes) {
            if (victim.id === ball.holderId || victim.eliminated) {
              continue;
            }
            let tProj = 1.0;
            if (segLenSq > 0.00001) {
              tProj = THREE.MathUtils.clamp(
                ((victim.x - prevX) * segDx + (victim.z - prevZ) * segDz) /
                  segLenSq,
                0,
                1
              );
            }
            const closestX = prevX + segDx * tProj;
            const closestZ = prevZ + segDz * tProj;
            const hDist = Math.hypot(victim.x - closestX, victim.z - closestZ);

            if (
              hDist <= 1.32 &&
              ball.y >= victim.y - 0.3 &&
              ball.y <= victim.y + 2.35
            ) {
              const thrower = athletes.find((a) => a.id === ball.holderId);

              if (victim.dodgeActiveTimer > 0 && hDist > 0.48) {
                if (victim.isPlayer) {
                  onCalloutRef.current?.('DODGED!', '#4ADE80');
                }
                continue;
              }

              hitOrCaught = true;

              const dmg = ball.isSuperThrow ? 55 : 40;
              victim.hp = Math.max(0, victim.hp - dmg);
              // Show Health Bar ONLY for 2.2s after getting hit!
              victim.hitFlashTimer = 2.2;

              const spd = Math.max(1, Math.hypot(ball.vx, ball.vz));
              const dirX = ball.vx / spd;
              const dirZ = ball.vz / spd;
              const kb = ball.isSuperThrow ? 11.5 : 8.5;
              victim.knockVx = dirX * kb;
              victim.knockVz = dirZ * kb;
              victim.vy = 4.2;
              victim.grounded = false;
              victim.jiggleVelY += 5.0;
              victim.jiggleVelRoll += dirX * 6.2;

              if (thrower) {
                thrower.hitsScored += 1;
              }

              const isKo = victim.hp <= 0;
              spawnBloodSplatter(
                victim.x,
                victim.y + 0.95,
                victim.z,
                dirX,
                dirZ,
                isKo ? 1.65 : ball.isSuperThrow ? 1.35 : 1.1
              );
              spawnHitExplosion(
                victim.x,
                victim.y + 0.95,
                victim.z,
                '#DC2626',
                ball.isSuperThrow
              );

              crayonAudio.playDodgeballHit(
                victim.config.id,
                ball.isSuperThrow,
                isKo
              );

              if (victim.isPlayer || thrower?.isPlayer) {
                screenShakeMag = ball.isSuperThrow ? 0.38 : 0.22;
              }

              if (isKo) {
                victim.eliminated = true;
                victim.group.visible = false;
                victim.hpBarBg.visible = false;
                victim.hpBarFill.visible = false;
                // If victim was holding the other ball, drop it immediately
                if (victim.heldBallId !== null) {
                  const dropped = dodgeballs.find(
                    (db) => db.id === victim.heldBallId
                  );
                  if (dropped) {
                    dropped.state = 'free';
                    dropped.holderId = null;
                    dropped.floorRing.visible = true;
                    dropped.beaconArrow.visible = true;
                  }
                  victim.heldBallId = null;
                }
                if (thrower) thrower.kills += 1;
                crayonAudio.playScoreCheer();
                bannerText = `${thrower ? thrower.name : 'Nuke'} ELIMINATED ${victim.name}!`;
                bannerTimer = 2.6;

                if (thrower?.isPlayer) {
                  onCalloutRef.current?.(
                    `ELIMINATED ${victim.name.toUpperCase()}!`,
                    '#FACC15'
                  );
                } else if (victim.isPlayer) {
                  onCalloutRef.current?.('ELIMINATED!', '#FB7185');
                }
              } else {
                const hitsLeft = Math.ceil(victim.hp / 40);
                if (victim.isPlayer) {
                  onCalloutRef.current?.(
                    `HIT! (${hitsLeft} HITS LEFT)`,
                    '#FB7185'
                  );
                } else if (thrower?.isPlayer) {
                  onCalloutRef.current?.(`NUKE HIT! -${dmg} HP`, '#FEF08A');
                }
              }

              ball.state = 'free';
              ball.holderId = null;
              ball.targetId = null;
              ball.pickupCooldown = 0.36;
              ball.lastHitVictimId = victim.id;
              ball.idleTimer = 0;

              const incomingAngle = Math.atan2(dirX, dirZ);
              const deflectOffset =
                (Math.random() < 0.5 ? -1 : 1) *
                (Math.PI * 0.42 + Math.random() * Math.PI * 0.42);
              const bounceAngle = incomingAngle + deflectOffset;
              const bounceSpeed = 11.0 + Math.random() * 4.0;
              ball.vx = Math.sin(bounceAngle) * bounceSpeed;
              ball.vz = Math.cos(bounceAngle) * bounceSpeed;
              ball.vy = 7.6 + Math.random() * 2.2;
              ball.trailMeshes.forEach((tm) => {
                tm.visible = false;
              });
              break;
            }
          }

          if (!hitOrCaught) {
            if (ball.y <= 0.54) {
              ball.y = 0.54;
              const horizSpd = Math.hypot(ball.vx, ball.vz);
              if (horizSpd > 15.5) {
                ball.vx *= 0.72;
                ball.vz *= 0.72;
                ball.vy = 4.8;
                crayonAudio.playBallBounce(0.75);
              } else {
                ball.state = 'free';
                ball.holderId = null;
                ball.targetId = null;
                ball.pickupCooldown = 0.14;
                ball.vx *= 0.78;
                ball.vz *= 0.78;
                ball.vy = Math.max(4.4, Math.abs(ball.vy) * 0.7);
                ball.trailMeshes.forEach((tm) => {
                  tm.visible = false;
                });
                crayonAudio.playBallBounce(0.72);
              }
            }
            if (Math.abs(ball.x) > COURT_HALF_W - 0.6) {
              ball.x = Math.sign(ball.x) * (COURT_HALF_W - 0.6);
              ball.vx = -ball.vx * 0.78;
              ball.vy = Math.max(ball.vy, 4.2);
              ball.state = 'free';
              ball.holderId = null;
              ball.pickupCooldown = 0.16;
              ball.trailMeshes.forEach((tm) => {
                tm.visible = false;
              });
              crayonAudio.playBallBounce(0.7);
            }
            if (Math.abs(ball.z) > COURT_HALF_D - 0.6) {
              ball.z = Math.sign(ball.z) * (COURT_HALF_D - 0.6);
              ball.vz = -ball.vz * 0.78;
              ball.vy = Math.max(ball.vy, 4.2);
              ball.state = 'free';
              ball.holderId = null;
              ball.pickupCooldown = 0.16;
              ball.trailMeshes.forEach((tm) => {
                tm.visible = false;
              });
              crayonAudio.playBallBounce(0.7);
            }
          }

          ball.mesh.position.set(ball.x, ball.y, ball.z);
        } else {
          ball.vy -= 19.5 * dt;
          ball.x += ball.vx * dt;
          ball.y += ball.vy * dt;
          ball.z += ball.vz * dt;
          if (ball.y <= 0.54) {
            ball.y = 0.54;
            if (ball.vy < -1.8) {
              ball.vy = -ball.vy * 0.66;
              crayonAudio.playBallBounce(
                Math.min(0.85, Math.abs(ball.vy) / 9.0)
              );
            } else {
              ball.vy = 0;
            }
            ball.vx *= Math.pow(0.42, dt);
            ball.vz *= Math.pow(0.42, dt);
          }

          if (Math.abs(ball.x) > COURT_HALF_W - 0.6) {
            ball.x = Math.sign(ball.x) * (COURT_HALF_W - 0.6);
            ball.vx = -ball.vx * 0.78;
            crayonAudio.playBallBounce(0.55);
          }
          if (Math.abs(ball.z) > COURT_HALF_D - 0.6) {
            ball.z = Math.sign(ball.z) * (COURT_HALF_D - 0.6);
            ball.vz = -ball.vz * 0.78;
            crayonAudio.playBallBounce(0.55);
          }

          const rollSpeed = Math.hypot(ball.vx, ball.vz);
          if (rollSpeed < 0.8) {
            ball.idleTimer += dt;
            const distFromCenter = Math.hypot(ball.x - ball.homeX, ball.z - ball.homeZ);
            if (ball.idleTimer > 3.2 && distFromCenter > 6.5) {
              ball.idleTimer = 0;
              ball.vx = ((ball.homeX - ball.x) / distFromCenter) * 8.5;
              ball.vz = ((ball.homeZ - ball.z) / distFromCenter) * 8.5;
              ball.vy = 5.4;
              spawnHitExplosion(ball.x, 0.2, ball.z, '#FACC15', false);
            }
          } else {
            ball.idleTimer = 0;
          }

          const bob = rollSpeed < 0.6 ? Math.sin(tSec * 4.0 + ball.id) * 0.05 : 0;
          ball.mesh.position.set(ball.x, ball.y + bob, ball.z);
          ball.ballSphere.rotation.x += ball.vz * dt * 1.8;
          ball.ballSphere.rotation.z -= ball.vx * dt * 1.8;

          ball.floorRing.visible = true;
          ball.floorRing.position.set(ball.x, 0.042, ball.z);
          const ringPulse = 0.95 + Math.sin(tSec * 6.0 + ball.id) * 0.14;
          ball.floorRing.scale.setScalar(ringPulse);

          ball.beaconArrow.visible = true;
          ball.beaconArrow.position.set(
            ball.x,
            ball.y + 1.15 + Math.sin(tSec * 6.0 + ball.id) * 0.18,
            ball.z
          );
          ball.beaconArrow.rotation.y += dt * 3.0;
        }
      }

      // 4. Update Compact Center-Screen Crosshair Lock
      const lockedEnemy = !playerAthlete.eliminated
        ? getCrosshairLockedEnemy()
        : null;

      if (
        crosshairRingRef.current &&
        crosshairDotRef.current &&
        crosshairLabelRef.current
      ) {
        if (lockedEnemy) {
          crosshairRingRef.current.style.borderColor = '#EF4444';
          crosshairRingRef.current.style.transform = 'scale(1.18)';
          crosshairDotRef.current.style.backgroundColor = '#EF4444';
          crosshairLabelRef.current.textContent = lockedEnemy.name.toUpperCase();
          crosshairLabelRef.current.style.opacity = '1';
        } else {
          crosshairRingRef.current.style.borderColor =
            playerAthlete.heldBallId !== null
              ? '#FACC15'
              : 'rgba(255,255,255,0.85)';
          crosshairRingRef.current.style.transform = 'scale(1)';
          crosshairDotRef.current.style.backgroundColor =
            playerAthlete.heldBallId !== null ? '#FACC15' : '#FFFFFF';
          crosshairLabelRef.current.style.opacity = '0';
        }
      }

      // 5. Update 3D VFX Bursts & Crimson Blood Splatters
      for (let i = vfxBursts.length - 1; i >= 0; i--) {
        const p = vfxBursts[i];
        p.life -= dt;
        const prog = 1 - Math.max(0, p.life / p.maxLife);
        if (p.kind === 'ring') {
          p.mesh.scale.setScalar(1 + prog * 2.6);
          ((p.mesh as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity =
            (1 - prog) * 0.82;
        } else if (p.kind === 'blood_mist') {
          p.mesh.position.x += p.vx * dt;
          p.mesh.position.y += p.vy * dt;
          p.mesh.position.z += p.vz * dt;
          p.mesh.scale.setScalar(1 + prog * 2.5);
          ((p.mesh as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity =
            Math.max(0, (1 - prog) * 0.72);
        } else if (p.kind === 'blood_drop') {
          p.mesh.position.x += p.vx * dt;
          p.mesh.position.y += p.vy * dt;
          p.mesh.position.z += p.vz * dt;
          p.vy -= 18.5 * dt;
          const fY = p.floorY ?? 0.035;
          if (p.mesh.position.y <= fY) {
            p.mesh.position.y = fY;
            p.vx *= 0.25;
            p.vz *= 0.25;
            p.vy = 0;
            p.mesh.scale.set(1.4, 0.25, 1.4);
          } else {
            p.mesh.scale.setScalar(Math.max(0.15, 1 - prog * 0.55));
          }
        } else if (p.kind === 'blood_splat') {
          const m = (p.mesh as THREE.Mesh).material as THREE.MeshBasicMaterial;
          const fadeStart = 0.65;
          m.opacity =
            prog < fadeStart
              ? 0.85
              : Math.max(0, 0.85 * (1 - (prog - fadeStart) / (1 - fadeStart)));
        } else {
          p.mesh.position.x += p.vx * dt;
          p.mesh.position.y += p.vy * dt;
          p.mesh.position.z += p.vz * dt;
          p.vy -= 14.0 * dt;
          p.mesh.rotation.x += dt * 8;
          p.mesh.rotation.y += dt * 8;
          p.mesh.scale.setScalar(Math.max(0.05, 1 - prog));
        }
        if (p.life <= 0) {
          scene.remove(p.mesh);
          vfxBursts.splice(i, 1);
        }
      }

      // 6. Update Athlete Visual Transforms, Hit-Only Overhead HP Bars & Ragdoll Jiggle
      for (const a of athletes) {
        if (a.eliminated) continue;

        a.visualY += (a.y - a.visualY) * Math.min(1, dt * 20);
        a.facingYaw = lerpAngleShortest(
          a.facingYaw,
          a.targetYaw,
          Math.min(1, dt * 14)
        );
        a.group.position.set(a.x, a.visualY, a.z);
        a.group.rotation.y = a.facingYaw;

        // Keep overhead HP bar hidden in Dodgeball (HUD only shows Round & Active Players!)
        a.hpBarBg.visible = false;
        a.hpBarFill.visible = false;

        a.jiggleVelY += (-190 * a.jiggleY - 10.5 * a.jiggleVelY) * dt;
        a.jiggleY = THREE.MathUtils.clamp(
          a.jiggleY + a.jiggleVelY * dt,
          -0.28,
          0.28
        );
        a.jiggleVelRoll += (-160 * a.jiggleRoll - 9.5 * a.jiggleVelRoll) * dt;
        a.jiggleRoll = THREE.MathUtils.clamp(
          a.jiggleRoll + a.jiggleVelRoll * dt,
          -0.24,
          0.24
        );

        const speed = Math.hypot(a.vx, a.vz);
        const runBounce =
          speed > 0.5 && a.grounded ? Math.sin(a.walkCycle * 2) * 0.04 : 0;
        const totJiggle = a.jiggleY + runBounce;

        if (a.rig.bodyGroup) {
          a.rig.bodyGroup.scale.set(
            1 - totJiggle * 0.22,
            1 + totJiggle * 0.3,
            1 - totJiggle * 0.22
          );
          a.rig.bodyGroup.rotation.z = a.jiggleRoll * 0.6;
        }
        if (a.rig.headGroup) {
          a.rig.headGroup.rotation.z = -a.jiggleRoll * 0.75;
        }

        if (speed > 0.45 && a.grounded) {
          if (a.isPlayer) crayonAudio.playFootstep();
          a.walkCycle += dt * speed * 2.1;
          const stride = Math.sin(a.walkCycle) * 0.48;
          if (a.rig.leftFoot) a.rig.leftFoot.rotation.x = stride;
          if (a.rig.rightFoot) a.rig.rightFoot.rotation.x = -stride;
          if (a.rig.leftArm) a.rig.leftArm.rotation.x = -stride * 0.65;
          if (a.rig.rightArm) {
            if (a.throwSwingTimer > 0) {
              a.rig.rightArm.rotation.x = -2.2;
            } else if (a.heldBallId !== null) {
              a.rig.rightArm.rotation.x = -1.25;
            } else {
              a.rig.rightArm.rotation.x = stride * 0.65;
            }
          }
        } else {
          if (a.rig.leftFoot) a.rig.leftFoot.rotation.x *= 0.82;
          if (a.rig.rightFoot) a.rig.rightFoot.rotation.x *= 0.82;
          if (a.rig.leftArm) a.rig.leftArm.rotation.x *= 0.82;
          if (a.rig.rightArm) {
            if (a.throwSwingTimer > 0) {
              a.rig.rightArm.rotation.x = -2.2;
            } else if (a.heldBallId !== null) {
              a.rig.rightArm.rotation.x = -1.25;
            } else {
              a.rig.rightArm.rotation.x *= 0.82;
            }
          }
        }
      }

      // 7. Check Elimination-Driven Round Progression:
      //    - Round 1 (starts with 4): advances ONLY when 1 player is eliminated (<= 3 alive)
      //    - Round 2 (starts with 3): advances ONLY when 1 more is eliminated (<= 2 alive)
      //    - Round 3 (starts with 2): ends when 1 is eliminated (1 Champion survivor wins!)
      const aliveAthletes = athletes.filter((a) => !a.eliminated);
      const roundLimitSec = Math.max(45, Math.floor(matchDurationSec / 3));

      if (
        !matchEnded &&
        countdownSec <= 0 &&
        roundTransitionTimer <= 0 &&
        roundTimeSec >= roundLimitSec &&
        !overtimeAnnounced
      ) {
        overtimeAnnounced = true;
        bannerText = 'OVERTIME! ROUND CONTINUES UNTIL AN ELIMINATION!';
        bannerTimer = 2.8;
        onCalloutRef.current?.('OVERTIME! ELIMINATE 1 RIVAL!', '#FACC15');
      }

      const targetSurvivorsForRound =
        currentRound === 1 ? 3 : currentRound === 2 ? 2 : 1;

      if (
        !matchEnded &&
        countdownSec <= 0 &&
        roundTransitionTimer <= 0 &&
        (aliveAthletes.length <= targetSurvivorsForRound ||
          playerAthlete.eliminated)
      ) {
        // Award a survival round point to all surviving athletes when a round concludes
        if (!playerAthlete.eliminated) {
          for (const surv of aliveAthletes) {
            surv.roundWins += 1;
          }
        }

        // Did the match reach the Final Champion (1 survivor left, Round 3 finished, or Local Player Eliminated)?
        if (
          playerAthlete.eliminated ||
          currentRound >= MAX_REGULATION_ROUNDS ||
          aliveAthletes.length <= 1
        ) {
          matchEnded = true;
          matchEndStatsDelayTimer = 0.75; // Snappy handoff to App.tsx Victory/Defeat banner -> Statistics screen!

          const champion =
            aliveAthletes.find((a) => a.isPlayer) ||
            [...aliveAthletes].sort(
              (a, b) => b.kills - a.kills || b.roundWins - a.roundWins
            )[0] ||
            [...athletes].sort(
              (a, b) => b.kills - a.kills || b.roundWins - a.roundWins
            )[0];
          const playerWon = !playerAthlete.eliminated && champion.isPlayer;
          const bestRivalWins = Math.max(
            1,
            ...athletes.filter((a) => !a.isPlayer).map((a) => a.roundWins)
          );

          if (playerWon) {
            crayonAudio.playVictoryFanfare();
            bannerText = `VICTORY! ${playerAthlete.name} IS THE NUKE CHAMPION!`;
            onCalloutRef.current?.('CHAMPION VICTORY!', '#4ADE80');
          } else {
            crayonAudio.playLoseStinger();
            bannerText = playerAthlete.eliminated
              ? `ELIMINATED IN ROUND ${currentRound}! ${champion.name} LEADS!`
              : `${champion.name} WON THE NUKE CHAMPIONSHIP!`;
            onCalloutRef.current?.(
              playerAthlete.eliminated
                ? `KNOCKED OUT IN ROUND ${currentRound}!`
                : `${champion.name.toUpperCase()} WINS!`,
              '#FB7185'
            );
          }
          bannerTimer = 2.6;

          pendingMatchResult = {
            winner: playerWon ? 'player' : 'ai',
            stats: {
              playerScore: playerAthlete.roundWins,
              aiScore: bestRivalWins,
              bestRally: playerAthlete.kills,
              perfectSpikes: playerAthlete.hitsScored + playerAthlete.catchesMade,
              lastPointWinner: playerWon ? 'player' : 'ai',
              lastPointReason: playerWon
                ? `Nuke Champion! Survived all 3 Elimination Rounds (${playerAthlete.kills} KOs)!`
                : playerAthlete.eliminated
                  ? `Eliminated in Round ${currentRound} of 3 (${playerAthlete.kills} KOs)!`
                  : `${champion.name} won the Final Showdown!`,
              raceTimeSec: Number(totalMatchTimeSec.toFixed(1)),
              raceMaxFalls: playerAthlete.kills,
              raceProgressPct: playerWon
                ? 100
                : currentRound === 3
                  ? 85
                  : currentRound === 2
                    ? 60
                    : 35,
            },
          };
        } else {
          // Advance to Next Elimination Round (Round 2 with 3 survivors, or Round 3 with 2 finalists!)
          crayonAudio.playScoreCheer();
          roundTransitionTimer = 2.6;
          const nextRound = currentRound + 1;
          bannerText =
            nextRound === 3
              ? `2 FINALISTS REMAIN! ADVANCING TO FINAL ROUND 3!`
              : `${aliveAthletes.length} SURVIVORS ADVANCE TO ROUND ${nextRound}!`;
          bannerTimer = 2.6;
          onCalloutRef.current?.(
            nextRound === 3
              ? 'FINAL 2 ADVANCE TO ROUND 3!'
              : `ROUND ${currentRound} COMPLETE!`,
            '#4ADE80'
          );
        }
      }

      // 8. Third-Person Shooter-Style Rotatable Camera
      if (screenShakeMag > 0) {
        screenShakeMag = Math.max(0, screenShakeMag - rawDt * 2.4);
      }
      const shakeX = (Math.random() - 0.5) * screenShakeMag;
      const shakeY = (Math.random() - 0.5) * screenShakeMag;

      const aspect = camera.aspect || 1;
      const portraitFactor =
        aspect < 0.95
          ? THREE.MathUtils.clamp((0.95 - aspect) / 0.45, 0, 1.15)
          : 0;
      const effectiveFov = fovRef.current - 2 + portraitFactor * 10;
      if (Math.abs(camera.fov - effectiveFov) > 0.1) {
        camera.fov = effectiveFov;
        camera.updateProjectionMatrix();
      }

      const camFocusAthlete =
        !playerAthlete.eliminated
          ? playerAthlete
          : athletes.find((a) => !a.eliminated && a.heldBallId !== null) ||
            aliveAthletes[0] ||
            playerAthlete;

      const camYaw = camYawOffsetRef.current;
      const camPitch = THREE.MathUtils.clamp(
        camPitchOffsetRef.current,
        -0.12,
        0.52
      );
      const camDist = 6.8 + portraitFactor * 2.1;
      const camHeight =
        3.4 + portraitFactor * 1.15 + Math.sin(camPitch) * 3.2;

      const camTargetX =
        camFocusAthlete.x + Math.sin(camYaw) * camDist;
      const camTargetY =
        camFocusAthlete.visualY + camHeight;
      const camTargetZ =
        camFocusAthlete.z + Math.cos(camYaw) * camDist;

      const lookAheadDist = 11.0;
      const lookX =
        camFocusAthlete.x - Math.sin(camYaw) * lookAheadDist;
      const lookY =
        camFocusAthlete.visualY + 1.35 - Math.sin(camPitch) * 2.4;
      const lookZ =
        camFocusAthlete.z - Math.cos(camYaw) * lookAheadDist;

      camera.position.x =
        THREE.MathUtils.damp(camera.position.x, camTargetX, 14.0, rawDt) +
        shakeX;
      camera.position.y =
        THREE.MathUtils.damp(camera.position.y, camTargetY, 14.0, rawDt) +
        shakeY;
      camera.position.z = THREE.MathUtils.damp(
        camera.position.z,
        camTargetZ,
        14.0,
        rawDt
      );
      camera.lookAt(lookX, lookY, lookZ);

      // 9. Smart Throttled HUD Sync (Only triggers React state update when displayed values actually change = ZERO lag!)
      const hasBall = playerAthlete.heldBallId !== null;
      const isSuperReady = playerAthlete.superCharge >= 100;
      const roundLimit = Math.max(45, Math.floor(matchDurationSec / 3));
      const ceilCountdown = Math.ceil(countdownSec);
      const ceilRemaining = Math.max(0, Math.ceil(roundLimit - roundTimeSec));
      const standingsSig = athletes
        .map(
          (at) =>
            `${at.id}:${at.eliminated ? 0 : 1}:${Math.ceil(at.hp)}:${at.roundWins}:${at.kills}`
        )
        .join('|');
      const nextHudKey = `${ceilCountdown}_${aliveAthletes.length}_${ceilRemaining}_${Math.ceil(playerAthlete.hp)}_${hasBall ? 1 : 0}_${isSuperReady ? 1 : 0}_${currentRound}_${isExtraRound ? 1 : 0}_${bannerText ?? ''}_${standingsSig}`;

      if (nextHudKey !== lastHudKey) {
        lastHudKey = nextHudKey;
        onHudUpdateRef.current({
          countdown: ceilCountdown,
          aliveCount: aliveAthletes.length,
          totalPlayers: athletes.length,
          survivalTimeSec: Math.floor(totalMatchTimeSec),
          timeRemainingSec: ceilRemaining,
          playerLives: Math.ceil((playerAthlete.hp / playerAthlete.maxHp) * 4),
          playerHp: Math.max(0, Math.ceil(playerAthlete.hp)),
          playerMaxHp: playerAthlete.maxHp,
          playerKills: playerAthlete.kills,
          holdingBallType: hasBall ? 'crimson' : 'none',
          superReady: isSuperReady,
          currentRound,
          maxRounds: MAX_REGULATION_ROUNDS,
          isExtraRound,
          playerRoundWins: playerAthlete.roundWins,
          roundStandings: athletes.map((at) => ({
            id: at.id,
            name: at.isPlayer
              ? playerDisplayName || 'YOU'
              : at.name.replace(' (YOU)', ''),
            roundWins: at.roundWins,
            kills: at.kills,
            hp: Math.max(0, Math.ceil(at.hp)),
            maxHp: at.maxHp,
            alive: !at.eliminated,
            isPlayer: at.isPlayer,
            colorHex: at.colorHex,
          })),
          lavaLevelMeters: playerAthlete.hitsScored + playerAthlete.catchesMade,
          lavaWarningState: isSuperReady
            ? 'ERUPTING!'
            : hasBall
              ? 'RISING!'
              : 'STABLE',
          tilesCrumbled: playerAthlete.kills,
          currentTier: currentRound,
          eliminationBanner: bannerText,
        });
      }

      netSyncAccum += rawDt;
      if (netSyncAccum >= 0.036 && !matchEnded) {
        netSyncAccum = 0;
        multiplayerClient.sendPlayerTick({
          slotIndex: playerAthlete.slotIndex ?? 0,
          x: playerAthlete.x,
          y: playerAthlete.y,
          z: playerAthlete.z,
          vx: playerAthlete.vx,
          vy: playerAthlete.vy,
          vz: playerAthlete.vz,
          yaw: playerAthlete.facingYaw,
          hp: Math.round(playerAthlete.hp),
          maxHp: playerAthlete.maxHp,
          kills: playerAthlete.kills,
          holdingBallId: playerAthlete.heldBallId,
        });
      }

      postPipeline.render();
    };

    animFrameId = requestAnimationFrame(animate);

    return () => {
      unsubRemoteTick();
      unsubRemoteEvent();
      cancelAnimationFrame(animFrameId);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('resize', onResize);
      skyTexture.dispose();
      deepOceanTex.dispose();
      lagoonTex.dispose();
      courtDeckTex.dispose();
      crimsonBallTex.dispose();
      postPipeline.dispose();
      renderer.dispose();
    };
  }, [playerCharacter, aiDifficulty, lavaMapId, matchDurationSec]);

  // ===========================================================================
  // GUN-STYLE SCREEN ROTATION + HOLD SCREEN TO PICK BALL + AIM ASSIST THROW:
  // - Holding Screen anywhere (`screenHeldRef.current = true`) automatically picks up the ball when nearby!
  // - Drag Right Side of Screen (or Move Mouse) = Rotate 3D Camera & Aim Crosshair!
  // - Tap Right Side / Left-Click = Throw along Crosshair with Aim Assist!
  // - Double-Tap / Right-Click = Jump / Dodge!
  // - Left Half = Floating Movement Joystick
  // ===========================================================================
  const handleTouchAreaDown = (e: React.PointerEvent<HTMLDivElement>) => {
    screenHeldRef.current = true;
    const now = performance.now();
    if (now - lastTapTimeRef.current < 320) {
      tapStreakRef.current += 1;
    } else {
      tapStreakRef.current = 1;
    }
    lastTapTimeRef.current = now;

    if (e.pointerType === 'mouse') {
      lastMousePosRef.current = { x: e.clientX, y: e.clientY, initialized: true };
      if (e.button === 2) {
        dodgeQueuedRef.current = true;
      } else {
        rightActionQueuedRef.current = true;
      }
      return;
    }

    const screenW = window.innerWidth || 1;
    const isRightHalf = e.clientX >= screenW * 0.48;
    const isSecondFingerTouch =
      joyPointerIdRef.current !== null &&
      joyPointerIdRef.current !== e.pointerId;

    if (tapStreakRef.current >= 2 && isRightHalf) {
      tapStreakRef.current = 0;
      jumpQueuedRef.current = true;
    }

    // Right Half Touch = Hold to Pick Ball, Drag to Rotate Camera & Aim Crosshair, Tap to Throw!
    if (isRightHalf || isSecondFingerTouch) {
      lookPointerRef.current = {
        id: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        lastX: e.clientX,
        lastY: e.clientY,
        maxDrag: 0,
        downTime: now,
      };
      e.currentTarget.setPointerCapture(e.pointerId);
      return;
    }

    // Left Half Touch = Movement Joystick + Hold to Pick Ball!
    if (joyPointerIdRef.current === null) {
      joyPointerIdRef.current = e.pointerId;
      joyOriginRef.current = { x: e.clientX, y: e.clientY };
      e.currentTarget.setPointerCapture(e.pointerId);
      joystickRef.current = { x: 0, y: 0, active: true };
      if (joyContainerRef.current && joyKnobRef.current) {
        joyContainerRef.current.style.display = 'flex';
        joyContainerRef.current.style.left = `${e.clientX}px`;
        joyContainerRef.current.style.top = `${e.clientY}px`;
        joyKnobRef.current.style.transform = 'translate3d(0px, 0px, 0)';
      }
    }
  };

  const handleTouchAreaMove = (e: React.PointerEvent<HTMLDivElement>) => {
    // Desktop Mouse Movement = Smoothly Rotate Camera & Aim Center Crosshair!
    if (e.pointerType === 'mouse') {
      if (lastMousePosRef.current.initialized) {
        const mdx = e.clientX - lastMousePosRef.current.x;
        const mdy = e.clientY - lastMousePosRef.current.y;
        camYawOffsetRef.current -= mdx * 0.0055;
        camPitchOffsetRef.current = THREE.MathUtils.clamp(
          camPitchOffsetRef.current + mdy * 0.0035,
          -0.12,
          0.52
        );
      }
      lastMousePosRef.current = { x: e.clientX, y: e.clientY, initialized: true };
      return;
    }

    // Mobile/Touch Right Half Drag = Rotate Screen Camera & Aim Center Crosshair!
    if (lookPointerRef.current.id === e.pointerId) {
      const dx = e.clientX - lookPointerRef.current.lastX;
      const dy = e.clientY - lookPointerRef.current.lastY;
      lookPointerRef.current.lastX = e.clientX;
      lookPointerRef.current.lastY = e.clientY;
      const totalDrag = Math.hypot(
        e.clientX - lookPointerRef.current.startX,
        e.clientY - lookPointerRef.current.startY
      );
      lookPointerRef.current.maxDrag = Math.max(
        lookPointerRef.current.maxDrag,
        totalDrag
      );

      camYawOffsetRef.current -= dx * 0.0075;
      camPitchOffsetRef.current = THREE.MathUtils.clamp(
        camPitchOffsetRef.current + dy * 0.0045,
        -0.12,
        0.52
      );
      return;
    }

    if (joyPointerIdRef.current !== e.pointerId) return;
    const maxR = 52;
    const rawDx = e.clientX - joyOriginRef.current.x;
    const rawDy = e.clientY - joyOriginRef.current.y;
    const dist = Math.hypot(rawDx, rawDy);
    const clamped = Math.min(dist, maxR);
    const angle = Math.atan2(rawDy, rawDx);
    const dx = dist > 4 ? Math.cos(angle) * clamped : 0;
    const dy = dist > 4 ? Math.sin(angle) * clamped : 0;

    joystickRef.current = {
      x: dx / maxR,
      y: dy / maxR,
      active: dist > 4,
    };
    if (joyKnobRef.current) {
      joyKnobRef.current.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
    }
  };

  const handleTouchAreaEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse') {
      screenHeldRef.current = false;
      return;
    }
    if (lookPointerRef.current.id === e.pointerId) {
      // Quick Tap or Release on Right Half -> Throw held ball or Grab!
      if (lookPointerRef.current.maxDrag < 24) {
        rightActionQueuedRef.current = true;
      }
      lookPointerRef.current.id = null;
      if (joyPointerIdRef.current === null) {
        screenHeldRef.current = false;
      }
      return;
    }
    if (joyPointerIdRef.current !== e.pointerId) return;
    joyPointerIdRef.current = null;
    joystickRef.current = { x: 0, y: 0, active: false };
    if (lookPointerRef.current.id === null) {
      screenHeldRef.current = false;
    }
    if (joyContainerRef.current) {
      joyContainerRef.current.style.display = 'none';
    }
  };

  return (
    <div
      onContextMenu={(e) => e.preventDefault()}
      className="relative w-full h-full overflow-hidden select-none"
    >
      <div ref={containerRef} className="w-full h-full" />

      {/* Compact Precision Shooter Crosshair & Hold-Screen-to-Pick-Ball Touch Layer */}
      {gameState === 'PLAYING' && (
        <div
          onPointerDown={handleTouchAreaDown}
          onPointerMove={handleTouchAreaMove}
          onPointerUp={handleTouchAreaEnd}
          onPointerCancel={handleTouchAreaEnd}
          className="fixed inset-0 z-10 pointer-events-auto touch-none select-none"
        >
          {/* Compact 20px Shooter Crosshair ("why the cross hair so big dude" -> sleek minimal reticle!) */}
          <div
            style={{ left: '50%', top: '42%' }}
            className="pointer-events-none fixed -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center z-40"
          >
            <div className="relative w-5 h-5 flex items-center justify-center">
              <div
                ref={crosshairRingRef}
                className="w-3.5 h-3.5 rounded-full border-[1.5px] border-white/85 shadow-[0_0_4px_rgba(0,0,0,0.85)] transition-transform duration-75 flex items-center justify-center"
              >
                <div
                  ref={crosshairDotRef}
                  className="w-1 h-1 rounded-full bg-yellow-300 shadow-sm"
                />
              </div>
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1.5px] h-1 bg-white/90 shadow-[0_0_2px_#000]" />
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[1.5px] h-1 bg-white/90 shadow-[0_0_2px_#000]" />
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-[1.5px] bg-white/90 shadow-[0_0_2px_#000]" />
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-[1.5px] bg-white/90 shadow-[0_0_2px_#000]" />
            </div>
            <span
              ref={crosshairLabelRef}
              style={{ opacity: 0 }}
              className="mt-0.5 px-1.5 py-0.2 rounded bg-slate-950/80 border border-red-400/40 text-[8px] font-extrabold tracking-wider text-red-300 uppercase shadow transition-opacity duration-75"
            />
          </div>

          <div
            ref={joyContainerRef}
            style={{ display: 'none' }}
            className="pointer-events-none fixed -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-full border border-white/20 bg-white/[0.06] opacity-25 items-center justify-center"
          >
            <div
              ref={joyKnobRef}
              className="w-10 h-10 rounded-full bg-white/35 border border-white/40"
            />
          </div>
        </div>
      )}
    </div>
  );
};
export default FloorIsLavaCanvas;

