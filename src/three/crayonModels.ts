import * as THREE from 'three';
import {
  CHARACTER_OUTFITS,
  CharacterConfig,
  CourtTheme,
  COURT_THEMES,
  CRAYON_CHARACTERS,
  FaceId,
  FloorIsLavaMapConfig,
  ObstacleRushMapConfig,
} from '../types/game';
import {
  addCrayonOutline,
  CRAYON_INK_HEX,
  createCourtFloorTexture,
  createCrayonToonMaterial,
  createCrayonWoodTexture,
  createLushGrassTurfTexture,
  createOutfitTorsoTexture,
  createSkinToonMaterial,
  createStylizedAirshipTexture,
  createStylizedRoofTileTexture,
  createStylizedSkyDomeTexture,
  createStylizedStoneWallTexture,
  createStylizedWaterTexture,
  createVolleyballTexture,
  createWaterfallStreamTexture,
  getContactShadowTexture,
  getToonGradientMap,
} from './crayonMaterials';

export interface CharacterRig {
  root: THREE.Group;
  bodyGroup: THREE.Group;
  headGroup: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  leftFoot: THREE.Group;
  rightFoot: THREE.Group;
  shadowMesh: THREE.Mesh;
  playerRing?: THREE.Mesh;
}

/**
 * Builds the 3D Chibi Humanoid Character matching Untitled Design.png
 * Supports customizable Outfits (hoodies, jerseys, coats, suits) and Faces (happy laugh, shades, star eyes, wink, etc.)
 */
export function createCrayonCharacter(
  config: CharacterConfig,
  maxAnisotropy: number = 4,
  facingZ: 1 | -1 = 1,
  isLocalPlayer: boolean = false
): CharacterRig {
  const root = new THREE.Group();
  const bodyGroup = new THREE.Group();
  bodyGroup.rotation.y = facingZ === 1 ? 0 : Math.PI;
  root.add(bodyGroup);

  const activeOutfitId = config.outfitId || config.defaultOutfit || 'crown_hoodie';
  const outfit =
    CHARACTER_OUTFITS.find((o) => o.id === activeOutfitId) || CHARACTER_OUTFITS[0];
  const activeFaceId: FaceId =
    config.faceId || config.defaultFace || 'happy_laugh';

  const primaryHex = config.outfitId ? outfit.primaryColor : config.primaryColor;
  const secondaryHex = config.outfitId
    ? outfit.secondaryColor
    : config.secondaryColor;

  // Smooth, grain-free 3D vinyl/toon skin so the character's face is crystal-clear!
  const skinMat = createSkinToonMaterial(config.skinTone || '#FFDFC4');
  const hoodieMat = createCrayonToonMaterial(primaryHex, maxAnisotropy, 1);
  const shortsMat = createCrayonToonMaterial(secondaryHex, maxAnisotropy, 1);
  const accentMat = createCrayonToonMaterial(config.accentColor, maxAnisotropy, 1);
  const whiteMat = createCrayonToonMaterial('#CBD5E1', maxAnisotropy, 1);
  const greenBrimMat = createCrayonToonMaterial(primaryHex, maxAnisotropy, 1);
  const redCapMat = createCrayonToonMaterial('#EF4444', maxAnisotropy, 1);
  const goldMat = createCrayonToonMaterial('#FACC15', maxAnisotropy, 1);
  const tongueMat = new THREE.MeshBasicMaterial({
    color: 0xfb7185,
    polygonOffset: true,
    polygonOffsetFactor: -4,
    polygonOffsetUnits: -4,
  });
  const darkMat = new THREE.MeshBasicMaterial({
    color: CRAYON_INK_HEX,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });
  const pupilDarkMat = new THREE.MeshBasicMaterial({
    color: CRAYON_INK_HEX,
    polygonOffset: true,
    polygonOffsetFactor: -5,
    polygonOffsetUnits: -5,
  });
  const eyeWhiteMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });
  const shineWhiteMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    polygonOffset: true,
    polygonOffsetFactor: -8,
    polygonOffsetUnits: -8,
  });
  const teethWhiteMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    polygonOffset: true,
    polygonOffsetFactor: -4,
    polygonOffsetUnits: -4,
  });
  const cheekMat = new THREE.MeshBasicMaterial({
    color: config.cheekColor,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });
  const cyanGlowMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    polygonOffset: true,
    polygonOffsetFactor: -3,
    polygonOffsetUnits: -3,
  });

  // =========================================================================
  // 1. SPORTY SHORTS WAIST & PELVIS (y = 0.365)
  // =========================================================================
  const hipsGeo = new THREE.CylinderGeometry(0.228, 0.212, 0.14, 24);
  const hipsMesh = new THREE.Mesh(hipsGeo, shortsMat);
  hipsMesh.position.y = 0.365;
  hipsMesh.castShadow = true;
  hipsMesh.receiveShadow = true;
  addCrayonOutline(hipsMesh, 0.035);
  bodyGroup.add(hipsMesh);

  // Crisp White Undershirt Hem Ring peeking between hoodie and shorts
  const underHemGeo = new THREE.TorusGeometry(0.218, 0.018, 10, 28);
  const underHemMesh = new THREE.Mesh(underHemGeo, whiteMat);
  underHemMesh.rotation.x = Math.PI / 2;
  underHemMesh.position.y = 0.412;
  addCrayonOutline(underHemMesh, 0.025);
  bodyGroup.add(underHemMesh);

  // =========================================================================
  // 2. SCULPTED ONE-PIECE CHIBI HOODIE TORSO (y = 0.41..0.935)
  // =========================================================================
  const torsoTex = createOutfitTorsoTexture(
    primaryHex,
    outfit.emblemType,
    outfit.accentColor,
    maxAnisotropy
  );
  const torsoPrintedMat = new THREE.MeshToonMaterial({
    color: 0xffffff,
    map: torsoTex,
    gradientMap: getToonGradientMap(),
  });

  // Smooth organic chibi hoodie silhouette from waist hem (0.41) to neck (0.935)
  // phiStart = Math.PI places u = 0.5 straight forward (+Z) with zero chest seams!
  const torsoProfile = [
    new THREE.Vector2(0.01, 0.41),
    new THREE.Vector2(0.215, 0.415),
    new THREE.Vector2(0.244, 0.435), // Ribbed waistband hem
    new THREE.Vector2(0.252, 0.49),  // Cozy lower hoodie tummy
    new THREE.Vector2(0.254, 0.58),  // Plump chibi torso
    new THREE.Vector2(0.242, 0.69),  // Mid chest
    new THREE.Vector2(0.222, 0.78),  // Upper chest
    new THREE.Vector2(0.188, 0.85),  // Smooth rounded shoulder slope
    new THREE.Vector2(0.145, 0.90),  // Collar base
    new THREE.Vector2(0.11, 0.935),  // Neck joint
  ];
  const torsoGeo = new THREE.LatheGeometry(torsoProfile, 32, Math.PI, Math.PI * 2);
  const torsoMesh = new THREE.Mesh(torsoGeo, torsoPrintedMat);
  torsoMesh.castShadow = true;
  torsoMesh.receiveShadow = true;
  addCrayonOutline(torsoMesh, 0.036);
  bodyGroup.add(torsoMesh);

  // Sculpted 3D Neck Cylinder connecting Collar to Head
  const neckMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.105, 0.118, 0.1, 16),
    skinMat
  );
  neckMesh.position.set(0, 0.93, 0);
  bodyGroup.add(neckMesh);

  // Sculpted 3D Hoodie Collar Ring around neck
  const collarGeo = new THREE.TorusGeometry(0.152, 0.04, 12, 28);
  const collarMesh = new THREE.Mesh(collarGeo, hoodieMat);
  collarMesh.rotation.x = Math.PI / 2 + 0.12;
  collarMesh.position.set(0, 0.895, 0.012);
  addCrayonOutline(collarMesh, 0.03);
  bodyGroup.add(collarMesh);

  // Cozy 3D Folded Hood resting behind the neck & upper back
  const backHoodMesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.16, 18, 14),
    hoodieMat
  );
  backHoodMesh.scale.set(1.22, 0.62, 0.85);
  backHoodMesh.position.set(0, 0.865, -0.105);
  backHoodMesh.rotation.x = -0.25;
  addCrayonOutline(backHoodMesh, 0.032);
  bodyGroup.add(backHoodMesh);

  // Crisp 3D White Hoodie Drawstrings + Aglet Tips on front of chest
  const stringGeo = new THREE.CapsuleGeometry(0.013, 0.105, 6, 8);
  const agletGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.026, 8);
  [-0.056, 0.056].forEach((sx) => {
    const str = new THREE.Mesh(stringGeo, whiteMat);
    str.position.set(sx, 0.79, 0.244);
    str.rotation.x = -0.08;
    addCrayonOutline(str, 0.028);
    bodyGroup.add(str);

    const aglet = new THREE.Mesh(agletGeo, goldMat);
    aglet.position.set(sx, 0.722, 0.249);
    aglet.rotation.x = -0.08;
    bodyGroup.add(aglet);
  });

  // =========================================================================
  // 3. SCULPTED 3D HEAD SHAPES & EXPRESSIVE CRYSTAL-CLEAR 3D FACE (y = 0.94)
  // Supports: 'round' | 'bean' | 'squircle' | 'mochi' | 'angular'
  // =========================================================================
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 0.94, 0);
  bodyGroup.add(headGroup);

  const activeHeadShape = config.headShape || 'round';
  const headGeo = new THREE.SphereGeometry(0.32, 36, 28);
  const posAttr = headGeo.attributes.position;

  let earOffsetX = 0.326;
  let faceFrontZ = 0.008;

  for (let i = 0; i < posAttr.count; i++) {
    const vx = posAttr.getX(i);
    const vy = posAttr.getY(i);
    const vz = posAttr.getZ(i);
    const nx = vx / 0.32;
    const ny = vy / 0.32;
    const nz = vz / 0.32;

    if (activeHeadShape === 'squircle') {
      // Smooth Vinyl-Toy Rounded Cube (3D Squircle via L-3.6 norm blend)
      const p = 3.6;
      const lNorm =
        Math.pow(
          Math.pow(Math.abs(nx), p) +
            Math.pow(Math.abs(ny), p) +
            Math.pow(Math.abs(nz), p),
          1 / p
        ) || 1;
      const blend = 0.68;
      const sx = THREE.MathUtils.lerp(nx, nx / lNorm, blend) * 0.305;
      const sy = THREE.MathUtils.lerp(ny, ny / lNorm, blend) * 0.295;
      const sz = THREE.MathUtils.lerp(nz, nz / lNorm, blend) * 0.305;
      posAttr.setXYZ(i, sx, sy, sz);
      earOffsetX = 0.314;
      faceFrontZ = -0.004;
    } else if (activeHeadShape === 'bean') {
      // Stumble-Bean / Pear Capsule Silhouette (Taller crown, wider lower cheeks)
      const cheekWiden = ny < 0 ? 1.0 + Math.abs(ny) * 0.14 : 1.0 - ny * 0.12;
      posAttr.setXYZ(
        i,
        vx * 0.95 * cheekWiden,
        vy * 1.13,
        vz * 0.98 * (ny < 0 ? 1.04 : 0.96)
      );
      earOffsetX = 0.312;
      faceFrontZ = 0.01;
    } else if (activeHeadShape === 'mochi') {
      // Wide Squishy Mochi / Dumpling Cheeks
      const lowerPuff = ny < 0.15 ? 1.0 + Math.max(0, 0.15 - ny) * 0.16 : 0.95;
      posAttr.setXYZ(i, vx * 1.14 * lowerPuff, vy * 0.92, vz * 1.02);
      earOffsetX = 0.366;
      faceFrontZ = 0.014;
    } else if (activeHeadShape === 'angular') {
      // Sporty Sculpted Cheekbones & Tapered V-Jaw
      const jawTaper =
        ny < -0.15
          ? 1.0 - Math.min(0.32, Math.abs(ny + 0.15) * 0.36)
          : 1.0 + Math.max(0, 0.25 - Math.abs(ny)) * 0.08;
      posAttr.setXYZ(
        i,
        vx * 1.03 * jawTaper,
        vy * 1.04,
        vz * (ny < -0.2 ? 1.04 : 1.0)
      );
      earOffsetX = 0.334;
      faceFrontZ = 0.012;
    }
  }
  posAttr.needsUpdate = true;
  headGeo.computeVertexNormals();

  const headMesh = new THREE.Mesh(headGeo, skinMat);
  headMesh.position.set(0, 0.28, 0);
  headMesh.castShadow = true;
  headMesh.receiveShadow = false;
  addCrayonOutline(headMesh, 0.036);
  headGroup.add(headMesh);

  // Cute Chibi Ears + Warm Inner Ear Dimple adjusted automatically to headShape width!
  const earGeo = new THREE.SphereGeometry(0.074, 14, 12);
  const innerEarMat = new THREE.MeshBasicMaterial({ color: 0xe5987d });
  [-1, 1].forEach((side) => {
    const ear = new THREE.Mesh(earGeo, skinMat);
    ear.position.set(side * earOffsetX, 0.272, 0);
    ear.scale.set(0.55, 1.0, 0.8);
    addCrayonOutline(ear, 0.035);
    headGroup.add(ear);

    const innerEar = new THREE.Mesh(
      new THREE.SphereGeometry(0.036, 10, 8),
      innerEarMat
    );
    innerEar.position.set(side * (earOffsetX + 0.004), 0.272, 0.042);
    innerEar.scale.set(0.5, 0.85, 0.4);
    headGroup.add(innerEar);
  });

  // Cute Sculpted 3D Button Nose (No dark outline hull so mobile depth never smudges between eyes!)
  const noseMesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.022, 12, 10),
    skinMat
  );
  noseMesh.scale.set(1.1, 0.85, 0.9);
  noseMesh.position.set(0, 0.232, 0.336 + faceFrontZ);
  headGroup.add(noseMesh);

  // Rosy Blush Cheeks with Crisp Visibility & Mobile Depth Clearance
  [-1, 1].forEach((side) => {
    const cheek = new THREE.Mesh(
      new THREE.SphereGeometry(0.044, 14, 10),
      cheekMat
    );
    cheek.scale.set(1.28, 0.7, 0.48);
    cheek.position.set(side * 0.178, 0.212, 0.296 + faceFrontZ);
    cheek.rotation.y = side * 0.46;
    headGroup.add(cheek);
  });

  // -------------------------------------------------------------------------
  // FACE EXPRESSIONS (Positioned cleanly with mobile WebGL depth clearance!)
  // -------------------------------------------------------------------------
  const showShades =
    activeFaceId === 'cool_shades' ||
    (config.hatStyle === 'shades' && !config.faceId);
  const showVisor = activeFaceId === 'cyber_visor';

  if (showShades) {
    // Cool Black Pro Sunglasses + White Specular Rim
    [-1, 1].forEach((side) => {
      const lens = new THREE.Mesh(
        new THREE.BoxGeometry(0.142, 0.084, 0.04),
        darkMat
      );
      lens.position.set(side * 0.104, 0.278, 0.342 + faceFrontZ);
      lens.rotation.y = side * 0.18;
      addCrayonOutline(lens, 0.032, 0xffffff);
      headGroup.add(lens);
    });
    const bridge = new THREE.Mesh(
      new THREE.BoxGeometry(0.068, 0.022, 0.03),
      darkMat
    );
    bridge.position.set(0, 0.288, 0.35 + faceFrontZ);
    headGroup.add(bridge);
  } else if (showVisor) {
    // Glowing Cyan Holo-Visor
    const visorBar = new THREE.Mesh(
      new THREE.BoxGeometry(0.35, 0.086, 0.048),
      cyanGlowMat
    );
    visorBar.position.set(0, 0.278, 0.34 + faceFrontZ);
    addCrayonOutline(visorBar, 0.032);
    headGroup.add(visorBar);
  } else {
    // Big Expressive Cartoon Eyes (Generous Z-layer offset prevents mobile Z-fighting!)
    const scleraGeo = new THREE.SphereGeometry(0.062, 18, 16);
    const pupilGeo = new THREE.SphereGeometry(0.041, 16, 14);
    const shineGeo = new THREE.SphereGeometry(0.017, 10, 10);
    const smallShineGeo = new THREE.SphereGeometry(0.009, 8, 8);

    [-1, 1].forEach((side) => {
      // Check if winking on right eye
      if (activeFaceId === 'cheeky_wink' && side === 1) {
        const winkArc = new THREE.Mesh(
          new THREE.TorusGeometry(0.046, 0.013, 10, 18, Math.PI),
          darkMat
        );
        winkArc.position.set(side * 0.106, 0.268, 0.334 + faceFrontZ);
        winkArc.rotation.y = side * 0.22;
        headGroup.add(winkArc);
      } else {
        // Crisp Dark Cartoon Eyeliner Rim (FrontSide backing so mobile GPUs never Z-fight BackSide!)
        const scleraRim = new THREE.Mesh(scleraGeo, darkMat);
        scleraRim.position.set(side * 0.106, 0.272, 0.312 + faceFrontZ);
        scleraRim.scale.set(1.16, 1.26, 0.42);
        scleraRim.rotation.y = side * 0.22;
        headGroup.add(scleraRim);

        // White Eye Sclera cleanly in front of Eyeliner Rim
        const sclera = new THREE.Mesh(scleraGeo, eyeWhiteMat);
        sclera.position.set(side * 0.106, 0.272, 0.324 + faceFrontZ);
        sclera.scale.set(1.0, 1.12, 0.46);
        sclera.rotation.y = side * 0.22;
        headGroup.add(sclera);

        const pupilMat = activeFaceId === 'star_eyes' ? goldMat : pupilDarkMat;
        const pupil = new THREE.Mesh(pupilGeo, pupilMat);
        pupil.position.set(side * 0.106, 0.272, 0.348 + faceFrontZ);
        pupil.scale.set(1.0, 1.1, 0.42);
        pupil.rotation.y = side * 0.22;
        headGroup.add(pupil);

        // Big Top-Right White Specular Catchlight
        const shine1 = new THREE.Mesh(shineGeo, shineWhiteMat);
        shine1.position.set(side * 0.106 + 0.014, 0.292, 0.368 + faceFrontZ);
        headGroup.add(shine1);

        // Small Bottom-Left Specular Catchlight
        const shine2 = new THREE.Mesh(smallShineGeo, shineWhiteMat);
        shine2.position.set(side * 0.106 - 0.013, 0.252, 0.366 + faceFrontZ);
        headGroup.add(shine2);
      }

      // Expressive Bold Eyebrows (Positioned cleanly above eyes with open forehead above!)
      const brow = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.013, 0.058, 6, 8),
        darkMat
      );
      const browTilt =
        activeFaceId === 'fierce_pro' ? side * 0.26 : -side * 0.14;
      brow.rotation.z = Math.PI / 2 + browTilt;
      brow.rotation.y = side * 0.22;
      brow.position.set(side * 0.106, 0.348, 0.322 + faceFrontZ);
      headGroup.add(brow);
    });
  }

  // Mouth + Teeth + Tongue (Distinct Z layers + polygonOffset for zero mobile Z-fighting)
  if (activeFaceId === 'shock_rally') {
    const oMouth = new THREE.Mesh(
      new THREE.SphereGeometry(0.046, 14, 12),
      darkMat
    );
    oMouth.position.set(0, 0.165, 0.324 + faceFrontZ);
    oMouth.scale.set(0.92, 1.1, 0.46);
    headGroup.add(oMouth);
  } else {
    // Wide Happy Laughing Mouth Cavity
    const mouthMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.074, 18, 14),
      darkMat
    );
    mouthMesh.position.set(0, 0.168, 0.316 + faceFrontZ);
    mouthMesh.scale.set(1.24, 0.78, 0.44);
    headGroup.add(mouthMesh);

    // Clean One-Piece Upper Teeth Bar
    const teethBar = new THREE.Mesh(
      new THREE.BoxGeometry(0.068, 0.022, 0.024),
      teethWhiteMat
    );
    teethBar.position.set(0, 0.196, 0.342 + faceFrontZ);
    headGroup.add(teethBar);

    // Cute Curved Pink Tongue
    const tongueMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.036, 12, 10),
      tongueMat
    );
    tongueMesh.scale.set(1.12, 0.65, 0.54);
    tongueMesh.position.set(
      activeFaceId === 'cheeky_wink' ? 0.016 : 0,
      0.144,
      0.34 + faceFrontZ
    );
    headGroup.add(tongueMesh);
  }

  // -------------------------------------------------------------------------
  // 3B. SCULPTED 3D BEARDS & MUSTACHES (Viking Braided Beard & Boss Chef Beard)
  // -------------------------------------------------------------------------
  const hasVikingBeard =
    activeFaceId === 'viking_beard' ||
    (config.hatStyle === 'viking' && !config.faceId);
  const hasChefBeard =
    activeFaceId === 'chef_beard' ||
    (config.hatStyle === 'burger' && !config.faceId);

  if (hasVikingBeard) {
    const vikingBeardMat = createCrayonToonMaterial('#B45309', maxAnisotropy, 1);
    const darkGingerMat = createCrayonToonMaterial('#92400E', maxAnisotropy, 1);

    // Sweeping Handlebar Mustache right under nose
    [-1, 1].forEach((side) => {
      const stacheWing = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.032, 0.11, 8, 12),
        vikingBeardMat
      );
      stacheWing.position.set(side * 0.072, 0.198, 0.328 + faceFrontZ);
      stacheWing.rotation.z = Math.PI / 2 + side * 0.28;
      stacheWing.rotation.y = -side * 0.22;
      addCrayonOutline(stacheWing, 0.026);
      headGroup.add(stacheWing);
    });

    // Full Lush Lower Jaw Beard Base
    const mainBeard = new THREE.Mesh(
      new THREE.SphereGeometry(0.185, 20, 16),
      darkGingerMat
    );
    mainBeard.scale.set(1.28, 0.92, 0.85);
    mainBeard.position.set(0, 0.055, 0.225 + faceFrontZ);
    addCrayonOutline(mainBeard, 0.032);
    headGroup.add(mainBeard);

    // Sideburn Cheek Puffs connecting beard to temples
    [-1, 1].forEach((side) => {
      const sideburn = new THREE.Mesh(
        new THREE.SphereGeometry(0.105, 14, 12),
        vikingBeardMat
      );
      sideburn.scale.set(0.75, 1.15, 0.82);
      sideburn.position.set(side * 0.215, 0.145, 0.195 + faceFrontZ);
      addCrayonOutline(sideburn, 0.028);
      headGroup.add(sideburn);

      // Twin Braided Viking Beard Tails + Golden Beard Rings
      const braid = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.044, 0.12, 8, 12),
        vikingBeardMat
      );
      braid.position.set(side * 0.088, -0.065, 0.275 + faceFrontZ);
      braid.rotation.z = -side * 0.14;
      braid.rotation.x = -0.15;
      addCrayonOutline(braid, 0.028);
      headGroup.add(braid);

      const beardRing = new THREE.Mesh(
        new THREE.TorusGeometry(0.046, 0.013, 8, 16),
        goldMat
      );
      beardRing.rotation.x = Math.PI / 2 - 0.15;
      beardRing.position.set(side * 0.092, -0.095, 0.282 + faceFrontZ);
      addCrayonOutline(beardRing, 0.02);
      headGroup.add(beardRing);
    });
  } else if (hasChefBeard) {
    const chefBeardMat = createCrayonToonMaterial('#451A03', maxAnisotropy, 1);

    // Thick Curled Grill-Master Handlebar Mustache
    [-1, 1].forEach((side) => {
      const stache = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.03, 0.105, 8, 12),
        chefBeardMat
      );
      stache.position.set(side * 0.068, 0.2, 0.332 + faceFrontZ);
      stache.rotation.z = Math.PI / 2 + side * 0.22;
      stache.rotation.y = -side * 0.2;
      addCrayonOutline(stache, 0.026);
      headGroup.add(stache);

      // Upward curled mustache tip
      const curlTip = new THREE.Mesh(
        new THREE.SphereGeometry(0.028, 10, 10),
        chefBeardMat
      );
      curlTip.position.set(side * 0.135, 0.205, 0.312 + faceFrontZ);
      addCrayonOutline(curlTip, 0.022);
      headGroup.add(curlTip);
    });

    // Sculpted Rounded Chin Beard / Goatee
    const chinGoatee = new THREE.Mesh(
      new THREE.SphereGeometry(0.115, 16, 14),
      chefBeardMat
    );
    chinGoatee.scale.set(1.18, 0.85, 0.72);
    chinGoatee.position.set(0, 0.065, 0.265 + faceFrontZ);
    addCrayonOutline(chinGoatee, 0.028);
    headGroup.add(chinGoatee);
  }

  // =========================================================================
  // 4. SCULPTED 3D HAIR & PRO HEADGEAR (High above forehead — Zero Face Overlap!)
  // =========================================================================
  const headgearGroup = new THREE.Group();
  headgearGroup.position.set(0, 0.28, 0);
  if (activeHeadShape === 'bean') {
    headgearGroup.scale.set(0.96, 1.11, 0.98);
  } else if (activeHeadShape === 'squircle') {
    headgearGroup.scale.set(0.98, 0.96, 0.98);
  } else if (activeHeadShape === 'mochi') {
    headgearGroup.scale.set(1.13, 0.93, 1.02);
  } else if (activeHeadShape === 'angular') {
    headgearGroup.scale.set(1.03, 1.04, 1.01);
  }
  headGroup.add(headgearGroup);

  const hairHex =
    config.id === 'viking_beard'
      ? '#B45309'
      : config.id === 'gold_king' || config.id === 'pineapple_king'
        ? '#78350F'
        : config.id === 'pink_visor' || config.id === 'strawberry_kid'
          ? '#881337'
          : config.id === 'astro_bean'
            ? '#1E3A8A'
            : config.id === 'red_cap' ||
                config.id === 'pirate_capt' ||
                config.id === 'burger_chef'
              ? '#451A03'
              : '#2B1B14';
  const hairMat = createCrayonToonMaterial(hairHex, maxAnisotropy, 1);
  const navyCapMat = createCrayonToonMaterial('#1E293B', maxAnisotropy, 1);
  const rubyMat = createCrayonToonMaterial('#EF4444', maxAnisotropy, 1);

  // Smooth Back-Crown Hair Dome for open/bandana/headband styles (No protruding cones!)
  const hasFullCapOrHelmet =
    config.hatStyle === 'baseball_cap' ||
    config.hatStyle === 'ears_hood' ||
    config.hatStyle === 'visor' ||
    config.hatStyle === 'astronaut' ||
    config.hatStyle === 'viking' ||
    config.hatStyle === 'burger' ||
    config.hatStyle === 'strawberry' ||
    config.hatStyle === 'pineapple';

  if (!hasFullCapOrHelmet) {
    // Clean Upper-Crown Hair Tuft (Never protrudes down the back like a dark rectangle!)
    const hairCrownPuff = new THREE.Mesh(
      new THREE.SphereGeometry(0.285, 22, 16),
      hairMat
    );
    hairCrownPuff.scale.set(0.96, 0.52, 0.88);
    hairCrownPuff.position.set(0, 0.195, 0.01);
    addCrayonOutline(hairCrownPuff, 0.024);
    headgearGroup.add(hairCrownPuff);
  }

  // Helper: Builds a Smoothly Curved 3D Baseball Cap Visor Brim (High above eyebrows!)
  const createCurvedCapVisor = (
    topMaterial: THREE.Material,
    underMaterial: THREE.Material,
    direction: 'forward' | 'backward' = 'forward'
  ): THREE.Group => {
    const visorRoot = new THREE.Group();
    const archSegments = 9;
    const archSpan = 0.34;
    for (let i = 0; i < archSegments; i++) {
      const u = i / (archSegments - 1) - 0.5;
      const angle = u * 0.95;
      const segWidth = 0.068;
      const segDepth = 0.165 * (1 - Math.abs(u) * 0.32);
      const vx = Math.sin(angle) * (archSpan * 0.56);
      const vy = Math.cos(angle) * 0.038 - 0.02;
      const vz = Math.cos(angle) * 0.055;

      const topSeg = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.016, segDepth, 8, 10),
        topMaterial
      );
      topSeg.rotation.x = Math.PI / 2 + 0.04;
      topSeg.rotation.z = -angle * 0.62;
      topSeg.scale.set(segWidth / 0.034, 1, 0.62);
      topSeg.position.set(vx, vy, vz);
      if (i % 2 === 0) addCrayonOutline(topSeg, 0.022);
      visorRoot.add(topSeg);

      const underSeg = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.013, segDepth * 0.92, 6, 8),
        underMaterial
      );
      underSeg.rotation.x = Math.PI / 2 + 0.04;
      underSeg.rotation.z = -angle * 0.62;
      underSeg.scale.set(segWidth / 0.03, 1, 0.48);
      underSeg.position.set(vx, vy - 0.011, vz - 0.004);
      visorRoot.add(underSeg);
    }

    if (direction === 'forward') {
      visorRoot.position.set(0, 0.165, 0.292);
      visorRoot.rotation.x = -0.04;
    } else {
      visorRoot.position.set(0, 0.105, -0.312);
      visorRoot.rotation.y = Math.PI;
      visorRoot.rotation.x = 0.08;
    }
    return visorRoot;
  };

  // Helper: Builds a Multi-Point 3D Royal Golden Crown with Jewels
  const createRoyalCrown3D = (scale: number = 1.0): THREE.Group => {
    const crownGrp = new THREE.Group();
    crownGrp.scale.setScalar(scale);

    // Golden Base Circlet Ring
    const baseBand = new THREE.Mesh(
      new THREE.CylinderGeometry(0.185, 0.165, 0.075, 24),
      goldMat
    );
    baseBand.position.y = 0.038;
    addCrayonOutline(baseBand, 0.03);
    crownGrp.add(baseBand);

    const lowerRim = new THREE.Mesh(
      new THREE.TorusGeometry(0.172, 0.02, 10, 24),
      goldMat
    );
    lowerRim.rotation.x = Math.PI / 2;
    lowerRim.position.y = 0.005;
    addCrayonOutline(lowerRim, 0.025);
    crownGrp.add(lowerRim);

    // Inner Royal Velvet Cushion
    const cushion = new THREE.Mesh(
      new THREE.SphereGeometry(0.155, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.5),
      rubyMat
    );
    cushion.position.y = 0.02;
    crownGrp.add(cushion);

    // 5 Sculpted Golden Crown Spires + Pearl Tips + Gems
    const numPoints = 5;
    for (let i = 0; i < numPoints; i++) {
      const a = (i / numPoints) * Math.PI * 2;
      const px = Math.sin(a) * 0.165;
      const pz = Math.cos(a) * 0.165;

      const spire = new THREE.Mesh(
        new THREE.ConeGeometry(0.052, 0.125, 10),
        goldMat
      );
      spire.position.set(px, 0.125, pz);
      spire.rotation.x = Math.cos(a) * 0.14;
      spire.rotation.z = -Math.sin(a) * 0.14;
      addCrayonOutline(spire, 0.028);
      crownGrp.add(spire);

      const pearl = new THREE.Mesh(
        new THREE.SphereGeometry(0.024, 10, 10),
        whiteMat
      );
      pearl.position.set(px * 1.08, 0.19, pz * 1.08);
      addCrayonOutline(pearl, 0.022);
      crownGrp.add(pearl);

      const gemMat = i % 2 === 0 ? rubyMat : cyanGlowMat;
      const gem = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.024, 0),
        gemMat
      );
      gem.position.set(Math.sin(a) * 0.184, 0.038, Math.cos(a) * 0.184);
      crownGrp.add(gem);
    }

    return crownGrp;
  };

  if (config.hatStyle === 'baseball_cap') {
    // Signature Closed-Crown Street Snapback Cap (Zero open hemisphere back cut-edge!)
    const capDome = new THREE.Mesh(
      new THREE.SphereGeometry(0.324, 28, 20),
      navyCapMat
    );
    capDome.scale.set(1.02, 0.56, 1.03);
    capDome.position.set(0, 0.215, 0.0);
    capDome.rotation.x = -0.05;
    addCrayonOutline(capDome, 0.03);
    headgearGroup.add(capDome);

    // Fitted Sweatband Rim high on upper forehead (dy = +0.16, well above eyebrows!)
    const capRimBand = new THREE.Mesh(
      new THREE.TorusGeometry(0.308, 0.022, 12, 32),
      greenBrimMat
    );
    capRimBand.rotation.x = Math.PI / 2 - 0.05;
    capRimBand.position.set(0, 0.155, 0.0);
    addCrayonOutline(capRimBand, 0.026);
    headgearGroup.add(capRimBand);

    // Top Crown Button Stud
    const topButton = new THREE.Mesh(
      new THREE.SphereGeometry(0.032, 12, 10),
      greenBrimMat
    );
    topButton.position.set(0, 0.39, -0.01);
    addCrayonOutline(topButton, 0.024);
    headgearGroup.add(topButton);

    // Mini 3D Golden Crown Badge Pin on the Front of the Cap
    const frontPin = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.034, 0),
      goldMat
    );
    frontPin.scale.set(1.2, 0.88, 0.52);
    frontPin.position.set(0, 0.235, 0.295);
    addCrayonOutline(frontPin, 0.022);
    headgearGroup.add(frontPin);

    // Sculpted Curved 3D Forward Visor Brim (Clean back silhouette in Follow Cam!)
    const forwardCurvedVisor = createCurvedCapVisor(
      greenBrimMat,
      navyCapMat,
      'forward'
    );
    headgearGroup.add(forwardCurvedVisor);
  } else if (config.hatStyle === 'ears_hood') {
    // Plush Neko/Beast Closed-Crown Street Hoodie Cap seated cleanly above forehead
    const hoodDome = new THREE.Mesh(
      new THREE.SphereGeometry(0.326, 28, 18),
      hoodieMat
    );
    hoodDome.scale.set(1.02, 0.56, 1.03);
    hoodDome.position.set(0, 0.215, 0.0);
    hoodDome.rotation.x = -0.05;
    addCrayonOutline(hoodDome, 0.03);
    headgearGroup.add(hoodDome);

    const hoodRim = new THREE.Mesh(
      new THREE.TorusGeometry(0.31, 0.022, 12, 32),
      hoodieMat
    );
    hoodRim.rotation.x = Math.PI / 2 - 0.05;
    hoodRim.position.set(0, 0.155, 0.0);
    addCrayonOutline(hoodRim, 0.025);
    headgearGroup.add(hoodRim);

    // Sculpted 3D Cat Ears with Pink Inner Ear Cushions
    [-1, 1].forEach((s) => {
      const outerEar = new THREE.Mesh(
        new THREE.ConeGeometry(0.102, 0.175, 14),
        hoodieMat
      );
      outerEar.position.set(s * 0.21, 0.34, 0.01);
      outerEar.rotation.z = -s * 0.34;
      addCrayonOutline(outerEar, 0.032);
      headgearGroup.add(outerEar);

      const innerPink = new THREE.Mesh(
        new THREE.ConeGeometry(0.056, 0.105, 10),
        cheekMat
      );
      innerPink.position.set(s * 0.21, 0.335, 0.052);
      innerPink.rotation.z = -s * 0.34;
      headgearGroup.add(innerPink);
    });
  } else if (config.hatStyle === 'visor') {
    // Pro Forward Baseball Cap with Closed Ellipsoid Crown
    const capDome = new THREE.Mesh(
      new THREE.SphereGeometry(0.324, 28, 20),
      hoodieMat
    );
    capDome.scale.set(1.02, 0.56, 1.03);
    capDome.position.set(0, 0.215, 0.0);
    capDome.rotation.x = -0.05;
    addCrayonOutline(capDome, 0.03);
    headgearGroup.add(capDome);

    const sweatband = new THREE.Mesh(
      new THREE.TorusGeometry(0.308, 0.022, 12, 32),
      whiteMat
    );
    sweatband.rotation.x = Math.PI / 2 - 0.05;
    sweatband.position.set(0, 0.155, 0);
    addCrayonOutline(sweatband, 0.025);
    headgearGroup.add(sweatband);

    const topStud = new THREE.Mesh(
      new THREE.SphereGeometry(0.03, 12, 10),
      whiteMat
    );
    topStud.position.set(0, 0.39, -0.01);
    addCrayonOutline(topStud, 0.022);
    headgearGroup.add(topStud);

    // True Curved Forward Baseball Cap Brim (High above eyebrows!)
    const forwardVisor = createCurvedCapVisor(
      whiteMat,
      navyCapMat,
      'forward'
    );
    headgearGroup.add(forwardVisor);
  } else if (config.hatStyle === 'headband') {
    // Smooth Sculpted Crown Hair + Crisp Pro Athletic Headband high on forehead!
    const band = new THREE.Mesh(
      new THREE.TorusGeometry(0.306, 0.028, 12, 32),
      whiteMat
    );
    band.rotation.x = Math.PI / 2 - 0.06;
    band.position.set(0, 0.155, 0.002);
    addCrayonOutline(band, 0.028);
    headgearGroup.add(band);

    // Accent Stripe on Headband
    const bandStripe = new THREE.Mesh(
      new THREE.TorusGeometry(0.31, 0.01, 8, 32),
      hoodieMat
    );
    bandStripe.rotation.x = Math.PI / 2 - 0.06;
    bandStripe.position.set(0, 0.155, 0.002);
    headgearGroup.add(bandStripe);

    // Smooth Rounded Anime Hair Puffs on Top (Cohesive rounded tufts, never sharp cones)
    [
      { x: 0, y: 0.31, z: 0.02, rx: -0.22, rz: 0, sx: 1.15, sy: 0.9, sz: 1.2 },
      { x: -0.1, y: 0.29, z: -0.01, rx: -0.18, rz: 0.32, sx: 0.95, sy: 0.85, sz: 1.05 },
      { x: 0.1, y: 0.29, z: -0.01, rx: -0.18, rz: -0.32, sx: 0.95, sy: 0.85, sz: 1.05 },
    ].forEach((pf) => {
      const puff = new THREE.Mesh(
        new THREE.SphereGeometry(0.11, 14, 12),
        hairMat
      );
      puff.position.set(pf.x, pf.y, pf.z);
      puff.rotation.set(pf.rx, 0, pf.rz);
      puff.scale.set(pf.sx, pf.sy, pf.sz);
      addCrayonOutline(puff, 0.026);
      headgearGroup.add(puff);
    });
  } else if (config.hatStyle === 'pirate') {
    // FINN: Fitted Crimson Pirate Bandana Cap + Classic Bicorne Captain Hat (Closed dome!)
    const bandanaSkullCap = new THREE.Mesh(
      new THREE.SphereGeometry(0.324, 26, 18),
      rubyMat
    );
    bandanaSkullCap.scale.set(1.02, 0.55, 1.02);
    bandanaSkullCap.position.set(0, 0.21, 0);
    addCrayonOutline(bandanaSkullCap, 0.028);
    headgearGroup.add(bandanaSkullCap);

    const bandanaRim = new THREE.Mesh(
      new THREE.TorusGeometry(0.308, 0.024, 12, 32),
      rubyMat
    );
    bandanaRim.rotation.x = Math.PI / 2 - 0.05;
    bandanaRim.position.set(0, 0.155, 0.0);
    addCrayonOutline(bandanaRim, 0.026);
    headgearGroup.add(bandanaRim);

    // Sculpted Rounded Captain Hat Crown & Gold Trim Band (No dark rectangular bar!)
    const hatCrown = new THREE.Mesh(
      new THREE.CylinderGeometry(0.31, 0.29, 0.15, 24),
      navyCapMat
    );
    hatCrown.scale.set(1.18, 1.0, 0.82);
    hatCrown.position.set(0, 0.275, 0.01);
    addCrayonOutline(hatCrown, 0.03);
    headgearGroup.add(hatCrown);

    const goldTrimRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.305, 0.022, 10, 28),
      goldMat
    );
    goldTrimRing.scale.set(1.18, 0.82, 1.0);
    goldTrimRing.rotation.x = Math.PI / 2;
    goldTrimRing.position.set(0, 0.34, 0.01);
    addCrayonOutline(goldTrimRing, 0.022);
    headgearGroup.add(goldTrimRing);

    // Golden Captain Medallion on Front Center
    const skullMedallion = new THREE.Mesh(
      new THREE.SphereGeometry(0.048, 14, 12),
      goldMat
    );
    skullMedallion.scale.set(1.15, 1.15, 0.45);
    skullMedallion.position.set(0, 0.27, 0.265);
    addCrayonOutline(skullMedallion, 0.024);
    headgearGroup.add(skullMedallion);
  } else if (config.hatStyle === 'crown') {
    // Plush Round Bear Ears + Multi-Point Jeweled 3D Royal Golden Crown!
    [-1, 1].forEach((s) => {
      const bearEar = new THREE.Mesh(
        new THREE.SphereGeometry(0.094, 16, 14),
        hoodieMat
      );
      bearEar.position.set(s * 0.24, 0.285, 0.01);
      addCrayonOutline(bearEar, 0.032);
      headgearGroup.add(bearEar);

      const innerBear = new THREE.Mesh(
        new THREE.SphereGeometry(0.05, 12, 10),
        cheekMat
      );
      innerBear.position.set(s * 0.24, 0.285, 0.066);
      innerBear.scale.set(0.85, 0.85, 0.4);
      headgearGroup.add(innerBear);
    });

    const crown3D = createRoyalCrown3D(0.85);
    crown3D.position.set(0, 0.295, 0.01);
    headgearGroup.add(crown3D);
  } else if (config.hatStyle === 'shades') {
    // Full Royal 5-Point Jeweled Golden Crown seated cleanly on top of head!
    const royalCrown = createRoyalCrown3D(1.0);
    royalCrown.position.set(0, 0.29, 0.0);
    headgearGroup.add(royalCrown);
  } else if (config.hatStyle === 'astronaut') {
    // NOVA: Sleek Closed-Crown Galactic Space Cadet Cap + Starlight Visor Brim + Upper Winglet Fins!
    const cadetCapDome = new THREE.Mesh(
      new THREE.SphereGeometry(0.324, 28, 20),
      navyCapMat
    );
    cadetCapDome.scale.set(1.02, 0.56, 1.03);
    cadetCapDome.position.set(0, 0.215, 0.0);
    cadetCapDome.rotation.x = -0.05;
    addCrayonOutline(cadetCapDome, 0.03);
    headgearGroup.add(cadetCapDome);

    // Crisp Cyan-Blue Galactic Band Rim high on forehead
    const astroRimBand = new THREE.Mesh(
      new THREE.TorusGeometry(0.308, 0.023, 12, 32),
      cyanGlowMat
    );
    astroRimBand.rotation.x = Math.PI / 2 - 0.05;
    astroRimBand.position.set(0, 0.155, 0);
    addCrayonOutline(astroRimBand, 0.025);
    headgearGroup.add(astroRimBand);

    // Forward Curved Starlight Cap Visor
    const astroVisor = createCurvedCapVisor(
      cyanGlowMat,
      navyCapMat,
      'forward'
    );
    headgearGroup.add(astroVisor);

    // Golden Star Emblem Badge on Front of Space Cadet Cap
    const starBadge = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.044, 0),
      goldMat
    );
    starBadge.scale.set(1.25, 1.0, 0.48);
    starBadge.position.set(0, 0.245, 0.295);
    addCrayonOutline(starBadge, 0.024);
    headgearGroup.add(starBadge);

    // Sleek Upper-Crown Aero Winglets
    [-1, 1].forEach((s) => {
      const wingFin = new THREE.Mesh(
        new THREE.ConeGeometry(0.058, 0.16, 10),
        goldMat
      );
      wingFin.position.set(s * 0.245, 0.305, -0.03);
      wingFin.rotation.z = -s * 0.45;
      wingFin.rotation.x = -0.22;
      addCrayonOutline(wingFin, 0.026);
      headgearGroup.add(wingFin);
    });
  } else if (config.hatStyle === 'viking') {
    // BJORN: Iron & Bronze Norse Horned Viking Helmet (Closed Dome!)
    const ironHelmMat = createCrayonToonMaterial('#475569', maxAnisotropy, 1);
    const hornIvoryMat = createCrayonToonMaterial('#FEF3C7', maxAnisotropy, 1);

    const helmDome = new THREE.Mesh(
      new THREE.SphereGeometry(0.326, 28, 20),
      ironHelmMat
    );
    helmDome.scale.set(1.02, 0.56, 1.03);
    helmDome.position.set(0, 0.215, 0.0);
    helmDome.rotation.x = -0.05;
    addCrayonOutline(helmDome, 0.03);
    headgearGroup.add(helmDome);

    // Golden Norse Brow Band
    const browBand = new THREE.Mesh(
      new THREE.TorusGeometry(0.312, 0.026, 12, 32),
      goldMat
    );
    browBand.rotation.x = Math.PI / 2 - 0.05;
    browBand.position.set(0, 0.155, 0);
    addCrayonOutline(browBand, 0.026);
    headgearGroup.add(browBand);

    // Curved Ivory Viking Horns with Golden Base Sockets
    [-1, 1].forEach((s) => {
      const hornSocket = new THREE.Mesh(
        new THREE.CylinderGeometry(0.058, 0.068, 0.055, 12),
        goldMat
      );
      hornSocket.position.set(s * 0.285, 0.24, 0.01);
      hornSocket.rotation.z = -s * 0.72;
      addCrayonOutline(hornSocket, 0.024);
      headgearGroup.add(hornSocket);

      const hornBase = new THREE.Mesh(
        new THREE.ConeGeometry(0.056, 0.22, 14),
        hornIvoryMat
      );
      hornBase.position.set(s * 0.38, 0.335, 0.015);
      hornBase.rotation.z = -s * 0.42;
      hornBase.rotation.x = 0.12;
      addCrayonOutline(hornBase, 0.028);
      headgearGroup.add(hornBase);
    });
  } else if (config.hatStyle === 'burger') {
    // BURGER BOSS: Giant 3D Double-Cheeseburger Sesame Hat!
    const bunMat = createCrayonToonMaterial('#F59E0B', maxAnisotropy, 1);
    const pattyMat = createCrayonToonMaterial('#78350F', maxAnisotropy, 1);
    const cheeseMat = createCrayonToonMaterial('#FACC15', maxAnisotropy, 1);
    const lettuceMat = createCrayonToonMaterial('#22C55E', maxAnisotropy, 1);
    const tomatoMat = createCrayonToonMaterial('#EF4444', maxAnisotropy, 1);
    const sesameMat = createCrayonToonMaterial('#FEF3C7', maxAnisotropy, 1);

    const bottomBun = new THREE.Mesh(
      new THREE.CylinderGeometry(0.32, 0.295, 0.065, 24),
      bunMat
    );
    bottomBun.position.set(0, 0.175, 0);
    addCrayonOutline(bottomBun, 0.028);
    headgearGroup.add(bottomBun);

    const lettuceRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.305, 0.032, 10, 24),
      lettuceMat
    );
    lettuceRing.rotation.x = Math.PI / 2;
    lettuceRing.position.set(0, 0.215, 0);
    addCrayonOutline(lettuceRing, 0.025);
    headgearGroup.add(lettuceRing);

    const patty = new THREE.Mesh(
      new THREE.CylinderGeometry(0.33, 0.33, 0.072, 24),
      pattyMat
    );
    patty.position.set(0, 0.258, 0);
    addCrayonOutline(patty, 0.028);
    headgearGroup.add(patty);

    const cheeseSlice = new THREE.Mesh(
      new THREE.BoxGeometry(0.46, 0.024, 0.46),
      cheeseMat
    );
    cheeseSlice.position.set(0, 0.298, 0);
    cheeseSlice.rotation.y = Math.PI / 4;
    addCrayonOutline(cheeseSlice, 0.022);
    headgearGroup.add(cheeseSlice);

    const tomatoRing = new THREE.Mesh(
      new THREE.CylinderGeometry(0.285, 0.285, 0.032, 20),
      tomatoMat
    );
    tomatoRing.position.set(0, 0.318, 0);
    headgearGroup.add(tomatoRing);

    const topBun = new THREE.Mesh(
      new THREE.SphereGeometry(0.315, 24, 16),
      bunMat
    );
    topBun.scale.set(1.0, 0.56, 1.0);
    topBun.position.set(0, 0.36, 0);
    addCrayonOutline(topBun, 0.03);
    headgearGroup.add(topBun);

    [
      { x: 0, y: 0.54, z: 0.08 },
      { x: -0.12, y: 0.51, z: 0.14 },
      { x: 0.12, y: 0.51, z: 0.14 },
      { x: -0.16, y: 0.49, z: -0.04 },
      { x: 0.16, y: 0.49, z: -0.04 },
      { x: 0, y: 0.52, z: -0.14 },
    ].forEach((seedPos) => {
      const seed = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.012, 0.022, 6, 8),
        sesameMat
      );
      seed.position.set(seedPos.x, seedPos.y, seedPos.z);
      seed.rotation.x = Math.PI / 2;
      headgearGroup.add(seed);
    });
  } else if (config.hatStyle === 'strawberry') {
    // BERRY: Juicy 3D Strawberry Fruit Cap (Closed Dome!)
    const berryRedMat = createCrayonToonMaterial('#F43F5E', maxAnisotropy, 1);
    const leafGreenMat = createCrayonToonMaterial('#22C55E', maxAnisotropy, 1);
    const seedGoldMat = createCrayonToonMaterial('#FEF08A', maxAnisotropy, 1);

    const berryDome = new THREE.Mesh(
      new THREE.SphereGeometry(0.326, 28, 20),
      berryRedMat
    );
    berryDome.scale.set(1.02, 0.56, 1.03);
    berryDome.position.set(0, 0.215, 0.0);
    berryDome.rotation.x = -0.05;
    addCrayonOutline(berryDome, 0.03);
    headgearGroup.add(berryDome);

    const berryRim = new THREE.Mesh(
      new THREE.TorusGeometry(0.31, 0.024, 12, 32),
      berryRedMat
    );
    berryRim.rotation.x = Math.PI / 2 - 0.05;
    berryRim.position.set(0, 0.155, 0);
    addCrayonOutline(berryRim, 0.025);
    headgearGroup.add(berryRim);

    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + 0.2;
      const seed = new THREE.Mesh(
        new THREE.SphereGeometry(0.018, 8, 8),
        seedGoldMat
      );
      seed.scale.set(0.8, 1.3, 0.6);
      seed.position.set(
        Math.sin(a) * 0.295,
        0.245 + (i % 2) * 0.045,
        Math.cos(a) * 0.295
      );
      headgearGroup.add(seed);
    }

    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const leaf = new THREE.Mesh(
        new THREE.ConeGeometry(0.075, 0.18, 8),
        leafGreenMat
      );
      leaf.scale.set(1.1, 1.0, 0.35);
      leaf.position.set(Math.sin(a) * 0.13, 0.385, Math.cos(a) * 0.13);
      leaf.rotation.y = a;
      leaf.rotation.x = Math.PI * 0.38;
      addCrayonOutline(leaf, 0.024);
      headgearGroup.add(leaf);
    }

    const stem = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.022, 0.09, 8, 10),
      leafGreenMat
    );
    stem.position.set(0, 0.44, 0);
    stem.rotation.z = 0.22;
    addCrayonOutline(stem, 0.024);
    headgearGroup.add(stem);
  } else if (config.hatStyle === 'pineapple') {
    // PINE: Tropical Golden Pineapple Cap (Closed Dome!)
    const pineGoldMat = createCrayonToonMaterial('#EAB308', maxAnisotropy, 1);
    const pineAmberMat = createCrayonToonMaterial('#CA8A04', maxAnisotropy, 1);
    const frondGreenMat = createCrayonToonMaterial('#16A34A', maxAnisotropy, 1);
    const frondLimeMat = createCrayonToonMaterial('#4ADE80', maxAnisotropy, 1);

    const pineDome = new THREE.Mesh(
      new THREE.SphereGeometry(0.326, 24, 18),
      pineGoldMat
    );
    pineDome.scale.set(1.02, 0.56, 1.03);
    pineDome.position.set(0, 0.215, 0.0);
    pineDome.rotation.x = -0.05;
    addCrayonOutline(pineDome, 0.03);
    headgearGroup.add(pineDome);

    // Quilted Pineapple Rim Band
    const pineRim = new THREE.Mesh(
      new THREE.TorusGeometry(0.31, 0.025, 12, 24),
      pineAmberMat
    );
    pineRim.rotation.x = Math.PI / 2 - 0.06;
    pineRim.position.set(0, 0.15, 0);
    addCrayonOutline(pineRim, 0.026);
    headgearGroup.add(pineRim);

    // Diamond Pineapple Scale Studs around Cap
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const stud = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.028, 0),
        pineAmberMat
      );
      stud.position.set(
        Math.sin(a) * 0.295,
        0.24 + (i % 2) * 0.04,
        Math.cos(a) * 0.295
      );
      headgearGroup.add(stud);
    }

    // Lush Tropical Pineapple Leaf Crown on Top (Inner + Outer Fronds)
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const outerFrond = new THREE.Mesh(
        new THREE.ConeGeometry(0.068, 0.22, 8),
        frondGreenMat
      );
      outerFrond.scale.set(1.0, 1.0, 0.38);
      outerFrond.position.set(Math.sin(a) * 0.09, 0.43, Math.cos(a) * 0.09);
      outerFrond.rotation.y = a;
      outerFrond.rotation.x = 0.48;
      addCrayonOutline(outerFrond, 0.026);
      headgearGroup.add(outerFrond);
    }
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + 0.4;
      const innerFrond = new THREE.Mesh(
        new THREE.ConeGeometry(0.055, 0.25, 8),
        frondLimeMat
      );
      innerFrond.scale.set(1.0, 1.0, 0.38);
      innerFrond.position.set(Math.sin(a) * 0.04, 0.48, Math.cos(a) * 0.04);
      innerFrond.rotation.y = a;
      innerFrond.rotation.x = 0.22;
      addCrayonOutline(innerFrond, 0.024);
      headgearGroup.add(innerFrond);
    }
  }

  // =========================================================================
  // 5. ARTICULATED CHIBI ARMS (Shoulder -> Curved Sleeve -> Cuff -> Hand & Fingers)
  // =========================================================================
  const buildChibiArm = (side: -1 | 1): THREE.Group => {
    const armPivot = new THREE.Group();
    armPivot.position.set(side * 0.205, 0.815, 0.01);

    // Seamless Rounded Shoulder Cap
    const shoulderCap = new THREE.Mesh(
      new THREE.SphereGeometry(0.076, 14, 12),
      hoodieMat
    );
    shoulderCap.position.set(side * 0.01, -0.01, 0);
    addCrayonOutline(shoulderCap, 0.035);
    armPivot.add(shoulderCap);

    // Upper Hoodie Sleeve
    const upperSleeve = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.072, 0.11, 10, 14),
      hoodieMat
    );
    upperSleeve.position.set(side * 0.052, -0.078, 0.006);
    upperSleeve.rotation.z = side * 0.34;
    upperSleeve.castShadow = true;
    addCrayonOutline(upperSleeve, 0.036);
    armPivot.add(upperSleeve);

    // Forearm Hoodie Sleeve (natural forward athletic bend)
    const forearmSleeve = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.068, 0.1, 10, 14),
      hoodieMat
    );
    forearmSleeve.position.set(side * 0.096, -0.175, 0.028);
    forearmSleeve.rotation.z = side * 0.22;
    forearmSleeve.rotation.x = -0.18;
    forearmSleeve.castShadow = true;
    addCrayonOutline(forearmSleeve, 0.036);
    armPivot.add(forearmSleeve);

    // Crisp White Ribbed Sleeve Cuff
    const cuff = new THREE.Mesh(
      new THREE.TorusGeometry(0.054, 0.022, 10, 20),
      whiteMat
    );
    cuff.position.set(side * 0.118, -0.238, 0.044);
    cuff.rotation.x = Math.PI / 2 - 0.18;
    cuff.rotation.y = side * 0.22;
    addCrayonOutline(cuff, 0.028);
    armPivot.add(cuff);

    // Plump 3D Chibi Palm
    const hand = new THREE.Mesh(
      new THREE.SphereGeometry(0.068, 16, 14),
      skinMat
    );
    hand.position.set(side * 0.132, -0.295, 0.058);
    hand.scale.set(0.88, 1.02, 0.78);
    hand.castShadow = true;
    addCrayonOutline(hand, 0.036);
    armPivot.add(hand);

    // Articulated Thumb
    const thumb = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.021, 0.028, 6, 8),
      skinMat
    );
    thumb.position.set(side * 0.088, -0.282, 0.095);
    thumb.rotation.z = -side * 0.55;
    thumb.rotation.x = 0.35;
    addCrayonOutline(thumb, 0.03);
    armPivot.add(thumb);

    // 3 Cute Sculpted Fingers
    const fingerGeo = new THREE.CapsuleGeometry(0.016, 0.026, 6, 8);
    [-0.022, 0, 0.022].forEach((fz, idx) => {
      const finger = new THREE.Mesh(fingerGeo, skinMat);
      finger.position.set(
        side * (0.132 - idx * 0.004),
        -0.348,
        0.058 + fz
      );
      finger.rotation.z = side * 0.12;
      addCrayonOutline(finger, 0.028);
      armPivot.add(finger);
    });

    return armPivot;
  };

  const leftArm = buildChibiArm(-1);
  const rightArm = buildChibiArm(1);
  bodyGroup.add(leftArm, rightArm);

  // =========================================================================
  // 6. SHORTS CUFFS, LEGS, CREW SOCKS & ROUNDED 3D HIGH-TOP SNEAKERS
  // =========================================================================
  const buildChibiLeg = (side: -1 | 1): THREE.Group => {
    const legGroup = new THREE.Group();
    legGroup.position.set(side * 0.118, 0.1, 0);

    // Tailored Athletic Shorts Leg Cuff (moves with each leg!)
    const shortLeg = new THREE.Mesh(
      new THREE.CylinderGeometry(0.104, 0.096, 0.135, 18),
      shortsMat
    );
    shortLeg.position.y = 0.205;
    shortLeg.castShadow = true;
    addCrayonOutline(shortLeg, 0.035);
    legGroup.add(shortLeg);

    // Crisp White Shorts Leg Bottom Trim Ring
    const shortTrim = new THREE.Mesh(
      new THREE.TorusGeometry(0.095, 0.012, 8, 20),
      whiteMat
    );
    shortTrim.rotation.x = Math.PI / 2;
    shortTrim.position.y = 0.14;
    legGroup.add(shortTrim);

    // White Athletic Side Stripe on Shorts Leg
    const sideStripe = new THREE.Mesh(
      new THREE.BoxGeometry(0.022, 0.125, 0.042),
      whiteMat
    );
    sideStripe.position.set(side * 0.098, 0.205, 0);
    legGroup.add(sideStripe);

    // Sturdy Chibi Knee / Calf
    const legMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.068, 0.062, 0.11, 16),
      skinMat
    );
    legMesh.position.y = 0.105;
    legMesh.castShadow = true;
    addCrayonOutline(legMesh, 0.035);
    legGroup.add(legMesh);

    // Crisp White Crew Sock + Sport Stripe
    const sock = new THREE.Mesh(
      new THREE.CylinderGeometry(0.068, 0.066, 0.075, 16),
      whiteMat
    );
    sock.position.y = 0.045;
    addCrayonOutline(sock, 0.028);
    legGroup.add(sock);

    const sockStripe = new THREE.Mesh(
      new THREE.TorusGeometry(0.067, 0.009, 8, 18),
      hoodieMat
    );
    sockStripe.rotation.x = Math.PI / 2;
    sockStripe.position.y = 0.072;
    legGroup.add(sockStripe);

    // High-Top Sneaker Ankle Collar
    const ankleCollar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.074, 0.078, 0.055, 18),
      hoodieMat
    );
    ankleCollar.position.set(0, 0.008, 0.008);
    addCrayonOutline(ankleCollar, 0.032);
    legGroup.add(ankleCollar);

    // Sculpted Rounded 3D Sneaker Upper (No boxy edges!)
    const shoeUpper = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.076, 0.085, 12, 18),
      hoodieMat
    );
    shoeUpper.rotation.x = Math.PI / 2;
    shoeUpper.scale.set(1.02, 0.85, 0.68);
    shoeUpper.position.set(0, -0.022, 0.036);
    shoeUpper.castShadow = true;
    addCrayonOutline(shoeUpper, 0.036);
    legGroup.add(shoeUpper);

    // Classic White Rounded Rubber Toe Cap
    const toeCap = new THREE.Mesh(
      new THREE.SphereGeometry(0.074, 16, 12),
      whiteMat
    );
    toeCap.scale.set(0.96, 0.56, 0.68);
    toeCap.position.set(0, -0.026, 0.088);
    addCrayonOutline(toeCap, 0.028);
    legGroup.add(toeCap);

    // Chunky White Sneaker Midsole
    const sole = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.082, 0.096, 12, 18),
      whiteMat
    );
    sole.rotation.x = Math.PI / 2;
    sole.scale.set(1.04, 0.92, 0.38);
    sole.position.set(0, -0.056, 0.038);
    addCrayonOutline(sole, 0.032);
    legGroup.add(sole);

    // Crisp White Shoe Laces across the Instep
    const laceGeo = new THREE.BoxGeometry(0.075, 0.016, 0.018);
    [
      { y: 0.004, z: 0.056 },
      { y: -0.008, z: 0.074 },
    ].forEach((lPos) => {
      const lace = new THREE.Mesh(laceGeo, whiteMat);
      lace.position.set(0, lPos.y, lPos.z);
      legGroup.add(lace);
    });

    return legGroup;
  };

  const leftFoot = buildChibiLeg(-1);
  const rightFoot = buildChibiLeg(1);
  bodyGroup.add(leftFoot, rightFoot);

  // Soft Ground Contact Shadow
  const shadowGeo = new THREE.PlaneGeometry(1.3, 1.3);
  const shadowMat = new THREE.MeshBasicMaterial({
    map: getContactShadowTexture(),
    transparent: true,
    depthWrite: false,
    opacity: 0.72,
  });
  const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
  shadowMesh.rotation.x = -Math.PI / 2;
  shadowMesh.position.y = 0.015;
  root.add(shadowMesh);

  // Hide permanent foot ring so only the classic Red/Green ball-contact indicating circle is shown
  let playerRing: THREE.Mesh | undefined;
  if (isLocalPlayer) {
    const ringGeo = new THREE.RingGeometry(0.46, 0.56, 36);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xa3e635,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.0,
      depthWrite: false,
    });
    playerRing = new THREE.Mesh(ringGeo, ringMat);
    playerRing.rotation.x = -Math.PI / 2;
    playerRing.position.y = 0.022;
    playerRing.visible = false;
    root.add(playerRing);
  }

  return {
    root,
    bodyGroup,
    headGroup,
    leftArm,
    rightArm,
    leftFoot,
    rightFoot,
    shadowMesh,
    playerRing,
  };
}

/**
 * Builds the Bright Blue Circular 3D Studio Podium matching Panel 2 ("CUSTOMIZE")
 */
export function createCharacterStudioPodium(maxAnisotropy: number = 4): THREE.Group {
  const group = new THREE.Group();

  const baseMat = createCrayonToonMaterial('#1D4ED8', maxAnisotropy, 1);
  const topMat = createCrayonToonMaterial('#38BDF8', maxAnisotropy, 1);
  const rimMat = new THREE.MeshBasicMaterial({ color: 0x93c5fd });

  const baseCyl = new THREE.Mesh(
    new THREE.CylinderGeometry(1.12, 1.24, 0.2, 40),
    baseMat
  );
  baseCyl.position.y = -0.12;
  baseCyl.receiveShadow = true;
  addCrayonOutline(baseCyl, 0.025);
  group.add(baseCyl);

  const topCyl = new THREE.Mesh(
    new THREE.CylinderGeometry(1.04, 1.1, 0.08, 40),
    topMat
  );
  topCyl.position.y = -0.02;
  topCyl.receiveShadow = true;
  group.add(topCyl);

  const glowRing = new THREE.Mesh(
    new THREE.TorusGeometry(1.07, 0.024, 12, 48),
    rimMat
  );
  glowRing.rotation.x = Math.PI / 2;
  glowRing.position.y = 0.015;
  group.add(glowRing);

  return group;
}

/**
 * Builds the Pastel Multi-Panel Volleyball & Classic Red/Green Contact Landing Target Circle!
 * - RED (#EF4444) when no player is in contact with the landing zone
 * - GREEN (#22C55E) when the player is in contact / ready to hit!
 */
export function createVolleyballSet(
  maxAnisotropy: number = 4,
  skinId: string = 'classic_pro'
) {
  const ballGroup = new THREE.Group();

  const ballGeo = new THREE.SphereGeometry(0.44, 32, 28);
  const ballTex = createVolleyballTexture(maxAnisotropy, skinId);
  const ballMat = new THREE.MeshToonMaterial({
    color: 0xffffff,
    map: ballTex,
    gradientMap: getToonGradientMap(),
  });

  const ballMesh = new THREE.Mesh(ballGeo, ballMat);
  ballMesh.castShadow = true;
  addCrayonOutline(ballMesh, 0.025, 0x1e3a8a);
  ballGroup.add(ballMesh);

  const bombCapGroup = new THREE.Group();
  const capMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.15, 0.1, 12),
    createCrayonToonMaterial('#EF4444', maxAnisotropy, 1)
  );
  capMesh.position.y = 0.44;
  bombCapGroup.add(capMesh);

  const sparkMesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.09, 10, 10),
    new THREE.MeshBasicMaterial({ color: 0xfacc15 })
  );
  sparkMesh.position.y = 0.56;
  bombCapGroup.add(sparkMesh);
  bombCapGroup.visible = false;
  ballGroup.add(bombCapGroup);

  const shadowGeo = new THREE.PlaneGeometry(1.15, 1.15);
  const shadowMat = new THREE.MeshBasicMaterial({
    map: getContactShadowTexture(),
    transparent: true,
    depthWrite: false,
    opacity: 0.65,
  });
  const ballShadow = new THREE.Mesh(shadowGeo, shadowMat);
  ballShadow.rotation.x = -Math.PI / 2;
  ballShadow.position.y = 0.025;

  // Classic Indicating Landing Circle on the Court Floor:
  // ONLY a low-opacity circular ring edge: RED (#EF4444) when not in contact, GREEN (#22C55E) when in contact!
  const targetGroup = new THREE.Group();
  targetGroup.renderOrder = 5;

  const innerGlowGeo = new THREE.CircleGeometry(0.6, 48);
  const innerGlowMat = new THREE.MeshBasicMaterial({
    color: 0xef4444,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.0,
    depthWrite: false,
  });
  const innerGlow = new THREE.Mesh(innerGlowGeo, innerGlowMat);
  innerGlow.rotation.x = -Math.PI / 2;
  innerGlow.position.y = 0.036;
  innerGlow.visible = false;
  targetGroup.add(innerGlow);

  const outerRingGeo = new THREE.RingGeometry(0.62, 0.75, 64);
  const outerRingMat = new THREE.MeshBasicMaterial({
    color: 0xef4444,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.46,
    depthWrite: false,
  });
  const outerRing = new THREE.Mesh(outerRingGeo, outerRingMat);
  outerRing.rotation.x = -Math.PI / 2;
  outerRing.position.y = 0.038;
  outerRing.renderOrder = 6;
  targetGroup.add(outerRing);

  const innerDotGeo = new THREE.CircleGeometry(0.15, 32);
  const innerDotMat = new THREE.MeshBasicMaterial({
    color: 0xef4444,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.0,
    depthWrite: false,
  });
  const innerDot = new THREE.Mesh(innerDotGeo, innerDotMat);
  innerDot.rotation.x = -Math.PI / 2;
  innerDot.position.y = 0.04;
  innerDot.visible = false;
  targetGroup.add(innerDot);

  return {
    ballGroup,
    ballMesh,
    ballMat,
    bombCapGroup,
    sparkMesh,
    sparkStar: sparkMesh,
    ballShadow,
    targetGroup,
    outerRingMat,
    innerGlowMat,
    innerDotMat,
  };
}

/**
 * Builds the Clean 3D Volleyball Net & Left-Sideline Referee High Chair
 * matching the Reference Image (Bottom-Right Panel)
 */
export function createVolleyballNet(
  theme: CourtTheme,
  maxAnisotropy: number = 4
): THREE.Group {
  const netGroup = new THREE.Group();
  const postMat = createCrayonToonMaterial(theme.postColor, maxAnisotropy, 1);
  const tapeMat = createCrayonToonMaterial('#FFFFFF', maxAnisotropy, 1);
  const netMat = createCrayonToonMaterial(theme.netColor, maxAnisotropy, 1);
  const darkSlateMat = createCrayonToonMaterial('#1E293B', maxAnisotropy, 1);

  const postGeo = new THREE.CylinderGeometry(0.11, 0.12, 2.38, 18);
  const postBasePlateGeo = new THREE.CylinderGeometry(0.24, 0.28, 0.07, 18);
  const capSphereGeo = new THREE.SphereGeometry(0.13, 14, 12);

  [-3.85, 3.85].forEach((x) => {
    const basePlate = new THREE.Mesh(postBasePlateGeo, darkSlateMat);
    basePlate.position.set(x, 0.035, 0);
    addCrayonOutline(basePlate, 0.025);
    netGroup.add(basePlate);

    const post = new THREE.Mesh(postGeo, postMat);
    post.position.set(x, 1.19, 0);
    post.castShadow = true;
    addCrayonOutline(post, 0.035);
    netGroup.add(post);

    const topCap = new THREE.Mesh(capSphereGeo, tapeMat);
    topCap.position.set(x, 2.4, 0);
    addCrayonOutline(topCap, 0.03);
    netGroup.add(topCap);
  });

  // Top Canvas Net Tape
  const topTape = new THREE.Mesh(
    new THREE.BoxGeometry(7.65, 0.13, 0.07),
    tapeMat
  );
  topTape.position.y = 2.16;
  topTape.castShadow = true;
  addCrayonOutline(topTape, 0.028);
  netGroup.add(topTape);

  // Bottom Canvas Net Tape
  const bottomTape = new THREE.Mesh(
    new THREE.BoxGeometry(7.65, 0.08, 0.05),
    tapeMat
  );
  bottomTape.position.y = 1.04;
  addCrayonOutline(bottomTape, 0.025);
  netGroup.add(bottomTape);

  // Vertical Side Tapes at x = ±3.6
  [-3.6, 3.6].forEach((sx) => {
    const sideBand = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 1.14, 0.06),
      tapeMat
    );
    sideBand.position.set(sx, 1.6, 0);
    addCrayonOutline(sideBand, 0.025);
    netGroup.add(sideBand);
  });

  // Crisp Interwoven Net Mesh Cords
  const vCordGeo = new THREE.CylinderGeometry(0.011, 0.011, 1.1, 6);
  for (let x = -3.5; x <= 3.5; x += 0.25) {
    const cord = new THREE.Mesh(vCordGeo, netMat);
    cord.position.set(x, 1.6, 0);
    netGroup.add(cord);
  }
  const hCordGeo = new THREE.CylinderGeometry(0.011, 0.011, 7.2, 6);
  for (let y = 1.18; y <= 2.04; y += 0.172) {
    const hCord = new THREE.Mesh(hCordGeo, netMat);
    hCord.rotation.z = Math.PI / 2;
    hCord.position.set(0, y, 0);
    netGroup.add(hCord);
  }

  // White Referee / Lifeguard High Chair on Left Sideline (matching Reference Bottom-Right Panel!)
  const refChair = new THREE.Group();
  const legGeo = new THREE.CylinderGeometry(0.045, 0.055, 1.85, 10);
  [
    [-0.26, -0.24],
    [0.26, -0.24],
    [-0.26, 0.24],
    [0.26, 0.24],
  ].forEach(([lx, lz]) => {
    const leg = new THREE.Mesh(legGeo, tapeMat);
    leg.position.set(lx, 0.92, lz);
    leg.castShadow = true;
    addCrayonOutline(leg, 0.028);
    refChair.add(leg);
  });

  const rungGeo = new THREE.CylinderGeometry(0.024, 0.024, 0.52, 8);
  [0.42, 0.88, 1.34].forEach((ry) => {
    const rung = new THREE.Mesh(rungGeo, tapeMat);
    rung.rotation.x = Math.PI / 2;
    rung.position.set(0.26, ry, 0);
    refChair.add(rung);
  });

  const seat = new THREE.Mesh(
    new THREE.BoxGeometry(0.66, 0.11, 0.6),
    tapeMat
  );
  seat.position.y = 1.86;
  seat.castShadow = true;
  addCrayonOutline(seat, 0.032);
  refChair.add(seat);

  const backrest = new THREE.Mesh(
    new THREE.BoxGeometry(0.11, 0.62, 0.6),
    postMat
  );
  backrest.position.set(-0.27, 2.2, 0);
  addCrayonOutline(backrest, 0.032);
  refChair.add(backrest);

  refChair.position.set(-4.4, 0, 0);
  netGroup.add(refChair);

  return netGroup;
}

/**
 * Helper to create a smooth 2D Rounded-Rectangle THREE.Shape for the Sculpted Diorama Island
 */
function createRoundedRectIslandShape(width: number, length: number, radius: number): THREE.Shape {
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
 * Builds a richly textured, comic-inked 3D Sky Vehicle ('biplane' or 'airship')
 * with aerodynamic ribbed hull texture, star roundel insignias, swept wings, tail fins,
 * cockpit canopy/gondola, and spinning 3D propellers! Never a plain blue blob!
 */
export function createStylizedSkyVehicle(
  variant: 'airship' | 'biplane' = 'biplane',
  baseHex: string = '#2563EB',
  stripeHex: string = '#FACC15',
  accentHex: string = '#EF4444',
  maxAnisotropy: number = 4
): { group: THREE.Group; propellers: THREE.Object3D[] } {
  const group = new THREE.Group();
  const propellers: THREE.Object3D[] = [];

  const hullTex = createStylizedAirshipTexture(baseHex, stripeHex, accentHex);
  hullTex.anisotropy = maxAnisotropy;
  const hullMat = createCrayonToonMaterial('#FFFFFF', maxAnisotropy, 1);
  hullMat.map = hullTex;

  const accentMat = createCrayonToonMaterial(accentHex, maxAnisotropy, 1);
  const goldMat = createCrayonToonMaterial(stripeHex, maxAnisotropy, 1);
  const whiteMat = createCrayonToonMaterial('#F8FAFC', maxAnisotropy, 1);
  const darkMat = createCrayonToonMaterial('#0F172A', maxAnisotropy, 1);
  const glassMat = createCrayonToonMaterial('#7DD3FC', maxAnisotropy, 1, '#38BDF8', 0.25);

  if (variant === 'biplane') {
    // 1. Textured Streamlined Fuselage Body
    const fuselage = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.46, 1.55, 14, 22),
      hullMat
    );
    fuselage.rotation.z = Math.PI / 2;
    addCrayonOutline(fuselage, 0.032);
    group.add(fuselage);

    // 2. Crimson & Gold Radial Engine Cowling at Nose (+X)
    const noseCowling = new THREE.Mesh(
      new THREE.CylinderGeometry(0.42, 0.47, 0.44, 18),
      accentMat
    );
    noseCowling.rotation.z = -Math.PI / 2;
    noseCowling.position.x = 1.02;
    addCrayonOutline(noseCowling, 0.028);
    group.add(noseCowling);

    const noseGoldRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.44, 0.05, 10, 22),
      goldMat
    );
    noseGoldRing.rotation.y = Math.PI / 2;
    noseGoldRing.position.x = 0.82;
    group.add(noseGoldRing);

    // 3. Spinning 3-Blade Front Propeller Assembly
    const propGroup = new THREE.Group();
    propGroup.position.x = 1.28;
    const spinnerCone = new THREE.Mesh(
      new THREE.ConeGeometry(0.18, 0.32, 14),
      goldMat
    );
    spinnerCone.rotation.z = -Math.PI / 2;
    spinnerCone.position.x = 0.08;
    addCrayonOutline(spinnerCone, 0.024);
    propGroup.add(spinnerCone);

    for (let b = 0; b < 3; b++) {
      const bladePivot = new THREE.Group();
      bladePivot.rotation.x = (b * Math.PI * 2) / 3;
      const blade = new THREE.Mesh(
        new THREE.BoxGeometry(0.05, 0.72, 0.14),
        whiteMat
      );
      blade.position.y = 0.36;
      addCrayonOutline(blade, 0.02);
      bladePivot.add(blade);

      const tip = new THREE.Mesh(
        new THREE.BoxGeometry(0.055, 0.16, 0.145),
        accentMat
      );
      tip.position.y = 0.64;
      bladePivot.add(tip);
      propGroup.add(bladePivot);
    }
    group.add(propGroup);
    propellers.push(propGroup);

    // 4. Upper & Lower Biplane Swept Wings with Textured Stripes & Roundel Stars
    const upperWing = new THREE.Mesh(
      new THREE.BoxGeometry(0.82, 0.1, 3.45),
      hullMat
    );
    upperWing.position.set(0.18, 0.56, 0);
    addCrayonOutline(upperWing, 0.03);
    group.add(upperWing);

    const lowerWing = new THREE.Mesh(
      new THREE.BoxGeometry(0.76, 0.1, 3.1),
      hullMat
    );
    lowerWing.position.set(0.12, -0.32, 0);
    addCrayonOutline(lowerWing, 0.028);
    group.add(lowerWing);

    // Wingtip Roundels & Interplane Wing Struts
    [-1.25, 1.25].forEach((wz) => {
      const strut = new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.04, 0.88, 8),
        goldMat
      );
      strut.position.set(0.15, 0.12, wz * 0.82);
      addCrayonOutline(strut, 0.02);
      group.add(strut);

      const roundelOuter = new THREE.Mesh(
        new THREE.CylinderGeometry(0.28, 0.28, 0.12, 16),
        accentMat
      );
      roundelOuter.position.set(0.18, 0.57, wz);
      group.add(roundelOuter);

      const roundelInner = new THREE.Mesh(
        new THREE.CylinderGeometry(0.16, 0.16, 0.13, 14),
        goldMat
      );
      roundelInner.position.set(0.18, 0.57, wz);
      group.add(roundelInner);
    });

    // 5. Glass Cockpit Canopy & Chibi Pilot Dome
    const canopy = new THREE.Mesh(
      new THREE.SphereGeometry(0.32, 14, 12),
      glassMat
    );
    canopy.scale.set(1.35, 0.75, 0.85);
    canopy.position.set(-0.15, 0.38, 0);
    addCrayonOutline(canopy, 0.024);
    group.add(canopy);

    // 6. Tail Fin Rudder & Horizontal Stabilizers (-X)
    const tailFin = new THREE.Mesh(
      new THREE.BoxGeometry(0.58, 0.68, 0.1),
      accentMat
    );
    tailFin.position.set(-1.05, 0.42, 0);
    tailFin.rotation.z = 0.22;
    addCrayonOutline(tailFin, 0.028);
    group.add(tailFin);

    const tailStripe = new THREE.Mesh(
      new THREE.BoxGeometry(0.6, 0.16, 0.12),
      goldMat
    );
    tailStripe.position.set(-1.05, 0.44, 0);
    tailStripe.rotation.z = 0.22;
    group.add(tailStripe);

    const hStab = new THREE.Mesh(
      new THREE.BoxGeometry(0.48, 0.08, 1.35),
      goldMat
    );
    hStab.position.set(-1.02, 0.12, 0);
    addCrayonOutline(hStab, 0.026);
    group.add(hStab);

    // 7. Landing Gear Wheels under Lower Wing
    [-0.55, 0.55].forEach((wz) => {
      const leg = new THREE.Mesh(
        new THREE.CylinderGeometry(0.035, 0.035, 0.42, 8),
        darkMat
      );
      leg.position.set(0.28, -0.52, wz);
      group.add(leg);

      const tire = new THREE.Mesh(
        new THREE.TorusGeometry(0.14, 0.06, 10, 16),
        darkMat
      );
      tire.position.set(0.28, -0.72, wz);
      addCrayonOutline(tire, 0.02);
      group.add(tire);
    });
  } else {
    // Stylized Dirigible Airship with Textured Ribbed Hull, Tail Fins, Gondola & Twin Propellers
    const hull = new THREE.Mesh(
      new THREE.SphereGeometry(1.18, 26, 20),
      hullMat
    );
    hull.scale.set(1.92, 0.96, 0.96);
    addCrayonOutline(hull, 0.035);
    group.add(hull);

    // Nose Cone & Tail Cone Caps
    const noseCap = new THREE.Mesh(
      new THREE.ConeGeometry(0.38, 0.55, 16),
      goldMat
    );
    noseCap.rotation.z = -Math.PI / 2;
    noseCap.position.x = 2.32;
    addCrayonOutline(noseCap, 0.026);
    group.add(noseCap);

    // 4 Cruciform Tail Fins at Rear (-X)
    [0, Math.PI / 2, Math.PI, (Math.PI * 3) / 2].forEach((ang, i) => {
      const finPivot = new THREE.Group();
      finPivot.position.x = -1.75;
      finPivot.rotation.x = ang;
      const fin = new THREE.Mesh(
        new THREE.BoxGeometry(0.68, 0.52, 0.09),
        i % 2 === 0 ? accentMat : goldMat
      );
      fin.position.y = 0.68;
      fin.rotation.z = 0.25;
      addCrayonOutline(fin, 0.026);
      finPivot.add(fin);
      group.add(finPivot);
    });

    // Detailed Passenger Gondola Cabin with Illuminated Windows
    const gondola = new THREE.Mesh(
      new THREE.BoxGeometry(1.25, 0.44, 0.56),
      goldMat
    );
    gondola.position.y = -1.16;
    addCrayonOutline(gondola, 0.032);
    group.add(gondola);

    [-0.36, 0, 0.36].forEach((wx) => {
      const win = new THREE.Mesh(
        new THREE.BoxGeometry(0.22, 0.18, 0.6),
        glassMat
      );
      win.position.set(wx, -1.12, 0);
      group.add(win);
    });

    // Twin Side Engine Pods + Spinning Propellers
    [-0.46, 0.46].forEach((pz) => {
      const pod = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.12, 0.32, 8, 12),
        accentMat
      );
      pod.rotation.z = Math.PI / 2;
      pod.position.set(-0.1, -1.16, pz);
      addCrayonOutline(pod, 0.022);
      group.add(pod);

      const prop = new THREE.Group();
      prop.position.set(0.18, -1.16, pz);
      for (let b = 0; b < 2; b++) {
        const blade = new THREE.Mesh(
          new THREE.BoxGeometry(0.04, 0.42, 0.08),
          whiteMat
        );
        blade.rotation.x = (b * Math.PI) / 2;
        prop.add(blade);
      }
      group.add(prop);
      propellers.push(prop);
    });
  }

  return { group, propellers };
}

/**
 * Builds Studio-Polished, Reference-Faithful 3D Toy-Diorama Islands & Scenery for all Maps!
 */
export function createSceneryProps(
  theme: CourtTheme,
  maxAnisotropy: number = 4
) {
  const sceneryGroup = new THREE.Group();
  const clouds: THREE.Group[] = [];
  const spinningProps: THREE.Object3D[] = [];
  const waveRings: THREE.Mesh[] = [];
  const waterfallTextures: THREE.Texture[] = [];
  const waterfallFoams: THREE.Mesh[] = [];

  const cliffMat = createCrayonToonMaterial(
    theme.islandCliffColor,
    maxAnisotropy,
    1
  );
  const groundRimMat = createCrayonToonMaterial(
    '#FFFFFF',
    maxAnisotropy,
    1
  );
  if (theme.id !== 'glacier_fort' && theme.id !== 'toy_park') {
    const grassTurfTex = createLushGrassTurfTexture(
      theme.groundColor,
      maxAnisotropy,
      6
    );
    grassTurfTex.anisotropy = maxAnisotropy;
    grassTurfTex.repeat.set(6, 6);
    groundRimMat.map = grassTurfTex;
  } else {
    groundRimMat.color.set(theme.groundColor);
  }
  const foliage1 = createCrayonToonMaterial(
    theme.foliagePrimary,
    maxAnisotropy,
    1
  );
  const foliage2 = createCrayonToonMaterial(
    theme.foliageSecondary,
    maxAnisotropy,
    1
  );
  const woodMat = createCrayonToonMaterial('#854D0E', maxAnisotropy, 1);
  woodMat.map = createCrayonWoodTexture('#854D0E', '#713F12');
  woodMat.color.setHex(0xffffff);

  const whiteMat = createCrayonToonMaterial('#F8FAFC', maxAnisotropy, 1);
  const pinkMat = createCrayonToonMaterial('#F472B6', maxAnisotropy, 1);
  const redMat = createCrayonToonMaterial('#EF4444', maxAnisotropy, 1);
  const goldMat = createCrayonToonMaterial('#FACC15', maxAnisotropy, 1);
  const sandShoreMat = createCrayonToonMaterial('#FDE047', maxAnisotropy, 1);

  const airshipHullTex = createStylizedAirshipTexture('#2563EB', '#FACC15', '#EF4444');
  airshipHullTex.anisotropy = maxAnisotropy;
  const blueBlimpMat = createCrayonToonMaterial('#FFFFFF', maxAnisotropy, 1);
  blueBlimpMat.map = airshipHullTex;

  const rockMat = createCrayonToonMaterial('#FFFFFF', maxAnisotropy, 1);
  rockMat.map = createStylizedStoneWallTexture('#64748B', '#334155');

  const darkSlateMat = createCrayonToonMaterial('#1E293B', maxAnisotropy, 1);

  // =========================================================================
  // 0. 3D STYLIZED PAINTED SKY DOME (Zenith-to-Horizon Gradient + Cirrus Clouds + Sunbeams)
  // =========================================================================
  const skyDomeTex = createStylizedSkyDomeTexture(
    theme.skyTop,
    theme.skyHorizon,
    theme.id === 'sky_island' ? '#FEF08A' : '#E0F2FE'
  );
  const skyDomeGeo = new THREE.SphereGeometry(72, 32, 24);
  const skyDomeMat = new THREE.MeshBasicMaterial({
    map: skyDomeTex,
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
  });
  const skyDomeMesh = new THREE.Mesh(skyDomeGeo, skyDomeMat);
  skyDomeMesh.position.y = -2.0;
  sceneryGroup.add(skyDomeMesh);

  // =========================================================================
  // 1. SCULPTED ROUNDED-RECTANGLE TOY-DIORAMA ISLAND (Matches Reference Sheet!)
  // Smooth beveled sandy shoreline + lush rounded grass plateau flush at y = 0.0
  // =========================================================================
  if (theme.hasWaterPlane) {
    // Shallow Turquoise Lagoon Caustic Shelf around Island
    const isLavaTheme = theme.id === 'sakura_temple';
    const lagoonShelfShape = createRoundedRectIslandShape(22.4, 26.2, 6.4);
    const lagoonShelfGeo = new THREE.ShapeGeometry(lagoonShelfShape, 28);
    lagoonShelfGeo.rotateX(-Math.PI / 2);
    const lagoonShelfTex = createStylizedWaterTexture(
      isLavaTheme ? '#F97316' : '#38BDF8',
      maxAnisotropy,
      4
    );
    const lagoonShelfMat = new THREE.MeshBasicMaterial({
      map: lagoonShelfTex,
      transparent: true,
      opacity: isLavaTheme ? 0.68 : 0.62,
      depthWrite: false,
    });
    const lagoonShelfMesh = new THREE.Mesh(lagoonShelfGeo, lagoonShelfMat);
    lagoonShelfMesh.position.y = -0.22;
    sceneryGroup.add(lagoonShelfMesh);
    waterfallTextures.push(lagoonShelfTex);

    // Dual Concentric Animated Shoreline Ocean Foam Rings
    [0, 1].forEach((ringIdx) => {
      const foamShape = createRoundedRectIslandShape(
        18.5 + ringIdx * 1.35,
        22.3 + ringIdx * 1.35,
        5.2 + ringIdx * 0.4
      );
      const foamGeo = new THREE.ShapeGeometry(foamShape, 28);
      foamGeo.rotateX(-Math.PI / 2);
      const foamMat = new THREE.MeshBasicMaterial({
        color: isLavaTheme ? 0xfacc15 : ringIdx === 0 ? 0xe0f2fe : 0x7dd3fc,
        transparent: true,
        opacity: isLavaTheme
          ? ringIdx === 0
            ? 0.72
            : 0.38
          : ringIdx === 0
            ? 0.64
            : 0.36,
        depthWrite: false,
      });
      const foamMesh = new THREE.Mesh(foamGeo, foamMat);
      foamMesh.position.y = -0.195 + ringIdx * 0.012;
      sceneryGroup.add(foamMesh);
      waveRings.push(foamMesh);
    });
  }

  // Layer A: Beveled Golden Beach Sand / Rim Slope (17.2m x 21.0m)
  const shoreShape = createRoundedRectIslandShape(17.2, 21.0, 4.6);
  const shoreGeo = new THREE.ExtrudeGeometry(shoreShape, {
    depth: 0.34,
    bevelEnabled: true,
    bevelThickness: 0.14,
    bevelSize: 0.45,
    bevelSegments: 5,
    curveSegments: 24,
  });
  shoreGeo.rotateX(Math.PI / 2);
  const shoreMat =
    theme.id === 'pirate_cove' || theme.id === 'cozy_beach' || theme.id === 'space_station'
      ? sandShoreMat
      : theme.id === 'sakura_temple'
        ? createCrayonToonMaterial('#F97316', maxAnisotropy, 1, '#EA580C', 0.35)
        : cliffMat;
  const shoreMesh = new THREE.Mesh(shoreGeo, shoreMat);
  shoreMesh.position.y = -0.23;
  shoreMesh.receiveShadow = true;
  sceneryGroup.add(shoreMesh);

  // Layer B: Smooth Rounded-Rectangle Turf / Ground Plateau (15.4m x 19.2m) — Well below courtMesh (y = 0.018) for zero mobile Z-fighting!
  const turfShape = createRoundedRectIslandShape(15.4, 19.2, 4.0);
  const turfGeo = new THREE.ExtrudeGeometry(turfShape, {
    depth: 0.22,
    bevelEnabled: true,
    bevelThickness: 0.05,
    bevelSize: 0.22,
    bevelSegments: 4,
    curveSegments: 24,
  });
  turfGeo.rotateX(Math.PI / 2);
  const turfMesh = new THREE.Mesh(turfGeo, groundRimMat);
  turfMesh.position.y = -0.095;
  turfMesh.receiveShadow = true;
  sceneryGroup.add(turfMesh);

  // Layer C: Deep Sculpted Under-Island Cliff Foundation
  const cliffShape = createRoundedRectIslandShape(15.8, 19.6, 4.2);
  const cliffGeo = new THREE.ExtrudeGeometry(cliffShape, {
    depth: 3.4,
    bevelEnabled: true,
    bevelThickness: 0.35,
    bevelSize: 0.35,
    bevelSegments: 3,
    curveSegments: 20,
  });
  cliffGeo.rotateX(Math.PI / 2);
  const deepCliffMesh = new THREE.Mesh(cliffGeo, cliffMat);
  deepCliffMesh.position.y = -0.52;
  deepCliffMesh.scale.set(0.92, 1.0, 0.92);
  sceneryGroup.add(deepCliffMesh);

  // Smooth Rounded Perimeter Shrubs & Coastal Pebbles (Zero jagged geometry!)
  const buildPerimeterBushesAndPebbles = () => {
    const spots = [
      { x: -6.4, z: -6.8, s: 1.0 },
      { x: 6.4, z: -6.8, s: 0.95 },
      { x: -6.8, z: 4.8, s: 0.95 },
      { x: 6.6, z: 5.2, s: 0.9 },
      { x: -5.2, z: 7.8, s: 0.85 },
      { x: 5.2, z: 7.8, s: 0.85 },
    ];
    spots.forEach((sp, idx) => {
      const g = new THREE.Group();
      const b1 = new THREE.Mesh(
        new THREE.SphereGeometry(0.46, 16, 12),
        idx % 2 === 0 ? foliage1 : foliage2
      );
      b1.scale.set(1.2, 0.78, 1.1);
      b1.position.set(0, 0.28, 0);
      addCrayonOutline(b1, 0.03);
      g.add(b1);

      const b2 = new THREE.Mesh(
        new THREE.SphereGeometry(0.34, 14, 10),
        idx % 2 === 0 ? foliage2 : foliage1
      );
      b2.scale.set(1.15, 0.75, 1.05);
      b2.position.set(0.38, 0.22, 0.16);
      addCrayonOutline(b2, 0.03);
      g.add(b2);

      const pebble = new THREE.Mesh(
        new THREE.SphereGeometry(0.28, 12, 10),
        rockMat
      );
      pebble.scale.set(1.3, 0.65, 1.1);
      pebble.position.set(-0.42, 0.14, 0.22);
      addCrayonOutline(pebble, 0.028);
      g.add(pebble);

      const grassCluster = createLushGrassBorderCluster(
        theme.id === 'space_station',
        true
      );
      grassCluster.position.set(0.18, 0.01, -0.28);
      g.add(grassCluster);

      g.position.set(sp.x, 0, sp.z);
      g.scale.setScalar(sp.s);
      sceneryGroup.add(g);
    });

    // Distant Sculpted 3D Alpine Mountain Peaks ("Pahad") framing the island horizon
    [
      { x: -16.5, y: -0.8, z: -22.5, s: 0.42, ry: 0.25, seed: 1 },
      { x: 16.5, y: -0.8, z: -22.5, s: 0.42, ry: -0.25, seed: 2 },
    ].forEach((m) => {
      const mtn = createSculptedAlpineMountainPeak(
        11.0,
        19.5,
        m.seed,
        theme.id === 'space_station'
      );
      mtn.position.set(m.x, m.y, m.z);
      mtn.scale.setScalar(m.s);
      mtn.rotation.y = m.ry;
      sceneryGroup.add(mtn);
    });
  };

  // Helper 1: Lush Curved Tropical Coconut Palm Tree (with broad arching fronds!)
  const buildPalmTree = (
    x: number,
    z: number,
    scale: number = 1,
    leanDir: number = 1
  ) => {
    const palm = new THREE.Group();
    for (let s = 0; s < 5; s++) {
      const seg = new THREE.Mesh(
        new THREE.CylinderGeometry(
          0.19 - s * 0.022,
          0.24 - s * 0.022,
          0.58,
          12
        ),
        woodMat
      );
      seg.position.set(leanDir * (s * s * 0.036), 0.26 + s * 0.48, 0);
      seg.rotation.z = -leanDir * s * 0.065;
      seg.castShadow = true;
      addCrayonOutline(seg, 0.032);
      palm.add(seg);
    }

    const topX = leanDir * 0.58;
    const topY = 2.55;

    // 3 Coconuts nestled under the crown
    [-0.14, 0.14, 0].forEach((cx, ci) => {
      const coco = new THREE.Mesh(
        new THREE.SphereGeometry(0.13, 10, 8),
        woodMat
      );
      coco.position.set(topX + cx, topY - 0.1, ci === 2 ? 0.14 : -0.06);
      palm.add(coco);
    });

    // 7 Broad, Lush Arching Palm Fronds
    for (let f = 0; f < 7; f++) {
      const angle = (f / 7) * Math.PI * 2;
      const frondPivot = new THREE.Group();
      frondPivot.position.set(topX, topY, 0);
      frondPivot.rotation.y = angle;

      const leaf = new THREE.Mesh(
        new THREE.SphereGeometry(0.62, 14, 10),
        f % 2 === 0 ? foliage1 : foliage2
      );
      leaf.scale.set(1.35, 0.22, 0.52);
      leaf.rotation.z = -0.36;
      leaf.position.set(0.68, -0.1, 0);
      leaf.castShadow = true;
      addCrayonOutline(leaf, 0.028);
      frondPivot.add(leaf);
      palm.add(frondPivot);
    }

    palm.position.set(x, 0, z);
    palm.scale.setScalar(scale);
    sceneryGroup.add(palm);
  };

  // Helper 2: Smooth Puffy Cartoon Tree (Spherical foliage clusters like Reference Image!)
  const buildPuffyTree = (x: number, z: number, scale: number = 1) => {
    const g = new THREE.Group();
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.26, 1.85, 12),
      woodMat
    );
    trunk.position.y = 0.92;
    trunk.castShadow = true;
    addCrayonOutline(trunk, 0.035);
    g.add(trunk);

    const puffs = [
      { x: 0, y: 2.25, z: 0, r: 0.96, mat: foliage1 },
      { x: -0.52, y: 1.9, z: 0.2, r: 0.72, mat: foliage2 },
      { x: 0.54, y: 1.92, z: -0.16, r: 0.74, mat: foliage2 },
      { x: 0.08, y: 1.85, z: 0.52, r: 0.68, mat: foliage1 },
    ];
    puffs.forEach((pf) => {
      const m = new THREE.Mesh(new THREE.SphereGeometry(pf.r, 18, 14), pf.mat);
      m.position.set(pf.x, pf.y, pf.z);
      m.scale.set(1.08, 0.92, 1.05);
      m.castShadow = true;
      addCrayonOutline(m, 0.032);
      g.add(m);
    });

    g.position.set(x, 0, z);
    g.scale.setScalar(scale);
    sceneryGroup.add(g);
  };

  // Helper 3: 8-Panel Alternating Red-and-White Striped Beach Umbrella
  const buildBeachUmbrellaSet = (
    x: number,
    z: number,
    tilt: number = 0.14
  ) => {
    const u = new THREE.Group();
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.055, 0.055, 2.35, 10),
      whiteMat
    );
    pole.position.y = 1.15;
    addCrayonOutline(pole, 0.025);
    u.add(pole);

    const canopyGroup = new THREE.Group();
    canopyGroup.position.y = 2.24;
    canopyGroup.rotation.z = tilt;

    // 8 Alternating Red/Pink and White Umbrella Wedges
    const sliceArc = (Math.PI * 2) / 8;
    for (let s = 0; s < 8; s++) {
      const wedgeGeo = new THREE.ConeGeometry(
        1.48,
        0.66,
        6,
        1,
        false,
        s * sliceArc,
        sliceArc
      );
      const wedge = new THREE.Mesh(
        wedgeGeo,
        s % 2 === 0 ? redMat : whiteMat
      );
      wedge.castShadow = true;
      canopyGroup.add(wedge);
    }

    const topFinial = new THREE.Mesh(
      new THREE.SphereGeometry(0.11, 10, 10),
      goldMat
    );
    topFinial.position.y = 0.36;
    canopyGroup.add(topFinial);
    u.add(canopyGroup);

    u.position.set(x, 0, z);
    sceneryGroup.add(u);
  };

  // Helper 4: Stylized Textured Sky Plane & Dirigible Airship with Wings, Roundels, Tail Fins & Spinning Propeller!
  const buildSkyBlimp = (
    x: number,
    y: number,
    z: number,
    variant: 'airship' | 'biplane' = 'biplane',
    baseHex: string = '#2563EB',
    stripeHex: string = '#FACC15',
    accentHex: string = '#EF4444',
    scale: number = 1.0
  ) => {
    const { group: vehicle, propellers } = createStylizedSkyVehicle(
      variant,
      baseHex,
      stripeHex,
      accentHex,
      maxAnisotropy
    );
    vehicle.position.set(x, y, z);
    vehicle.scale.setScalar(scale);
    sceneryGroup.add(vehicle);
    clouds.push(vehicle);
    propellers.forEach((p) => spinningProps.push(p));
  };

  // Helper 5: Fluffy 3D Cumulus Cloud with Ink Line-Art Outlines (Never flat bright white!)
  const buildCloud = (x: number, y: number, z: number, scale: number) => {
    const cg = new THREE.Group();
    const puff1 = new THREE.Mesh(
      new THREE.SphereGeometry(0.92, 16, 14),
      whiteMat
    );
    addCrayonOutline(puff1, 0.032);
    const puff2 = new THREE.Mesh(
      new THREE.SphereGeometry(0.72, 14, 12),
      whiteMat
    );
    puff2.position.set(0.76, -0.1, 0.1);
    addCrayonOutline(puff2, 0.032);
    const puff3 = new THREE.Mesh(
      new THREE.SphereGeometry(0.66, 14, 12),
      whiteMat
    );
    puff3.position.set(-0.72, -0.12, -0.1);
    addCrayonOutline(puff3, 0.032);
    cg.add(puff1, puff2, puff3);
    cg.position.set(x, y, z);
    cg.scale.setScalar(scale);
    sceneryGroup.add(cg);
    clouds.push(cg);
  };

  // Helper 6: Cascading 3D Waterfall with Animated Flowing Stream Texture & Ink-Outlined Foam Puffs
  const buildWaterfall = (
    x: number,
    yTop: number,
    z: number,
    width: number,
    height: number,
    rotY: number = 0,
    waterHex: string = '#7DD3FC'
  ) => {
    const wf = new THREE.Group();
    const wfTex = createWaterfallStreamTexture(waterHex, maxAnisotropy);
    waterfallTextures.push(wfTex);
    const wfMat = new THREE.MeshBasicMaterial({
      map: wfTex,
      transparent: true,
      opacity: 0.92,
    });
    const stream = new THREE.Mesh(
      new THREE.BoxGeometry(width, height, 0.28),
      wfMat
    );
    stream.position.y = -height / 2;
    wf.add(stream);

    // Ink-Outlined Foam Splash Puffs at Top & Bottom of Waterfall
    [-width * 0.32, 0, width * 0.32].forEach((fx, i) => {
      const topFoam = new THREE.Mesh(
        new THREE.SphereGeometry(0.28 + (i % 2) * 0.08, 12, 10),
        whiteMat
      );
      topFoam.position.set(fx, 0.04, 0.12);
      addCrayonOutline(topFoam, 0.03);
      wf.add(topFoam);
      waterfallFoams.push(topFoam);

      const botFoam = new THREE.Mesh(
        new THREE.SphereGeometry(0.42 + (i % 2) * 0.12, 12, 10),
        whiteMat
      );
      botFoam.position.set(fx, -height + 0.15, 0.18);
      addCrayonOutline(botFoam, 0.03);
      wf.add(botFoam);
      waterfallFoams.push(botFoam);
    });

    wf.position.set(x, yTop, z);
    wf.rotation.y = rotY;
    sceneryGroup.add(wf);
  };

  // =========================================================================
  // MAP 1: SKY ISLANDS (Celestial Sky Sanctuary + Sun Halo + Rainbow Arch + Floating Islets + Windmill + Hot-Air Balloons)
  // =========================================================================
  if (theme.id === 'sky_island') {
    buildPerimeterBushesAndPebbles();
    buildPuffyTree(-6.0, -4.6, 1.15);
    buildPuffyTree(6.0, -4.6, 1.15);
    buildPuffyTree(-6.2, 1.8, 0.95);
    buildPuffyTree(6.2, 1.8, 0.95);

    // 1. Radiant Celestial Sun Disk & Golden Halo Rings high in the Back Sky
    const skySunGroup = new THREE.Group();
    const sunCore = new THREE.Mesh(
      new THREE.CircleGeometry(2.8, 32),
      new THREE.MeshBasicMaterial({ color: 0xfef08a, fog: false })
    );
    skySunGroup.add(sunCore);

    const sunHalo1 = new THREE.Mesh(
      new THREE.RingGeometry(2.9, 4.2, 32),
      new THREE.MeshBasicMaterial({
        color: 0xfde047,
        transparent: true,
        opacity: 0.42,
        side: THREE.DoubleSide,
        fog: false,
      })
    );
    skySunGroup.add(sunHalo1);

    const sunHalo2 = new THREE.Mesh(
      new THREE.RingGeometry(4.3, 6.2, 32),
      new THREE.MeshBasicMaterial({
        color: 0xbae6fd,
        transparent: true,
        opacity: 0.25,
        side: THREE.DoubleSide,
        fog: false,
      })
    );
    skySunGroup.add(sunHalo2);
    skySunGroup.position.set(0, 12.2, -28.0);
    sceneryGroup.add(skySunGroup);

    // 2. Sweeping Celestial Rainbow & Golden Sky-Ribbon Arch across the Back Sky
    const skyRainbow = new THREE.Group();
    const skyArcColors = ['#FB7185', '#FACC15', '#4ADE80', '#38BDF8', '#A855F7'];
    skyArcColors.forEach((hex, idx) => {
      const arc = new THREE.Mesh(
        new THREE.TorusGeometry(13.5 - idx * 0.42, 0.22, 12, 56, Math.PI),
        new THREE.MeshBasicMaterial({
          color: new THREE.Color(hex),
          transparent: true,
          opacity: 0.72,
          fog: false,
        })
      );
      skyRainbow.add(arc);
    });
    skyRainbow.position.set(0, -0.8, -19.5);
    sceneryGroup.add(skyRainbow);

    // 3. Cascading Crystal Sky Waterfalls pouring off the Left, Right & Front Cliffs!
    buildWaterfall(-7.4, -0.05, -1.2, 1.55, 3.8, -Math.PI / 2, '#7DD3FC');
    buildWaterfall(7.4, -0.05, -1.2, 1.55, 3.8, Math.PI / 2, '#7DD3FC');
    buildWaterfall(3.8, -0.05, 9.4, 1.4, 3.6, 0, '#7DD3FC');

    // 4. Multi-Altitude Floating Sky Sanctuary Islets with Waterfalls & Spinning Sky Windmill!
    [
      { x: -9.6, y: 2.1, z: -12.4, s: 1.12, hasWaterfall: true, hasWindmill: false },
      { x: 9.6, y: 2.4, z: -12.6, s: 1.18, hasWaterfall: true, hasWindmill: true },
      { x: -12.8, y: 4.2, z: -17.5, s: 0.92, hasWaterfall: false, hasWindmill: false },
      { x: 12.8, y: 4.5, z: -18.0, s: 0.96, hasWaterfall: false, hasWindmill: false },
    ].forEach((isl) => {
      const islet = new THREE.Group();
      const rock = new THREE.Mesh(
        new THREE.CylinderGeometry(2.3, 0.95, 2.5, 14),
        cliffMat
      );
      rock.position.y = -1.25;
      addCrayonOutline(rock, 0.03);
      islet.add(rock);

      const lowerSpire = new THREE.Mesh(
        new THREE.ConeGeometry(0.95, 1.5, 10),
        cliffMat
      );
      lowerSpire.rotation.x = Math.PI;
      lowerSpire.position.y = -3.1;
      addCrayonOutline(lowerSpire, 0.028);
      islet.add(lowerSpire);

      const grass = new THREE.Mesh(
        new THREE.CylinderGeometry(2.45, 2.3, 0.38, 16),
        groundRimMat
      );
      grass.position.y = 0.16;
      addCrayonOutline(grass, 0.03);
      islet.add(grass);

      if (isl.hasWindmill) {
        // Charming Spinning Sky Windmill Tower on the Right Floating Islet!
        const wmTower = new THREE.Mesh(
          new THREE.CylinderGeometry(0.48, 0.68, 2.1, 14),
          whiteMat
        );
        wmTower.position.y = 1.2;
        addCrayonOutline(wmTower, 0.03);
        islet.add(wmTower);

        const wmRoof = new THREE.Mesh(
          new THREE.ConeGeometry(0.65, 0.75, 14),
          redMat
        );
        wmRoof.position.y = 2.6;
        addCrayonOutline(wmRoof, 0.03);
        islet.add(wmRoof);

        const rotor = new THREE.Group();
        rotor.position.set(0, 1.85, 0.55);
        for (let b = 0; b < 4; b++) {
          const blade = new THREE.Mesh(
            new THREE.BoxGeometry(0.24, 1.45, 0.06),
            goldMat
          );
          blade.rotation.z = (b * Math.PI) / 2;
          addCrayonOutline(blade, 0.025);
          rotor.add(blade);
        }
        islet.add(rotor);
        spinningProps.push(rotor);
      } else {
        const miniTree = new THREE.Mesh(
          new THREE.SphereGeometry(0.98, 14, 12),
          foliage1
        );
        miniTree.position.set(-0.35, 1.25, -0.2);
        addCrayonOutline(miniTree, 0.03);
        islet.add(miniTree);

        const miniTree2 = new THREE.Mesh(
          new THREE.SphereGeometry(0.72, 12, 10),
          foliage2
        );
        miniTree2.position.set(0.55, 0.98, 0.25);
        addCrayonOutline(miniTree2, 0.028);
        islet.add(miniTree2);
      }

      islet.position.set(isl.x, isl.y, isl.z);
      islet.scale.setScalar(isl.s);
      sceneryGroup.add(islet);

      if (isl.hasWaterfall) {
        buildWaterfall(isl.x * 0.88, isl.y, isl.z + 1.6, 0.95, 3.2, 0, '#7DD3FC');
      }
    });

    // 5. Upgraded Celestial Greek Marble Temple Colonnade with Pediment Roof & Golden Sun Crest
    const templeColonnade = new THREE.Group();
    const plinth = new THREE.Mesh(
      new THREE.BoxGeometry(7.6, 0.36, 1.35),
      whiteMat
    );
    plinth.position.set(0, 0.18, -8.3);
    addCrayonOutline(plinth, 0.028);
    templeColonnade.add(plinth);

    const goldStepTrim = new THREE.Mesh(
      new THREE.BoxGeometry(7.8, 0.1, 1.45),
      goldMat
    );
    goldStepTrim.position.set(0, 0.38, -8.3);
    templeColonnade.add(goldStepTrim);

    [-2.9, -0.98, 0.98, 2.9].forEach((cx) => {
      const col = new THREE.Mesh(
        new THREE.CylinderGeometry(0.26, 0.31, 3.1, 14),
        whiteMat
      );
      col.position.set(cx, 1.9, -8.3);
      addCrayonOutline(col, 0.032);
      templeColonnade.add(col);

      const cap = new THREE.Mesh(
        new THREE.CylinderGeometry(0.38, 0.28, 0.22, 14),
        goldMat
      );
      cap.position.set(cx, 3.42, -8.3);
      addCrayonOutline(cap, 0.025);
      templeColonnade.add(cap);
    });

    const architrave = new THREE.Mesh(
      new THREE.BoxGeometry(7.1, 0.44, 0.95),
      whiteMat
    );
    architrave.position.set(0, 3.72, -8.3);
    addCrayonOutline(architrave, 0.032);
    templeColonnade.add(architrave);

    const pediment = new THREE.Mesh(
      new THREE.ConeGeometry(3.8, 1.15, 4),
      goldMat
    );
    pediment.rotation.y = Math.PI / 4;
    pediment.scale.set(1.32, 1.0, 0.28);
    pediment.position.set(0, 4.48, -8.3);
    addCrayonOutline(pediment, 0.03);
    templeColonnade.add(pediment);

    sceneryGroup.add(templeColonnade);

    // 6. 3 Textured Striped Hot-Air Balloons + 1 Stylized Sky Biplane drifting across the Celestial Sky
    [
      { x: -7.8, y: 5.8, z: -9.4, col: '#F43F5E', stripe: '#FDE047', accent: '#38BDF8', s: 1.08 },
      { x: 7.8, y: 5.5, z: -8.8, col: '#2563EB', stripe: '#FACC15', accent: '#EF4444', s: 1.04 },
      { x: -2.4, y: 7.6, z: -15.2, col: '#A855F7', stripe: '#FACC15', accent: '#EC4899', s: 0.88 },
    ].forEach((b) => {
      const balloon = new THREE.Group();
      const envTex = createStylizedAirshipTexture(b.col, b.stripe, b.accent);
      envTex.anisotropy = maxAnisotropy;
      const envMat = createCrayonToonMaterial('#FFFFFF', maxAnisotropy, 1);
      envMat.map = envTex;

      const env = new THREE.Mesh(
        new THREE.SphereGeometry(1.18, 22, 18),
        envMat
      );
      env.scale.y = 1.24;
      addCrayonOutline(env, 0.035);
      balloon.add(env);

      // Decorative Golden Equator Ring & Lower Burner Collar
      const eqRing = new THREE.Mesh(
        new THREE.TorusGeometry(1.17, 0.045, 10, 28),
        goldMat
      );
      eqRing.rotation.x = Math.PI / 2;
      balloon.add(eqRing);

      const collar = new THREE.Mesh(
        new THREE.TorusGeometry(0.42, 0.06, 10, 20),
        goldMat
      );
      collar.rotation.x = Math.PI / 2;
      collar.position.y = -1.22;
      balloon.add(collar);

      // Rigging Struts connecting Collar to Basket
      [-0.22, 0.22].forEach((rx) => {
        [-0.22, 0.22].forEach((rz) => {
          const rope = new THREE.Mesh(
            new THREE.CylinderGeometry(0.02, 0.02, 0.45, 6),
            darkSlateMat
          );
          rope.position.set(rx, -1.45, rz);
          balloon.add(rope);
        });
      });

      const basket = new THREE.Mesh(
        new THREE.BoxGeometry(0.56, 0.46, 0.56),
        woodMat
      );
      basket.position.y = -1.72;
      addCrayonOutline(basket, 0.032);
      balloon.add(basket);

      balloon.position.set(b.x, b.y, b.z);
      balloon.scale.setScalar(b.s);
      sceneryGroup.add(balloon);
      clouds.push(balloon);
    });

    // Stylized Textured Biplane soaring across the Sky Islands horizon
    buildSkyBlimp(3.6, 7.2, -13.5, 'biplane', '#2563EB', '#FACC15', '#EF4444', 0.95);

    // 7. Multi-Tiered Sea of Fluffy White Cumulus Clouds surrounding & high in the Sky
    for (let i = 0; i < 20; i++) {
      const angle = (i / 20) * Math.PI * 2;
      const rad = 10.0 + (i % 3) * 2.4;
      buildCloud(
        Math.cos(angle) * rad,
        -0.45 + (i % 3) * 0.42,
        Math.sin(angle) * rad - 1.2,
        1.32
      );
    }
    // High-altitude sky clouds framing the upper horizon
    [
      [-11.5, 6.8, -14.5, 1.45],
      [0.0, 8.2, -17.5, 1.6],
      [11.5, 6.6, -14.0, 1.45],
      [-14.0, 4.8, -6.5, 1.25],
      [14.0, 5.0, -6.5, 1.25],
    ].forEach(([cx, cy, cz, sc]) => {
      buildCloud(cx, cy, cz, sc);
    });
  }
  // =========================================================================
  // MAP 2: CANDY CHAOS (Pastel Rainbow + Candy Castle + Cotton-Candy Trees + Lollipops)
  // =========================================================================
  else if (theme.id === 'toy_park') {
    const cyanCandyMat = createCrayonToonMaterial('#38BDF8', maxAnisotropy, 1);
    const yellowCandyMat = createCrayonToonMaterial('#FDE047', maxAnisotropy, 1);
    const lavenderMat = createCrayonToonMaterial('#C084FC', maxAnisotropy, 1);

    // Giant 5-Band Pastel Rainbow Arch across the Back Sky (Matches Reference Image!)
    const rainbowGroup = new THREE.Group();
    const rbColors = ['#FB7185', '#FBBF24', '#FEF08A', '#4ADE80', '#38BDF8'];
    rbColors.forEach((hex, idx) => {
      const arc = new THREE.Mesh(
        new THREE.TorusGeometry(6.8 - idx * 0.34, 0.19, 12, 48, Math.PI),
        new THREE.MeshBasicMaterial({ color: new THREE.Color(hex) })
      );
      rainbowGroup.add(arc);
    });
    rainbowGroup.position.set(0, 0.5, -10.2);
    sceneryGroup.add(rainbowGroup);

    // Frosted Candy Castle & Cupcake Turrets at Back Corners
    [-5.6, 5.6].forEach((bx, sideIdx) => {
      const tower = new THREE.Group();
      const base = new THREE.Mesh(
        new THREE.CylinderGeometry(0.85, 0.95, 2.4, 16),
        sideIdx === 0 ? pinkMat : cyanCandyMat
      );
      base.position.y = 1.2;
      addCrayonOutline(base, 0.035);
      tower.add(base);

      const frosting = new THREE.Mesh(
        new THREE.SphereGeometry(0.95, 16, 12),
        whiteMat
      );
      frosting.scale.set(1.05, 0.55, 1.05);
      frosting.position.y = 2.45;
      addCrayonOutline(frosting, 0.03);
      tower.add(frosting);

      const spire = new THREE.Mesh(
        new THREE.ConeGeometry(0.82, 1.45, 16),
        sideIdx === 0 ? lavenderMat : pinkMat
      );
      spire.position.y = 3.35;
      addCrayonOutline(spire, 0.035);
      tower.add(spire);

      const cherry = new THREE.Mesh(
        new THREE.SphereGeometry(0.22, 12, 10),
        redMat
      );
      cherry.position.y = 4.15;
      addCrayonOutline(cherry, 0.03);
      tower.add(cherry);

      tower.position.set(bx, 0, -6.2);
      sceneryGroup.add(tower);
    });

    // Fluffy Pink & Lavender Cotton-Candy Trees + Giant Swirl Lollipops & Donuts
    [-6.0, 6.0].forEach((lx, idx) => {
      // Cotton Candy Tree
      const ccTree = new THREE.Group();
      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.16, 0.22, 1.75, 12),
        whiteMat
      );
      trunk.position.y = 0.88;
      addCrayonOutline(trunk, 0.032);
      ccTree.add(trunk);

      const puff1 = new THREE.Mesh(
        new THREE.SphereGeometry(0.92, 16, 14),
        idx === 0 ? pinkMat : lavenderMat
      );
      puff1.position.set(0, 2.1, 0);
      addCrayonOutline(puff1, 0.032);
      ccTree.add(puff1);

      const puff2 = new THREE.Mesh(
        new THREE.SphereGeometry(0.68, 14, 12),
        idx === 0 ? lavenderMat : pinkMat
      );
      puff2.position.set(0.45, 1.8, 0.2);
      addCrayonOutline(puff2, 0.03);
      ccTree.add(puff2);

      ccTree.position.set(lx, 0, -2.2);
      sceneryGroup.add(ccTree);

      // Giant Swirl Lollipop
      const lolli = new THREE.Group();
      const stick = new THREE.Mesh(
        new THREE.CylinderGeometry(0.065, 0.065, 2.1, 10),
        whiteMat
      );
      stick.position.y = 1.05;
      addCrayonOutline(stick, 0.028);
      lolli.add(stick);

      const disk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.74, 0.74, 0.22, 22),
        idx === 0 ? pinkMat : cyanCandyMat
      );
      disk.rotation.x = Math.PI / 2;
      disk.position.y = 2.25;
      addCrayonOutline(disk, 0.035);
      lolli.add(disk);

      const innerSwirl = new THREE.Mesh(
        new THREE.CylinderGeometry(0.42, 0.42, 0.25, 18),
        yellowCandyMat
      );
      innerSwirl.rotation.x = Math.PI / 2;
      innerSwirl.position.y = 2.25;
      lolli.add(innerSwirl);

      lolli.position.set(lx, 0, 2.2);
      sceneryGroup.add(lolli);
    });
  }
  // =========================================================================
  // MAP 3: LAVA BOUNCE (Erupting Volcanoes + Molten Magma Falls + Obsidian Crags)
  // =========================================================================
  else if (theme.id === 'sakura_temple') {
    const lavaMat = createCrayonToonMaterial(
      '#F97316',
      maxAnisotropy,
      1,
      '#EA580C',
      0.48
    );
    const brightLavaMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
    const obsidianMat = createCrayonToonMaterial('#1C1917', maxAnisotropy, 1);

    // Sculpted Erupting Volcanoes with Glowing Crater Rim & Lava Rivers
    [-5.8, 5.8, 0.0].forEach((vx, idx) => {
      const volcano = new THREE.Group();
      const isCenter = idx === 2;
      const radiusBottom = isCenter ? 2.7 : 2.2;
      const radiusTop = isCenter ? 0.85 : 0.72;
      const height = isCenter ? 4.6 : 3.8;

      const cone = new THREE.Mesh(
        new THREE.CylinderGeometry(radiusTop, radiusBottom, height, 18),
        obsidianMat
      );
      cone.position.y = height / 2;
      addCrayonOutline(cone, 0.035);
      volcano.add(cone);

      // Glowing Molten Crater Lip
      const craterRim = new THREE.Mesh(
        new THREE.TorusGeometry(radiusTop * 0.92, 0.16, 12, 24),
        lavaMat
      );
      craterRim.rotation.x = Math.PI / 2;
      craterRim.position.y = height - 0.04;
      addCrayonOutline(craterRim, 0.025);
      volcano.add(craterRim);

      const lavaPool = new THREE.Mesh(
        new THREE.CircleGeometry(radiusTop * 0.85, 20),
        brightLavaMat
      );
      lavaPool.rotation.x = -Math.PI / 2;
      lavaPool.position.y = height + 0.05;
      volcano.add(lavaPool);

      // Bubbling Lava Spheres at Crater Rim
      [-0.25, 0.2, 0].forEach((bx, bi) => {
        const bubble = new THREE.Mesh(
          new THREE.SphereGeometry(0.24 - bi * 0.04, 12, 10),
          bi === 0 ? brightLavaMat : lavaMat
        );
        bubble.position.set(bx, height + 0.22 + bi * 0.1, (bi - 1) * 0.18);
        volcano.add(bubble);
      });

      // Basal Obsidian Boulders around Volcano Base
      [-1, 1].forEach((s) => {
        const boulder = new THREE.Mesh(
          new THREE.DodecahedronGeometry(0.65, 1),
          obsidianMat
        );
        boulder.scale.set(1.2, 0.75, 1.0);
        boulder.position.set(s * (radiusBottom * 0.75), 0.35, 0.8);
        addCrayonOutline(boulder, 0.03);
        volcano.add(boulder);
      });

      volcano.position.set(vx, 0, isCenter ? -9.6 : -6.6);
      sceneryGroup.add(volcano);
    });

    // Sculpted Flaming Obsidian Braziers with Gold Rim & Fire Plume on Sidelines
    [-5.9, 5.9].forEach((tx) => {
      const brazier = new THREE.Group();
      const basePedestal = new THREE.Mesh(
        new THREE.CylinderGeometry(0.55, 0.68, 0.32, 14),
        obsidianMat
      );
      basePedestal.position.y = 0.16;
      addCrayonOutline(basePedestal, 0.03);
      brazier.add(basePedestal);

      const pillar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.38, 0.48, 1.35, 14),
        obsidianMat
      );
      pillar.position.y = 0.92;
      addCrayonOutline(pillar, 0.032);
      brazier.add(pillar);

      const bowl = new THREE.Mesh(
        new THREE.SphereGeometry(0.56, 16, 12, 0, Math.PI * 2, Math.PI * 0.5, Math.PI * 0.5),
        obsidianMat
      );
      bowl.position.y = 1.65;
      addCrayonOutline(bowl, 0.032);
      brazier.add(bowl);

      const goldRim = new THREE.Mesh(
        new THREE.TorusGeometry(0.55, 0.055, 10, 22),
        goldMat
      );
      goldRim.rotation.x = Math.PI / 2;
      goldRim.position.y = 1.66;
      brazier.add(goldRim);

      const outerFlame = new THREE.Mesh(
        new THREE.ConeGeometry(0.42, 0.95, 12),
        lavaMat
      );
      outerFlame.position.y = 2.08;
      addCrayonOutline(outerFlame, 0.028);
      brazier.add(outerFlame);

      const innerFlame = new THREE.Mesh(
        new THREE.ConeGeometry(0.24, 0.65, 10),
        brightLavaMat
      );
      innerFlame.position.set(0, 2.02, 0.12);
      brazier.add(innerFlame);

      brazier.position.set(tx, 0, -1.5);
      sceneryGroup.add(brazier);
    });
  }
  // =========================================================================
  // MAP 4: ICE BREAK (Multi-Crystal Glaciers + Detailed Igloo + Dressed Snowman)
  // =========================================================================
  else if (theme.id === 'glacier_fort') {
    const iceMat = createCrayonToonMaterial('#7DD3FC', maxAnisotropy, 1);
    const deepIceMat = createCrayonToonMaterial('#38BDF8', maxAnisotropy, 1);
    const snowBlockMat = createCrayonToonMaterial('#F1F5F9', maxAnisotropy, 1);
    const pineMat = createCrayonToonMaterial('#0F766E', maxAnisotropy, 1);
    const orangeMat = createCrayonToonMaterial('#F97316', maxAnisotropy, 1);

    // Multi-Peak Sculpted Glacier Crystal Clusters at Back of Island
    [
      { x: -5.8, z: -7.2, r: 1.35, h: 4.2 },
      { x: -2.8, z: -8.6, r: 1.1, h: 3.4 },
      { x: 2.8, z: -8.6, r: 1.15, h: 3.6 },
      { x: 5.8, z: -7.2, r: 1.4, h: 4.4 },
    ].forEach((ib, idx) => {
      const cluster = new THREE.Group();

      // Snowdrift Foundation Mound
      const drift = new THREE.Mesh(
        new THREE.SphereGeometry(ib.r * 1.15, 16, 12),
        whiteMat
      );
      drift.scale.set(1.2, 0.38, 1.1);
      drift.position.y = 0.18;
      addCrayonOutline(drift, 0.028);
      cluster.add(drift);

      // Main Tall Faceted Glacier Spire
      const mainSpire = new THREE.Mesh(
        new THREE.ConeGeometry(ib.r, ib.h, 7),
        idx % 2 === 0 ? iceMat : deepIceMat
      );
      mainSpire.position.y = ib.h / 2;
      addCrayonOutline(mainSpire, 0.032);
      cluster.add(mainSpire);

      // Side Angled Crystal Shard
      const sideShard = new THREE.Mesh(
        new THREE.ConeGeometry(ib.r * 0.65, ib.h * 0.62, 6),
        idx % 2 === 0 ? deepIceMat : iceMat
      );
      sideShard.position.set(ib.r * 0.55, ib.h * 0.28, 0.35);
      sideShard.rotation.z = -0.24;
      addCrayonOutline(sideShard, 0.028);
      cluster.add(sideShard);

      cluster.position.set(ib.x, 0, ib.z);
      sceneryGroup.add(cluster);
    });

    // Snow-Capped Tiered Pine Trees on Left & Right Sidelines
    const buildSnowPine = (px: number, pz: number, scale: number = 1) => {
      const pine = new THREE.Group();
      const snowBase = new THREE.Mesh(
        new THREE.SphereGeometry(0.55, 12, 10),
        whiteMat
      );
      snowBase.scale.set(1.2, 0.35, 1.2);
      snowBase.position.y = 0.1;
      pine.add(snowBase);

      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.16, 0.22, 0.9, 10),
        woodMat
      );
      trunk.position.y = 0.45;
      addCrayonOutline(trunk, 0.028);
      pine.add(trunk);

      [0, 1, 2].forEach((tier) => {
        const cone = new THREE.Mesh(
          new THREE.ConeGeometry(0.95 - tier * 0.2, 1.15, 14),
          pineMat
        );
        cone.position.y = 1.1 + tier * 0.72;
        addCrayonOutline(cone, 0.032);
        pine.add(cone);

        const snowCap = new THREE.Mesh(
          new THREE.ConeGeometry(0.7 - tier * 0.14, 0.58, 14),
          whiteMat
        );
        snowCap.position.y = 1.41 + tier * 0.72;
        addCrayonOutline(snowCap, 0.025);
        pine.add(snowCap);
      });

      pine.position.set(px, 0, pz);
      pine.scale.setScalar(scale);
      sceneryGroup.add(pine);
    };

    buildSnowPine(-6.0, -3.4, 1.05);
    buildSnowPine(6.0, -3.4, 1.05);
    buildSnowPine(-6.1, 4.4, 0.92);

    // High-Finishing Sculpted Arctic Igloo (Snow Base Pad + Ice Brick Courses + Arched Dark Doorway + Chimney!)
    const igloo = new THREE.Group();

    // Raised Snow Foundation Pad under Igloo
    const iglooPad = new THREE.Mesh(
      new THREE.CylinderGeometry(1.55, 1.68, 0.14, 28),
      snowBlockMat
    );
    iglooPad.position.y = 0.07;
    addCrayonOutline(iglooPad, 0.028);
    igloo.add(iglooPad);

    // Main Hemisphere Snow Dome
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(1.32, 28, 18, 0, Math.PI * 2, 0, Math.PI * 0.5),
      whiteMat
    );
    dome.position.y = 0.08;
    addCrayonOutline(dome, 0.034);
    igloo.add(dome);

    // Sculpted Horizontal Ice-Brick Course Rings around the Igloo Dome
    [
      { y: 0.42, r: 1.25 },
      { y: 0.78, r: 1.06 },
      { y: 1.1, r: 0.75 },
    ].forEach((ring) => {
      const courseRing = new THREE.Mesh(
        new THREE.TorusGeometry(ring.r, 0.026, 10, 32),
        iceMat
      );
      courseRing.rotation.x = Math.PI / 2;
      courseRing.position.y = ring.y;
      igloo.add(courseRing);
    });

    // Top Igloo Snow Cap & Ice Chimney Vent
    const topCrownCap = new THREE.Mesh(
      new THREE.CylinderGeometry(0.36, 0.44, 0.14, 18),
      iceMat
    );
    topCrownCap.position.y = 1.38;
    addCrayonOutline(topCrownCap, 0.025);
    igloo.add(topCrownCap);

    // Arched Entrance Tunnel Facing the Court (+X) with Dark Recessed Doorway & Ice Arch Frame!
    const tunnelGroup = new THREE.Group();
    tunnelGroup.position.set(1.05, 0.08, 0);

    // Tunnel Vault Arch
    const tunnelBody = new THREE.Mesh(
      new THREE.CylinderGeometry(0.52, 0.52, 0.78, 20, 1, false, 0, Math.PI),
      whiteMat
    );
    tunnelBody.rotation.z = -Math.PI / 2;
    tunnelBody.rotation.x = Math.PI / 2;
    tunnelBody.position.set(0, 0.36, 0);
    addCrayonOutline(tunnelBody, 0.032);
    tunnelGroup.add(tunnelBody);

    // Tunnel Side Walls
    [-0.46, 0.46].forEach((wz) => {
      const wall = new THREE.Mesh(
        new THREE.BoxGeometry(0.76, 0.38, 0.12),
        whiteMat
      );
      wall.position.set(0, 0.19, wz);
      addCrayonOutline(wall, 0.026);
      tunnelGroup.add(wall);
    });

    // Front Icy Archway Trim Frame
    const archFrame = new THREE.Mesh(
      new THREE.TorusGeometry(0.5, 0.055, 12, 24, Math.PI),
      iceMat
    );
    archFrame.rotation.y = Math.PI / 2;
    archFrame.position.set(0.39, 0.36, 0);
    addCrayonOutline(archFrame, 0.026);
    tunnelGroup.add(archFrame);

    // Recessed Dark Interior Doorway Opening inside the Tunnel
    const darkDoorArch = new THREE.Mesh(
      new THREE.CircleGeometry(0.45, 20, 0, Math.PI),
      darkSlateMat
    );
    darkDoorArch.rotation.y = Math.PI / 2;
    darkDoorArch.position.set(0.37, 0.36, 0);
    tunnelGroup.add(darkDoorArch);

    const darkDoorRect = new THREE.Mesh(
      new THREE.PlaneGeometry(0.9, 0.36),
      darkSlateMat
    );
    darkDoorRect.rotation.y = Math.PI / 2;
    darkDoorRect.position.set(0.37, 0.18, 0);
    tunnelGroup.add(darkDoorRect);

    igloo.add(tunnelGroup);
    igloo.position.set(-5.95, 0, 1.1);
    igloo.rotation.y = -0.18;
    sceneryGroup.add(igloo);

    // Fully Dressed 3D Snowman (Top Hat + Red Scarf + Coal Eyes & Buttons + Carrot Nose + Twig Arms!)
    const snowman = new THREE.Group();
    const sBase = new THREE.Mesh(
      new THREE.SphereGeometry(0.58, 20, 16),
      whiteMat
    );
    sBase.scale.set(1.08, 0.92, 1.08);
    sBase.position.y = 0.5;
    addCrayonOutline(sBase, 0.032);
    snowman.add(sBase);

    const sMid = new THREE.Mesh(
      new THREE.SphereGeometry(0.44, 18, 14),
      whiteMat
    );
    sMid.scale.set(1.05, 0.94, 1.05);
    sMid.position.y = 1.24;
    addCrayonOutline(sMid, 0.032);
    snowman.add(sMid);

    const sHead = new THREE.Mesh(
      new THREE.SphereGeometry(0.32, 18, 14),
      whiteMat
    );
    sHead.position.y = 1.84;
    addCrayonOutline(sHead, 0.032);
    snowman.add(sHead);

    // Cozy Red Knitted Scarf around Neck + Hanging Scarf Tail
    const scarfRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.31, 0.068, 12, 24),
      redMat
    );
    scarfRing.rotation.x = Math.PI / 2;
    scarfRing.position.y = 1.56;
    addCrayonOutline(scarfRing, 0.026);
    snowman.add(scarfRing);

    const scarfTail = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.055, 0.28, 8, 10),
      redMat
    );
    scarfTail.position.set(0.18, 1.38, 0.34);
    scarfTail.rotation.z = -0.18;
    addCrayonOutline(scarfTail, 0.025);
    snowman.add(scarfTail);

    // Classic Black Top Hat with Red Ribbon Band
    const hatBrim = new THREE.Mesh(
      new THREE.CylinderGeometry(0.38, 0.38, 0.05, 20),
      darkSlateMat
    );
    hatBrim.position.y = 2.12;
    addCrayonOutline(hatBrim, 0.026);
    snowman.add(hatBrim);

    const hatCylinder = new THREE.Mesh(
      new THREE.CylinderGeometry(0.25, 0.23, 0.38, 18),
      darkSlateMat
    );
    hatCylinder.position.y = 2.32;
    addCrayonOutline(hatCylinder, 0.028);
    snowman.add(hatCylinder);

    const hatRibbon = new THREE.Mesh(
      new THREE.CylinderGeometry(0.242, 0.236, 0.07, 18),
      redMat
    );
    hatRibbon.position.y = 2.18;
    snowman.add(hatRibbon);

    // Coal Eyes, Carrot Nose & 3 Coal Chest Buttons
    [-0.11, 0.11].forEach((ex) => {
      const eye = new THREE.Mesh(
        new THREE.SphereGeometry(0.042, 10, 10),
        darkSlateMat
      );
      eye.position.set(ex, 1.9, 0.29);
      snowman.add(eye);
    });

    const carrot = new THREE.Mesh(
      new THREE.ConeGeometry(0.068, 0.34, 10),
      orangeMat
    );
    carrot.rotation.x = Math.PI / 2;
    carrot.position.set(0, 1.83, 0.38);
    addCrayonOutline(carrot, 0.022);
    snowman.add(carrot);

    [1.36, 1.18, 0.72].forEach((by, bIdx) => {
      const btn = new THREE.Mesh(
        new THREE.SphereGeometry(0.048, 10, 10),
        darkSlateMat
      );
      btn.position.set(0, by, bIdx === 2 ? 0.58 : 0.43);
      snowman.add(btn);
    });

    // Wooden Twig Arms
    [-1, 1].forEach((s) => {
      const twig = new THREE.Mesh(
        new THREE.CylinderGeometry(0.028, 0.036, 0.65, 8),
        woodMat
      );
      twig.position.set(s * 0.62, 1.32, 0);
      twig.rotation.z = -s * 1.05;
      addCrayonOutline(twig, 0.022);
      snowman.add(twig);
    });

    snowman.position.set(5.85, 0, 1.5);
    snowman.rotation.y = -0.55;
    sceneryGroup.add(snowman);
  }
  // =========================================================================
  // MAP 5: JUNGLE RUN (Stepped Mayan Temple Pyramid + Twin Waterfalls + Palms)
  // =========================================================================
  else if (theme.id === 'space_station') {
    const stoneMat = createCrayonToonMaterial('#78716C', maxAnisotropy, 1);
    const lightStoneMat = createCrayonToonMaterial('#A8A29E', maxAnisotropy, 1);

    buildPerimeterBushesAndPebbles();
    buildPalmTree(-6.0, -4.2, 1.12, 1);
    buildPalmTree(6.0, -4.2, 1.12, -1);
    buildPuffyTree(-6.1, 2.0, 1.05);
    buildPuffyTree(6.1, 2.0, 1.05);

    // Grand 4-Tier Stepped Mayan Temple Pyramid with Balustrades, Sanctuary Doorway & Golden Braziers!
    const temple = new THREE.Group();
    for (let step = 0; step < 4; step++) {
      const block = new THREE.Mesh(
        new THREE.BoxGeometry(5.4 - step * 1.1, 0.82, 3.8 - step * 0.72),
        step % 2 === 0 ? stoneMat : lightStoneMat
      );
      block.position.y = 0.41 + step * 0.82;
      addCrayonOutline(block, 0.035);
      temple.add(block);
    }

    // Top Sanctuary Shrine + Roof Cornice + Dark Doorway
    const shrineTop = new THREE.Mesh(
      new THREE.BoxGeometry(1.75, 0.92, 1.35),
      stoneMat
    );
    shrineTop.position.y = 3.74;
    addCrayonOutline(shrineTop, 0.035);
    temple.add(shrineTop);

    const shrineRoof = new THREE.Mesh(
      new THREE.BoxGeometry(1.95, 0.24, 1.5),
      lightStoneMat
    );
    shrineRoof.position.y = 4.28;
    addCrayonOutline(shrineRoof, 0.03);
    temple.add(shrineRoof);

    const shrineDoor = new THREE.Mesh(
      new THREE.PlaneGeometry(0.68, 0.68),
      darkSlateMat
    );
    shrineDoor.position.set(0, 3.62, 0.69);
    temple.add(shrineDoor);

    // Stepped Central Staircase + Flanking Stone Balustrades
    const stairs = new THREE.Mesh(
      new THREE.BoxGeometry(1.22, 3.45, 1.05),
      lightStoneMat
    );
    stairs.position.set(0, 1.52, 1.48);
    stairs.rotation.x = -0.36;
    addCrayonOutline(stairs, 0.03);
    temple.add(stairs);

    [-0.72, 0.72].forEach((bx) => {
      const rail = new THREE.Mesh(
        new THREE.BoxGeometry(0.22, 3.55, 1.15),
        stoneMat
      );
      rail.position.set(bx, 1.56, 1.48);
      rail.rotation.x = -0.36;
      addCrayonOutline(rail, 0.028);
      temple.add(rail);

      // Golden Torch Brazier at Foot of Balustrade
      const torch = new THREE.Mesh(
        new THREE.SphereGeometry(0.22, 12, 10),
        goldMat
      );
      torch.position.set(bx, 0.55, 2.25);
      addCrayonOutline(torch, 0.025);
      temple.add(torch);
    });

    temple.position.set(0, 0, -8.5);
    sceneryGroup.add(temple);

    // Twin Jungle Waterfalls cascading off the Left & Right Mossy Cliffs
    buildWaterfall(-7.4, -0.02, -1.5, 1.35, 2.4, -Math.PI / 2, '#38BDF8');
    buildWaterfall(7.4, -0.02, -1.5, 1.35, 2.4, Math.PI / 2, '#38BDF8');
  }
  // =========================================================================
  // MAP 6: PORTRAIT COURT (Clean Crayon Cove Harbour — Lighthouse, Pier, Palms & Sky Blimp!)
  // =========================================================================
  else if (theme.id === 'pirate_cove') {
    buildPerimeterBushesAndPebbles();

    buildBeachUmbrellaSet(-5.6, -1.5, 0.14);
    buildBeachUmbrellaSet(5.6, -1.5, -0.14);

    // Lush Curved Coconut Palm Trees framing the Cove Corners
    buildPalmTree(-6.0, -5.4, 1.15, 1);
    buildPalmTree(6.0, -5.4, 1.12, -1);
    buildPalmTree(-6.2, 3.2, 1.04, 1);
    buildPalmTree(6.2, 3.2, 1.04, -1);
    buildPuffyTree(-3.8, -8.2, 0.95);
    buildPuffyTree(3.8, -8.2, 0.92);

    // Grounded Wooden Beach Boardwalk Pier on Right Coastline
    const pierGroup = new THREE.Group();
    const pilingGeo = new THREE.CylinderGeometry(0.12, 0.13, 1.4, 10);
    for (let p = 0; p < 6; p++) {
      const px = 6.8 + p * 0.56;
      const plank = new THREE.Mesh(
        new THREE.BoxGeometry(1.55, 0.14, 0.44),
        woodMat
      );
      plank.position.set(px, 0.08, 4.2);
      plank.rotation.y = Math.PI / 2;
      plank.castShadow = true;
      addCrayonOutline(plank, 0.028);
      pierGroup.add(plank);

      if (p % 2 === 1) {
        [-0.6, 0.6].forEach((oz) => {
          const piling = new THREE.Mesh(pilingGeo, woodMat);
          piling.position.set(px, -0.28, 4.2 + oz);
          addCrayonOutline(piling, 0.028);
          pierGroup.add(piling);
        });
      }
    }
    sceneryGroup.add(pierGroup);

    // 6. Iconic Red-and-White Striped Lighthouse on Back-Right Corner
    const lh = new THREE.Group();
    const lhRockBase = new THREE.Mesh(
      new THREE.CylinderGeometry(1.08, 1.28, 0.42, 18),
      rockMat
    );
    lhRockBase.position.y = 0.21;
    addCrayonOutline(lhRockBase, 0.03);
    lh.add(lhRockBase);

    for (let i = 0; i < 4; i++) {
      const seg = new THREE.Mesh(
        new THREE.CylinderGeometry(0.74 - i * 0.08, 0.82 - i * 0.08, 1.15, 20),
        i % 2 === 0 ? redMat : whiteMat
      );
      seg.position.y = 0.92 + i * 1.15;
      seg.castShadow = true;
      addCrayonOutline(seg, 0.035);
      lh.add(seg);
    }
    const galleryDeck = new THREE.Mesh(
      new THREE.CylinderGeometry(0.7, 0.7, 0.16, 20),
      darkSlateMat
    );
    galleryDeck.position.y = 4.98;
    addCrayonOutline(galleryDeck, 0.03);
    lh.add(galleryDeck);

    const beaconRotor = new THREE.Group();
    beaconRotor.position.y = 5.28;
    const beaconGlass = new THREE.Mesh(
      new THREE.CylinderGeometry(0.45, 0.45, 0.52, 16),
      goldMat
    );
    beaconRotor.add(beaconGlass);
    lh.add(beaconRotor);
    spinningProps.push(beaconRotor);

    const roof = new THREE.Mesh(
      new THREE.ConeGeometry(0.74, 0.85, 20),
      redMat
    );
    roof.position.y = 5.88;
    addCrayonOutline(roof, 0.038);
    lh.add(roof);

    lh.position.set(5.6, 0, -6.6);
    sceneryGroup.add(lh);

    // 7. Stylized Textured Sky Biplane & Airship in Upper Sky
    buildSkyBlimp(-2.2, 6.4, -11.5, 'biplane', '#2563EB', '#FACC15', '#EF4444', 1.05);
    buildSkyBlimp(4.5, 7.8, -14.2, 'airship', '#0284C7', '#FDE047', '#F43F5E', 0.85);
  }
  // =========================================================================
  // MAP 7: COZY BEACH (1st-Edition Warm All-Sand Beach + Sandcastles + Palms)
  // =========================================================================
  else {
    buildPerimeterBushesAndPebbles();
    buildPalmTree(-5.8, -4.4, 1.15, 1);
    buildPalmTree(5.8, -4.4, 1.15, -1);
    buildPalmTree(-6.2, 2.8, 1.02, 1);
    buildPalmTree(6.2, 2.8, 1.02, -1);
    buildBeachUmbrellaSet(-5.6, -1.2, 0.15);
    buildBeachUmbrellaSet(5.6, -1.2, -0.14);

    [-5.6, 5.6].forEach((cx) => {
      const castle = new THREE.Group();
      const base = new THREE.Mesh(
        new THREE.BoxGeometry(1.3, 0.65, 1.3),
        goldMat
      );
      base.position.y = 0.32;
      addCrayonOutline(base, 0.035);
      castle.add(base);
      [-0.45, 0.45].forEach((tx) => {
        const turret = new THREE.Mesh(
          new THREE.CylinderGeometry(0.25, 0.29, 1.15, 12),
          goldMat
        );
        turret.position.set(tx, 0.58, 0.42);
        addCrayonOutline(turret, 0.035);
        castle.add(turret);

        const roof = new THREE.Mesh(
          new THREE.ConeGeometry(0.3, 0.44, 12),
          redMat
        );
        roof.position.set(tx, 1.35, 0.42);
        addCrayonOutline(roof, 0.03);
        castle.add(roof);
      });
      castle.position.set(cx, 0, 2.4);
      sceneryGroup.add(castle);
    });
  }

  buildCloud(-8.5, 5.8, -11.5, 1.1);
  buildCloud(1.5, 6.5, -13.0, 1.25);
  buildCloud(8.8, 5.5, -10.5, 1.05);

  return {
    sceneryGroup,
    clouds,
    spinningProps,
    waveRings,
    waterfallTextures,
    waterfallFoams,
  };
}

/**
 * Shared Offscreen 3D WebGL Renderer for Real Game Map Snapshots!
 * Reusing a single WebGLRenderer avoids browser WebGL context limits so EVERY map card
 * (both Volleyball Courts AND Gun Fight Arenas) renders a 100% REAL 3D Game Screenshot!
 */
const cachedMapThumbnails: Partial<Record<string, string>> = {};
let sharedThumbCanvas: HTMLCanvasElement | null = null;
let sharedThumbRenderer: THREE.WebGLRenderer | null = null;

function getSharedThumbRenderer(width: number, height: number): {
  canvas: HTMLCanvasElement;
  renderer: THREE.WebGLRenderer;
} {
  if (!sharedThumbCanvas) {
    sharedThumbCanvas = document.createElement('canvas');
  }
  sharedThumbCanvas.width = width;
  sharedThumbCanvas.height = height;

  if (!sharedThumbRenderer) {
    sharedThumbRenderer = new THREE.WebGLRenderer({
      canvas: sharedThumbCanvas,
      antialias: true,
      alpha: false,
      preserveDrawingBuffer: true,
      powerPreference: 'high-performance',
    });
    sharedThumbRenderer.outputColorSpace = THREE.SRGBColorSpace;
    sharedThumbRenderer.toneMapping = THREE.ACESFilmicToneMapping;
    sharedThumbRenderer.toneMappingExposure = 0.98;
  }
  sharedThumbRenderer.setSize(width, height, false);
  return { canvas: sharedThumbCanvas, renderer: sharedThumbRenderer };
}

export function setLiveRushMapThumbnail(mapId: string, dataUrl: string) {
  if (!dataUrl) return;
  cachedMapThumbnails[`rush_exact_gunfight_v8_${mapId}_persp`] = dataUrl;
}

function createThumbCastleStoneTex(baseHex: string, mortarHex: string): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = mortarHex;
  ctx.fillRect(0, 0, size, size);
  const rows = 4;
  const cols = 2;
  const rh = size / rows;
  const cw = size / cols;
  for (let r = 0; r < rows; r++) {
    const ox = r % 2 === 1 ? cw * 0.5 : 0;
    for (let c = -1; c <= cols; c++) {
      ctx.fillStyle = baseHex;
      ctx.beginPath();
      ctx.roundRect(c * cw + ox + 4, r * rh + 4, cw - 8, rh - 8, 8);
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#0F172A';
      ctx.stroke();
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function createThumbContainerTex(baseHex: string, accentHex: string): THREE.CanvasTexture {
  const size = 256;
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
    ctx.fillRect(rx, 22, ribW * 0.45, size - 44);
    ctx.fillStyle = `#${lightCol.getHexString()}`;
    ctx.fillRect(rx + ribW * 0.45, 22, ribW * 0.35, size - 44);
    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(rx, 22);
    ctx.lineTo(rx, size - 22);
    ctx.stroke();
  }
  ctx.fillStyle = '#1E293B';
  ctx.fillRect(0, 0, size, 22);
  ctx.fillRect(0, size - 22, size, 22);
  ctx.fillStyle = accentHex;
  ctx.fillRect(0, size * 0.44, size, 18);
  ctx.strokeStyle = '#0F172A';
  ctx.lineWidth = 2.5;
  ctx.strokeRect(0, size * 0.44, size, 18);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Instant, Zero-Lag 800x500 HD 2D Canvas Diorama Renderer for Volleyball, Gun Fight & Nuke Thumbnails!
 * Eliminates synchronous WebGL context stalls when opening Mode Select or Arena Select while delivering
 * 4x higher resolution (800x500 PNG/WebP quality) with crisp cel-shaded art & ink outlines.
 */
function drawStylizedCloud(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  scale: number
) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);
  ctx.fillStyle = '#F8FAFC';
  ctx.strokeStyle = '#0F172A';
  ctx.lineWidth = 4;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.arc(-28, 6, 22, Math.PI * 0.5, Math.PI * 1.5);
  ctx.arc(0, -8, 30, Math.PI * 1.05, Math.PI * 1.95);
  ctx.arc(30, 6, 20, Math.PI * 1.5, Math.PI * 0.5);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawStylizedTree(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  leafHex1: string = '#22C55E',
  leafHex2: string = '#16A34A'
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.strokeStyle = '#0F172A';
  ctx.lineWidth = 4;
  ctx.fillStyle = '#854D0E';
  ctx.beginPath();
  ctx.roundRect(-7, -36, 14, 38, 4);
  ctx.fill();
  ctx.stroke();

  const puffs = [
    { ox: -16, oy: -42, r: 20, col: leafHex2 },
    { ox: 16, oy: -42, r: 20, col: leafHex2 },
    { ox: 0, oy: -56, r: 25, col: leafHex1 },
  ];
  puffs.forEach((p) => {
    ctx.fillStyle = p.col;
    ctx.beginPath();
    ctx.arc(p.ox, p.oy, p.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  });
  ctx.restore();
}

function drawStylizedChibi(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  shirtHex: string,
  hatHex: string,
  hasGun: boolean = false
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);

  // Shadow
  ctx.fillStyle = 'rgba(15, 23, 42, 0.35)';
  ctx.beginPath();
  ctx.ellipse(0, 4, 20, 7, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#0F172A';
  ctx.lineWidth = 4.2;

  // Legs
  ctx.fillStyle = '#1E293B';
  ctx.beginPath();
  ctx.roundRect(-12, -16, 9, 16, 4);
  ctx.roundRect(3, -16, 9, 16, 4);
  ctx.fill();
  ctx.stroke();

  // Hoodie Torso
  ctx.fillStyle = shirtHex;
  ctx.beginPath();
  ctx.roundRect(-17, -42, 34, 28, 10);
  ctx.fill();
  ctx.stroke();

  // Head
  ctx.fillStyle = '#FDE68A';
  ctx.beginPath();
  ctx.arc(0, -58, 19, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Cap Dome
  ctx.fillStyle = hatHex;
  ctx.beginPath();
  ctx.arc(0, -63, 19.5, Math.PI, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Eyes
  ctx.fillStyle = '#0F172A';
  ctx.beginPath();
  ctx.arc(-6, -56, 2.8, 0, Math.PI * 2);
  ctx.arc(6, -56, 2.8, 0, Math.PI * 2);
  ctx.fill();

  if (hasGun) {
    ctx.fillStyle = '#334155';
    ctx.beginPath();
    ctx.roundRect(8, -36, 26, 9, 3);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#FACC15';
    ctx.beginPath();
    ctx.arc(36, -31.5, 4.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/**
 * Builds a Sculpted Multi-Ridge Craggy 3D Alpine Mountain Range ("Pahad")
 * Replaces simple cones/cylinders with faceted craggy rock peaks, secondary flanking ridges,
 * snow-pack glacier overhangs, alpine pine trees on the foothills, and boulder outcrops!
 */
export function createSculptedAlpineMountainPeak(
  radius: number,
  height: number,
  seed: number = 1,
  isJungle: boolean = false
): THREE.Group {
  const mGrp = new THREE.Group();

  const slateRockMat = new THREE.MeshToonMaterial({
    color: new THREE.Color(isJungle ? '#57534E' : '#475569'),
    gradientMap: getToonGradientMap(),
  });
  const graniteMat = new THREE.MeshToonMaterial({
    color: new THREE.Color(isJungle ? '#78716C' : '#64748B'),
    gradientMap: getToonGradientMap(),
  });
  const darkCragMat = new THREE.MeshToonMaterial({
    color: new THREE.Color(isJungle ? '#44403C' : '#334155'),
    gradientMap: getToonGradientMap(),
  });
  const meadowGreenMat = new THREE.MeshToonMaterial({
    color: new THREE.Color(isJungle ? '#15803D' : '#16A34A'),
    gradientMap: getToonGradientMap(),
  });
  const pineLeafMat = new THREE.MeshToonMaterial({
    color: new THREE.Color(isJungle ? '#166534' : '#15803D'),
    gradientMap: getToonGradientMap(),
  });
  const snowGlacierMat = new THREE.MeshToonMaterial({
    color: new THREE.Color('#F1F5F9'),
    gradientMap: getToonGradientMap(),
  });

  // Helper to sculpt a faceted craggy rock cone with natural ridge lines
  const buildFacetedPeak = (
    r: number,
    h: number,
    radialSegs: number,
    mat: THREE.Material,
    phaseOffset: number
  ): THREE.Mesh => {
    const geo = new THREE.ConeGeometry(r, h, radialSegs, 5);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const vx = pos.getX(i);
      const vy = pos.getY(i);
      const vz = pos.getZ(i);
      const normY = (vy + h * 0.5) / h; // 0 at base, 1 at summit
      if (normY > 0.02 && normY < 0.96) {
        const ang = Math.atan2(vz, vx);
        const ridgeWave =
          1.0 +
          0.14 * Math.sin(ang * 5 + phaseOffset) +
          0.08 * Math.cos(ang * 3 - normY * 4.0);
        const terraceStep = 1.0 + 0.05 * Math.sin(normY * Math.PI * 6);
        pos.setX(i, vx * ridgeWave * terraceStep);
        pos.setZ(i, vz * ridgeWave * terraceStep);
      }
    }
    geo.computeVertexNormals();
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    addCrayonOutline(mesh, 0.014);
    return mesh;
  };

  // 1. Primary Central Craggy Mountain Peak
  const mainPeak = buildFacetedPeak(
    radius,
    height,
    9,
    seed % 2 === 0 ? slateRockMat : graniteMat,
    seed * 1.7
  );
  mainPeak.position.y = height * 0.5;
  mGrp.add(mainPeak);

  // 2. Sculpted Multi-Lobe Glacier Snow Cap on Main Summit
  const snowH = height * 0.36;
  const snowR = radius * 0.39;
  const snowGeo = new THREE.ConeGeometry(snowR, snowH, 9, 3);
  const sPos = snowGeo.attributes.position;
  for (let i = 0; i < sPos.count; i++) {
    const vx = sPos.getX(i);
    const vy = sPos.getY(i);
    const vz = sPos.getZ(i);
    const normY = (vy + snowH * 0.5) / snowH;
    const ang = Math.atan2(vz, vx);
    if (normY < 0.35) {
      // Scalloped snow-pack glacier fingers draping down the mountain ridges
      const drape = Math.sin(ang * 5 + seed * 1.7) * (snowH * 0.14);
      sPos.setY(i, vy + drape);
    }
    if (normY > 0.02 && normY < 0.95) {
      const rScale = 1.04 + 0.12 * Math.sin(ang * 5 + seed * 1.7);
      sPos.setX(i, vx * rScale);
      sPos.setZ(i, vz * rScale);
    }
  }
  snowGeo.computeVertexNormals();
  const snowCap = new THREE.Mesh(snowGeo, snowGlacierMat);
  snowCap.position.y = height - snowH * 0.48;
  addCrayonOutline(snowCap, 0.016);
  mGrp.add(snowCap);

  // 3. Secondary Flanking Left & Right Craggy Ridge Peaks (Creates authentic multi-peak alpine silhouette!)
  [
    {
      ox: -radius * 0.56,
      oz: radius * 0.18,
      r: radius * 0.62,
      h: height * 0.68,
      mat: darkCragMat,
      rotY: 0.45,
      hasSnow: true,
    },
    {
      ox: radius * 0.54,
      oz: -radius * 0.14,
      r: radius * 0.56,
      h: height * 0.58,
      mat: graniteMat,
      rotY: -0.6,
      hasSnow: true,
    },
    {
      ox: 0,
      oz: radius * 0.48,
      r: radius * 0.52,
      h: height * 0.44,
      mat: slateRockMat,
      rotY: 1.1,
      hasSnow: false,
    },
  ].forEach((sub, idx) => {
    const subPeak = buildFacetedPeak(
      sub.r,
      sub.h,
      8,
      sub.mat,
      seed * 2.3 + idx * 1.9
    );
    subPeak.position.set(sub.ox, sub.h * 0.5, sub.oz);
    subPeak.rotation.y = sub.rotY;
    mGrp.add(subPeak);

    if (sub.hasSnow) {
      const subSnow = new THREE.Mesh(
        new THREE.ConeGeometry(sub.r * 0.38, sub.h * 0.32, 8),
        snowGlacierMat
      );
      subSnow.position.set(sub.ox, sub.h * 0.84, sub.oz);
      subSnow.rotation.y = sub.rotY;
      addCrayonOutline(subSnow, 0.015);
      mGrp.add(subSnow);
    }
  });

  // 4. Lush Alpine Foothill Terrace Shelf & Pine Trees Around the Lower Slopes
  const foothillBelt = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.72, radius * 0.88, height * 0.16, 10),
    meadowGreenMat
  );
  foothillBelt.position.y = height * 0.24;
  addCrayonOutline(foothillBelt, 0.014);
  mGrp.add(foothillBelt);

  for (let p = 0; p < 5; p++) {
    const ang = (p / 5) * Math.PI * 1.4 - Math.PI * 0.2;
    const pr = radius * 0.68;
    const px = Math.sin(ang) * pr;
    const pz = Math.cos(ang) * pr;
    const py = height * 0.29;

    const pineTree = new THREE.Group();
    pineTree.position.set(px, py, pz);
    const tier1 = new THREE.Mesh(
      new THREE.ConeGeometry(1.45, 2.8, 7),
      pineLeafMat
    );
    tier1.position.y = 1.4;
    addCrayonOutline(tier1, 0.018);
    const tier2 = new THREE.Mesh(
      new THREE.ConeGeometry(1.1, 2.4, 7),
      meadowGreenMat
    );
    tier2.position.y = 2.7;
    addCrayonOutline(tier2, 0.018);
    pineTree.add(tier1, tier2);
    mGrp.add(pineTree);
  }

  return mGrp;
}

/**
 * Builds 3D Sculpted Grass Blade Tufts, Clover Cushions & Wildflowers
 * for lush tactile ground borders around the arena!
 */
export function createLushGrassBorderCluster(
  isJungle: boolean = false,
  withFlowers: boolean = true
): THREE.Group {
  const cluster = new THREE.Group();

  const bladeMat1 = new THREE.MeshToonMaterial({
    color: new THREE.Color(isJungle ? '#16A34A' : '#22C55E'),
    gradientMap: getToonGradientMap(),
  });
  const bladeMat2 = new THREE.MeshToonMaterial({
    color: new THREE.Color(isJungle ? '#22C55E' : '#4ADE80'),
    gradientMap: getToonGradientMap(),
  });
  const flowerGoldMat = new THREE.MeshToonMaterial({
    color: new THREE.Color('#FACC15'),
    gradientMap: getToonGradientMap(),
  });
  const flowerWhiteMat = new THREE.MeshToonMaterial({
    color: new THREE.Color('#F8FAFC'),
    gradientMap: getToonGradientMap(),
  });
  const flowerPinkMat = new THREE.MeshToonMaterial({
    color: new THREE.Color('#FB7185'),
    gradientMap: getToonGradientMap(),
  });

  // Soft Ground Cushion Mound
  const cushion = new THREE.Mesh(
    new THREE.SphereGeometry(0.42, 10, 8),
    bladeMat1
  );
  cushion.scale.set(1.25, 0.34, 1.15);
  cushion.position.y = 0.08;
  addCrayonOutline(cushion, 0.02);
  cluster.add(cushion);

  // 7 Tapered 3D Grass Blades fanning outward
  const bladeConfigs = [
    { ox: 0, oz: 0, h: 0.62, r: 0.11, rx: 0.06, rz: 0 },
    { ox: -0.18, oz: 0.08, h: 0.52, r: 0.095, rx: 0.14, rz: 0.28 },
    { ox: 0.18, oz: 0.08, h: 0.54, r: 0.095, rx: 0.14, rz: -0.28 },
    { ox: -0.14, oz: -0.14, h: 0.48, r: 0.09, rx: -0.2, rz: 0.24 },
    { ox: 0.14, oz: -0.14, h: 0.5, r: 0.09, rx: -0.2, rz: -0.24 },
    { ox: -0.28, oz: -0.02, h: 0.42, r: 0.082, rx: 0.05, rz: 0.42 },
    { ox: 0.28, oz: -0.02, h: 0.44, r: 0.082, rx: 0.05, rz: -0.42 },
  ];

  bladeConfigs.forEach((b, idx) => {
    const blade = new THREE.Mesh(
      new THREE.ConeGeometry(b.r, b.h, 5),
      idx % 2 === 0 ? bladeMat2 : bladeMat1
    );
    blade.scale.set(1.0, 1.0, 0.48);
    blade.position.set(b.ox, b.h * 0.46, b.oz);
    blade.rotation.set(b.rx, idx * 0.5, b.rz);
    addCrayonOutline(blade, 0.018);
    cluster.add(blade);
  });

  if (withFlowers) {
    [
      { fx: -0.16, fy: 0.28, fz: 0.18, petalMat: flowerWhiteMat },
      { fx: 0.18, fy: 0.31, fz: 0.14, petalMat: flowerPinkMat },
    ].forEach((fl) => {
      const flw = new THREE.Group();
      flw.position.set(fl.fx, fl.fy, fl.fz);
      const center = new THREE.Mesh(
        new THREE.SphereGeometry(0.052, 8, 8),
        flowerGoldMat
      );
      flw.add(center);
      for (let p = 0; p < 5; p++) {
        const a = (p / 5) * Math.PI * 2;
        const petal = new THREE.Mesh(
          new THREE.SphereGeometry(0.046, 8, 6),
          fl.petalMat
        );
        petal.scale.set(1.1, 0.55, 1.1);
        petal.position.set(Math.cos(a) * 0.068, -0.01, Math.sin(a) * 0.068);
        flw.add(petal);
      }
      cluster.add(flw);
    });
  }

  return cluster;
}

export function getMapThumbnailDataUrl(theme: CourtTheme): string {
  const cacheKey = `volley_hd_2d_v12_${theme.id}`;
  if (cachedMapThumbnails[cacheKey]) {
    return cachedMapThumbnails[cacheKey]!;
  }
  if (typeof document === 'undefined') return '';

  const width = 960;
  const height = 600;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // 1. Rich Sunlit Sky Gradient with Golden Sunbeams
  const skyGrad = ctx.createLinearGradient(0, 0, 0, height * 0.62);
  skyGrad.addColorStop(0, theme.skyTop || '#1D4ED8');
  skyGrad.addColorStop(0.55, '#38BDF8');
  skyGrad.addColorStop(1, theme.skyHorizon || '#BAE6FD');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, width, height);

  // Sunburst Rays
  ctx.save();
  ctx.translate(width * 0.5, 130);
  for (let r = 0; r < 12; r++) {
    ctx.rotate(Math.PI / 6);
    ctx.fillStyle = 'rgba(254, 249, 195, 0.14)';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-28, -420);
    ctx.lineTo(28, -420);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  // Golden Sun Disc
  const sunHalo = ctx.createRadialGradient(width * 0.5, 130, 15, width * 0.5, 130, 110);
  sunHalo.addColorStop(0, 'rgba(254, 240, 138, 0.95)');
  sunHalo.addColorStop(0.5, 'rgba(253, 224, 71, 0.38)');
  sunHalo.addColorStop(1, 'rgba(253, 224, 71, 0)');
  ctx.fillStyle = sunHalo;
  ctx.beginPath();
  ctx.arc(width * 0.5, 130, 110, 0, Math.PI * 2);
  ctx.fill();

  drawStylizedCloud(ctx, 165, 96, 1.2);
  drawStylizedCloud(ctx, 795, 92, 1.15);

  // 2. Sculpted Multi-Peak Alpine Mountains on Horizon
  [
    { x: 155, w: 260, h: 175, dark: '#334155', light: '#64748B' },
    { x: 805, w: 270, h: 185, dark: '#334155', light: '#64748B' },
  ].forEach((m) => {
    ctx.lineWidth = 4.5;
    ctx.strokeStyle = '#0F172A';
    // Left lit face
    ctx.fillStyle = m.light;
    ctx.beginPath();
    ctx.moveTo(m.x - m.w * 0.5, 275);
    ctx.lineTo(m.x, 275 - m.h);
    ctx.lineTo(m.x + m.w * 0.06, 275);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Right shadow face
    ctx.fillStyle = m.dark;
    ctx.beginPath();
    ctx.moveTo(m.x, 275 - m.h);
    ctx.lineTo(m.x + m.w * 0.5, 275);
    ctx.lineTo(m.x - m.w * 0.04, 275);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Scalloped Snow Glacier Cap
    ctx.fillStyle = '#F8FAFC';
    ctx.beginPath();
    ctx.moveTo(m.x - m.w * 0.19, 275 - m.h * 0.62);
    ctx.lineTo(m.x, 275 - m.h);
    ctx.lineTo(m.x + m.w * 0.19, 275 - m.h * 0.62);
    ctx.lineTo(m.x + m.w * 0.07, 275 - m.h * 0.52);
    ctx.lineTo(m.x - m.w * 0.06, 275 - m.h * 0.55);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  });

  // 3. Turquoise Ocean Lagoon & Caustics
  const waterGrad = ctx.createLinearGradient(0, 265, 0, height);
  waterGrad.addColorStop(0, '#38BDF8');
  waterGrad.addColorStop(0.4, theme.waterColor || '#0284C7');
  waterGrad.addColorStop(1, '#0369A1');
  ctx.fillStyle = waterGrad;
  ctx.fillRect(0, 265, width, height - 265);

  // Island Cliff & Mowed Grass Turf Plateau
  ctx.strokeStyle = '#0F172A';
  ctx.lineWidth = 5.5;
  ctx.fillStyle = theme.groundColor || '#475569';
  ctx.beginPath();
  ctx.roundRect(110, 262, 740, 295, 56);
  ctx.fill();
  ctx.stroke();

  const turfGrad = ctx.createLinearGradient(0, 238, 0, 525);
  turfGrad.addColorStop(0, '#34D399');
  turfGrad.addColorStop(1, '#10B981');
  ctx.fillStyle = turfGrad;
  ctx.beginPath();
  ctx.roundRect(126, 238, 708, 282, 48);
  ctx.fill();
  ctx.stroke();

  // Coastal Lighthouse on Right Cliff
  ctx.fillStyle = '#EF4444';
  ctx.beginPath();
  ctx.roundRect(756, 148, 34, 98, 6);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#F8FAFC';
  ctx.fillRect(758, 172, 30, 22);
  ctx.fillRect(758, 212, 30, 20);

  // 4. Perspective 3D Volleyball Court with Mowed Stripes
  ctx.fillStyle = theme.courtInnerColor || '#38BDF8';
  ctx.strokeStyle = '#0F172A';
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(265, 262);
  ctx.lineTo(695, 262);
  ctx.lineTo(775, 492);
  ctx.lineTo(185, 492);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 4.5;
  ctx.stroke();

  drawStylizedTree(ctx, 185, 285, 1.2);
  drawStylizedTree(ctx, 775, 285, 1.2);

  // 5. Volleyball Net across Center Court
  ctx.strokeStyle = '#0F172A';
  ctx.lineWidth = 5.5;
  ctx.fillStyle = 'rgba(248, 250, 252, 0.9)';
  ctx.beginPath();
  ctx.roundRect(220, 326, 520, 42, 6);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#F43F5E';
  ctx.fillRect(220, 326, 520, 10);

  // 6. 2v2 Athletes & Pro Volleyball in Flight
  drawStylizedChibi(ctx, 345, 315, 0.95, '#EF4444', '#1E293B', false);
  drawStylizedChibi(ctx, 610, 315, 0.95, '#DC2626', '#FACC15', false);
  drawStylizedChibi(ctx, 355, 448, 1.18, '#2563EB', '#FACC15', false);
  drawStylizedChibi(ctx, 595, 448, 1.18, '#0284C7', '#1E293B', false);

  // Glowing Spike Trajectory Arc & Ball
  ctx.strokeStyle = 'rgba(254, 240, 138, 0.88)';
  ctx.lineWidth = 6;
  ctx.setLineDash([12, 8]);
  ctx.beginPath();
  ctx.moveTo(355, 248);
  ctx.quadraticCurveTo(480, 135, 585, 295);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = '#FACC15';
  ctx.strokeStyle = '#0F172A';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(475, 188, 26, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  const dataUrl = canvas.toDataURL('image/png');
  cachedMapThumbnails[cacheKey] = dataUrl;
  return dataUrl;
}

export function getRushMapThumbnailDataUrl(
  rushMap: ObstacleRushMapConfig,
  topDown: boolean = false
): string {
  const cacheKey = `rush_hd_2d_v12_${rushMap.id}_${topDown ? 'top' : 'persp'}`;
  if (cachedMapThumbnails[cacheKey]) {
    return cachedMapThumbnails[cacheKey]!;
  }
  if (typeof document === 'undefined') return '';

  const width = 960;
  const height = 600;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const isJungle = rushMap.id === 'lava_foundry';

  // 1. Sky & Multi-Faceted Alpine Mountains
  const skyGrad = ctx.createLinearGradient(0, 0, 0, height * 0.56);
  skyGrad.addColorStop(0, isJungle ? '#0284C7' : '#1D4ED8');
  skyGrad.addColorStop(0.55, isJungle ? '#38BDF8' : '#60A5FA');
  skyGrad.addColorStop(1, isJungle ? '#A7F3D0' : '#BAE6FD');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, width, height);

  drawStylizedCloud(ctx, 165, 90, 1.18);
  drawStylizedCloud(ctx, 795, 86, 1.12);

  // Dual Faceted Alpine Peaks with Snow Glacier Caps
  [
    { x: 155, w: 265, h: 195 },
    { x: 805, w: 275, h: 205 },
  ].forEach((m) => {
    ctx.lineWidth = 4.5;
    ctx.strokeStyle = '#0F172A';
    ctx.fillStyle = isJungle ? '#78716C' : '#64748B';
    ctx.beginPath();
    ctx.moveTo(m.x - m.w * 0.5, 285);
    ctx.lineTo(m.x, 285 - m.h);
    ctx.lineTo(m.x + m.w * 0.05, 285);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = isJungle ? '#44403C' : '#334155';
    ctx.beginPath();
    ctx.moveTo(m.x, 285 - m.h);
    ctx.lineTo(m.x + m.w * 0.5, 285);
    ctx.lineTo(m.x - m.w * 0.05, 285);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#F8FAFC';
    ctx.beginPath();
    ctx.moveTo(m.x - m.w * 0.19, 285 - m.h * 0.62);
    ctx.lineTo(m.x, 285 - m.h);
    ctx.lineTo(m.x + m.w * 0.19, 285 - m.h * 0.62);
    ctx.lineTo(m.x + m.w * 0.06, 285 - m.h * 0.52);
    ctx.lineTo(m.x - m.w * 0.06, 285 - m.h * 0.54);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  });

  // 2. Ocean Lagoon & Lush Grass Island Plateau
  ctx.fillStyle = isJungle ? '#0D9488' : '#0284C7';
  ctx.fillRect(0, 275, width, height - 275);

  ctx.strokeStyle = '#0F172A';
  ctx.lineWidth = 5.5;
  ctx.fillStyle = isJungle ? '#15803D' : '#10B981';
  ctx.beginPath();
  ctx.roundRect(88, 255, 784, 305, 44);
  ctx.fill();
  ctx.stroke();

  // 3. Detailed Grand Royal Castle Citadel OR Mayan Temple Pyramid
  if (isJungle) {
    [
      { w: 340, h: 38, y: 218, col: '#78716C' },
      { w: 256, h: 36, y: 182, col: '#A8A29E' },
      { w: 176, h: 34, y: 148, col: '#78716C' },
      { w: 104, h: 42, y: 106, col: '#FACC15' },
    ].forEach((tier) => {
      ctx.fillStyle = tier.col;
      ctx.beginPath();
      ctx.roundRect(width * 0.5 - tier.w * 0.5, tier.y, tier.w, tier.h, 6);
      ctx.fill();
      ctx.stroke();
    });
  } else {
    // Curtain Wall + Crenellations
    ctx.fillStyle = '#94A3B8';
    ctx.beginPath();
    ctx.roundRect(265, 165, 430, 98, 6);
    ctx.fill();
    ctx.stroke();

    // Central Royal Keep + Gabled Blue Roof
    ctx.fillStyle = '#64748B';
    ctx.beginPath();
    ctx.roundRect(395, 108, 170, 155, 6);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#2563EB';
    ctx.beginPath();
    ctx.moveTo(382, 108);
    ctx.lineTo(480, 48);
    ctx.lineTo(578, 108);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Arched Portcullis Gate
    ctx.fillStyle = '#0F172A';
    ctx.beginPath();
    ctx.arc(480, 218, 34, Math.PI, 0);
    ctx.lineTo(514, 263);
    ctx.lineTo(446, 263);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Flanking Cylindrical Turrets with Conical Tile Roofs & Banners
    [
      { x: 280, roof: '#2563EB', h: 132 },
      { x: 382, roof: '#DC2626', h: 146 },
      { x: 578, roof: '#DC2626', h: 146 },
      { x: 680, roof: '#2563EB', h: 132 },
    ].forEach((t) => {
      ctx.fillStyle = '#CBD5E1';
      ctx.beginPath();
      ctx.roundRect(t.x - 32, 263 - t.h, 64, t.h, 6);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = t.roof;
      ctx.beginPath();
      ctx.moveTo(t.x - 42, 263 - t.h);
      ctx.lineTo(t.x, 263 - t.h - 62);
      ctx.lineTo(t.x + 42, 263 - t.h);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    });
  }

  // 4. Mowed Grass Turf Court & Tactical Cargo Containers
  ctx.fillStyle = isJungle ? '#22C55E' : '#10B981';
  ctx.strokeStyle = '#0F172A';
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(195, 272);
  ctx.lineTo(765, 272);
  ctx.lineTo(835, 528);
  ctx.lineTo(125, 528);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Mowed Grass Stripes on Court
  for (let s = 0; s < 6; s++) {
    if (s % 2 === 0) {
      ctx.fillStyle = 'rgba(74, 222, 128, 0.28)';
      ctx.beginPath();
      const x1Top = 205 + s * 92;
      const x2Top = x1Top + 46;
      const x1Bot = 140 + s * 112;
      const x2Bot = x1Bot + 56;
      ctx.moveTo(x1Top, 276);
      ctx.lineTo(x2Top, 276);
      ctx.lineTo(x2Bot, 524);
      ctx.lineTo(x1Bot, 524);
      ctx.closePath();
      ctx.fill();
    }
  }

  // Left & Right Tactical Cargo Containers
  [
    { x: 235, y: 330, col: isJungle ? '#15803D' : '#D97706' },
    { x: 615, y: 330, col: isJungle ? '#B45309' : '#334155' },
  ].forEach((c) => {
    ctx.fillStyle = c.col;
    ctx.beginPath();
    ctx.roundRect(c.x, c.y, 110, 68, 8);
    ctx.fill();
    ctx.stroke();
  });

  drawStylizedTree(ctx, 155, 310, 1.12);
  drawStylizedTree(ctx, 805, 310, 1.12);

  // 5. Armed Chibi Fighters in Action (Up to 5 in Custom!)
  drawStylizedChibi(ctx, 355, 472, 1.22, '#2563EB', '#1E293B', true);
  drawStylizedChibi(ctx, 595, 438, 1.14, '#DC2626', '#FACC15', true);
  drawStylizedChibi(ctx, 475, 375, 0.98, '#10B981', '#0F172A', true);

  const dataUrl = canvas.toDataURL('image/png');
  cachedMapThumbnails[cacheKey] = dataUrl;
  return dataUrl;
}

export function getLavaMapThumbnailDataUrl(map: FloorIsLavaMapConfig): string {
  const cacheKey = `nuke_hd_2d_v12_${map.id}`;
  if (cachedMapThumbnails[cacheKey]) {
    return cachedMapThumbnails[cacheKey]!;
  }
  if (typeof document === 'undefined') return '';

  const width = 960;
  const height = 600;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const isJungle = map.id === 'hex_colosseum';

  // 1. Sky & Faceted Alpine Peaks
  const skyGrad = ctx.createLinearGradient(0, 0, 0, height * 0.56);
  skyGrad.addColorStop(0, map.skyTop || '#1D4ED8');
  skyGrad.addColorStop(0.55, '#38BDF8');
  skyGrad.addColorStop(1, map.skyHorizon || '#7DD3FC');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, width, height);

  drawStylizedCloud(ctx, 175, 92, 1.18);
  drawStylizedCloud(ctx, 785, 88, 1.12);

  // Alpine Peaks
  [
    { x: 155, w: 255, h: 185 },
    { x: 805, w: 265, h: 195 },
  ].forEach((m) => {
    ctx.lineWidth = 4.5;
    ctx.strokeStyle = '#0F172A';
    ctx.fillStyle = '#64748B';
    ctx.beginPath();
    ctx.moveTo(m.x - m.w * 0.5, 275);
    ctx.lineTo(m.x, 275 - m.h);
    ctx.lineTo(m.x + m.w * 0.05, 275);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#334155';
    ctx.beginPath();
    ctx.moveTo(m.x, 275 - m.h);
    ctx.lineTo(m.x + m.w * 0.5, 275);
    ctx.lineTo(m.x - m.w * 0.05, 275);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#F8FAFC';
    ctx.beginPath();
    ctx.moveTo(m.x - m.w * 0.18, 275 - m.h * 0.62);
    ctx.lineTo(m.x, 275 - m.h);
    ctx.lineTo(m.x + m.w * 0.18, 275 - m.h * 0.62);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  });

  // Ocean & Island
  ctx.fillStyle = isJungle ? '#0D9488' : '#0284C7';
  ctx.fillRect(0, 270, width, height - 270);

  ctx.strokeStyle = '#0F172A';
  ctx.lineWidth = 5.5;
  ctx.fillStyle = isJungle ? '#15803D' : '#10B981';
  ctx.beginPath();
  ctx.roundRect(96, 252, 768, 305, 44);
  ctx.fill();
  ctx.stroke();

  // North Castle or Mayan Temple
  if (isJungle) {
    [
      { w: 320, h: 38, y: 215, col: '#78716C' },
      { w: 235, h: 36, y: 179, col: '#A8A29E' },
      { w: 150, h: 40, y: 139, col: '#FACC15' },
    ].forEach((tier) => {
      ctx.fillStyle = tier.col;
      ctx.beginPath();
      ctx.roundRect(width * 0.5 - tier.w * 0.5, tier.y, tier.w, tier.h, 6);
      ctx.fill();
      ctx.stroke();
    });
  } else {
    ctx.fillStyle = '#94A3B8';
    ctx.beginPath();
    ctx.roundRect(280, 168, 400, 92, 6);
    ctx.fill();
    ctx.stroke();

    [
      { x: 295, roof: '#2563EB' },
      { x: 665, roof: '#DC2626' },
    ].forEach((t) => {
      ctx.fillStyle = '#CBD5E1';
      ctx.beginPath();
      ctx.roundRect(t.x - 34, 132, 68, 128, 6);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = t.roof;
      ctx.beginPath();
      ctx.moveTo(t.x - 44, 132);
      ctx.lineTo(t.x, 66);
      ctx.lineTo(t.x + 44, 132);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    });
  }

  // Nuke Showdown Mowed Grass Turf Court
  ctx.fillStyle = isJungle ? '#22C55E' : '#10B981';
  ctx.strokeStyle = '#0F172A';
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(215, 270);
  ctx.lineTo(745, 270);
  ctx.lineTo(815, 522);
  ctx.lineTo(145, 522);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Dual Nuke Balls in Center Ring
  ctx.strokeStyle = '#FEF08A';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.ellipse(480, 396, 84, 32, 0, 0, Math.PI * 2);
  ctx.stroke();

  [
    { x: 440, y: 388, col: '#EF4444' },
    { x: 520, y: 388, col: '#FACC15' },
  ].forEach((b) => {
    ctx.fillStyle = b.col;
    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(b.x, b.y, 24, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  });

  drawStylizedChibi(ctx, 305, 462, 1.18, '#2563EB', '#1E293B', false);
  drawStylizedChibi(ctx, 655, 462, 1.18, '#EC4899', '#FACC15', false);

  const dataUrl = canvas.toDataURL('image/png');
  cachedMapThumbnails[cacheKey] = dataUrl;
  return dataUrl;
}





