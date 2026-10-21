import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  AIDifficulty,
  BALL_SKINS,
  BallSkinConfig,
  BallSkinId,
  CalloutPopup,
  CameraPreset,
  CharacterConfig,
  CourtTheme,
  GameMode,
  GameState,
  LevelModifier,
} from '../types/game';
import {
  createCourtFloorTexture,
  createStylizedWaterTexture,
  createVolleyballTexture,
} from '../three/crayonMaterials';
import { createStylizedPostPipeline } from '../three/postProcessing';
import {
  CharacterRig,
  createCharacterStudioPodium,
  createCrayonCharacter,
  createSceneryProps,
  createVolleyballNet,
  createVolleyballSet,
} from '../three/crayonModels';
import { crayonAudio } from '../audio/crayonAudio';
import { multiplayerClient } from '../network/multiplayerClient';

// Module-scope reusable math objects (Zero GC in render loop)
const _camGoalPos = new THREE.Vector3();
const _camGoalLook = new THREE.Vector3();
const _currentLook = new THREE.Vector3(0, 1.2, 0);
const _dummyParticle = new THREE.Object3D();
const _tempColor = new THREE.Color();

export interface VolleyballCanvasProps {
  playerChar: CharacterConfig;
  partnerChar: CharacterConfig;
  aiChar1: CharacterConfig;
  aiChar2: CharacterConfig;
  is2v2: boolean;
  theme: CourtTheme;
  gameMode: GameMode;
  difficulty: AIDifficulty;
  modifier: LevelModifier;
  gameState: GameState;
  cameraPreset: CameraPreset;
  servingSide: 'player' | 'ai';
  matchId?: number;
  ballSkinSetting?: BallSkinId | 'auto';
  onActiveBallSkinChange?: (skin: BallSkinConfig) => void;
  actionTriggerRef: React.MutableRefObject<{
    spikeRequested: boolean;
    diveRequested: boolean;
    superRequested: boolean;
    liftRequested?: boolean;
  }>;
  onRallyUpdate: (
    newRally: number,
    isSweetSpot: boolean,
    superDelta: number,
    usedSuper: boolean,
    isPartnerSet: boolean
  ) => void;
  onPointFinished: (winner: 'player' | 'ai', reason: string) => void;
  onBonusScore: (points: number, label: string) => void;
  onCallout: (callout: Omit<CalloutPopup, 'id'>) => void;
  superCharge: number;
  gameSpeedMultiplier?: number;
  cameraFov?: number;
  landingCircleStyle?: 'classic' | 'neon' | 'off';
  enableVfx?: boolean;
  enableScreenShake?: boolean;
}

interface ParticleItem {
  active: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  scale: number;
  life: number;
  maxLife: number;
  colorHex: number;
}

const MAX_PARTICLES = 80;
const BASE_GRAVITY = -15.5;

export const VolleyballCanvas: React.FC<VolleyballCanvasProps> = ({
  playerChar,
  partnerChar,
  aiChar1,
  aiChar2,
  is2v2,
  theme,
  gameMode,
  difficulty,
  modifier,
  gameState,
  cameraPreset,
  servingSide,
  matchId = 1,
  ballSkinSetting = 'auto',
  onActiveBallSkinChange,
  actionTriggerRef,
  onRallyUpdate,
  onPointFinished,
  onBonusScore,
  onCallout,
  superCharge,
  gameSpeedMultiplier = 1.0,
  cameraFov = 45,
  landingCircleStyle = 'classic',
  enableVfx = true,
  enableScreenShake = true,
}) => {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const joystickVecRef = useRef({ x: 0, y: 0, active: false });

  const propsRef = useRef({
    playerChar,
    partnerChar,
    aiChar1,
    aiChar2,
    is2v2,
    theme,
    gameMode,
    difficulty,
    modifier,
    gameState,
    cameraPreset,
    servingSide,
    ballSkinSetting,
    onActiveBallSkinChange,
    superCharge,
    gameSpeedMultiplier,
    cameraFov,
    landingCircleStyle,
    enableVfx,
    enableScreenShake,
    onRallyUpdate,
    onPointFinished,
    onBonusScore,
    onCallout,
  });

  useEffect(() => {
    propsRef.current = {
      playerChar,
      partnerChar,
      aiChar1,
      aiChar2,
      is2v2,
      theme,
      gameMode,
      difficulty,
      modifier,
      gameState,
      cameraPreset,
      servingSide,
      ballSkinSetting,
      onActiveBallSkinChange,
      superCharge,
      gameSpeedMultiplier,
      cameraFov,
      landingCircleStyle,
      enableVfx,
      enableScreenShake,
      onRallyUpdate,
      onPointFinished,
      onBonusScore,
      onCallout,
    };
  });

  const rebuildActorsRef = useRef<(() => void) | null>(null);
  const applyBallSkinRef = useRef<((forceNextAuto?: boolean) => void) | null>(null);
  const joyContainerRef = useRef<HTMLDivElement | null>(null);
  const joyKnobRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (rebuildActorsRef.current) {
      rebuildActorsRef.current();
    }
  }, [
    playerChar.id,
    playerChar.outfitId,
    playerChar.faceId,
    playerChar.headShape,
    partnerChar.id,
    aiChar1.id,
    aiChar2.id,
    is2v2,
    theme.id,
    modifier,
    gameMode,
    gameState,
  ]);

  useEffect(() => {
    if (applyBallSkinRef.current) {
      applyBallSkinRef.current(false);
    }
  }, [ballSkinSetting]);

  const prevMatchIdRef = useRef<number>(matchId);
  useEffect(() => {
    if (prevMatchIdRef.current !== matchId) {
      prevMatchIdRef.current = matchId;
      // Rotate ball skin ONLY when a brand-new full match starts!
      if (applyBallSkinRef.current) {
        applyBallSkinRef.current(true);
      }
      if (resetServeRef.current) {
        resetServeRef.current(servingSide);
      }
    }
  }, [matchId, servingSide]);

  const resetServeRef = useRef<((server: 'player' | 'ai') => void) | null>(null);
  const prevGameStateRef = useRef<GameState>(gameState);
  useEffect(() => {
    const prev = prevGameStateRef.current;
    prevGameStateRef.current = gameState;
    if (gameState === 'PLAYING' && prev !== 'PLAYING' && prev !== 'PAUSED' && resetServeRef.current) {
      resetServeRef.current(servingSide);
    }
  }, [gameState, servingSide]);

  useEffect(() => {
    const container = canvasMountRef.current;
    if (!container) return;

    const isHeadless =
      navigator.webdriver || /HeadlessChrome/i.test(navigator.userAgent);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.94;
    renderer.setPixelRatio(
      isHeadless ? 1 : Math.min(window.devicePixelRatio || 1, 2.5)
    );
    renderer.shadowMap.enabled = !isHeadless;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const width = container.clientWidth || 960;
    const height = container.clientHeight || 540;
    renderer.setSize(width, height);
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const maxAnisotropy = Math.min(
      renderer.capabilities.getMaxAnisotropy() || 8,
      16
    );

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.5, 120);
    camera.position.set(0, 7.2, 12.8);
    camera.lookAt(0, 1.2, 0);

    const postPipeline = createStylizedPostPipeline(
      renderer,
      scene,
      camera,
      width,
      height,
      {
        bloomStrength: 0.2,
        bloomRadius: 0.42,
        bloomThreshold: 0.88,
        vignetteIntensity: 0.22,
      }
    );

    // Crisp Cool-Sky & Balanced Contrast Daylight Lighting Rig (Zero Glare on Whites!)
    const hemiLight = new THREE.HemisphereLight(0xcbd5e1, 0x64748b, 0.84);
    hemiLight.position.set(0, 20, 0);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xf8fafc, 1.26);
    keyLight.position.set(8, 16, 10);
    keyLight.castShadow = !isHeadless;
    keyLight.shadow.mapSize.width = 1536;
    keyLight.shadow.mapSize.height = 1536;
    keyLight.shadow.camera.near = 1;
    keyLight.shadow.camera.far = 45;
    const d = 12;
    keyLight.shadow.camera.left = -d;
    keyLight.shadow.camera.right = d;
    keyLight.shadow.camera.top = d;
    keyLight.shadow.camera.bottom = -d;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 0.55);
    rimLight.position.set(-8, 9, -10);
    scene.add(rimLight);

    // Court Floor (9.6m x 15.6m framed inside the 3D Court Curb at y = 0.008) & Water Plane
    const courtGeo = new THREE.PlaneGeometry(9.6, 15.6);
    courtGeo.rotateX(-Math.PI / 2);
    const courtMat = new THREE.MeshToonMaterial({
      color: 0xffffff,
      alphaTest: 0.5,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
    const courtMesh = new THREE.Mesh(courtGeo, courtMat);
    courtMesh.position.y = 0.018;
    courtMesh.receiveShadow = true;
    scene.add(courtMesh);

    const waterGeo = new THREE.PlaneGeometry(140, 140, 1, 1);
    waterGeo.rotateX(-Math.PI / 2);
    const waterMat = new THREE.MeshToonMaterial({ color: 0xffffff });
    const waterMesh = new THREE.Mesh(waterGeo, waterMat);
    waterMesh.position.y = -0.24;
    waterMesh.matrixAutoUpdate = false;
    waterMesh.updateMatrix();
    scene.add(waterMesh);

    // Dedicated Minimal 3D Character Selection Studio Podium
    const studioPodiumGroup = createCharacterStudioPodium(maxAnisotropy);
    studioPodiumGroup.visible = false;
    scene.add(studioPodiumGroup);

    const worldPropsRoot = new THREE.Group();
    scene.add(worldPropsRoot);

    const charactersRoot = new THREE.Group();
    scene.add(charactersRoot);

    let playerRig: CharacterRig;
    let partnerRig: CharacterRig | null = null;
    let aiRig1: CharacterRig;
    let aiRig2: CharacterRig | null = null;
    let cloudsList: THREE.Group[] = [];
    let spinningPropsList: THREE.Object3D[] = [];
    let waveRingsList: THREE.Mesh[] = [];
    let waterfallTexturesList: THREE.Texture[] = [];
    let waterfallFoamsList: THREE.Mesh[] = [];

    // Volleyball + Contact Ground Shadow + Indicating Landing Circle
    const vBall = createVolleyballSet(maxAnisotropy);
    scene.add(vBall.ballGroup);
    scene.add(vBall.ballShadow);
    scene.add(vBall.targetGroup);

    // 3D Sparkle / Burst Particle Pool (InstancedMesh)
    const particleGeo = new THREE.DodecahedronGeometry(0.15, 0);
    const particleMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const particleInstanced = new THREE.InstancedMesh(
      particleGeo,
      particleMat,
      MAX_PARTICLES
    );
    particleInstanced.frustumCulled = false;
    scene.add(particleInstanced);

    const particles: ParticleItem[] = Array.from({ length: MAX_PARTICLES }, () => ({
      active: false,
      x: 0,
      y: -10,
      z: 0,
      vx: 0,
      vy: 0,
      vz: 0,
      scale: 0,
      life: 0,
      maxLife: 1,
      colorHex: 0x38bdf8,
    }));

    let activeParticleCount = 0;

    const spawnParticleBurst = (
      bx: number,
      by: number,
      bz: number,
      count: number,
      colors: number[]
    ) => {
      let spawned = 0;
      for (let i = 0; i < MAX_PARTICLES && spawned < count; i++) {
        if (!particles[i].active) {
          const p = particles[i];
          p.active = true;
          activeParticleCount++;
          p.x = bx;
          p.y = by;
          p.z = bz;
          const angle = Math.random() * Math.PI * 2;
          const speed = 1.8 + Math.random() * 4.5;
          p.vx = Math.cos(angle) * speed;
          p.vy = 2.2 + Math.random() * 4.8;
          p.vz = Math.sin(angle) * speed;
          p.scale = 0.8 + Math.random() * 1.0;
          p.life = 0;
          p.maxLife = 0.45 + Math.random() * 0.35;
          p.colorHex = colors[spawned % colors.length];
          spawned++;
        }
      }
    };

    // Ball Trail Ribbon Spheres (Sky Cyan, Rose Pink, Violet, Emerald — zero yellow!)
    const TRAIL_COUNT = 14;
    const trailGeo = new THREE.SphereGeometry(0.22, 10, 10);
    const trailMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.72,
    });
    const trailInstanced = new THREE.InstancedMesh(trailGeo, trailMat, TRAIL_COUNT);
    trailInstanced.frustumCulled = false;
    scene.add(trailInstanced);

    const trailHistory: Array<{ x: number; y: number; z: number }> = Array.from(
      { length: TRAIL_COUNT },
      () => ({ x: 0, y: -10, z: 0 })
    );
    const rainbowColors = [
      0x38bdf8, 0xf43f5e, 0xa855f7, 0x10b981, 0xec4899, 0x6366f1,
    ];

    let currentBallSkinIdx = 0;
    let activeSkinColors = BALL_SKINS[0].trailHex;

    const updateBallSkinTexture = (forceNextAuto: boolean = false) => {
      const setting = propsRef.current.ballSkinSetting || 'auto';
      let chosenSkin: BallSkinConfig;
      if (setting === 'auto') {
        if (forceNextAuto) {
          const offset = 1 + Math.floor(Math.random() * (BALL_SKINS.length - 1));
          currentBallSkinIdx = (currentBallSkinIdx + offset) % BALL_SKINS.length;
        }
        chosenSkin = BALL_SKINS[currentBallSkinIdx] || BALL_SKINS[0];
      } else {
        const foundIdx = BALL_SKINS.findIndex((s) => s.id === setting);
        currentBallSkinIdx = foundIdx >= 0 ? foundIdx : 0;
        chosenSkin = BALL_SKINS[currentBallSkinIdx];
      }

      const newTex = createVolleyballTexture(maxAnisotropy, chosenSkin.id);
      vBall.ballMat.map = newTex;
      vBall.ballMat.needsUpdate = true;
      activeSkinColors = chosenSkin.trailHex;
      propsRef.current.onActiveBallSkinChange?.(chosenSkin);
    };

    applyBallSkinRef.current = updateBallSkinTexture;

    let builtThemeId = '';
    let builtCharsKey = '';

    const buildSceneActors = () => {
      const {
        playerChar: pCfg,
        partnerChar: ptCfg,
        aiChar1: a1Cfg,
        aiChar2: a2Cfg,
        is2v2: duoMode,
        theme: th,
        modifier: mod,
        gameMode: gMode,
        gameState: gState,
      } = propsRef.current;

      // In MODE_SELECT (when browsing Volleyball modes), show the LIVE 3D Court & Scenery in the background!
      const isLiveCourtPreview =
        gState === 'MODE_SELECT' && gMode !== 'obstacle_rush';

      const isMenuOrStudio =
        gState === 'TITLE_MENU' ||
        gState === 'CHARACTER_SELECT' ||
        gState === 'PROFILE' ||
        gState === 'SETTINGS' ||
        (gState === 'MODE_SELECT' && !isLiveCourtPreview) ||
        gState === 'GAME_OVER';

      if (isMenuOrStudio) {
        scene.background = null;
        scene.fog = null;
        hemiLight.color.set('#E0F2FE');
        hemiLight.groundColor.set('#38BDF8');
        keyLight.color.set('#FFFFFF');
      } else {
        scene.background = new THREE.Color(th.skyHorizon);
        scene.fog = new THREE.FogExp2(th.skyHorizon, 0.014);
        hemiLight.color.set(th.hemisphereSky);
        hemiLight.groundColor.set(th.hemisphereGround);
        keyLight.color.set(th.sunColor);
      }

      courtMesh.visible = !isMenuOrStudio;
      waterMesh.visible = !isMenuOrStudio && th.hasWaterPlane;
      worldPropsRoot.visible = !isMenuOrStudio;
      studioPodiumGroup.visible =
        gState === 'CHARACTER_SELECT' || gState === 'PROFILE';
      vBall.ballGroup.visible = !isMenuOrStudio;
      vBall.ballShadow.visible = !isMenuOrStudio;
      vBall.targetGroup.visible = !isMenuOrStudio && !isLiveCourtPreview;

      const ballScale = mod === 'big_ball' ? 1.55 : 1.0;
      vBall.ballGroup.scale.setScalar(ballScale);
      vBall.bombCapGroup.visible = !isMenuOrStudio && gMode === 'bomb_potato';

      // ONLY rebuild 3D Court Scenery & Net when the court theme actually changes!
      if (!isMenuOrStudio && builtThemeId !== th.id) {
        builtThemeId = th.id;
        courtMat.map = createCourtFloorTexture(
          th.courtInnerColor,
          th.groundColor,
          th.lineColor,
          maxAnisotropy
        );
        courtMat.needsUpdate = true;

        waterMat.map = createStylizedWaterTexture(th.waterColor, maxAnisotropy, 10);
        waterMat.needsUpdate = true;

        while (worldPropsRoot.children.length > 0) {
          worldPropsRoot.remove(worldPropsRoot.children[0]);
        }

        const netGroup = createVolleyballNet(th, maxAnisotropy);
        worldPropsRoot.add(netGroup);

        const scenery = createSceneryProps(th, maxAnisotropy);
        worldPropsRoot.add(scenery.sceneryGroup);
        cloudsList = scenery.clouds;
        spinningPropsList = scenery.spinningProps;
        waveRingsList = scenery.waveRings;
        waterfallTexturesList = scenery.waterfallTextures;
        waterfallFoamsList = scenery.waterfallFoams;
      }

      const playerFacing: 1 | -1 = isMenuOrStudio ? 1 : -1;
      const showCourtRivals = !isMenuOrStudio;
      const charsKey = `${pCfg.id}_${pCfg.outfitId}_${pCfg.faceId}_${pCfg.headShape}_${ptCfg.id}_${a1Cfg.id}_${a2Cfg.id}_${duoMode}_${playerFacing}_${gState === 'PLAYING'}`;

      if (builtCharsKey !== charsKey) {
        builtCharsKey = charsKey;
        while (charactersRoot.children.length > 0) {
          charactersRoot.remove(charactersRoot.children[0]);
        }

        playerRig = createCrayonCharacter(
          pCfg,
          maxAnisotropy,
          playerFacing,
          gState === 'PLAYING'
        );
        playerRig.root.userData.jiggleVelY = 4.6;
        charactersRoot.add(playerRig.root);

        if (duoMode) {
          partnerRig = createCrayonCharacter(
            ptCfg,
            maxAnisotropy,
            playerFacing,
            false
          );
          charactersRoot.add(partnerRig.root);
        } else {
          partnerRig = null;
        }

        aiRig1 = createCrayonCharacter(a1Cfg, maxAnisotropy, 1, false);
        aiRig1.root.position.set(duoMode ? -1.8 : 0, 0, -4.6);
        charactersRoot.add(aiRig1.root);

        if (duoMode) {
          aiRig2 = createCrayonCharacter(a2Cfg, maxAnisotropy, 1, false);
          aiRig2.root.position.set(1.8, 0, -3.2);
          charactersRoot.add(aiRig2.root);
        } else {
          aiRig2 = null;
        }
      }

      if (playerRig) {
        playerRig.root.visible =
          (gState !== 'MODE_SELECT' || isLiveCourtPreview) &&
          gState !== 'SETTINGS' &&
          gState !== 'PROFILE' &&
          gState !== 'GAME_OVER';
      }
      if (partnerRig) {
        partnerRig.root.visible = duoMode && showCourtRivals;
      }
      if (aiRig1) {
        aiRig1.root.visible = showCourtRivals;
      }
      if (aiRig2) {
        aiRig2.root.visible = duoMode && showCourtRivals;
      }
    };

    buildSceneActors();
    updateBallSkinTexture(false);
    rebuildActorsRef.current = buildSceneActors;

    // =========================================================================
    // GAMEPLAY & VOLLEYBALL RALLY PHYSICS STATE
    // =========================================================================
    const getGravity = () =>
      propsRef.current.modifier === 'low_gravity' ? -10.4 : BASE_GRAVITY;

    const gameData = {
      phase: 'SERVE_WAIT' as 'SERVE_WAIT' | 'RALLY' | 'POINT_DELAY',
      serveWaitTimer: 0,
      pointDelayTimer: 0,
      rallyCount: 0,
      isRainbowSmash: false,
      isSuperSmash: false,
      lastHitter: 'player' as
        | 'player'
        | 'partner'
        | 'partner_set'
        | 'self_set'
        | 'ai',
      bombFuseTimer: 9.0,
      partnerSetCooldownRallies: 0,
      playerConsecutiveTouches: 0,

      // Player 1
      px: 0,
      py: 0,
      pz: 4.6,
      pvx: 0,
      pvy: 0,
      pvz: 0,
      pSwingTimer: 0,
      pDiveTimer: 0,
      spikeIntentTimer: 0,
      setIntentTimer: 0,
      setCooldownTimer: 0,
      superIntent: false,

      // Partner
      ptx: 1.8,
      pty: 0,
      ptz: 3.4,
      ptvy: 0,
      ptSwingTimer: 0,

      // AI 1 & AI 2
      a1x: -1.6,
      a1y: 0,
      a1z: -4.6,
      a1vy: 0,
      a1SwingTimer: 0,

      a2x: 1.6,
      a2y: 0,
      a2z: -3.2,
      a2vy: 0,
      a2SwingTimer: 0,

      // Volleyball
      bx: 0,
      by: 2.2,
      bz: 3.8,
      bvx: 0,
      bvy: 0,
      bvz: 0,
      ballJiggle: 0,
      ballJiggleVel: 0,
      playerShotQuality: 1.0,
      landingX: 0,
      landingZ: 4.5,
    };

    const computeLandingSpot = (
      x0: number,
      y0: number,
      z0: number,
      vx: number,
      vy: number,
      vz: number
    ) => {
      const grav = getGravity();
      const targetY = propsRef.current.modifier === 'big_ball' ? 0.62 : 0.42;
      const dy = y0 - targetY;
      const disc = vy * vy - 2 * grav * dy;
      if (disc < 0) {
        gameData.landingX = x0;
        gameData.landingZ = z0;
        return;
      }
      const t = (-vy - Math.sqrt(disc)) / grav;
      const flightT = Math.max(0.05, t);
      gameData.landingX = THREE.MathUtils.clamp(x0 + vx * flightT, -3.5, 3.5);
      gameData.landingZ = THREE.MathUtils.clamp(z0 + vz * flightT, -6.5, 6.5);
    };

    const launchBallToTarget = (
      targetX: number,
      targetZ: number,
      flightDuration: number,
      hitter: 'player' | 'partner' | 'ai',
      rainbowSmash: boolean = false,
      superSmash: boolean = false
    ) => {
      const grav = getGravity();
      const modSpeed = propsRef.current.modifier === 'turbo' ? 0.84 : 1.0;
      // Progressive Rally Tension: Long rallies get slightly brisker & more exciting!
      const rallyPace = Math.max(0.86, 1.0 - Math.max(0, gameData.rallyCount - 3) * 0.018);
      const T = Math.max(0.54, flightDuration * modSpeed * rallyPace);

      // Keep shots cleanly inside the playable court bounds (|x| <= 3.3, |z| <= 6.2)
      const clampedX = THREE.MathUtils.clamp(targetX, -3.25, 3.25);
      const clampedZ =
        hitter === 'ai'
          ? THREE.MathUtils.clamp(targetZ, 1.35, 5.95)
          : THREE.MathUtils.clamp(targetZ, -5.95, -1.35);

      const targetY = propsRef.current.modifier === 'big_ball' ? 0.62 : 0.42;
      gameData.bvx = (clampedX - gameData.bx) / T;
      gameData.bvz = (clampedZ - gameData.bz) / T;
      gameData.bvy = (targetY - gameData.by - 0.5 * grav * T * T) / T;
      gameData.lastHitter = hitter;
      gameData.isRainbowSmash = rainbowSmash || superSmash;
      gameData.isSuperSmash = superSmash;

      computeLandingSpot(
        gameData.bx,
        gameData.by,
        gameData.bz,
        gameData.bvx,
        gameData.bvy,
        gameData.bvz
      );

      if (hitter === 'player') {
        const mySlot = multiplayerClient.currentRoom?.slots.find(
          (s) => s.playerId === multiplayerClient.playerId
        );
        multiplayerClient.sendGameEvent('volley:hit', {
          team: mySlot?.team || 'blue',
          bx: gameData.bx,
          by: gameData.by,
          bz: gameData.bz,
          bvx: gameData.bvx,
          bvy: gameData.bvy,
          bvz: gameData.bvz,
          rainbowSmash,
          superSmash,
        });
      }
    };

    // High, floaty Set / Lift trajectory onto our own front-court attack zone so the Player can Jump & Volley Smash!
    const launchSetBall = (
      targetX: number,
      targetZ: number,
      flightDuration: number,
      setter: 'partner_set' | 'self_set'
    ) => {
      const grav = getGravity();
      const T = Math.max(1.08, flightDuration);
      const clampedX = THREE.MathUtils.clamp(targetX, -2.5, 2.5);
      const clampedZ = THREE.MathUtils.clamp(targetZ, 1.15, 2.25);
      const targetY = propsRef.current.modifier === 'big_ball' ? 0.62 : 0.42;

      gameData.bvx = (clampedX - gameData.bx) / T;
      gameData.bvz = (clampedZ - gameData.bz) / T;
      gameData.bvy = (targetY - gameData.by - 0.5 * grav * T * T) / T;
      gameData.lastHitter = setter;
      gameData.isRainbowSmash = false;
      gameData.isSuperSmash = false;
      gameData.setCooldownTimer = 0.32;

      computeLandingSpot(
        gameData.bx,
        gameData.by,
        gameData.bz,
        gameData.bvx,
        gameData.bvy,
        gameData.bvz
      );
    };

    const setupServe = (server: 'player' | 'ai') => {
      // Keep the same ball skin for the entire full match (never change mid-game!)
      gameData.phase = 'SERVE_WAIT';
      gameData.serveWaitTimer = 0;
      gameData.rallyCount = 0;
      gameData.isRainbowSmash = false;
      gameData.isSuperSmash = false;
      gameData.spikeIntentTimer = 0;
      gameData.setIntentTimer = 0;
      gameData.setCooldownTimer = 0;
      gameData.playerConsecutiveTouches = 0;
      gameData.superIntent = false;
      gameData.bombFuseTimer = 8.5;
      if (gameData.partnerSetCooldownRallies > 0) {
        gameData.partnerSetCooldownRallies = Math.max(
          0,
          gameData.partnerSetCooldownRallies - 1
        );
      }

      const duo = propsRef.current.is2v2;
      gameData.px = duo ? -1.35 : 0;
      gameData.py = 0;
      gameData.pz = 4.6;
      gameData.pvx = 0;
      gameData.pvy = 0;
      gameData.pvz = 0;

      gameData.ptx = 1.75;
      gameData.pty = 0;
      gameData.ptz = 3.6;

      gameData.a1x = duo ? -1.6 : 0;
      gameData.a1y = 0;
      gameData.a1z = -4.8;

      gameData.a2x = 1.6;
      gameData.a2y = 0;
      gameData.a2z = -3.2;

      if (server === 'player') {
        gameData.bx = gameData.px;
        gameData.by = 2.05;
        gameData.bz = gameData.pz - 0.55;
      } else {
        gameData.bx = gameData.a1x;
        gameData.by = 2.05;
        gameData.bz = gameData.a1z + 0.55;
      }
      gameData.bvx = 0;
      gameData.bvy = 0;
      gameData.bvz = 0;

      if (propsRef.current.gameState === 'PLAYING') {
        crayonAudio.playServeWhistle();
      }

      spawnParticleBurst(
        gameData.bx,
        gameData.by,
        gameData.bz,
        10,
        activeSkinColors
      );
    };

    setupServe(propsRef.current.servingSide);
    resetServeRef.current = setupServe;

    // =========================================================================
    // SERVE & SPIKE ACTIONS (SEPARATED FOR PLAYER VS AI!)
    // =========================================================================
    const keysDown = new Set<string>();
    let leftTouchId: number | null = null;
    let leftOriginX = 0;
    let leftOriginY = 0;
    let tapStreakCount = 0;
    let lastTapTimeMs = 0;

    const executeAiServe = () => {
      if (gameData.phase !== 'SERVE_WAIT') return;
      gameData.phase = 'RALLY';
      gameData.rallyCount = 1;
      gameData.playerConsecutiveTouches = 0;
      gameData.a1vy = 4.8;
      gameData.a1SwingTimer = 0.36;
      crayonAudio.playJumpBoing();

      // Aim AI serve toward a fair reachable zone on the player's court
      const targetX = THREE.MathUtils.clamp(
        gameData.px + (Math.random() - 0.5) * 3.0,
        -2.7,
        2.7
      );
      const targetZ = 2.8 + Math.random() * 2.4;
      launchBallToTarget(targetX, targetZ, 1.32, 'ai', false, false);
      crayonAudio.playServeHit();
      crayonAudio.playBallPop(1, false);
      spawnParticleBurst(gameData.bx, gameData.by, gameData.bz, 10, [
        0x38bdf8, 0xf43f5e,
      ]);
    };

    const getPlayerDirectionalAim = () => {
      let dirX = 0;
      let dirZ = 0;
      if (keysDown.has('ArrowLeft') || keysDown.has('KeyA')) dirX -= 1;
      if (keysDown.has('ArrowRight') || keysDown.has('KeyD')) dirX += 1;
      if (keysDown.has('ArrowUp') || keysDown.has('KeyW')) dirZ -= 1;
      if (keysDown.has('ArrowDown') || keysDown.has('KeyS')) dirZ += 1;
      if (joystickVecRef.current.active) {
        dirX += joystickVecRef.current.x;
        dirZ += joystickVecRef.current.y;
      }
      return {
        dirX: THREE.MathUtils.clamp(dirX, -1, 1),
        dirZ: THREE.MathUtils.clamp(dirZ, -1, 1),
      };
    };

    const executePlayerHit = (
      isSpikeIntent: boolean,
      wantSuper: boolean,
      isFromSet: boolean = false
    ) => {
      const pCfg = propsRef.current.playerChar;
      const canSuper =
        (wantSuper || gameData.superIntent || actionTriggerRef.current.superRequested) &&
        propsRef.current.superCharge >= 100;

      gameData.rallyCount += 1;
      gameData.pSwingTimer = 0.36;
      gameData.spikeIntentTimer = 0;
      gameData.setIntentTimer = 0;
      gameData.superIntent = false;
      gameData.playerConsecutiveTouches += 1;
      gameData.setCooldownTimer = 0.22;

      const isAirSpike = isSpikeIntent || gameData.py > 0.16 || isFromSet;
      const isDiveSave = gameData.pDiveTimer > 0;

      // Skill-Based Shot Quality & Placement:
      // Evaluates player's jump apex timing, sweet-spot distance to ball, and active directional aiming!
      const { dirX, dirZ } = getPlayerDirectionalAim();
      const distToBall = Math.hypot(
        gameData.bx - gameData.px,
        gameData.bz - gameData.pz
      );
      const sweetSpotBonus = THREE.MathUtils.clamp(
        1.25 - distToBall * 0.55,
        0.55,
        1.25
      );
      const jumpApexBonus = isAirSpike
        ? THREE.MathUtils.clamp(0.85 + gameData.py * 0.65, 0.85, 1.35)
        : 0.72;
      const aimSkillBonus = Math.hypot(dirX, dirZ) > 0.25 ? 1.12 : 0.92;
      const computedSkill = THREE.MathUtils.clamp(
        sweetSpotBonus * jumpApexBonus * aimSkillBonus * (isFromSet ? 1.18 : 1.0),
        0.62,
        1.48
      );
      gameData.playerShotQuality = canSuper ? 1.65 : computedSkill;
      gameData.ballJiggleVel = isAirSpike || canSuper ? 6.5 : 3.8;

      const isPerfectTiming = isAirSpike && computedSkill >= 1.16;

      const contactOffsetX = THREE.MathUtils.clamp(
        (gameData.bx - gameData.px) * 1.45,
        -1.85,
        1.85
      );

      // Skilled directional aim lets the player paint the sidelines & corners accurately!
      const aimX = THREE.MathUtils.clamp(
        gameData.px * 0.12 +
          dirX * (isPerfectTiming ? 3.35 : 2.85) +
          contactOffsetX * 1.25 +
          (Math.random() - 0.5) * (isPerfectTiming ? 0.12 : 0.32),
        -3.2,
        3.2
      );

      // Forward input (dirZ < 0) drives deep baseline corners; Down/Back input (dirZ > 0) hits deceptive short drop shots!
      const baseDepth = canSuper
        ? -5.15
        : isFromSet && isAirSpike
          ? -4.45
          : isAirSpike
            ? -4.05
            : -3.35;
      const depthAdjust = dirZ * (isPerfectTiming ? 2.15 : 1.75);
      const aimZ = THREE.MathUtils.clamp(
        baseDepth + depthAdjust + (Math.random() - 0.5) * 0.24,
        -5.9,
        -1.38
      );

      const flight = canSuper
        ? 0.58
        : isFromSet && isAirSpike
          ? 0.68
          : isPerfectTiming
            ? 0.76
            : isAirSpike
              ? 0.88
              : 1.24;

      launchBallToTarget(aimX, aimZ, flight, 'player', isAirSpike, canSuper);

      if (canSuper) {
        crayonAudio.playSuperUltimate();
        crayonAudio.playRainbowSmash();
      } else if (isAirSpike) {
        crayonAudio.playRainbowSmash();
      } else {
        crayonAudio.playBallPop(gameData.rallyCount, false);
      }

      spawnParticleBurst(
        gameData.bx,
        gameData.by,
        gameData.bz,
        canSuper ? 36 : isFromSet && isAirSpike ? 30 : isAirSpike ? 24 : 12,
        isAirSpike || canSuper ? rainbowColors : [0x38bdf8, 0x10b981]
      );

      propsRef.current.onRallyUpdate(
        gameData.rallyCount,
        isAirSpike || canSuper,
        isFromSet && isAirSpike
          ? 34
          : isPerfectTiming
            ? 30
            : isAirSpike
              ? 24
              : 15,
        canSuper,
        false
      );

      if (canSuper) {
        propsRef.current.onCallout({
          text: `${pCfg.superMoveName.toUpperCase()}!`,
          subtext: 'UNSTOPPABLE SUPER SHOT!',
          color: '#F8FAFC',
          bgHex: '#E11D48',
          x: 50,
          y: 34,
        });
      } else if (isFromSet && isAirSpike) {
        propsRef.current.onCallout({
          text: 'VOLLEY SMASH!',
          subtext: 'Alley-Oop Power Spike!',
          color: '#F8FAFC',
          bgHex: '#D97706',
          x: 50,
          y: 35,
        });
      } else if (isPerfectTiming) {
        propsRef.current.onCallout({
          text: 'PERFECT SMASH!',
          subtext: 'Apex Timing · Corner Laser!',
          color: '#F8FAFC',
          bgHex: '#16A34A',
          x: 50,
          y: 35,
        });
      } else if (isAirSpike) {
        propsRef.current.onCallout({
          text: 'SUPER SPIKE!',
          subtext: 'Sweet Spot Smash!',
          color: '#F8FAFC',
          bgHex: '#2563EB',
          x: 50,
          y: 36,
        });
      } else if (isDiveSave) {
        propsRef.current.onCallout({
          text: 'DIVING SAVE!',
          color: '#F8FAFC',
          bgHex: '#059669',
          x: 50,
          y: 62,
        });
      }
    };

    // Execute Self-Lift / Volley Set ("khud uthane k liye" via Triple Tap, Downward Scroll, or PC Alt)
    const executePlayerSetLift = () => {
      gameData.rallyCount += 1;
      gameData.pSwingTimer = 0.36;
      gameData.setIntentTimer = 0;
      gameData.spikeIntentTimer = 0;
      gameData.playerConsecutiveTouches = 1;
      if (gameData.py <= 0.08) {
        gameData.pvy = 3.6;
      }

      const { dirX } = getPlayerDirectionalAim();
      const setTargetX = THREE.MathUtils.clamp(
        gameData.px + dirX * 1.15,
        -2.45,
        2.45
      );
      const setTargetZ = THREE.MathUtils.clamp(
        Math.min(gameData.pz - 0.85, 1.55),
        1.18,
        2.05
      );

      launchSetBall(setTargetX, setTargetZ, 1.26, 'self_set');
      crayonAudio.playSetLift();
      spawnParticleBurst(gameData.bx, gameData.by, gameData.bz, 18, [
        0xfacc15, 0x38bdf8, 0xa855f7,
      ]);

      propsRef.current.onRallyUpdate(
        gameData.rallyCount,
        false,
        18,
        false,
        true
      );
      propsRef.current.onCallout({
        text: 'VOLLEY LIFT!',
        subtext: 'Ball Lifted — Jump & Spike!',
        color: '#F8FAFC',
        bgHex: '#0284C7',
        x: 50,
        y: 48,
      });
    };

    // Execute Teammate Set / Lift ("teammate uthana") in 2v2 ONLY when needed & rare!
    const executePartnerSetLift = () => {
      const ptCfg = propsRef.current.partnerChar;
      gameData.rallyCount += 1;
      gameData.ptSwingTimer = 0.38;
      gameData.ptvy = 4.4;
      gameData.partnerSetCooldownRallies = 4;
      crayonAudio.playSetLift();

      // Lift high toward the front-court attack zone near the Player!
      const setTargetX = THREE.MathUtils.clamp(
        gameData.px * 0.72 + (gameData.px <= 0 ? -0.35 : 0.35),
        -2.35,
        2.35
      );
      const setTargetZ = THREE.MathUtils.clamp(
        Math.min(gameData.pz - 0.45, 1.55),
        1.2,
        1.95
      );

      launchSetBall(setTargetX, setTargetZ, 1.28, 'partner_set');
      spawnParticleBurst(gameData.bx, gameData.by, gameData.bz, 18, [
        0xfacc15, 0xa855f7, 0x38bdf8,
      ]);

      propsRef.current.onRallyUpdate(
        gameData.rallyCount,
        false,
        20,
        false,
        true
      );
      propsRef.current.onCallout({
        text: `${ptCfg.name.toUpperCase()} ASSIST LIFT!`,
        subtext: 'Rare Teammate Set — Jump & Smash!',
        color: '#F8FAFC',
        bgHex: '#7C3AED',
        x: 50,
        y: 52,
      });
    };

    // Triggered by Swipe Down on mobile/touch, Downward Scroll (Wheel), or PC Alt Key!
    const triggerPlayerSetLift = (fromSwipeDown: boolean = false) => {
      if (propsRef.current.gameState !== 'PLAYING') return;

      // 1. If in SERVE_WAIT on Player's Serve: Toss/Lift the ball high onto front court for a Self-Set Jump Smash!
      if (gameData.phase === 'SERVE_WAIT') {
        if (propsRef.current.servingSide !== 'player') return;
        gameData.phase = 'RALLY';
        gameData.rallyCount = 1;
        gameData.playerConsecutiveTouches = 1;
        gameData.pvy = 3.8;
        gameData.pSwingTimer = 0.36;
        crayonAudio.playJumpBoing();

        const { dirX } = getPlayerDirectionalAim();
        const tossX = THREE.MathUtils.clamp(
          gameData.px + dirX * 0.95,
          -2.35,
          2.35
        );
        const tossZ = THREE.MathUtils.clamp(
          Math.min(gameData.pz - 1.45, 1.65),
          1.2,
          2.1
        );
        launchSetBall(tossX, tossZ, 1.26, 'self_set');
        crayonAudio.playSetLift();
        spawnParticleBurst(gameData.bx, gameData.by, gameData.bz, 16, [
          0xfacc15, 0x38bdf8,
        ]);
        propsRef.current.onCallout({
          text: 'SELF TOSS LIFT!',
          subtext: 'Run Up & Jump Smash!',
          color: '#F8FAFC',
          bgHex: '#0284C7',
          x: 50,
          y: 48,
        });
        return;
      }

      // 2. Buffer Set Intent for 0.75s so if the ball is arriving shortly, player will Lift/Set it on contact!
      gameData.setIntentTimer = 0.75;
      gameData.spikeIntentTimer = 0;

      if (gameData.phase === 'RALLY' && gameData.bz >= -0.35) {
        const distToBall = Math.hypot(
          gameData.bx - gameData.px,
          gameData.bz - gameData.pz
        );
        const reachBonus = propsRef.current.playerChar.reach * 0.05;
        // If triggered via Swipe Down right after touching or serving the ball, immediately convert into a high Volley Lift!
        const canConvertRecentTouch =
          fromSwipeDown &&
          gameData.lastHitter === 'player' &&
          gameData.bz > -0.5;

        if (
          canConvertRecentTouch ||
          (gameData.setCooldownTimer <= 0 &&
            distToBall <= 2.25 + reachBonus &&
            gameData.by <= 3.45 &&
            gameData.by >= 0.32)
        ) {
          executePlayerSetLift();
          return;
        }

        // If 2v2 and the ball is near the Teammate, command Teammate to immediately Set/Lift it!
        if (propsRef.current.is2v2) {
          const distPartner = Math.hypot(
            gameData.bx - gameData.ptx,
            gameData.bz - gameData.ptz
          );
          if (
            distPartner <= 2.35 &&
            gameData.by <= 3.0 &&
            gameData.by >= 0.32
          ) {
            executePartnerSetLift();
          }
        }
      }
    };

    const triggerPlayerSpikeOrServe = (wantSuper: boolean = false) => {
      const currentState = propsRef.current.gameState;
      if (currentState !== 'PLAYING') return;

      // 1. If waiting for serve: ONLY serve if it is the Player's turn to serve!
      if (gameData.phase === 'SERVE_WAIT') {
        if (propsRef.current.servingSide !== 'player') {
          return;
        }
        gameData.phase = 'RALLY';
        gameData.rallyCount = 1;
        gameData.playerConsecutiveTouches = 1;
        gameData.setCooldownTimer = 0.22;
        gameData.pvy = 5.4;
        gameData.pSwingTimer = 0.36;
        crayonAudio.playJumpBoing();

        const { dirX, dirZ } = getPlayerDirectionalAim();
        const targetX = THREE.MathUtils.clamp(
          gameData.px * 0.45 + dirX * 2.35 + (Math.random() - 0.5) * 0.45,
          -2.9,
          2.9
        );
        const targetZ = THREE.MathUtils.clamp(
          -3.8 + dirZ * 1.25 + (Math.random() - 0.5) * 0.4,
          -5.6,
          -2.1
        );
        launchBallToTarget(targetX, targetZ, 1.22, 'player', false, false);
        crayonAudio.playServeHit();
        crayonAudio.playBallPop(1, false);
        spawnParticleBurst(gameData.bx, gameData.by, gameData.bz, 12, [
          0x38bdf8, 0xf43f5e, 0x10b981,
        ]);
        return;
      }

      // 2. During Rally: Jump and open a generous 0.46s spike window (supports 2nd-touch / Double Touch!)
      if (gameData.py <= 0.08) {
        gameData.pvy = 6.35 + propsRef.current.playerChar.floatiness * 0.14;
        crayonAudio.playJumpBoing();
      }
      gameData.pSwingTimer = 0.36;
      gameData.spikeIntentTimer = 0.46;
      gameData.setIntentTimer = 0;
      gameData.superIntent = wantSuper;

      const isSetBall =
        gameData.lastHitter === 'partner_set' ||
        gameData.lastHitter === 'self_set';
      const canDoubleTouch =
        gameData.lastHitter !== 'player' ||
        isSetBall ||
        gameData.playerConsecutiveTouches < 2;

      if (
        gameData.phase === 'RALLY' &&
        gameData.bz > -0.35 &&
        canDoubleTouch &&
        gameData.setCooldownTimer <= 0
      ) {
        const distToBall = Math.hypot(
          gameData.bx - gameData.px,
          gameData.bz - gameData.pz
        );
        const reachBonus = propsRef.current.playerChar.reach * 0.05;
        const maxSpikeDist = (isSetBall ? 1.95 : 1.62) + reachBonus;
        const maxSpikeY = isSetBall ? 3.95 : 3.45;
        if (
          distToBall <= maxSpikeDist &&
          gameData.by <= maxSpikeY &&
          gameData.by >= 0.35
        ) {
          executePlayerHit(true, wantSuper, isSetBall);
        }
      }
    };

    const triggerPlayerDive = () => {
      if (propsRef.current.gameState !== 'PLAYING') return;
      if (gameData.pDiveTimer <= 0) {
        gameData.pDiveTimer = 0.36;
        crayonAudio.playDive();
        const dx = gameData.landingX - gameData.px;
        const dz = Math.max(0.8, gameData.landingZ) - gameData.pz;
        const len = Math.hypot(dx, dz) || 1;
        gameData.pvx = (dx / len) * 11.8;
        gameData.pvz = (dz / len) * 11.8;
        spawnParticleBurst(gameData.px, 0.2, gameData.pz, 10, [
          0x38bdf8, 0xa855f7,
        ]);
      }
    };

    let lastWheelSetTime = 0;

    // Multi-Touch Joystick + Swipe Down Lift + Single/Double Tap Handler
    let leftMaxDragDist = 0;
    let leftDownTimeMs = 0;
    let leftSwipedDown = false;
    const actionTouches = new Map<
      number,
      { startX: number; startY: number; startTime: number; swipedDown: boolean }
    >();

    const handleTapGesture = (isSecondFingerTouch: boolean) => {
      if (propsRef.current.gameState !== 'PLAYING') return;
      const now = performance.now();
      if (now - lastTapTimeMs < 360) {
        tapStreakCount += 1;
      } else {
        tapStreakCount = 1;
      }
      lastTapTimeMs = now;

      if (tapStreakCount >= 2) {
        // DOUBLE TAP -> Double-Touch Power Spike / Super Smash, OR Dive Save if ball is far on our court!
        tapStreakCount = 0;
        const distToLanding = Math.hypot(
          gameData.landingX - gameData.px,
          gameData.landingZ - gameData.pz
        );
        if (
          gameData.phase === 'RALLY' &&
          gameData.landingZ > 0 &&
          distToLanding > 2.05 &&
          gameData.py <= 0.12
        ) {
          triggerPlayerDive();
        }
        triggerPlayerSpikeOrServe(true);
      } else if (isSecondFingerTouch || gameData.phase === 'SERVE_WAIT') {
        // Second finger touch ("double touch" while holding joystick) or Serve phase -> Immediate Jump / Spike / Serve!
        triggerPlayerSpikeOrServe(false);
      }
    };

    const onPointerDown = (e: PointerEvent) => {
      if (propsRef.current.gameState !== 'PLAYING') return;
      const rect = renderer.domElement.getBoundingClientRect();
      const localX = e.clientX - rect.left;
      const localY = e.clientY - rect.top;

      const isSecondFinger = leftTouchId !== null && e.pointerId !== leftTouchId;
      if (isSecondFinger) {
        actionTouches.set(e.pointerId, {
          startX: localX,
          startY: localY,
          startTime: performance.now(),
          swipedDown: false,
        });
      }
      handleTapGesture(isSecondFinger);

      // Only bind the floating movement joystick if no joystick pointer is currently active
      if (leftTouchId === null) {
        leftTouchId = e.pointerId;
        leftOriginX = localX;
        leftOriginY = localY;
        leftMaxDragDist = 0;
        leftDownTimeMs = performance.now();
        leftSwipedDown = false;
        joystickVecRef.current = { x: 0, y: 0, active: true };
        if (joyContainerRef.current && joyKnobRef.current) {
          joyContainerRef.current.style.display = 'flex';
          joyContainerRef.current.style.left = `${e.clientX}px`;
          joyContainerRef.current.style.top = `${e.clientY}px`;
          joyKnobRef.current.style.transform = 'translate3d(0px, 0px, 0)';
        }
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      const localX = e.clientX - rect.left;
      const localY = e.clientY - rect.top;

      if (e.pointerId === leftTouchId && joystickVecRef.current.active) {
        const dx = localX - leftOriginX;
        const dy = localY - leftOriginY;
        const maxR = 48;
        const dist = Math.hypot(dx, dy);

        if (dist > leftMaxDragDist) leftMaxDragDist = dist;
        const clamped = Math.min(dist, maxR);
        const angle = Math.atan2(dy, dx);
        const clampedDx = dist > 5 ? Math.cos(angle) * clamped : 0;
        const clampedDy = dist > 5 ? Math.sin(angle) * clamped : 0;
        const nx = clampedDx / maxR;
        const ny = clampedDy / maxR;

        joystickVecRef.current = { x: nx, y: ny, active: true };
        if (joyKnobRef.current) {
          joyKnobRef.current.style.transform = `translate3d(${clampedDx}px, ${clampedDy}px, 0)`;
        }
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      if (actionTouches.has(e.pointerId)) {
        actionTouches.delete(e.pointerId);
      }
      if (e.pointerId === leftTouchId) {
        const tapDuration = performance.now() - leftDownTimeMs;

        if (
          !leftSwipedDown &&
          leftMaxDragDist < 14 &&
          tapDuration < 240 &&
          tapStreakCount === 1 &&
          gameData.phase === 'RALLY'
        ) {
          triggerPlayerSpikeOrServe(false);
        }
        leftTouchId = null;
        joystickVecRef.current = { x: 0, y: 0, active: false };
        if (joyContainerRef.current) {
          joyContainerRef.current.style.display = 'none';
        }
      }
    };

    const onWheel = (_e: WheelEvent) => {
      // Do not trigger lift on touchpad swipe/scroll
    };

    const onKeyDown = (e: KeyboardEvent) => {
      keysDown.add(e.code);
      if (e.code === 'Space') {
        e.preventDefault();
        triggerPlayerSpikeOrServe(false);
      } else if (e.code === 'KeyE') {
        e.preventDefault();
        triggerPlayerSpikeOrServe(true);
      } else if (
        e.code === 'AltLeft' ||
        e.code === 'AltRight' ||
        e.key === 'Alt'
      ) {
        // PC Alt key -> Self-Lift / Volley Set ("and pc k lie alt")
        e.preventDefault();
        triggerPlayerSetLift();
      } else if (
        e.code === 'ShiftLeft' ||
        e.code === 'ShiftRight' ||
        e.code === 'KeyZ'
      ) {
        e.preventDefault();
        triggerPlayerDive();
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      keysDown.delete(e.code);
    };

    const domElem = renderer.domElement;
    domElem.addEventListener('pointerdown', onPointerDown);
    domElem.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = entry.contentRect.width;
        const h = entry.contentRect.height;
        if (w > 0 && h > 0) {
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
          renderer.setSize(w, h);
          postPipeline.setSize(w, h);
        }
      }
    });
    resizeObserver.observe(container);

    // =========================================================================
    // MAIN 60FPS ANIMATION & PHYSICS LOOP
    // =========================================================================
    const timer = new THREE.Timer();
    let reqId = 0;
    let netSyncAccum = 0;
    let remotePartnerLastTickAt = 0;
    let remoteRival1LastTickAt = 0;
    let remoteRival2LastTickAt = 0;

    const unsubRemoteTick = multiplayerClient.onRemoteTick((pkt) => {
      const room = multiplayerClient.currentRoom;
      if (!room || room.mode !== 'volleyball_2v2') return;
      const mySlot = room.slots.find((s) => s.playerId === multiplayerClient.playerId);
      const remoteSlot =
        room.slots.find((s) => s.playerId === pkt.senderId) ||
        room.slots[pkt.slotIndex];
      if (!remoteSlot) return;
      const myTeam = mySlot?.team || 'blue';
      const nowMs = performance.now();

      if (remoteSlot.team === myTeam) {
        remotePartnerLastTickAt = nowMs;
        gameData.ptx = THREE.MathUtils.lerp(gameData.ptx, pkt.x, 0.55);
        gameData.pty = THREE.MathUtils.lerp(gameData.pty, pkt.y, 0.55);
        gameData.ptz = THREE.MathUtils.lerp(gameData.ptz, pkt.z, 0.55);
      } else {
        // Mirror opposing team coordinates across the net (z -> -z, x -> -x)
        const isFirstRival = remoteSlot.slotIndex % 2 === 0;
        if (isFirstRival) {
          remoteRival1LastTickAt = nowMs;
          gameData.a1x = THREE.MathUtils.lerp(gameData.a1x, -pkt.x, 0.55);
          gameData.a1y = THREE.MathUtils.lerp(gameData.a1y, pkt.y, 0.55);
          gameData.a1z = THREE.MathUtils.lerp(gameData.a1z, -pkt.z, 0.55);
        } else {
          remoteRival2LastTickAt = nowMs;
          gameData.a2x = THREE.MathUtils.lerp(gameData.a2x, -pkt.x, 0.55);
          gameData.a2y = THREE.MathUtils.lerp(gameData.a2y, pkt.y, 0.55);
          gameData.a2z = THREE.MathUtils.lerp(gameData.a2z, -pkt.z, 0.55);
        }
      }
    });

    const unsubRemoteEvent = multiplayerClient.onRemoteEvent((evt) => {
      if (evt.eventKind === 'volley:hit' && evt.payload) {
        const room = multiplayerClient.currentRoom;
        if (!room || room.mode !== 'volleyball_2v2') return;
        const mySlot = room.slots.find((s) => s.playerId === multiplayerClient.playerId);
        const myTeam = mySlot?.team || 'blue';
        const p = evt.payload;
        const sameTeam = p.team === myTeam;

        gameData.phase = 'RALLY';
        gameData.rallyCount += 1;
        if (sameTeam) {
          gameData.bx = Number(p.bx) || gameData.bx;
          gameData.by = Number(p.by) || gameData.by;
          gameData.bz = Number(p.bz) || gameData.bz;
          gameData.bvx = Number(p.bvx) || 0;
          gameData.bvy = Number(p.bvy) || 4;
          gameData.bvz = Number(p.bvz) || -4;
          gameData.lastHitter = 'partner';
          gameData.ptSwingTimer = 0.36;
        } else {
          gameData.bx = -(Number(p.bx) || 0);
          gameData.by = Number(p.by) || 1.8;
          gameData.bz = -(Number(p.bz) || -2);
          gameData.bvx = -(Number(p.bvx) || 0);
          gameData.bvy = Number(p.bvy) || 4;
          gameData.bvz = -(Number(p.bvz) || 4);
          gameData.lastHitter = 'ai';
          gameData.a1SwingTimer = 0.36;
        }
        gameData.isRainbowSmash = Boolean(p.rainbowSmash || p.superSmash);
        gameData.isSuperSmash = Boolean(p.superSmash);
        computeLandingSpot(
          gameData.bx,
          gameData.by,
          gameData.bz,
          gameData.bvx,
          gameData.bvy,
          gameData.bvz
        );
        crayonAudio.playBallPop(gameData.rallyCount, Boolean(p.rainbowSmash));
      }
    });

    const animate = (timestamp: number) => {
      reqId = requestAnimationFrame(animate);
      timer.update(timestamp);
      const speedMult = propsRef.current.gameSpeedMultiplier ?? 1.0;
      const dt = Math.min(timer.getDelta(), 0.05) * speedMult;
      const elapsed = timer.getElapsed();

      const {
        gameState: currentState,
        gameMode: currentMode,
        difficulty: currentDiff,
        cameraPreset: currentCam,
        playerChar: pCfg,
        partnerChar: ptCfg,
        aiChar1: a1Cfg,
        is2v2: duoMode,
        modifier: currentMod,
        cameraFov: targetFov = 45,
        landingCircleStyle: circleStyle = 'classic',
        enableVfx: vfxEnabled = true,
        enableScreenShake: shakeEnabled = true,
      } = propsRef.current;

      const aspect = camera.aspect || 1;
      // Only apply portrait pull-back on true vertical portrait viewports (aspect < 0.95) so PC/desktop & landscape stay crisp!
      const portraitFactor =
        aspect < 0.95
          ? THREE.MathUtils.clamp((0.95 - aspect) / 0.45, 0, 1.15)
          : 0;
      const effectiveFov = targetFov + portraitFactor * 13;

      if (Math.abs(camera.fov - effectiveFov) > 0.1) {
        camera.fov = THREE.MathUtils.damp(camera.fov, effectiveFov, 8, 0.016);
        camera.updateProjectionMatrix();
      }

      // Consume UI triggers (Super Badge, Spike, Dive, Call Lift)
      if (actionTriggerRef.current.superRequested) {
        actionTriggerRef.current.superRequested = false;
        triggerPlayerSpikeOrServe(true);
      }
      if (actionTriggerRef.current.spikeRequested) {
        actionTriggerRef.current.spikeRequested = false;
        triggerPlayerSpikeOrServe(false);
      }
      if (actionTriggerRef.current.diveRequested) {
        actionTriggerRef.current.diveRequested = false;
        triggerPlayerDive();
      }
      if (actionTriggerRef.current.liftRequested) {
        actionTriggerRef.current.liftRequested = false;
        triggerPlayerSetLift();
      }

      // 1. Animate World Clouds, Blimps, Spinning Windmills/Lighthouse & Stylized Ocean Water Motion
      for (let c = 0; c < cloudsList.length; c++) {
        cloudsList[c].position.x += Math.sin(elapsed * 0.35 + c) * 0.22 * dt;
      }
      for (let s = 0; s < spinningPropsList.length; s++) {
        spinningPropsList[s].rotation.z += dt * 0.85;
      }

      if (waterMesh.visible && waterMat.map) {
        waterMat.map.offset.x = (elapsed * 0.038) % 1;
        waterMat.map.offset.y = (elapsed * 0.026) % 1;
      }

      for (let w = 0; w < waveRingsList.length; w++) {
        const ring = waveRingsList[w];
        const s = 1 + Math.sin(elapsed * 2.3 + w * 1.6) * 0.022;
        ring.scale.set(s, s, 1);
        const mat = ring.material as THREE.MeshBasicMaterial;
        mat.opacity =
          (w === 0 ? 0.58 : 0.32) + Math.sin(elapsed * 2.3 + w * 1.6) * 0.12;
      }

      for (let wt = 0; wt < waterfallTexturesList.length; wt++) {
        const tex = waterfallTexturesList[wt];
        if (wt === 0 && propsRef.current.theme.hasWaterPlane) {
          tex.offset.x = (-elapsed * 0.024) % 1;
          tex.offset.y = (elapsed * 0.032) % 1;
        } else {
          tex.offset.y = (elapsed * 1.45) % 1;
        }
      }

      for (let wf = 0; wf < waterfallFoamsList.length; wf++) {
        const foam = waterfallFoamsList[wf];
        const pulse = 0.92 + Math.sin(elapsed * 6.5 + wf * 1.1) * 0.14;
        foam.scale.setScalar(pulse);
      }

      const isBombMode = currentMode === 'bomb_potato';
      vBall.bombCapGroup.visible = currentState !== 'CHARACTER_SELECT' && isBombMode;

      if (isBombMode) {
        vBall.sparkStar.rotation.y += dt * 8;
        vBall.sparkStar.rotation.z += dt * 6;
        const pulse = 1 + Math.sin(elapsed * 18) * 0.28;
        vBall.sparkStar.scale.setScalar(pulse);
      }

      const effGravity = getGravity();

      // =======================================================================
      // 2. STATE-SPECIFIC SCENE & ACTOR CHOREOGRAPHY
      // =======================================================================
      if (
        currentState === 'CHARACTER_SELECT' ||
        currentState === 'PROFILE'
      ) {
        const isWideMenu = aspect >= 1.02;
        const studioX =
          currentState === 'CHARACTER_SELECT' && isWideMenu ? -0.18 : 0;
        const studioY =
          currentState === 'CHARACTER_SELECT' && !isWideMenu ? 0.24 : 0.04;
        studioPodiumGroup.position.set(studioX, studioY, 0);
        gameData.px = studioX;
        gameData.py = studioY + Math.abs(Math.sin(elapsed * 2.8)) * 0.035;
        gameData.pz = 0;

        if (playerRig) {
          playerRig.root.rotation.y = Math.sin(elapsed * 0.85) * 0.28;
          playerRig.bodyGroup.rotation.z = 0;
        }
      } else if (
        currentState === 'MODE_SELECT' &&
        currentMode !== 'obstacle_rush' &&
        currentMode !== 'floor_is_lava'
      ) {
        // Live 3D Arena Preview in Mode Select: Athletes warm up on court!
        gameData.px = -1.35;
        gameData.py = Math.abs(Math.sin(elapsed * 3.2)) * 0.35;
        gameData.pz = 3.2;
        gameData.ptx = 1.55;
        gameData.pty = Math.abs(Math.cos(elapsed * 2.8)) * 0.15;
        gameData.ptz = 4.0;
        gameData.a1x = -1.45;
        gameData.a1y = Math.abs(Math.cos(elapsed * 3.0)) * 0.25;
        gameData.a1z = -3.8;
        gameData.a2x = 1.5;
        gameData.a2y = Math.abs(Math.sin(elapsed * 2.6)) * 0.2;
        gameData.a2z = -3.2;
        gameData.bx = Math.sin(elapsed * 1.8) * 1.3;
        gameData.by = 2.4 + Math.abs(Math.cos(elapsed * 3.6)) * 1.1;
        gameData.bz = Math.cos(elapsed * 1.8) * 2.6;
        vBall.ballMesh.rotation.x += dt * 3.2;
        vBall.ballMesh.rotation.y += dt * 2.4;
      } else if (
        currentState === 'TITLE_MENU' ||
        currentState === 'MODE_SELECT' ||
        currentState === 'SETTINGS'
      ) {
        const isWideMenu = aspect >= 1.02;
        const heroY = !isWideMenu ? 0.10 : 0.0;
        gameData.px = !isWideMenu ? 0.0 : -0.02;
        gameData.py = heroY + Math.abs(Math.sin(elapsed * 2.4)) * 0.025;
        gameData.pz = 0;

        if (playerRig) {
          playerRig.root.rotation.y = 0.08 + Math.sin(elapsed * 1.1) * 0.05;
          playerRig.bodyGroup.rotation.z = 0;
        }
      } else if (currentState === 'PLAYING') {
        if (playerRig) {
          playerRig.root.rotation.y = 0;
          playerRig.bodyGroup.rotation.z = 0;
        }
        if (partnerRig) {
          partnerRig.root.rotation.y = 0;
        }

        if (gameData.spikeIntentTimer > 0) {
          gameData.spikeIntentTimer -= dt;
        }
        if (gameData.setIntentTimer > 0) {
          gameData.setIntentTimer -= dt;
        }
        if (gameData.setCooldownTimer > 0) {
          gameData.setCooldownTimer -= dt;
        }

        // -------------------------------------------------------------------
        // A. MANUAL PLAYER MOVEMENT (INVISIBLE THUMBSTICK OR KEYBOARD + SMART STEP-ASSIST)
        // -------------------------------------------------------------------
        const moveSpeed = 6.85 + pCfg.speed * 0.42;
        let inputX = 0;
        let inputZ = 0;

        if (keysDown.has('ArrowLeft') || keysDown.has('KeyA')) inputX -= 1;
        if (keysDown.has('ArrowRight') || keysDown.has('KeyD')) inputX += 1;
        if (keysDown.has('ArrowUp') || keysDown.has('KeyW')) inputZ -= 1;
        if (keysDown.has('ArrowDown') || keysDown.has('KeyS')) inputZ += 1;

        if (joystickVecRef.current.active) {
          inputX += joystickVecRef.current.x;
          inputZ += joystickVecRef.current.y;
        }

        if (gameData.pDiveTimer > 0) {
          gameData.pDiveTimer -= dt;
          gameData.px += gameData.pvx * dt;
          gameData.pz += gameData.pvz * dt;
          gameData.pvx *= 0.91;
          gameData.pvz *= 0.91;
        } else if (Math.abs(inputX) > 0.01 || Math.abs(inputZ) > 0.01) {
          const len = Math.min(1, Math.hypot(inputX, inputZ));
          const normX = inputX / (Math.hypot(inputX, inputZ) || 1);
          const normZ = inputZ / (Math.hypot(inputX, inputZ) || 1);
          gameData.px += normX * len * moveSpeed * dt;
          gameData.pz += normZ * len * moveSpeed * dt;
          if (gameData.py <= 0.05) {
            crayonAudio.playFootstep();
          }
        }

        // Subtle Smart Reception Step-Assist (Helps close the final gap when within 2.35m of incoming ball, without playing automatically!)
        if (
          gameData.phase === 'RALLY' &&
          gameData.lastHitter === 'ai' &&
          gameData.landingZ > 0 &&
          gameData.bz > -1.2 &&
          gameData.pDiveTimer <= 0
        ) {
          const toLandX = gameData.landingX - gameData.px;
          const toLandZ = gameData.landingZ - gameData.pz;
          const distToLanding = Math.hypot(toLandX, toLandZ);
          if (distToLanding > 0.18 && distToLanding < 2.35) {
            const assistPull = 2.15 * (1 - distToLanding / 2.65);
            gameData.px += (toLandX / distToLanding) * assistPull * dt;
            gameData.pz += (toLandZ / distToLanding) * assistPull * dt;
          }
        }

        gameData.px = THREE.MathUtils.clamp(gameData.px, -3.5, 3.5);
        gameData.pz = THREE.MathUtils.clamp(gameData.pz, 0.85, 6.6);

        if (gameData.py > 0 || gameData.pvy > 0) {
          gameData.py += gameData.pvy * dt;
          gameData.pvy += effGravity * dt;
          if (gameData.py <= 0) {
            gameData.py = 0;
            gameData.pvy = 0;
          }
        }

        // -------------------------------------------------------------------
        // B. 2v2 PARTNER AI (Respects Player Priority! Skipped if Partner is a Live Remote Human!)
        // -------------------------------------------------------------------
        const nowMs = performance.now();
        if (duoMode && partnerRig && nowMs - remotePartnerLastTickAt > 3000) {
          // Stay cleanly on the opposite wing from the Player so Player has full freedom!
          const wingX = gameData.px <= 0.15 ? 1.85 : -1.85;
          let goalPtX = wingX;
          let goalPtZ = 3.65;

          if (
            gameData.phase === 'RALLY' &&
            gameData.lastHitter === 'ai' &&
            gameData.landingZ > 0
          ) {
            const distPlayerToLanding = Math.hypot(
              gameData.landingX - gameData.px,
              gameData.landingZ - gameData.pz
            );
            const distPartnerToLanding = Math.hypot(
              gameData.landingX - gameData.ptx,
              gameData.landingZ - gameData.ptz
            );

            // ONLY chase the ball if Player is genuinely far away (> 2.85m) and Partner is much closer,
            // OR if Player explicitly requested a Lift (setIntentTimer > 0)!
            const playerCalledLift = gameData.setIntentTimer > 0;
            const isFarFromPlayer =
              distPlayerToLanding > 2.85 &&
              distPartnerToLanding + 0.72 < distPlayerToLanding;

            if (playerCalledLift || isFarFromPlayer) {
              goalPtX = THREE.MathUtils.clamp(gameData.landingX, -3.2, 3.2);
              goalPtZ = THREE.MathUtils.clamp(gameData.landingZ, 1.15, 6.1);
            }
          } else if (
            gameData.phase === 'RALLY' &&
            (gameData.lastHitter === 'partner_set' ||
              gameData.lastHitter === 'self_set')
          ) {
            // Clear the front-court attack lane so the Player has full room to Jump & Volley Smash!
            goalPtX = gameData.landingX < 0 ? 2.1 : -2.1;
            goalPtZ = 4.1;
          }

          // Realistic partner speed (slower than Player so Partner never steals balls!)
          const ptSpeed = 4.1 + ptCfg.speed * 0.2;
          const dpx = goalPtX - gameData.ptx;
          const dpz = goalPtZ - gameData.ptz;
          const dpLen = Math.hypot(dpx, dpz);
          if (dpLen > 0.08) {
            gameData.ptx += (dpx / dpLen) * Math.min(dpLen, ptSpeed * dt);
            gameData.ptz += (dpz / dpLen) * Math.min(dpLen, ptSpeed * dt);
          }
          gameData.ptx = THREE.MathUtils.clamp(gameData.ptx, -3.45, 3.45);
          gameData.ptz = THREE.MathUtils.clamp(gameData.ptz, 0.85, 6.4);

          if (gameData.pty > 0 || gameData.ptvy > 0) {
            gameData.pty += gameData.ptvy * dt;
            gameData.ptvy += effGravity * dt;
            if (gameData.pty <= 0) {
              gameData.pty = 0;
              gameData.ptvy = 0;
            }
          }
        }

        // -------------------------------------------------------------------
        // C. OPPONENT AI (Tactical Positioning, Cross-Court Angles & Challenging Rallies!)
        // -------------------------------------------------------------------
        const aiSpeedBase =
          currentDiff === 'chill'
            ? 2.85
            : currentDiff === 'breezy'
              ? 3.75
              : currentDiff === 'spicy'
                ? 4.65
                : currentDiff === 'extreme'
                  ? 5.45
                  : 6.25;

        let a1GoalX = duoMode ? -1.45 : 0;
        let a1GoalZ = -4.1;
        let a2GoalX = 1.45;
        let a2GoalZ = -2.85;

        if (
          gameData.phase === 'RALLY' &&
          gameData.landingZ < 0 &&
          gameData.bz < 0.85
        ) {
          if (!duoMode) {
            a1GoalX = gameData.landingX;
            a1GoalZ = THREE.MathUtils.clamp(gameData.landingZ, -6.2, -1.1);
          } else {
            const d1 = Math.hypot(
              gameData.landingX - gameData.a1x,
              gameData.landingZ - gameData.a1z
            );
            const d2 = Math.hypot(
              gameData.landingX - gameData.a2x,
              gameData.landingZ - gameData.a2z
            );
            if (d1 <= d2) {
              a1GoalX = gameData.landingX;
              a1GoalZ = THREE.MathUtils.clamp(gameData.landingZ, -6.2, -1.1);
              a2GoalX = gameData.landingX <= 0 ? 1.55 : -1.55;
              a2GoalZ = -2.9;
            } else {
              a2GoalX = gameData.landingX;
              a2GoalZ = THREE.MathUtils.clamp(gameData.landingZ, -6.2, -1.1);
              a1GoalX = gameData.landingX <= 0 ? 1.55 : -1.55;
              a1GoalZ = -4.3;
            }
          }
        } else if (gameData.phase === 'RALLY') {
          // Dynamic split-step anticipation: AI shifts defensively opposite to Player's attack angle & jiggles on its toes!
          const anticipateX = THREE.MathUtils.clamp(
            -gameData.px * 0.45 + Math.sin(elapsed * 3.8) * 0.35,
            -2.2,
            2.2
          );
          const anticipateZ =
            gameData.pz < 2.2
              ? -4.35 // Player is at the net -> AI backs up to dig hard spikes!
              : -3.25 + Math.cos(elapsed * 3.2) * 0.25;
          if (duoMode) {
            a1GoalX = THREE.MathUtils.clamp(anticipateX - 1.25, -2.5, -0.4);
            a1GoalZ = anticipateZ - 0.55;
            a2GoalX = THREE.MathUtils.clamp(anticipateX + 1.25, 0.4, 2.5);
            a2GoalZ = anticipateZ + 0.65;
          } else {
            a1GoalX = anticipateX;
            a1GoalZ = anticipateZ;
          }
        }

        // Player Skill Quality directly challenges AI defensive speed:
        // A well-timed, aimed player smash slows AI reaction so skilled play wins points!
        const skillSpeedTax = THREE.MathUtils.clamp(
          1.12 - (gameData.playerShotQuality - 0.85) * 0.52,
          0.62,
          1.08
        );
        const spikeSlowdown = gameData.isSuperSmash
          ? 0.56
          : gameData.isRainbowSmash
            ? 0.78 * skillSpeedTax
            : skillSpeedTax;
        const effectiveAiSpeed = aiSpeedBase * spikeSlowdown;

        if (nowMs - remoteRival1LastTickAt > 3000) {
          const da1x = a1GoalX - gameData.a1x;
          const da1z = a1GoalZ - gameData.a1z;
          const da1Len = Math.hypot(da1x, da1z);
          if (da1Len > 0.08) {
            gameData.a1x +=
              (da1x / da1Len) * Math.min(da1Len, effectiveAiSpeed * dt);
            gameData.a1z +=
              (da1z / da1Len) * Math.min(da1Len, effectiveAiSpeed * dt);
          }
          gameData.a1x = THREE.MathUtils.clamp(gameData.a1x, -3.45, 3.45);
          gameData.a1z = THREE.MathUtils.clamp(gameData.a1z, -6.4, -0.85);
        }

        if (duoMode && nowMs - remoteRival2LastTickAt > 3000) {
          const da2x = a2GoalX - gameData.a2x;
          const da2z = a2GoalZ - gameData.a2z;
          const da2Len = Math.hypot(da2x, da2z);
          if (da2Len > 0.08) {
            gameData.a2x +=
              (da2x / da2Len) * Math.min(da2Len, effectiveAiSpeed * dt);
            gameData.a2z +=
              (da2z / da2Len) * Math.min(da2Len, effectiveAiSpeed * dt);
          }
          gameData.a2x = THREE.MathUtils.clamp(gameData.a2x, -3.45, 3.45);
          gameData.a2z = THREE.MathUtils.clamp(gameData.a2z, -6.4, -0.85);
        }

        if (gameData.a1y > 0 || gameData.a1vy > 0) {
          gameData.a1y += gameData.a1vy * dt;
          gameData.a1vy += effGravity * dt;
          if (gameData.a1y <= 0) {
            gameData.a1y = 0;
            gameData.a1vy = 0;
          }
        }
        if (gameData.a2y > 0 || gameData.a2vy > 0) {
          gameData.a2y += gameData.a2vy * dt;
          gameData.a2vy += effGravity * dt;
          if (gameData.a2y <= 0) {
            gameData.a2y = 0;
            gameData.a2vy = 0;
          }
        }

        // -------------------------------------------------------------------
        // D. VOLLEYBALL SERVE, RALLY & POINT SCORING RULES
        // -------------------------------------------------------------------
        if (gameData.phase === 'SERVE_WAIT') {
          gameData.serveWaitTimer += dt;
          if (propsRef.current.servingSide === 'player') {
            gameData.bx = gameData.px;
            gameData.by = 1.98 + Math.sin(elapsed * 5) * 0.1;
            gameData.bz = gameData.pz - 0.55;
            if (
              joystickVecRef.current.active &&
              gameData.serveWaitTimer > 1.2
            ) {
              triggerPlayerSpikeOrServe(false);
            }
          } else {
            gameData.bx = gameData.a1x;
            gameData.by = 1.98 + Math.sin(elapsed * 5) * 0.1;
            gameData.bz = gameData.a1z + 0.55;
            if (gameData.serveWaitTimer >= 0.85) {
              executeAiServe();
            }
          }
        } else if (gameData.phase === 'RALLY') {
          if (currentMod === 'windy') {
            gameData.bvx += Math.sin(elapsed * 1.6) * 1.15 * dt;
          }

          gameData.bx += gameData.bvx * dt;
          gameData.by += gameData.bvy * dt;
          gameData.bz += gameData.bvz * dt;
          gameData.bvy += effGravity * dt;

          vBall.ballMesh.rotation.x += gameData.bvz * dt * 1.4;
          vBall.ballMesh.rotation.z -= gameData.bvx * dt * 1.4;

          // SUB-GAME: BOMB RUSH FUSE TIMER
          if (isBombMode) {
            gameData.bombFuseTimer -= dt;
            if (gameData.bombFuseTimer <= 0) {
              crayonAudio.playExplosionBoom();
              spawnParticleBurst(
                gameData.bx,
                gameData.by,
                gameData.bz,
                40,
                [0xf43f5e, 0x38bdf8, 0xa855f7]
              );
              const bombOnPlayerSide = gameData.bz >= 0;
              const winner: 'player' | 'ai' = bombOnPlayerSide ? 'ai' : 'player';
              const reason = bombOnPlayerSide
                ? 'BOOM! Bomb exploded on your side!'
                : 'BOOM! Bomb exploded on Rival court!';

              propsRef.current.onCallout({
                text:
                  winner === 'player'
                    ? 'BOMB BLAST POINT!'
                    : 'BOMB EXPLODED!',
                subtext: reason,
                color: '#F8FAFC',
                bgHex: winner === 'player' ? '#10B981' : '#E11D48',
                x: 50,
                y: 42,
              });

              gameData.phase = 'POINT_DELAY';
              gameData.pointDelayTimer = 1.25;
              propsRef.current.onPointFinished(winner, reason);
              return;
            }
          }

          // 1. Check Player 1 Active Spike Window, Self-Set Lift, OR Ground Bump Reception (Supports 2-Touch / Double Touch!)
          const isSetBall =
            gameData.lastHitter === 'partner_set' ||
            gameData.lastHitter === 'self_set';
          const canDoubleTouch =
            gameData.lastHitter !== 'player' ||
            isSetBall ||
            gameData.playerConsecutiveTouches < 2;

          if (
            canDoubleTouch &&
            gameData.bz >= -0.3 &&
            gameData.by >= 0.35 &&
            gameData.setCooldownTimer <= 0
          ) {
            const distP = Math.hypot(
              gameData.bx - gameData.px,
              gameData.bz - gameData.pz
            );
            const reachBonus = pCfg.reach * 0.045;

            // A) Player Buffered Self-Set Lift (via Triple Tap / Downward Scroll / PC Alt)
            if (
              gameData.setIntentTimer > 0 &&
              !isSetBall &&
              distP <= 1.9 + reachBonus &&
              gameData.by <= 2.95 + gameData.py
            ) {
              executePlayerSetLift();
            }
            // B) Active Jump-Spike / Volley Smash Window (Including 2nd-Touch Double Touch Smash!)
            else if (
              (gameData.spikeIntentTimer > 0 ||
                (isSetBall && gameData.py > 0.22)) &&
              distP <= (isSetBall ? 2.05 : 1.78) + reachBonus &&
              gameData.by <= (isSetBall ? 3.98 : 3.55)
            ) {
              executePlayerHit(true, gameData.superIntent, isSetBall);
            }
            // C) Ground/Air Bump Reception when Player is Positioned Under a Falling Ball from AI/Set
            else if (
              gameData.lastHitter !== 'player' &&
              gameData.bvy < 0 &&
              distP <= (isSetBall ? 1.52 : 1.42) + reachBonus &&
              gameData.by <= (isSetBall ? 1.75 : 2.12) + gameData.py
            ) {
              executePlayerHit(gameData.py > 0.2, false, isSetBall);
            }
          }

          // 2. Check 2v2 Partner Reception -> ONLY saves balls far from Player, and ONLY lifts when needed & rare!
          if (
            duoMode &&
            gameData.bz > 0.2 &&
            gameData.bvy < 0 &&
            gameData.by >= 0.36 &&
            gameData.setCooldownTimer <= 0
          ) {
            const distPlayer = Math.hypot(
              gameData.bx - gameData.px,
              gameData.bz - gameData.pz
            );
            const distPartner = Math.hypot(
              gameData.bx - gameData.ptx,
              gameData.bz - gameData.ptz
            );

            // Partner ONLY touches the ball when it drops low (by <= 1.22) AND Player is far away (> 2.45m)
            // OR if Player explicitly called for a Lift (setIntentTimer > 0)!
            if (
              gameData.lastHitter === 'ai' &&
              gameData.by <= 1.22 &&
              distPartner <= 1.18 &&
              (distPlayer > 2.45 || gameData.setIntentTimer > 0)
            ) {
              const playerExplicitlyRequestedLift = gameData.setIntentTimer > 0;
              const canRareAutoLift =
                gameData.partnerSetCooldownRallies <= 0 &&
                gameData.pz <= 3.15 &&
                distPlayer > 2.75 &&
                Math.random() < 0.16;

              if (playerExplicitlyRequestedLift || canRareAutoLift) {
                executePartnerSetLift();
              } else {
                // Normal Teammate Defensive Return over the net (no constant lifting!)
                gameData.rallyCount += 1;
                gameData.ptSwingTimer = 0.36;
                gameData.ptvy = 4.2;
                if (gameData.partnerSetCooldownRallies > 0) {
                  gameData.partnerSetCooldownRallies--;
                }
                crayonAudio.playBallPop(gameData.rallyCount, false);

                const targetX = THREE.MathUtils.clamp(
                  (Math.random() - 0.5) * 4.8,
                  -2.75,
                  2.75
                );
                const targetZ = -3.1 - Math.random() * 2.4;
                launchBallToTarget(
                  targetX,
                  targetZ,
                  1.18,
                  'partner',
                  false,
                  false
                );
                spawnParticleBurst(
                  gameData.bx,
                  gameData.by,
                  gameData.bz,
                  10,
                  activeSkinColors
                );
                propsRef.current.onRallyUpdate(
                  gameData.rallyCount,
                  false,
                  10,
                  false,
                  false
                );
              }
            }
            // Case B: Emergency Save if a Set Ball drops very low (by <= 0.85) and Player couldn't reach it
            else if (
              isSetBall &&
              gameData.by <= 0.85 &&
              distPartner <= 1.35 &&
              distPlayer > 2.1
            ) {
              gameData.rallyCount += 1;
              gameData.ptSwingTimer = 0.38;
              gameData.ptvy = 4.6;
              crayonAudio.playBallPop(gameData.rallyCount, false);

              const targetX = THREE.MathUtils.clamp(
                (Math.random() - 0.5) * 4.8,
                -2.6,
                2.6
              );
              const targetZ = -3.2 - Math.random() * 2.2;

              launchBallToTarget(
                targetX,
                targetZ,
                1.14,
                'partner',
                false,
                false
              );
              spawnParticleBurst(
                gameData.bx,
                gameData.by,
                gameData.bz,
                10,
                activeSkinColors
              );
            }
          }

          // 3. Check AI Opponents Return (Tactical Placement + Jump Spikes!)
          if (
            (gameData.lastHitter === 'player' ||
              gameData.lastHitter === 'partner') &&
            gameData.bz < 0 &&
            gameData.bvy < 0 &&
            gameData.by <= 2.15 &&
            gameData.by >= 0.4
          ) {
            const distA1 = Math.hypot(
              gameData.bx - gameData.a1x,
              gameData.bz - gameData.a1z
            );
            const distA2 = duoMode
              ? Math.hypot(gameData.bx - gameData.a2x, gameData.bz - gameData.a2z)
              : 999;

            const minDist = Math.min(distA1, distA2);
            const baseReach =
              currentDiff === 'chill'
                ? 0.96
                : currentDiff === 'breezy'
                  ? 1.18
                  : currentDiff === 'spicy'
                    ? 1.38
                    : currentDiff === 'extreme'
                      ? 1.54
                      : 1.72;
            const rallyFatigue = Math.max(
              0.68,
              1.0 - Math.max(0, gameData.rallyCount - 4) * 0.035
            );
            // Reward Player Skill: higher playerShotQuality makes the ball harder for AI to dig!
            const playerSkillTax = THREE.MathUtils.clamp(
              1.12 - (gameData.playerShotQuality - 0.85) * 0.48,
              0.55,
              1.08
            );
            const smashPenalty = gameData.isSuperSmash
              ? 0.35
              : gameData.isRainbowSmash
                ? 0.64 * playerSkillTax
                : playerSkillTax;
            const effectiveReach = baseReach * rallyFatigue * smashPenalty;

            if (minDist <= effectiveReach) {
              gameData.rallyCount += 1;
              gameData.playerConsecutiveTouches = 0;
              gameData.ballJiggleVel = 5.2;
              const aiSpikeChance =
                currentDiff === 'chill'
                  ? 0.12
                  : currentDiff === 'breezy'
                    ? 0.28
                    : currentDiff === 'spicy'
                      ? 0.48
                      : currentDiff === 'extreme'
                        ? 0.68
                        : 0.82;
              const isAiSpike =
                !gameData.isRainbowSmash && Math.random() < aiSpikeChance;

              if (distA1 <= distA2) {
                gameData.a1SwingTimer = 0.36;
                gameData.a1vy = isAiSpike ? 6.0 : 4.8;
              } else {
                gameData.a2SwingTimer = 0.36;
                gameData.a2vy = isAiSpike ? 6.0 : 4.8;
              }

              // Smarter, Varied Tactical AI Shot Selection (No fixed return pattern!):
              // Evaluates both Player (px, pz) and Partner (ptx, ptz) positions to find the most open court zone!
              const defenderLeftLoad =
                (gameData.px < 0 ? 1.2 : 0) +
                (duoMode && gameData.ptx < 0 ? 0.9 : 0);
              const defenderRightLoad =
                (gameData.px >= 0 ? 1.2 : 0) +
                (duoMode && gameData.ptx >= 0 ? 0.9 : 0);

              let smartOpenX: number;
              if (defenderLeftLoad > defenderRightLoad + 0.3) {
                // Player team is overloading left -> AI rips cross-court right or down the line!
                smartOpenX = 1.45 + Math.random() * 1.45;
              } else if (defenderRightLoad > defenderLeftLoad + 0.3) {
                // Player team is overloading right -> AI rips sharp left corner!
                smartOpenX = -1.45 - Math.random() * 1.45;
              } else {
                // Split coverage -> AI targets the seam or sharp sideline corners
                smartOpenX =
                  Math.random() < 0.5
                    ? (Math.random() < 0.5 ? -1 : 1) * (2.0 + Math.random() * 0.9)
                    : (gameData.px - (duoMode ? gameData.ptx : 0)) * 0.3;
              }

              const randomX = (Math.random() - 0.5) * 5.2;
              const tacticalBlend =
                currentDiff === 'chill'
                  ? 0.25
                  : currentDiff === 'breezy'
                    ? 0.48
                    : currentDiff === 'spicy'
                      ? 0.72
                      : 0.88;
              const targetX = THREE.MathUtils.clamp(
                THREE.MathUtils.lerp(randomX, smartOpenX, tacticalBlend),
                -2.9,
                2.9
              );

              // Dynamic Depth Selection:
              // - If Player is deep (pz > 3.4), AI mixes in deceptive short net drop-shots / dinks!
              // - If Player is crowding the net (pz < 2.3), AI drives deep baseline lobs/corners!
              // - Otherwise mixes mid-court cross angles and deep corners.
              let targetZ: number;
              const rollDepth = Math.random();
              if (gameData.pz > 3.4 && rollDepth < 0.42 && currentDiff !== 'chill') {
                // Short Drop-Shot right over the net!
                targetZ = 1.38 + Math.random() * 0.82;
              } else if (gameData.pz < 2.35 && rollDepth < 0.65) {
                // Deep Baseline Lob / Corner Smash over net-crowding player!
                targetZ = 4.35 + Math.random() * 1.45;
              } else {
                targetZ = 2.15 + Math.random() * 3.55;
              }

              const baseAiFlight =
                currentDiff === 'nightmare'
                  ? 0.82
                  : currentDiff === 'extreme'
                    ? 0.9
                    : currentDiff === 'spicy'
                      ? 1.02
                      : currentDiff === 'breezy'
                        ? 1.15
                        : 1.28;
              const aiFlight = isAiSpike ? baseAiFlight * 0.84 : baseAiFlight;

              launchBallToTarget(
                targetX,
                targetZ,
                aiFlight,
                'ai',
                isAiSpike,
                false
              );
              if (isAiSpike) {
                crayonAudio.playRainbowSmash();
              } else {
                crayonAudio.playBallPop(gameData.rallyCount, false);
              }
              spawnParticleBurst(
                gameData.bx,
                gameData.by,
                gameData.bz,
                isAiSpike ? 18 : 10,
                isAiSpike ? rainbowColors : activeSkinColors
              );
              propsRef.current.onRallyUpdate(
                gameData.rallyCount,
                false,
                8,
                false,
                false
              );
            }
          }

          // 4. Check Ground Touch (Point Scored!)
          const groundY = currentMod === 'big_ball' ? 0.62 : 0.42;
          if (gameData.by <= groundY) {
            gameData.by = groundY;
            crayonAudio.playBallFloorBounce(1.0);
            spawnParticleBurst(
              gameData.bx,
              0.2,
              gameData.bz,
              24,
              activeSkinColors
            );

            const landedOnPlayerSide = gameData.bz >= 0;
            const pointWinner: 'player' | 'ai' = landedOnPlayerSide
              ? 'ai'
              : 'player';

            crayonAudio.playPointScored(pointWinner === 'player');

            const reason =
              pointWinner === 'player'
                ? `${pCfg.name}'s team scored on ${a1Cfg.name}'s court!`
                : `${a1Cfg.name}'s team landed the ball on your court!`;

            propsRef.current.onCallout({
              text:
                pointWinner === 'player'
                  ? 'POINT FOR YOUR TEAM!'
                  : 'RIVAL SCORES!',
              subtext: reason,
              color: '#F8FAFC',
              bgHex: pointWinner === 'player' ? '#10B981' : '#E11D48',
              x: 50,
              y: 44,
            });

            gameData.phase = 'POINT_DELAY';
            gameData.pointDelayTimer = 1.15;
            propsRef.current.onPointFinished(pointWinner, reason);
          }
        } else if (gameData.phase === 'POINT_DELAY') {
          gameData.pointDelayTimer -= dt;
          gameData.by = 0.42 + Math.abs(Math.sin(elapsed * 6)) * 0.15;
          if (
            gameData.pointDelayTimer <= 0 &&
            propsRef.current.gameState === 'PLAYING'
          ) {
            setupServe(propsRef.current.servingSide);
          }
        }
      }

      // -------------------------------------------------------------------
      // 3. UPDATE ALL 4 HUMANOID RAGDOLL RIGS WITH SPRING-DAMPENED JIGGLE PHYSICS!
      // -------------------------------------------------------------------
      const updateRigAnim = (
        rig: CharacterRig | null,
        x: number,
        y: number,
        z: number,
        swingTimer: number,
        diveTimer: number,
        armDir: 1 | -1
      ) => {
        if (!rig) return;
        const prevX = rig.root.position.x;
        const prevY = rig.root.position.y;
        const prevZ = rig.root.position.z;
        const vxApprox = (x - prevX) / Math.max(dt, 0.008);
        const vyApprox = (y - prevY) / Math.max(dt, 0.008);
        const vzApprox = (z - prevZ) / Math.max(dt, 0.008);
        const moveSpeed = Math.min(8, Math.hypot(vxApprox, vzApprox));

        // Spring-Dampened Jiggle State stored on rig.root.userData
        const ud = rig.root.userData;
        if (ud.jiggleY === undefined) {
          ud.jiggleY = 0;
          ud.jiggleVelY = 0;
          ud.jiggleRoll = 0;
          ud.jiggleVelRoll = 0;
          ud.prevVx = 0;
          ud.prevVy = 0;
          ud.prevSwing = 0;
        }

        // Inject jiggle impulses on jump takeoff, landing, spike swing, and lateral direction changes!
        if (prevY <= 0.03 && y > 0.04) {
          ud.jiggleVelY += 4.2; // Stretch on takeoff
        } else if (prevY > 0.05 && y <= 0.03) {
          ud.jiggleVelY -= Math.min(5.0, Math.abs(ud.prevVy) * 0.45 + 2.4); // Squash on landing
        }
        if (ud.prevSwing <= 0 && swingTimer > 0) {
          ud.jiggleVelY += 3.5;
        }
        const dvx = vxApprox - ud.prevVx;
        if (Math.abs(dvx) > 1.5) {
          ud.jiggleVelRoll += THREE.MathUtils.clamp(-dvx * 0.38, -3.2, 3.2);
          ud.jiggleVelY -= Math.min(1.4, Math.abs(dvx) * 0.08);
        }
        ud.prevVx = vxApprox;
        ud.prevVy = vyApprox;
        ud.prevSwing = swingTimer;

        // Advance Spring-Damper Jiggle Oscillator
        ud.jiggleVelY += (-185 * ud.jiggleY - 10.2 * ud.jiggleVelY) * dt;
        ud.jiggleY = THREE.MathUtils.clamp(
          ud.jiggleY + ud.jiggleVelY * dt,
          -0.32,
          0.32
        );
        ud.jiggleVelRoll +=
          (-155 * ud.jiggleRoll - 9.2 * ud.jiggleVelRoll) * dt;
        ud.jiggleRoll = THREE.MathUtils.clamp(
          ud.jiggleRoll + ud.jiggleVelRoll * dt,
          -0.26,
          0.26
        );

        const idleOrRunJiggle =
          moveSpeed > 0.4 && y <= 0.08
            ? Math.sin(elapsed * (10 + moveSpeed * 1.5)) * 0.045
            : Math.sin(elapsed * 4.2) * 0.018;
        const totalJiggleY = ud.jiggleY + idleOrRunJiggle;

        rig.root.position.set(x, y, z);

        // Apply Elastic Squash & Stretch Jiggle to Torso & Belly
        const bodyScaleX = 1 - totalJiggleY * 0.23;
        const bodyScaleY = 1 + totalJiggleY * 0.31;
        const bodyScaleZ = 1 - totalJiggleY * 0.23;
        rig.bodyGroup.scale.set(bodyScaleX, bodyScaleY, bodyScaleZ);

        // Ragdoll Torso Pitch & Roll based on velocity, jump, dive, and jiggle roll
        const targetPitch =
          diveTimer > 0
            ? -0.78
            : y > 0.12
            ? Math.sin(elapsed * 10) * 0.16
            : THREE.MathUtils.clamp(vzApprox * 0.06, -0.28, 0.28);
        const targetRoll =
          THREE.MathUtils.clamp(-vxApprox * 0.065, -0.32, 0.32) +
          ud.jiggleRoll * 0.55;

        rig.bodyGroup.rotation.x = THREE.MathUtils.damp(
          rig.bodyGroup.rotation.x,
          targetPitch,
          9,
          dt
        );
        rig.bodyGroup.rotation.z = THREE.MathUtils.damp(
          rig.bodyGroup.rotation.z,
          targetRoll,
          9,
          dt
        );

        // Ragdoll Head Wobble & Lag + Secondary Jiggle Bounce
        if (rig.headGroup) {
          const headSquash = 1 - totalJiggleY * 0.15;
          const headStretch = 1 + totalJiggleY * 0.19;
          rig.headGroup.scale.set(headStretch, headSquash, headStretch);

          const headTargetX =
            swingTimer > 0
              ? -0.32
              : Math.sin(elapsed * 5.5) * 0.08 -
                targetPitch * 0.45 +
                totalJiggleY * 0.24;
          const headTargetZ =
            Math.cos(elapsed * 4.5) * 0.07 -
            targetRoll * 0.55 -
            ud.jiggleRoll * 0.65;
          rig.headGroup.rotation.x = THREE.MathUtils.damp(
            rig.headGroup.rotation.x,
            headTargetX,
            8,
            dt
          );
          rig.headGroup.rotation.z = THREE.MathUtils.damp(
            rig.headGroup.rotation.z,
            headTargetZ,
            8,
            dt
          );
        }

        // Ragdoll Floppy Arms
        if (swingTimer > 0) {
          rig.leftArm.rotation.x = 2.55 * armDir;
          rig.rightArm.rotation.x = 2.55 * armDir;
          rig.leftArm.rotation.z = -0.22;
          rig.rightArm.rotation.z = 0.22;
        } else if (
          rig === playerRig &&
          (currentState === 'TITLE_MENU' || currentState === 'CHARACTER_SELECT')
        ) {
          rig.leftArm.rotation.x = -0.22;
          rig.leftArm.rotation.z = -2.18 + Math.sin(elapsed * 5.2) * 0.18;
          rig.rightArm.rotation.x = -0.08 + Math.sin(elapsed * 2.4) * 0.05;
          rig.rightArm.rotation.z = 0.08;
        } else {
          const runSwing =
            (0.28 + moveSpeed * 0.14) * Math.sin(elapsed * (6 + moveSpeed * 1.4));
          const airFlail = y > 0.15 ? 1.85 : 0;
          rig.leftArm.rotation.x = THREE.MathUtils.damp(
            rig.leftArm.rotation.x,
            airFlail ? 2.1 * armDir : runSwing,
            9,
            dt
          );
          rig.rightArm.rotation.x = THREE.MathUtils.damp(
            rig.rightArm.rotation.x,
            airFlail ? 2.1 * armDir : -runSwing,
            9,
            dt
          );
          rig.leftArm.rotation.z = THREE.MathUtils.damp(
            rig.leftArm.rotation.z,
            -0.24 - Math.abs(targetRoll) * 0.6,
            9,
            dt
          );
          rig.rightArm.rotation.z = THREE.MathUtils.damp(
            rig.rightArm.rotation.z,
            0.24 + Math.abs(targetRoll) * 0.6,
            9,
            dt
          );
        }

        // Ragdoll Kicking Legs
        const stride =
          y > 0.15
            ? Math.sin(elapsed * 16) * 0.55
            : Math.sin(elapsed * (8 + moveSpeed * 1.6)) *
              (0.12 + moveSpeed * 0.08);
        rig.leftFoot.rotation.x = stride;
        rig.rightFoot.rotation.x = -stride;
        rig.leftFoot.position.y =
          0.1 + Math.max(0, Math.sin(elapsed * 12)) * (0.04 + moveSpeed * 0.015);
        rig.rightFoot.position.y =
          0.1 + Math.max(0, Math.cos(elapsed * 12)) * (0.04 + moveSpeed * 0.015);

        rig.shadowMesh.position.y = -y + 0.02;
        const sScale = Math.max(0.45, 1.0 - y * 0.22);
        rig.shadowMesh.scale.setScalar(sScale);

        if (rig.playerRing) {
          rig.playerRing.position.y = -y + 0.022;
          const rPulse = 1 + Math.sin(elapsed * 5) * 0.05;
          rig.playerRing.scale.setScalar(rPulse);
        }
      };

      if (gameData.pSwingTimer > 0) gameData.pSwingTimer -= dt;
      if (gameData.ptSwingTimer > 0) gameData.ptSwingTimer -= dt;
      if (gameData.a1SwingTimer > 0) gameData.a1SwingTimer -= dt;
      if (gameData.a2SwingTimer > 0) gameData.a2SwingTimer -= dt;

      updateRigAnim(
        playerRig,
        gameData.px,
        gameData.py,
        gameData.pz,
        gameData.pSwingTimer,
        gameData.pDiveTimer,
        -1
      );
      updateRigAnim(
        partnerRig,
        gameData.ptx,
        gameData.pty,
        gameData.ptz,
        gameData.ptSwingTimer,
        0,
        -1
      );
      updateRigAnim(
        aiRig1,
        gameData.a1x,
        gameData.a1y,
        gameData.a1z,
        gameData.a1SwingTimer,
        0,
        1
      );
      updateRigAnim(
        aiRig2,
        gameData.a2x,
        gameData.a2y,
        gameData.a2z,
        gameData.a2SwingTimer,
        0,
        1
      );

      // Update Volleyball, Spring Jiggle, Shadow & Indicating Landing Circle
      gameData.ballJiggleVel +=
        (-210 * gameData.ballJiggle - 11.5 * gameData.ballJiggleVel) * dt;
      gameData.ballJiggle = THREE.MathUtils.clamp(
        gameData.ballJiggle + gameData.ballJiggleVel * dt,
        -0.3,
        0.3
      );
      const baseBallScale = currentMod === 'big_ball' ? 1.5 : 1.0;
      vBall.ballGroup.position.set(gameData.bx, gameData.by, gameData.bz);
      vBall.ballGroup.scale.set(
        baseBallScale * (1 - gameData.ballJiggle * 0.22),
        baseBallScale * (1 + gameData.ballJiggle * 0.28),
        baseBallScale * (1 - gameData.ballJiggle * 0.22)
      );
      vBall.ballShadow.position.set(gameData.bx, 0.025, gameData.bz);
      const bShadowScale = Math.max(0.3, 1.15 - gameData.by * 0.14);
      vBall.ballShadow.scale.setScalar(bShadowScale);

      const ringX =
        gameData.phase === 'RALLY' ? gameData.landingX : gameData.bx;
      const ringZ =
        gameData.phase === 'RALLY' ? gameData.landingZ : gameData.bz;

      // Only show on OUR side (ringZ >= 0) AND hide in Hard/Extreme/Nightmare!
      const showTargetRing =
        currentState === 'PLAYING' &&
        (gameData.phase === 'RALLY' || gameData.phase === 'SERVE_WAIT') &&
        circleStyle !== 'off' &&
        currentDiff !== 'spicy' &&
        currentDiff !== 'extreme' &&
        currentDiff !== 'nightmare' &&
        ringZ >= 0;
      vBall.targetGroup.visible = showTargetRing;
      if (showTargetRing) {
        vBall.targetGroup.position.set(ringX, 0.022, ringZ);
        const pulse = 0.96 + Math.sin(elapsed * 8) * 0.06;
        vBall.targetGroup.scale.setScalar(pulse);

        // Classic Contact Indicator (Player Side Only):
        // ONLY the circular edge is visible at low opacity — RED (#EF4444) when not in contact, GREEN (#22C55E) when in contact!
        const pDist = Math.hypot(gameData.px - ringX, gameData.pz - ringZ);
        const ptDist = propsRef.current.is2v2
          ? Math.hypot(gameData.ptx - ringX, gameData.ptz - ringZ)
          : 999;
        const inContact = Math.min(pDist, ptDist) <= 1.25;

        if (circleStyle === 'neon') {
          vBall.outerRingMat.color.setHex(inContact ? 0x38bdf8 : 0xf43f5e);
          vBall.outerRingMat.opacity = 0.42;
        } else {
          vBall.outerRingMat.color.setHex(inContact ? 0x22c55e : 0xef4444);
          vBall.outerRingMat.opacity = 0.42;
        }
      }

      // Update Ball Trail (Zero yellow!)
      for (let t = TRAIL_COUNT - 1; t > 0; t--) {
        trailHistory[t].x = trailHistory[t - 1].x;
        trailHistory[t].y = trailHistory[t - 1].y;
        trailHistory[t].z = trailHistory[t - 1].z;
      }
      trailHistory[0].x = gameData.bx;
      trailHistory[0].y = gameData.by;
      trailHistory[0].z = gameData.bz;

      for (let t = 0; t < TRAIL_COUNT; t++) {
        const pt = trailHistory[t];
        const s =
          vfxEnabled && currentState === 'PLAYING' && gameData.phase === 'RALLY'
            ? (1 - t / TRAIL_COUNT) *
              (gameData.isSuperSmash
                ? 1.55
                : gameData.isRainbowSmash
                  ? 1.15
                  : 0.65)
            : 0.0001;
        _dummyParticle.position.set(pt.x, pt.y, pt.z);
        _dummyParticle.scale.setScalar(s);
        _dummyParticle.updateMatrix();
        trailInstanced.setMatrixAt(t, _dummyParticle.matrix);
        _tempColor.setHex(
          gameData.isRainbowSmash || isBombMode
            ? rainbowColors[t % rainbowColors.length]
            : activeSkinColors[t % activeSkinColors.length]
        );
        trailInstanced.setColorAt(t, _tempColor);
      }
      trailInstanced.instanceMatrix.needsUpdate = true;
      if (trailInstanced.instanceColor) {
        trailInstanced.instanceColor.needsUpdate = true;
      }

      // Update 3D Particles ONLY when active particles exist (120 FPS optimization!)
      if (activeParticleCount > 0) {
        for (let i = 0; i < MAX_PARTICLES; i++) {
          const p = particles[i];
          if (p.active && vfxEnabled) {
            p.life += dt;
            if (p.life >= p.maxLife) {
              p.active = false;
              activeParticleCount = Math.max(0, activeParticleCount - 1);
              _dummyParticle.position.set(0, -20, 0);
              _dummyParticle.scale.setScalar(0.0001);
            } else {
              p.x += p.vx * dt;
              p.y += p.vy * dt;
              p.z += p.vz * dt;
              p.vy += effGravity * 0.5 * dt;
              const fade = 1 - p.life / p.maxLife;
              _dummyParticle.position.set(p.x, Math.max(0.05, p.y), p.z);
              _dummyParticle.rotation.set(p.life * 4, p.life * 3, 0);
              _dummyParticle.scale.setScalar(p.scale * fade);
              _tempColor.setHex(p.colorHex);
              particleInstanced.setColorAt(i, _tempColor);
            }
          } else {
            _dummyParticle.position.set(0, -20, 0);
            _dummyParticle.scale.setScalar(0.0001);
          }
          _dummyParticle.updateMatrix();
          particleInstanced.setMatrixAt(i, _dummyParticle.matrix);
        }
        particleInstanced.instanceMatrix.needsUpdate = true;
        if (particleInstanced.instanceColor) {
          particleInstanced.instanceColor.needsUpdate = true;
        }
      }

      // -------------------------------------------------------------------
      // 5. SMOOTH CAMERA CHOREOGRAPHY (PC/DESKTOP & LANDSCAPE vs PORTRAIT MOBILE)
      // -------------------------------------------------------------------
      if (currentState === 'CHARACTER_SELECT') {
        const isWideMenu = aspect >= 1.02;
        if (!isWideMenu) {
          // Frame character + podium cleanly in the upper open window above the bottom customize sheet on portrait mobile
          _camGoalPos.set(0.0, 0.96, 4.45 + portraitFactor * 0.28);
          _camGoalLook.set(0.0, 0.42, 0);
        } else {
          _camGoalPos.set(0.0, 0.96, 3.65);
          _camGoalLook.set(0.0, 0.66, 0);
        }
      } else if (currentState === 'PROFILE') {
        _camGoalPos.set(0.0, 1.15, 3.85);
        _camGoalLook.set(0.0, 0.75, 0);
      } else if (
        currentState === 'MODE_SELECT' &&
        currentMode !== 'obstacle_rush' &&
        currentMode !== 'floor_is_lava'
      ) {
        // Live 3D Arena Camera in Mode Select (adapts to portrait and landscape)
        _camGoalPos.set(
          Math.sin(elapsed * 0.25) * 2.2,
          6.8 + portraitFactor * 2.0,
          12.6 + portraitFactor * 4.2
        );
        _camGoalLook.set(0.0, 1.1, -1.5);
      } else if (
        currentState === 'TITLE_MENU' ||
        currentState === 'MODE_SELECT' ||
        currentState === 'SETTINGS'
      ) {
        const isWideMenu = aspect >= 1.02;
        if (!isWideMenu) {
          // Frame 3D Hero cleanly in the center window between top logo and bottom action stack on portrait phones
          _camGoalPos.set(0.0, 0.94, 4.25 + portraitFactor * 0.28);
          _camGoalLook.set(0.0, 0.62, 0.0);
        } else {
          _camGoalPos.set(0.0, 0.90, 3.45);
          _camGoalLook.set(0.0, 0.66, 0.0);
        }
      } else {
        // Permanent Locked Follow Camera View — automatically pulls back on portrait phones & tablets so full court width is visible!
        _camGoalPos.set(
          gameData.px * (0.55 - portraitFactor * 0.15),
          5.4 + portraitFactor * 1.9,
          gameData.pz + 6.4 + portraitFactor * 3.9
        );
        _camGoalLook.set(
          gameData.bx * (0.4 - portraitFactor * 0.1),
          1.4 - portraitFactor * 0.2,
          gameData.bz * 0.35
        );
      }

      const shakeAmp =
        shakeEnabled &&
        currentState === 'PLAYING' &&
        gameData.pSwingTimer > 0.22 &&
        (gameData.isRainbowSmash || gameData.isSuperSmash)
          ? (gameData.pSwingTimer - 0.22) * 0.45
          : 0;
      const shakeX = shakeAmp > 0 ? Math.sin(elapsed * 55) * shakeAmp : 0;
      const shakeY = shakeAmp > 0 ? Math.cos(elapsed * 48) * shakeAmp : 0;

      camera.position.x =
        THREE.MathUtils.damp(
          camera.position.x,
          _camGoalPos.x,
          5.5,
          dt
        ) + shakeX;
      camera.position.y =
        THREE.MathUtils.damp(
          camera.position.y,
          _camGoalPos.y,
          5.5,
          dt
        ) + shakeY;
      camera.position.z = THREE.MathUtils.damp(
        camera.position.z,
        _camGoalPos.z,
        5.5,
        dt
      );

      _currentLook.x = THREE.MathUtils.damp(
        _currentLook.x,
        _camGoalLook.x,
        7.0,
        dt
      );
      _currentLook.y = THREE.MathUtils.damp(
        _currentLook.y,
        _camGoalLook.y,
        7.0,
        dt
      );
      _currentLook.z = THREE.MathUtils.damp(
        _currentLook.z,
        _camGoalLook.z,
        7.0,
        dt
      );
      camera.lookAt(_currentLook);

      if (currentState === 'PLAYING') {
        netSyncAccum += dt;
        if (netSyncAccum >= 0.04) {
          netSyncAccum = 0;
          const mySlot = multiplayerClient.currentRoom?.slots.find(
            (s) => s.playerId === multiplayerClient.playerId
          );
          multiplayerClient.sendPlayerTick({
            slotIndex: mySlot?.slotIndex ?? 0,
            x: gameData.px,
            y: gameData.py,
            z: gameData.pz,
            vx: gameData.pvx,
            vy: gameData.pvy,
            vz: gameData.pvz,
            yaw: 0,
          });
        }
      }

      if (
        currentState === 'PLAYING' ||
        currentState === 'PAUSED' ||
        currentState === 'TOUR_MAP'
      ) {
        postPipeline.render();
      } else {
        renderer.render(scene, camera);
      }
    };

    reqId = requestAnimationFrame(animate);

    return () => {
      unsubRemoteTick();
      unsubRemoteEvent();
      cancelAnimationFrame(reqId);
      resizeObserver.disconnect();
      domElem.removeEventListener('pointerdown', onPointerDown);
      domElem.removeEventListener('wheel', onWheel);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      postPipeline.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div className="relative w-full h-full overflow-hidden">
      <div
        ref={canvasMountRef}
        className="w-full h-full cursor-pointer touch-none select-none"
        aria-label="Interactive 3D Volleyball World"
      />
      <div
        ref={joyContainerRef}
        style={{ display: 'none' }}
        className="pointer-events-none fixed z-20 -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-full border border-white/20 bg-white/[0.06] opacity-25 items-center justify-center"
      >
        <div
          ref={joyKnobRef}
          className="w-10 h-10 rounded-full bg-white/35 border border-white/40"
        />
      </div>
    </div>
  );
};
