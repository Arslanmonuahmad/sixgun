import * as THREE from 'three';
import { OutfitConfig } from '../types/game';

export const CRAYON_INK_HEX = 0x1e1b24;

let cachedToonGradient: THREE.DataTexture | null = null;
const paperTextureCache = new Map<string, THREE.CanvasTexture>();
let cachedShadowTexture: THREE.CanvasTexture | null = null;
const outfitTextureCache = new Map<string, THREE.CanvasTexture>();

/**
 * 4-step bright cel-shaded gradient map for crisp, clean 3D toon shading
 */
export function getToonGradientMap(): THREE.DataTexture {
  if (cachedToonGradient) return cachedToonGradient;

  // High-contrast 5-step anime/cel-shaded ramp for crisp 3D volume without glare
  const colors = new Uint8Array([
    114, 120, 145, 255,
    150, 156, 178, 255,
    188, 194, 212, 255,
    222, 226, 238, 255,
    246, 248, 252, 255,
  ]);

  const texture = new THREE.DataTexture(colors, 5, 1, THREE.RGBAFormat);
  texture.minFilter = THREE.NearestFilter;
  texture.magFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;

  cachedToonGradient = texture;
  return texture;
}

/**
 * Smooth, grain-free 3D Vinyl/Toon Skin Material so character faces are crystal-clear!
 */
export function createSkinToonMaterial(hexColor: string): THREE.MeshToonMaterial {
  return new THREE.MeshToonMaterial({
    color: new THREE.Color(hexColor),
    gradientMap: getToonGradientMap(),
  });
}

/**
 * Generates a tileable hand-colored pastel texture with rich crayon grain, ink line-art,
 * and automatic anti-glare contrast toning on white/light surfaces!
 */
export function getCrayonPaperTexture(
  baseHex: string,
  maxAnisotropy: number = 4,
  repeatScale: number = 1
): THREE.CanvasTexture {
  const safeHex =
    typeof baseHex === 'string' && baseHex.trim().length > 0
      ? baseHex.trim()
      : '#38BDF8';
  const cacheKey = `v5_${safeHex}_${repeatScale}`;
  if (paperTextureCache.has(cacheKey)) {
    return paperTextureCache.get(cacheKey)!;
  }

  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  // Tone down overly bright whites (L > 0.76) so white surfaces always have rich contrast & shading!
  const rawColor = new THREE.Color(safeHex);
  const hsl = { h: 0, s: 0, l: 0 };
  rawColor.getHSL(hsl);
  const isLightSurface = hsl.l > 0.76;
  const baseColor = rawColor.clone();
  if (isLightSurface) {
    const tonedL = 0.75 + (hsl.l - 0.76) * 0.28;
    const tonedS = Math.max(hsl.s, 0.08);
    const tonedH = hsl.s < 0.05 ? 0.58 : hsl.h;
    baseColor.setHSL(tonedH, tonedS, tonedL);
  }

  ctx.fillStyle = `#${baseColor.getHexString()}`;
  ctx.fillRect(0, 0, size, size);

  const darker = baseColor
    .clone()
    .offsetHSL(0.01, 0.05, isLightSurface ? -0.12 : -0.07);
  const lighter = baseColor
    .clone()
    .offsetHSL(-0.01, -0.02, isLightSurface ? 0.04 : 0.06);
  const darkHex = `#${darker.getHexString()}`;
  const lightHex = `#${lighter.getHexString()}`;

  // 1. Soft radial pastel shading base
  const grad = ctx.createRadialGradient(
    size * 0.38,
    size * 0.35,
    size * 0.08,
    size * 0.5,
    size * 0.5,
    size * 0.72
  );
  grad.addColorStop(0, lightHex);
  grad.addColorStop(0.65, `#${baseColor.getHexString()}`);
  grad.addColorStop(1, darkHex);
  ctx.globalAlpha = 0.26;
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  // 2. Subtle tileable organic ground/pastel texture ("halka texture" — soft dabs & speckles)
  let seed = 1337;
  const nextRand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  for (let i = 0; i < 48; i++) {
    const cx = nextRand() * size;
    const cy = nextRand() * size;
    const rx = 8 + nextRand() * 18;
    const ry = 5 + nextRand() * 12;
    const rot = nextRand() * Math.PI;
    ctx.fillStyle = i % 2 === 0 ? lightHex : darkHex;
    ctx.globalAlpha = 0.08 + nextRand() * 0.05;
    for (let ox = -size; ox <= size; ox += size) {
      for (let oy = -size; oy <= size; oy += size) {
        ctx.beginPath();
        ctx.ellipse(cx + ox, cy + oy, rx, ry, rot, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  for (let i = 0; i < 90; i++) {
    const px = nextRand() * size;
    const py = nextRand() * size;
    const r = 1.5 + nextRand() * 2.8;
    ctx.fillStyle = i % 3 === 0 ? lightHex : darkHex;
    ctx.globalAlpha = 0.09 + nextRand() * 0.06;
    ctx.beginPath();
    ctx.arc(px, py, r, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.globalAlpha = 1.0;

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeatScale, repeatScale);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  texture.anisotropy = maxAnisotropy;
  texture.needsUpdate = true;

  paperTextureCache.set(cacheKey, texture);
  return texture;
}

export function createCrayonToonMaterial(
  hexColor: string,
  maxAnisotropy: number = 4,
  repeatScale: number = 1,
  emissiveHex?: string,
  emissiveIntensity: number = 0
): THREE.MeshToonMaterial {
  const map = getCrayonPaperTexture(hexColor, maxAnisotropy, repeatScale);
  const mat = new THREE.MeshToonMaterial({
    color: 0xffffff,
    map,
    gradientMap: getToonGradientMap(),
  });

  if (emissiveHex) {
    mat.emissive = new THREE.Color(emissiveHex);
    mat.emissiveIntensity = emissiveIntensity;
  }

  return mat;
}

/**
 * Adds a crisp, hand-inked dark cartoon outline hull around a 3D mesh
 * Uses vertex-normal expansion instead of uniform scale so offset parts (eyes, ears, limbs, toruses) never shift or distort!
 */
const outlineMaterialCache = new Map<number, THREE.MeshBasicMaterial>();

export function addCrayonOutline(
  mesh: THREE.Mesh,
  scaleMultiplier: number = 0.045,
  outlineHex: number = 0x0f172a
): THREE.Mesh {
  const outlineGeo = mesh.geometry.clone();
  outlineGeo.computeVertexNormals();

  const posAttr = outlineGeo.getAttribute('position');
  const normAttr = outlineGeo.getAttribute('normal');

  if (posAttr && normAttr) {
    outlineGeo.computeBoundingSphere();
    const radius = outlineGeo.boundingSphere?.radius || 1;
    const thickness = Math.min(0.105, Math.max(0.005, radius * scaleMultiplier * 1.25));

    for (let i = 0; i < posAttr.count; i++) {
      posAttr.setXYZ(
        i,
        posAttr.getX(i) + normAttr.getX(i) * thickness,
        posAttr.getY(i) + normAttr.getY(i) * thickness,
        posAttr.getZ(i) + normAttr.getZ(i) * thickness
      );
    }
    posAttr.needsUpdate = true;
  }

  let outlineMat = outlineMaterialCache.get(outlineHex);
  if (!outlineMat) {
    outlineMat = new THREE.MeshBasicMaterial({
      color: outlineHex,
      side: THREE.BackSide,
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 1,
    });
    outlineMaterialCache.set(outlineHex, outlineMat);
  }

  const outlineMesh = new THREE.Mesh(outlineGeo, outlineMat);
  outlineMesh.name = 'crayon_outline';
  outlineMesh.castShadow = false;
  outlineMesh.receiveShadow = false;
  mesh.add(outlineMesh);
  return outlineMesh;
}

/**
 * Generates a high-resolution 512x512 Hoodie / Outfit Texture mapped around the sculpted 3D Torso
 * Aspect-corrected horizontally (0.4x) so chest emblems & kangaroo pockets never stretch around the cylinder!
 */
export function createOutfitTorsoTexture(
  primaryHex: string,
  emblemType: OutfitConfig['emblemType'] = 'crown',
  accentHex: string = '#FFFFFF',
  maxAnisotropy: number = 4
): THREE.CanvasTexture {
  const key = `v3_${primaryHex}_${emblemType}_${accentHex}`;
  if (outfitTextureCache.has(key)) {
    return outfitTextureCache.get(key)!;
  }

  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  // Base hoodie/jersey fabric color (toned if overly white so it has rich contrast)
  const rawBase = new THREE.Color(primaryHex);
  const hsl = { h: 0, s: 0, l: 0 };
  rawBase.getHSL(hsl);
  if (hsl.l > 0.78) {
    rawBase.setHSL(hsl.s < 0.05 ? 0.58 : hsl.h, Math.max(hsl.s, 0.1), 0.76);
  }
  const safePrimaryHex = `#${rawBase.getHexString()}`;

  ctx.fillStyle = safePrimaryHex;
  ctx.fillRect(0, 0, size, size);

  const darkerCol = rawBase.clone().offsetHSL(0, 0.06, -0.11);
  const lighterCol = rawBase.clone().offsetHSL(0, -0.02, 0.05);
  const shadeHex = `#${darkerCol.getHexString()}`;
  const highlightHex = `#${lighterCol.getHexString()}`;

  // Subtle vertical chest highlight on front center (u = 0.5 -> x = 256)
  const chestGrad = ctx.createRadialGradient(256, 210, 10, 256, 210, 150);
  chestGrad.addColorStop(0, highlightHex);
  chestGrad.addColorStop(1, safePrimaryHex);
  ctx.fillStyle = chestGrad;
  ctx.fillRect(100, 40, 312, 360);

  // Ribbed bottom waistband hem with vertical ink ribbing ticks
  ctx.fillStyle = shadeHex;
  ctx.fillRect(0, size - 56, size, 56);
  ctx.strokeStyle = 'rgba(15, 23, 42, 0.45)';
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.moveTo(0, size - 56);
  ctx.lineTo(size, size - 56);
  ctx.stroke();

  for (let rx = 0; rx < size; rx += 12) {
    ctx.beginPath();
    ctx.moveTo(rx, size - 56);
    ctx.lineTo(rx, size - 14);
    ctx.stroke();
  }

  // Soft shaded undershirt trim at very bottom (never pure blinding white)
  ctx.fillStyle = '#CBD5E1';
  ctx.fillRect(0, size - 14, size, 14);

  // UV center u = 0.5 (x = 256) faces straight forward (+Z)
  const cx = size * 0.5;
  const cy = size * 0.42;

  // Kangaroo Pocket outline on lower front (aspect-corrected horizontally by 0.42x)
  ctx.save();
  ctx.translate(cx, size - 58);
  ctx.scale(0.42, 1.0);
  ctx.fillStyle = shadeHex;
  ctx.strokeStyle = '#0F172A';
  ctx.lineWidth = 9;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(-92, 0);
  ctx.lineTo(-68, -74);
  ctx.lineTo(68, -74);
  ctx.lineTo(92, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  // Draw Chest Emblem at (cx, cy), aspect-corrected horizontally (0.40x) so it is 1:1 on the 3D chest
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(0.4, 1.0);
  const safeAccent =
    accentHex.toUpperCase() === '#FFFFFF' || accentHex.toUpperCase() === '#F8FAFC'
      ? '#E2E8F0'
      : accentHex;
  ctx.fillStyle = safeAccent;
  ctx.strokeStyle = '#0F172A';
  ctx.lineWidth = 11;
  ctx.lineJoin = 'round';

  if (emblemType === 'crown') {
    ctx.beginPath();
    ctx.moveTo(-54, 34);
    ctx.lineTo(-64, -24);
    ctx.lineTo(-26, 8);
    ctx.lineTo(0, -36);
    ctx.lineTo(26, 8);
    ctx.lineTo(64, -24);
    ctx.lineTo(54, 34);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (emblemType === 'star') {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 === 0 ? 54 : 25;
      const a = (i * Math.PI) / 5 - Math.PI / 2;
      if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
      else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (emblemType === 'bolt') {
    ctx.beginPath();
    ctx.moveTo(12, -52);
    ctx.lineTo(-38, 4);
    ctx.lineTo(-5, 4);
    ctx.lineTo(-18, 54);
    ctx.lineTo(38, -6);
    ctx.lineTo(5, -6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (emblemType === 'paw') {
    ctx.beginPath();
    ctx.ellipse(0, 14, 32, 24, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    [-32, -11, 11, 32].forEach((px, idx) => {
      const py = idx === 0 || idx === 3 ? -14 : -26;
      ctx.beginPath();
      ctx.arc(px, py, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    });
  } else if (emblemType === 'number') {
    ctx.font = '900 78px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.strokeText('01', 0, 4);
    ctx.fillText('01', 0, 4);
  } else if (emblemType === 'skull') {
    ctx.beginPath();
    ctx.arc(0, -6, 34, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillRect(-16, 14, 32, 18);
    ctx.fillStyle = '#0F172A';
    ctx.beginPath();
    ctx.arc(-12, -6, 7, 0, Math.PI * 2);
    ctx.arc(12, -6, 7, 0, Math.PI * 2);
    ctx.fill();
  } else if (emblemType === 'burger') {
    // Stacked Cheeseburger Emblem
    // Top bun
    ctx.fillStyle = '#FBBF24';
    ctx.beginPath();
    ctx.arc(0, -6, 38, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Patty + Cheese
    ctx.fillStyle = '#78350F';
    ctx.fillRect(-40, -6, 80, 14);
    ctx.strokeRect(-40, -6, 80, 14);
    // Bottom bun
    ctx.fillStyle = '#FBBF24';
    ctx.fillRect(-36, 8, 72, 14);
    ctx.strokeRect(-36, 8, 72, 14);
  } else if (emblemType === 'berry') {
    // Juicy Strawberry Emblem with leafy green crown & seeds
    ctx.fillStyle = '#FEF08A';
    ctx.beginPath();
    ctx.moveTo(0, 38);
    ctx.bezierCurveTo(-42, 12, -38, -26, 0, -22);
    ctx.bezierCurveTo(38, -26, 42, 12, 0, 38);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Green leafy calyx
    ctx.fillStyle = '#22C55E';
    ctx.beginPath();
    ctx.moveTo(-28, -22);
    ctx.lineTo(0, -38);
    ctx.lineTo(28, -22);
    ctx.lineTo(0, -12);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (emblemType === 'pineapple') {
    // Tropical Pineapple Emblem
    ctx.fillStyle = '#FEF08A';
    ctx.beginPath();
    ctx.ellipse(0, 8, 28, 32, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // Green spiky crown leaves
    ctx.fillStyle = '#22C55E';
    ctx.beginPath();
    ctx.moveTo(-22, -18);
    ctx.lineTo(-12, -44);
    ctx.lineTo(0, -24);
    ctx.lineTo(0, -48);
    ctx.lineTo(12, -24);
    ctx.lineTo(22, -42);
    ctx.lineTo(18, -16);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else {
    // Planet ring
    ctx.beginPath();
    ctx.arc(0, 0, 32, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(0, 0, 58, 15, -0.3, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  tex.needsUpdate = true;
  outfitTextureCache.set(key, tex);
  return tex;
}

const ballCanvasCache = new Map<string, HTMLCanvasElement>();

/**
 * Generates 10 distinct, bright, vibrant 512x512 3D Pro Volleyball Skins!
 * - Zero black panels or dark muddy colors!
 * - Smooth polar caps at North/South poles so vertical seams never pinch into dark spots!
 * - Colored & white stitched panel seams + glossy specular highlights!
 */
export function createVolleyballTexture(
  maxAnisotropy: number = 4,
  skinId: string = 'classic_pro'
): THREE.CanvasTexture {
  const cacheKey = `ball_v5_bright_${skinId}`;
  const cachedCanvas = ballCanvasCache.get(cacheKey);
  if (cachedCanvas) {
    const tex = new THREE.CanvasTexture(cachedCanvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = maxAnisotropy;
    tex.needsUpdate = true;
    return tex;
  }

  const width = 512;
  const height = 512;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  const drawBrightProVolleyball = (
    wedges: string[],
    capTopColor: string,
    capBottomColor: string,
    seamColor: string,
    waveColor1: string,
    waveColor2: string
  ) => {
    const numWedges = wedges.length;
    const stripeW = width / numWedges;

    // 1. Bright Vertical Equatorial Wedges
    wedges.forEach((col, idx) => {
      ctx.fillStyle = col;
      ctx.fillRect(idx * stripeW, 0, stripeW + 2, height);

      // Soft glossy highlight down the center of each panel
      const grad = ctx.createLinearGradient(
        idx * stripeW,
        0,
        (idx + 1) * stripeW,
        0
      );
      grad.addColorStop(0, 'rgba(255,255,255,0.0)');
      grad.addColorStop(0.5, 'rgba(255,255,255,0.28)');
      grad.addColorStop(1, 'rgba(255,255,255,0.0)');
      ctx.fillStyle = grad;
      ctx.fillRect(idx * stripeW, 0, stripeW, height);
    });

    // 2. Dynamic Curved Pro Volleyball Wave Ribbons across the Equator
    ctx.save();
    ctx.lineCap = 'round';

    // Upper & Lower Curved Wave Bands
    ctx.strokeStyle = waveColor1;
    ctx.lineWidth = 28;
    ctx.beginPath();
    for (let x = 0; x <= width; x += 8) {
      const y = height * 0.34 + Math.sin((x / width) * Math.PI * 4) * 34;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    ctx.strokeStyle = waveColor2;
    ctx.lineWidth = 28;
    ctx.beginPath();
    for (let x = 0; x <= width; x += 8) {
      const y = height * 0.66 + Math.cos((x / width) * Math.PI * 4) * 34;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Crisp White Specular Border along the Wave Ribbons
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 5;
    ctx.beginPath();
    for (let x = 0; x <= width; x += 8) {
      const y = height * 0.34 + Math.sin((x / width) * Math.PI * 4) * 34;
      if (x === 0) ctx.moveTo(x, y - 15);
      else ctx.lineTo(x, y - 15);
    }
    ctx.stroke();

    ctx.beginPath();
    for (let x = 0; x <= width; x += 8) {
      const y = height * 0.66 + Math.cos((x / width) * Math.PI * 4) * 34;
      if (x === 0) ctx.moveTo(x, y + 15);
      else ctx.lineTo(x, y + 15);
    }
    ctx.stroke();
    ctx.restore();

    // 3. Clean Colored Panel Seams (Only between y=64 and y=height-64 so poles never pinch!)
    const capH = 64;
    ctx.strokeStyle = seamColor;
    ctx.lineWidth = 6.5;
    ctx.lineCap = 'round';
    for (let idx = 0; idx <= numWedges; idx++) {
      const x = idx * stripeW;
      ctx.beginPath();
      ctx.moveTo(x, capH);
      for (let y = capH; y <= height - capH; y += 16) {
        const curve = Math.sin(((y - capH) / (height - capH * 2)) * Math.PI) * 10 * (idx % 2 === 0 ? 1 : -1);
        ctx.lineTo(x + curve, y);
      }
      ctx.stroke();
    }

    // Center Equatorial Seam
    ctx.strokeStyle = seamColor;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(0, height * 0.5);
    for (let x = 0; x <= width; x += 16) {
      ctx.lineTo(x, height * 0.5 + Math.sin((x / width) * Math.PI * 2) * 14);
    }
    ctx.stroke();

    // 4. Smooth Solid Polar Caps at North & South Poles (Zero Pole Seam Pinching!)
    ctx.fillStyle = capTopColor;
    ctx.fillRect(0, 0, width, capH);
    ctx.fillStyle = capBottomColor;
    ctx.fillRect(0, height - capH, width, capH);

    // Polar Cap Trim Rings (White + Seam Color)
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(0, capH);
    ctx.lineTo(width, capH);
    ctx.moveTo(0, height - capH);
    ctx.lineTo(width, height - capH);
    ctx.stroke();

    ctx.strokeStyle = seamColor;
    ctx.lineWidth = 4.5;
    ctx.beginPath();
    ctx.moveTo(0, capH + 5);
    ctx.lineTo(width, capH + 5);
    ctx.moveTo(0, height - capH - 5);
    ctx.lineTo(width, height - capH - 5);
    ctx.stroke();
  };

  if (skinId === 'classic_pro') {
    // 1. Pro Tri-Wave (Sunny Tournament Gold, Sky Blue & Crisp Pearl White)
    drawBrightProVolleyball(
      ['#FDE047', '#38BDF8', '#FFFFFF', '#FACC15', '#38BDF8', '#FFFFFF'],
      '#FDE047',
      '#38BDF8',
      '#1D4ED8',
      '#2563EB',
      '#FACC15'
    );
  } else if (skinId === 'crayon_cove') {
    // 2. Sunset Coral (Bright Coral Pink, Turquoise Lagoon & Sunny Gold)
    drawBrightProVolleyball(
      ['#FB7185', '#2DD4BF', '#FDE047', '#FFFFFF', '#FB7185', '#2DD4BF'],
      '#FB7185',
      '#2DD4BF',
      '#E11D48',
      '#FDE047',
      '#2DD4BF'
    );
  } else if (skinId === 'retro_beach') {
    // 3. Classic 6-Panel Glossy Beach Ball (Red, White, Yellow, Blue, Green, White + White Polar Circles)
    drawBrightProVolleyball(
      ['#FF4D6D', '#FFFFFF', '#FDE047', '#FFFFFF', '#38BDF8', '#4ADE80'],
      '#FFFFFF',
      '#FFFFFF',
      '#0284C7',
      '#FF4D6D',
      '#FDE047'
    );
  } else if (skinId === 'juicy_melon') {
    // 4. Watermelon Splash (Bright Lime Rind, Juicy Watermelon Pink & Mint Cream)
    drawBrightProVolleyball(
      ['#4ADE80', '#FB7185', '#ECFDF5', '#22C55E', '#FB7185', '#86EFAC'],
      '#4ADE80',
      '#FB7185',
      '#15803D',
      '#FB7185',
      '#4ADE80'
    );
    // White & Emerald Watermelon Seeds (Zero Black!)
    ctx.fillStyle = '#FFFFFF';
    [1, 4].forEach((panelIdx) => {
      const px = (panelIdx + 0.5) * (width / 6);
      [140, 210, 295, 365].forEach((py, si) => {
        ctx.beginPath();
        ctx.ellipse(
          px + (si % 2 === 0 ? -12 : 12),
          py,
          5.5,
          9,
          0.2,
          0,
          Math.PI * 2
        );
        ctx.fill();
      });
    });
  } else if (skinId === 'neon_cyber') {
    // 5. Electric Arcade Pop (Bright Electric Cyan, Bubblegum Pink, Laser Yellow & White — Zero Black!)
    drawBrightProVolleyball(
      ['#22D3EE', '#F472B6', '#FEF08A', '#FFFFFF', '#22D3EE', '#F472B6'],
      '#22D3EE',
      '#F472B6',
      '#7C3AED',
      '#EC4899',
      '#06B6D4'
    );
  } else if (skinId === 'royal_gold') {
    // 6. Royal Crown Gold (Brilliant 24K Gold, Warm Buttercream, Royal Sky & White)
    drawBrightProVolleyball(
      ['#FACC15', '#FEF9C3', '#60A5FA', '#FDE047', '#FFFFFF', '#60A5FA'],
      '#FACC15',
      '#FEF9C3',
      '#D97706',
      '#3B82F6',
      '#F59E0B'
    );
    // Golden Star Medallions along the Equator
    ctx.fillStyle = '#FEF08A';
    ctx.strokeStyle = '#D97706';
    ctx.lineWidth = 4;
    [0, 2, 4].forEach((idx) => {
      const cx = (idx + 0.5) * (width / 6);
      const cy = height * 0.5;
      ctx.beginPath();
      ctx.arc(cx, cy, 20, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    });
  } else if (skinId === 'magma_core') {
    // 7. Solar Sunburst (Bright Tangerine, Sunburst Gold, Warm Coral & Cream — Zero Black!)
    drawBrightProVolleyball(
      ['#FB923C', '#FDE047', '#F87171', '#FFF7ED', '#FB923C', '#FDE047'],
      '#FDE047',
      '#FB923C',
      '#EA580C',
      '#EF4444',
      '#FACC15'
    );
  } else if (skinId === 'cosmic_nebula') {
    // 8. Cotton Candy Star (Pastel Lavender, Baby Sky Blue, Cotton Candy Pink & Gold Stars — Zero Black!)
    drawBrightProVolleyball(
      ['#C084FC', '#7DD3FC', '#F472B6', '#FFFFFF', '#C084FC', '#7DD3FC'],
      '#C084FC',
      '#7DD3FC',
      '#9333EA',
      '#F472B6',
      '#38BDF8'
    );
    ctx.fillStyle = '#FEF08A';
    for (let i = 0; i < 28; i++) {
      const sx = ((i * 97) % (width - 40)) + 20;
      const sy = 90 + ((i * 53) % (height - 180));
      ctx.beginPath();
      ctx.arc(sx, sy, (i % 3) + 4, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (skinId === 'candy_swirl') {
    // 9. Strawberry Mint (Sweet Strawberry Pink, Mint Aqua, Vanilla Cream & Lemon)
    drawBrightProVolleyball(
      ['#F472B6', '#6EE7B7', '#FFFBEB', '#F9A8D4', '#FEF08A', '#6EE7B7'],
      '#F472B6',
      '#6EE7B7',
      '#DB2777',
      '#34D399',
      '#F472B6'
    );
    const sprinkleCols = ['#38BDF8', '#FACC15', '#EC4899', '#10B981', '#A855F7'];
    for (let i = 0; i < 36; i++) {
      ctx.fillStyle = sprinkleCols[i % sprinkleCols.length];
      const rx = ((i * 83) % (width - 30)) + 15;
      const ry = 85 + ((i * 47) % (height - 170));
      ctx.beginPath();
      ctx.roundRect(rx, ry, 14, 7, 3.5);
      ctx.fill();
    }
  } else {
    // 10. Tropical Kiwi (Bright Kiwi Green, Sunny Lime, Golden Citrus & Crisp White)
    drawBrightProVolleyball(
      ['#4ADE80', '#FEF08A', '#A3E635', '#FFFFFF', '#4ADE80', '#FACC15'],
      '#4ADE80',
      '#FEF08A',
      '#0D9488',
      '#10B981',
      '#FACC15'
    );
  }

  ballCanvasCache.set(cacheKey, canvas);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = maxAnisotropy;
  texture.needsUpdate = true;
  return texture;
}

const courtFloorCanvasCache = new Map<string, HTMLCanvasElement>();
const waterCanvasCache = new Map<string, HTMLCanvasElement>();
const waterfallTextureCache = new Map<string, THREE.CanvasTexture>();
const skyDomeTextureCache = new Map<string, THREE.CanvasTexture>();

/**
 * Generates a Lush Hand-Painted 3D Grass Turf & Flagstone Court Floor Texture
 * Features alternating mowed stadium lawn stripes, painted grass blade tufts, clover clusters,
 * and carved stone border flagstones around the court apron!
 */
export function createCourtFloorTexture(
  innerHex: string,
  outerHex: string,
  lineHex: string,
  maxAnisotropy: number = 4
): THREE.CanvasTexture {
  const cacheKey = `v6_grass_${innerHex}_${outerHex}_${lineHex}`;
  let canvas = courtFloorCanvasCache.get(cacheKey);
  if (!canvas) {
    const width = 1024;
    const height = 1024;
    canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;

    const logicW = 1024;
    const logicH = 1024;
    ctx.clearRect(0, 0, logicW, logicH);

    const isDarkTheme = outerHex === '#292524' || innerHex === '#451A03';
    const isIceTheme = outerHex === '#F0F9FF' || innerHex === '#7DD3FC';
    const isCandyTheme = outerHex === '#F9A8D4' || innerHex === '#F472B6';

    const apronFillHex = isDarkTheme
      ? '#334155'
      : isIceTheme
        ? '#BAE6FD'
        : isCandyTheme
          ? '#FBCFE8'
          : '#22C55E';
    const apronRimHex = isDarkTheme
      ? '#64748B'
      : isIceTheme
        ? '#0284C7'
        : isCandyTheme
          ? '#DB2777'
          : '#15803D';

    let floorSeed = 4099;
    const nextFloorRand = () => {
      floorSeed = (floorSeed * 16807) % 2147483647;
      return (floorSeed - 1) / 2147483646;
    };

    // 1. Lush Outer Grass Turf Apron with Painted Grass Blades & Stone Flagstone Rim
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(14, 12, logicW - 28, logicH - 24, 68);
    ctx.fillStyle = apronFillHex;
    ctx.fill();
    ctx.clip();

    const apronBaseCol = new THREE.Color(apronFillHex);
    const apronLightHex = `#${apronBaseCol.clone().offsetHSL(-0.01, 0.05, 0.08).getHexString()}`;
    const apronDarkHex = `#${apronBaseCol.clone().offsetHSL(0.01, 0.06, -0.09).getHexString()}`;

    // Mowed diagonal turf bands on outer apron
    for (let b = -logicH; b < logicW + logicH; b += 96) {
      ctx.fillStyle = (Math.floor(b / 96) % 2 === 0) ? apronLightHex : apronDarkHex;
      ctx.globalAlpha = 0.14;
      ctx.beginPath();
      ctx.moveTo(b, 0);
      ctx.lineTo(b + 48, 0);
      ctx.lineTo(b + 48 - logicH * 0.25, logicH);
      ctx.lineTo(b - logicH * 0.25, logicH);
      ctx.closePath();
      ctx.fill();
    }

    // Organic grass dabs & blade clusters on apron
    for (let i = 0; i < 140; i++) {
      const ax = 20 + nextFloorRand() * (logicW - 40);
      const ay = 20 + nextFloorRand() * (logicH - 40);
      const rx = 14 + nextFloorRand() * 26;
      const ry = 8 + nextFloorRand() * 16;
      ctx.fillStyle = i % 2 === 0 ? apronLightHex : apronDarkHex;
      ctx.globalAlpha = 0.18;
      ctx.beginPath();
      ctx.ellipse(ax, ay, rx, ry, nextFloorRand() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1.0;
    ctx.restore();

    // Carved Stone Flagstone Border Curb around the Outer Apron
    ctx.save();
    ctx.strokeStyle = apronRimHex;
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.roundRect(22, 18, logicW - 44, logicH - 36, 62);
    ctx.stroke();

    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 9;
    ctx.beginPath();
    ctx.roundRect(14, 12, logicW - 28, logicH - 24, 68);
    ctx.stroke();
    ctx.restore();

    // 2. Inner Playable Arena Surface with Mowed Stadium Stripes & Hand-Painted Grass Tuft Strokes
    const courtLeft = 116;
    const courtTop = 74;
    const courtW = 792;
    const courtH = 876;

    const innerColor = new THREE.Color(innerHex);
    const innerHsl = { h: 0, s: 0, l: 0 };
    innerColor.getHSL(innerHsl);
    if (innerHsl.l > 0.72) {
      innerColor.setHSL(innerHsl.h, Math.max(innerHsl.s, 0.35), 0.64);
    }
    const innerLightHex = `#${innerColor.clone().offsetHSL(-0.01, 0.04, 0.065).getHexString()}`;
    const innerDarkHex = `#${innerColor.clone().offsetHSL(0.01, 0.06, -0.075).getHexString()}`;
    const bladeTipHex = `#${innerColor.clone().offsetHSL(-0.02, 0.08, 0.12).getHexString()}`;

    ctx.save();
    ctx.beginPath();
    ctx.roundRect(courtLeft, courtTop, courtW, courtH, 16);
    ctx.fillStyle = `#${innerColor.getHexString()}`;
    ctx.fill();
    ctx.clip();

    // Alternating Stadium Lawn Stripes (8 horizontal mowed bands for rich depth!)
    const numBands = 8;
    const bandH = courtH / numBands;
    for (let b = 0; b < numBands; b++) {
      ctx.fillStyle = b % 2 === 0 ? innerLightHex : innerDarkHex;
      ctx.globalAlpha = 0.16;
      ctx.fillRect(courtLeft, courtTop + b * bandH, courtW, bandH);
    }
    ctx.globalAlpha = 1.0;

    // Soft Sunlit Center Radial Glow
    const courtGrad = ctx.createRadialGradient(
      logicW * 0.5,
      logicH * 0.5,
      40,
      logicW * 0.5,
      logicH * 0.5,
      courtH * 0.62
    );
    courtGrad.addColorStop(0, 'rgba(255, 255, 255, 0.12)');
    courtGrad.addColorStop(0.6, 'rgba(255, 255, 255, 0.03)');
    courtGrad.addColorStop(1, 'rgba(15, 23, 42, 0.10)');
    ctx.fillStyle = courtGrad;
    ctx.fillRect(courtLeft, courtTop, courtW, courtH);

    // Organic Moss/Grass Patch Cushions
    for (let i = 0; i < 110; i++) {
      const gx = courtLeft + nextFloorRand() * courtW;
      const gy = courtTop + nextFloorRand() * courtH;
      const rx = 18 + nextFloorRand() * 36;
      const ry = 10 + nextFloorRand() * 22;
      const rot = nextFloorRand() * Math.PI;
      ctx.fillStyle = i % 2 === 0 ? innerLightHex : innerDarkHex;
      ctx.globalAlpha = 0.12 + nextFloorRand() * 0.05;
      ctx.beginPath();
      ctx.ellipse(gx, gy, rx, ry, rot, 0, Math.PI * 2);
      ctx.fill();
    }

    // Hand-Painted 3-Blade Grass Tuft Strokes & Clover Dots across the Ground
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (let i = 0; i < 240; i++) {
      const tx = courtLeft + 24 + nextFloorRand() * (courtW - 48);
      const ty = courtTop + 24 + nextFloorRand() * (courtH - 48);
      const h = 7 + nextFloorRand() * 8;
      ctx.strokeStyle = i % 3 === 0 ? bladeTipHex : innerDarkHex;
      ctx.lineWidth = 2.6;
      ctx.globalAlpha = 0.28 + nextFloorRand() * 0.12;
      ctx.beginPath();
      // Left blade
      ctx.moveTo(tx, ty);
      ctx.quadraticCurveTo(tx - 3, ty - h * 0.6, tx - 6, ty - h);
      // Center blade
      ctx.moveTo(tx, ty);
      ctx.lineTo(tx + 0.5, ty - h * 1.18);
      // Right blade
      ctx.moveTo(tx, ty);
      ctx.quadraticCurveTo(tx + 3, ty - h * 0.6, tx + 6, ty - h);
      ctx.stroke();
    }

    ctx.globalAlpha = 1.0;
    ctx.restore();

    // 3. Bold Hand-Inked Court Boundary Line with Carved Stone Corner Accents
    const safeLineFill =
      lineHex.toUpperCase() === '#FFFFFF' || lineHex.toUpperCase() === '#FFFBEB'
        ? '#E2E8F0'
        : lineHex;

    ctx.save();
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 26;
    ctx.beginPath();
    ctx.roundRect(courtLeft, courtTop, courtW, courtH, 16);
    ctx.stroke();

    ctx.strokeStyle = safeLineFill;
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.roundRect(courtLeft, courtTop, courtW, courtH, 16);
    ctx.stroke();
    ctx.restore();

    courtFloorCanvasCache.set(cacheKey, canvas);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  texture.anisotropy = maxAnisotropy;
  texture.needsUpdate = true;
  return texture;
}

const grassTurfTexCache = new Map<string, THREE.CanvasTexture>();

/**
 * Generates a Seamless Hand-Painted 3D Island Meadow Grass Texture with Clover Clusters,
 * Blade Brushstrokes, and Sunlit Emerald Dabs for the surrounding island ground plateau!
 */
export function createLushGrassTurfTexture(
  baseHex: string = '#22C55E',
  maxAnisotropy: number = 4,
  repeatScale: number = 6
): THREE.CanvasTexture {
  const key = `turf_${baseHex}_${repeatScale}`;
  if (grassTurfTexCache.has(key)) return grassTurfTexCache.get(key)!;

  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const baseCol = new THREE.Color(baseHex);
  const lightCol = baseCol.clone().offsetHSL(-0.02, 0.06, 0.08);
  const darkCol = baseCol.clone().offsetHSL(0.02, 0.05, -0.09);
  const tipCol = baseCol.clone().offsetHSL(-0.03, 0.1, 0.14);

  ctx.fillStyle = `#${baseCol.getHexString()}`;
  ctx.fillRect(0, 0, size, size);

  let seed = 7719;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  // Soft seamless turf cushions
  for (let i = 0; i < 64; i++) {
    const cx = rand() * size;
    const cy = rand() * size;
    const rx = 18 + rand() * 34;
    const ry = 12 + rand() * 24;
    ctx.fillStyle = `#${(i % 2 === 0 ? lightCol : darkCol).getHexString()}`;
    ctx.globalAlpha = 0.22;
    for (let ox = -size; ox <= size; ox += size) {
      for (let oy = -size; oy <= size; oy += size) {
        ctx.beginPath();
        ctx.ellipse(cx + ox, cy + oy, rx, ry, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // Painted grass blade tufts & tiny wildflower specks
  ctx.lineCap = 'round';
  for (let i = 0; i < 150; i++) {
    const tx = rand() * size;
    const ty = rand() * size;
    const bh = 8 + rand() * 9;
    ctx.strokeStyle = `#${(i % 2 === 0 ? tipCol : darkCol).getHexString()}`;
    ctx.lineWidth = 2.8;
    ctx.globalAlpha = 0.42;
    for (let ox = -size; ox <= size; ox += size) {
      for (let oy = -size; oy <= size; oy += size) {
        ctx.beginPath();
        ctx.moveTo(tx + ox, ty + oy);
        ctx.lineTo(tx + ox - 5, ty + oy - bh);
        ctx.moveTo(tx + ox, ty + oy);
        ctx.lineTo(tx + ox, ty + oy - bh * 1.2);
        ctx.moveTo(tx + ox, ty + oy);
        ctx.lineTo(tx + ox + 5, ty + oy - bh);
        ctx.stroke();
      }
    }
  }
  ctx.globalAlpha = 1.0;

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatScale, repeatScale);
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = false;
  tex.anisotropy = maxAnisotropy;
  tex.needsUpdate = true;
  grassTurfTexCache.set(key, tex);
  return tex;
}

/**
 * Generates a rich, seamless tileable stylized water texture with cellular caustics,
 * turquoise depth swells, and hand-drawn cartoon wave crests.
 * Designed for smooth UV scrolling and 3D wave undulation!
 */
export function createStylizedWaterTexture(
  waterHex: string = '#0284C7',
  maxAnisotropy: number = 4,
  repeatScale: number = 8
): THREE.CanvasTexture {
  const cacheKey = `${waterHex}`;
  let canvas = waterCanvasCache.get(cacheKey);
  if (!canvas) {
    const texSize = 256;
    canvas = document.createElement('canvas');
    canvas.width = texSize;
    canvas.height = texSize;
    const ctx = canvas.getContext('2d')!;
    ctx.scale(0.5, 0.5);
    const logicSize = 512;

  const isLava =
    waterHex.toUpperCase() === '#F97316' ||
    waterHex.toUpperCase() === '#EA580C';

  const baseColor = new THREE.Color(waterHex);
  const size = logicSize;
  ctx.fillStyle = `#${baseColor.getHexString()}`;
  ctx.fillRect(0, 0, size, size);

  const deepColor = baseColor
    .clone()
    .offsetHSL(0, 0.06, isLava ? -0.12 : -0.09);
  const midGlowColor = baseColor
    .clone()
    .offsetHSL(isLava ? 0.02 : -0.02, 0.1, isLava ? 0.12 : 0.11);
  const crestHighlightHex = isLava
    ? 'rgba(254, 240, 138, 0.36)'
    : 'rgba(224, 242, 254, 0.34)';
  const causticLineHex = isLava
    ? 'rgba(253, 224, 71, 0.25)'
    : 'rgba(125, 211, 252, 0.28)';
  const troughShadowHex = isLava
    ? 'rgba(124, 45, 18, 0.24)'
    : 'rgba(12, 74, 110, 0.20)';

  const drawTiled = (drawFn: (ox: number, oy: number) => void) => {
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        drawFn(dx * size, dy * size);
      }
    }
  };

  let seed = 907;
  const nextRand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  for (let i = 0; i < 18; i++) {
    const cx = nextRand() * size;
    const cy = nextRand() * size;
    const rx = 42 + nextRand() * 68;
    const ry = 24 + nextRand() * 42;
    const col =
      i % 2 === 0
        ? `#${midGlowColor.getHexString()}`
        : `#${deepColor.getHexString()}`;
    ctx.save();
    ctx.globalAlpha = 0.22;
    ctx.fillStyle = col;
    drawTiled((ox, oy) => {
      ctx.beginPath();
      ctx.ellipse(cx + ox, cy + oy, rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
  }

  ctx.save();
  ctx.lineCap = 'round';
  for (let row = 0; row < 6; row++) {
    const baseY = (row / 6) * size;
    const phase = row * 0.85;

    ctx.strokeStyle = troughShadowHex;
    ctx.lineWidth = 10;
    ctx.beginPath();
    for (let x = 0; x <= size; x += 16) {
      const t = (x / size) * Math.PI * 2;
      const y =
        baseY +
        Math.sin(t * 2 + phase) * 14 +
        Math.cos(t * 3 - phase * 0.7) * 6;
      if (x === 0) ctx.moveTo(x, y + 5);
      else ctx.lineTo(x, y + 5);
    }
    ctx.stroke();

    ctx.strokeStyle = causticLineHex;
    ctx.lineWidth = 6;
    ctx.beginPath();
    for (let x = 0; x <= size; x += 16) {
      const t = (x / size) * Math.PI * 2;
      const y =
        baseY +
        Math.sin(t * 2 + phase) * 14 +
        Math.cos(t * 3 - phase * 0.7) * 6;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  ctx.restore();

  ctx.save();
  ctx.strokeStyle = crestHighlightHex;
  ctx.lineWidth = 3.2;
  for (let i = 0; i < 20; i++) {
    const cx = nextRand() * size;
    const cy = nextRand() * size;
    const rx = 18 + nextRand() * 28;
    const ry = 10 + nextRand() * 18;
    const rot = (nextRand() - 0.5) * 0.5;
    drawTiled((ox, oy) => {
      ctx.beginPath();
      ctx.ellipse(cx + ox, cy + oy, rx, ry, rot, 0, Math.PI * 2);
      ctx.stroke();
    });
  }
  ctx.restore();

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (let i = 0; i < 16; i++) {
    const wx = nextRand() * size;
    const wy = nextRand() * size;
    const wLen = 34 + nextRand() * 38;
    const wAmp = 6 + nextRand() * 5;

    drawTiled((ox, oy) => {
      const x0 = wx + ox - wLen * 0.5;
      const y0 = wy + oy;

      ctx.strokeStyle = troughShadowHex;
      ctx.lineWidth = 5.5;
      ctx.beginPath();
      ctx.moveTo(x0, y0 + 3);
      ctx.quadraticCurveTo(
        x0 + wLen * 0.25,
        y0 - wAmp + 3,
        x0 + wLen * 0.5,
        y0 + 3
      );
      ctx.quadraticCurveTo(
        x0 + wLen * 0.75,
        y0 - wAmp + 3,
        x0 + wLen,
        y0 + 3
      );
      ctx.stroke();

      ctx.strokeStyle = crestHighlightHex;
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.quadraticCurveTo(x0 + wLen * 0.25, y0 - wAmp, x0 + wLen * 0.5, y0);
      ctx.quadraticCurveTo(x0 + wLen * 0.75, y0 - wAmp, x0 + wLen, y0);
      ctx.stroke();
    });
  }
  ctx.restore();

    waterCanvasCache.set(cacheKey, canvas);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeatScale, repeatScale);
  texture.anisotropy = maxAnisotropy;
  texture.needsUpdate = true;
  return texture;
}

/**
 * Generates a vertical cascading waterfall stream texture with foaming water streaks
 * designed to scroll smoothly along the Y axis.
 */
export function createWaterfallStreamTexture(
  waterHex: string = '#38BDF8',
  maxAnisotropy: number = 4
): THREE.CanvasTexture {
  const width = 256;
  const height = 512;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  const baseColor = new THREE.Color(waterHex);
  ctx.fillStyle = `#${baseColor.getHexString()}`;
  ctx.fillRect(0, 0, width, height);

  // Vertical cascading water streaks & foaming ribbons
  for (let i = 0; i < 16; i++) {
    const x = (i / 16) * width;
    const w = 10 + (i % 3) * 6;
    ctx.fillStyle =
      i % 2 === 0
        ? 'rgba(224, 242, 254, 0.36)'
        : 'rgba(2, 132, 199, 0.24)';
    ctx.fillRect(x, 0, w, height);
  }

  // Seamless vertical foam cascade dashes & ripple arcs
  ctx.save();
  ctx.lineCap = 'round';
  let seed = 523;
  const nextRand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  for (let i = 0; i < 42; i++) {
    const fx = 16 + nextRand() * (width - 32);
    const fy = nextRand() * height;
    const fLen = 36 + nextRand() * 68;
    const fWidth = 4 + nextRand() * 5;

    ctx.strokeStyle =
      i % 3 === 0
        ? 'rgba(240, 249, 255, 0.58)'
        : 'rgba(186, 230, 253, 0.42)';
    ctx.lineWidth = fWidth;

    [-height, 0, height].forEach((oy) => {
      ctx.beginPath();
      ctx.moveTo(fx, fy + oy);
      ctx.lineTo(fx, fy + oy + fLen);
      ctx.stroke();
    });
  }
  ctx.restore();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1, 2);
  texture.anisotropy = maxAnisotropy;
  texture.needsUpdate = true;
  return texture;
}

export function getContactShadowTexture(): THREE.CanvasTexture {
  if (cachedShadowTexture) return cachedShadowTexture;

  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createRadialGradient(
    size / 2,
    size / 2,
    6,
    size / 2,
    size / 2,
    size / 2
  );
  grad.addColorStop(0, 'rgba(30, 27, 36, 0.5)');
  grad.addColorStop(0.55, 'rgba(30, 27, 36, 0.22)');
  grad.addColorStop(1, 'rgba(30, 27, 36, 0.0)');

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  cachedShadowTexture = tex;
  return tex;
}

/**
 * Generates a rich painted 3D Sky Dome texture with zenith-to-horizon gradient,
 * warm sunlit horizon band, soft cirrus cloud ribbons, and gentle atmospheric sunbeams.
 */
export function createStylizedSkyDomeTexture(
  skyTopHex: string = '#1D4ED8',
  skyHorizonHex: string = '#93C5FD',
  accentGlowHex: string = '#FEF08A'
): THREE.CanvasTexture {
  const width = 1024;
  const height = 512;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  const topCol = new THREE.Color(skyTopHex);
  const horizonCol = new THREE.Color(skyHorizonHex);
  const midCol = topCol.clone().lerp(horizonCol, 0.52);
  const lowerHorizonCol = horizonCol
    .clone()
    .lerp(new THREE.Color(accentGlowHex), 0.18);

  // 1. Multi-stop vertical sky dome gradient
  const skyGrad = ctx.createLinearGradient(0, 0, 0, height);
  skyGrad.addColorStop(0.0, `#${topCol.getHexString()}`);
  skyGrad.addColorStop(0.32, `#${midCol.getHexString()}`);
  skyGrad.addColorStop(0.52, `#${horizonCol.getHexString()}`);
  skyGrad.addColorStop(0.62, `#${lowerHorizonCol.getHexString()}`);
  skyGrad.addColorStop(1.0, `#${horizonCol.getHexString()}`);
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, width, height);

  // 2. Soft Golden-Cyan Sunlit Atmospheric Glow on the Back Horizon
  const sunGlow = ctx.createRadialGradient(
    width * 0.5,
    height * 0.44,
    12,
    width * 0.5,
    height * 0.44,
    width * 0.36
  );
  sunGlow.addColorStop(0, 'rgba(254, 249, 195, 0.42)');
  sunGlow.addColorStop(0.45, 'rgba(224, 242, 254, 0.22)');
  sunGlow.addColorStop(1, 'rgba(255, 255, 255, 0.0)');
  ctx.fillStyle = sunGlow;
  ctx.fillRect(0, 0, width, height);

  // 3. Soft Diagonal Volumetric Sunbeams radiating across the upper sky
  ctx.save();
  for (let i = 0; i < 9; i++) {
    const angle = ((i - 4) / 9) * 1.15;
    const cx = width * 0.5;
    const cy = height * 0.46;
    const rayLen = height * 0.46;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.048)';
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(
      cx + Math.sin(angle - 0.045) * rayLen * 1.8,
      cy - Math.cos(angle - 0.045) * rayLen
    );
    ctx.lineTo(
      cx + Math.sin(angle + 0.045) * rayLen * 1.8,
      cy - Math.cos(angle + 0.045) * rayLen
    );
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  // 4. Hand-Painted Layered Cirrus & Cumulus Cloud Ribbons along the Sky Horizon
  ctx.save();
  let seed = 809;
  const nextRand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  for (let i = 0; i < 28; i++) {
    const cx = nextRand() * width;
    const cy = height * (0.24 + nextRand() * 0.26);
    const rx = 38 + nextRand() * 68;
    const ry = 10 + nextRand() * 16;

    [-width, 0, width].forEach((ox) => {
      // Soft cloud under-shadow
      ctx.fillStyle = 'rgba(148, 163, 184, 0.14)';
      ctx.beginPath();
      ctx.ellipse(cx + ox, cy + 4, rx * 0.95, ry * 0.85, 0, 0, Math.PI * 2);
      ctx.fill();

      // Warm sunlit cloud puff
      ctx.fillStyle = 'rgba(248, 250, 252, 0.24)';
      ctx.beginPath();
      ctx.ellipse(cx + ox, cy, rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();
    });
  }
  ctx.restore();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.needsUpdate = true;
  return tex;
}

const airshipTexCache = new Map<string, THREE.CanvasTexture>();
const roofTileTexCache = new Map<string, THREE.CanvasTexture>();
const stoneWallTexCache = new Map<string, THREE.CanvasTexture>();

/**
 * Generates a rich, comic-inked Airship / Sky Plane Hull Texture with aerodynamic panel ribs,
 * racing stripes, riveted seams, and a golden winged star/crown emblem so sky vehicles never look plain!
 */
export function createStylizedAirshipTexture(
  baseHex: string = '#2563EB',
  stripeHex: string = '#FACC15',
  accentHex: string = '#EF4444'
): THREE.CanvasTexture {
  const key = `${baseHex}_${stripeHex}_${accentHex}`;
  if (airshipTexCache.has(key)) return airshipTexCache.get(key)!;

  const width = 512;
  const height = 256;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  const baseCol = new THREE.Color(baseHex);
  const lightCol = baseCol.clone().offsetHSL(-0.01, 0.04, 0.1);
  const darkCol = baseCol.clone().offsetHSL(0.01, 0.05, -0.12);

  // 1. Alternating aerodynamic gore ribs with shading
  const numRibs = 12;
  const ribH = height / numRibs;
  for (let i = 0; i < numRibs; i++) {
    const y = i * ribH;
    const ribGrad = ctx.createLinearGradient(0, y, 0, y + ribH);
    ribGrad.addColorStop(0, `#${lightCol.getHexString()}`);
    ribGrad.addColorStop(0.55, `#${baseCol.getHexString()}`);
    ribGrad.addColorStop(1, `#${darkCol.getHexString()}`);
    ctx.fillStyle = ribGrad;
    ctx.fillRect(0, y, width, ribH + 1);

    // Hand-inked seam line
    ctx.strokeStyle = 'rgba(15, 23, 42, 0.65)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  // 2. Vertical structural ring bulkheads & rivets
  for (let x = 64; x < width; x += 64) {
    ctx.strokeStyle = 'rgba(15, 23, 42, 0.45)';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();

    ctx.fillStyle = 'rgba(248, 250, 252, 0.45)';
    for (let ry = 12; ry < height; ry += 24) {
      ctx.beginPath();
      ctx.arc(x - 5, ry, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // 3. Bold Equatorial Racing Stripes (Accent + Gold + White Specular Trim)
  const midY = height * 0.5;
  ctx.fillStyle = '#F8FAFC';
  ctx.fillRect(0, midY - 30, width, 60);

  ctx.fillStyle = accentHex;
  ctx.fillRect(0, midY - 24, width, 16);
  ctx.fillRect(0, midY + 8, width, 16);

  ctx.fillStyle = stripeHex;
  ctx.fillRect(0, midY - 8, width, 16);

  ctx.strokeStyle = '#0F172A';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(0, midY - 30);
  ctx.lineTo(width, midY - 30);
  ctx.moveTo(0, midY + 30);
  ctx.lineTo(width, midY + 30);
  ctx.stroke();

  // 4. Nose & Tail Checkered / Chevron Trim Bands
  const drawChevronBand = (bx: number) => {
    ctx.fillStyle = stripeHex;
    ctx.fillRect(bx, 0, 22, height);
    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 3.5;
    ctx.strokeRect(bx, 0, 22, height);
  };
  drawChevronBand(42);
  drawChevronBand(width - 64);

  // 5. Dual Side Medallion Insignias (Golden Circle + Star Emblem)
  [width * 0.25, width * 0.75].forEach((cx) => {
    ctx.save();
    ctx.translate(cx, midY);
    ctx.fillStyle = '#0F172A';
    ctx.beginPath();
    ctx.arc(0, 0, 34, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = stripeHex;
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#F8FAFC';
    ctx.beginPath();
    ctx.arc(0, 0, 27, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 5-Pointed Star inside Medallion
    ctx.fillStyle = accentHex;
    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let s = 0; s < 10; s++) {
      const r = s % 2 === 0 ? 18 : 8;
      const a = (s * Math.PI) / 5 - Math.PI / 2;
      if (s === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
      else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  });

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.needsUpdate = true;
  airshipTexCache.set(key, tex);
  return tex;
}

/**
 * Generates a stylized hand-inked Roof Shingle / Scallop Tile Texture for castle towers,
 * grandstands, and pavilions so roofs never look like flat solid cones!
 */
export function createStylizedRoofTileTexture(
  baseHex: string = '#2563EB',
  trimHex: string = '#FACC15'
): THREE.CanvasTexture {
  const key = `v2_${baseHex}_${trimHex}`;
  if (roofTileTexCache.has(key)) return roofTileTexCache.get(key)!;

  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const baseCol = new THREE.Color(baseHex);
  const darkCol = baseCol.clone().offsetHSL(0, 0.05, -0.12);
  const lightCol = baseCol.clone().offsetHSL(0, -0.02, 0.09);
  const specCol = baseCol.clone().offsetHSL(0, -0.04, 0.16);

  ctx.fillStyle = `#${baseCol.getHexString()}`;
  ctx.fillRect(0, 0, size, size);

  const rows = 7;
  const cols = 7;
  const rh = size / rows;
  const cw = size / cols;

  for (let r = rows - 1; r >= 0; r--) {
    const ox = r % 2 === 1 ? cw * 0.5 : 0;
    const cy = r * rh;
    for (let c = -1; c <= cols; c++) {
      const cx = c * cw + ox;
      const colShade = (r + c) % 2 === 0 ? lightCol : darkCol;
      ctx.fillStyle = `#${colShade.getHexString()}`;
      ctx.beginPath();
      ctx.roundRect(cx + 3, cy, cw - 6, rh + 10, [0, 0, 22, 22]);
      ctx.fill();

      // Inner shingle highlight rim
      ctx.fillStyle = `#${specCol.getHexString()}`;
      ctx.globalAlpha = 0.35;
      ctx.beginPath();
      ctx.roundRect(cx + 8, cy + 4, cw - 16, rh * 0.42, 6);
      ctx.fill();
      ctx.globalAlpha = 1.0;

      ctx.strokeStyle = '#0F172A';
      ctx.lineWidth = 4.5;
      ctx.beginPath();
      ctx.roundRect(cx + 3, cy, cw - 6, rh + 10, [0, 0, 22, 22]);
      ctx.stroke();
    }
  }

  // Bottom decorative golden trim band
  ctx.fillStyle = trimHex;
  ctx.fillRect(0, size - 36, size, 36);
  ctx.strokeStyle = '#0F172A';
  ctx.lineWidth = 5;
  ctx.strokeRect(0, size - 36, size, 36);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.needsUpdate = true;
  roofTileTexCache.set(key, tex);
  return tex;
}

/**
 * Generates an architectural hand-inked Stone Block Texture for castle walls,
 * grandstands, and pillars across all game modes.
 */
export function createStylizedStoneWallTexture(
  baseHex: string = '#94A3B8',
  mortarHex: string = '#475569'
): THREE.CanvasTexture {
  const key = `v2_${baseHex}_${mortarHex}`;
  if (stoneWallTexCache.has(key)) return stoneWallTexCache.get(key)!;

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
        .offsetHSL(0, 0, ((r * 3 + c) % 3 - 1) * 0.042);
      const bevelLight = shade.clone().offsetHSL(0, 0, 0.07);
      ctx.fillStyle = `#${shade.getHexString()}`;
      ctx.beginPath();
      ctx.roundRect(c * cw + ox + 6, r * rh + 6, cw - 12, rh - 12, 12);
      ctx.fill();

      // Top-left stone bevel highlight
      ctx.fillStyle = `#${bevelLight.getHexString()}`;
      ctx.globalAlpha = 0.45;
      ctx.beginPath();
      ctx.roundRect(c * cw + ox + 12, r * rh + 12, cw - 24, (rh - 24) * 0.38, 6);
      ctx.fill();
      ctx.globalAlpha = 1.0;

      ctx.lineWidth = 5;
      ctx.strokeStyle = '#0F172A';
      ctx.beginPath();
      ctx.roundRect(c * cw + ox + 6, r * rh + 6, cw - 12, rh - 12, 12);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(15, 23, 42, 0.35)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(c * cw + ox + 20, r * rh + 22);
      ctx.lineTo(c * cw + ox + 54, r * rh + 22);
      ctx.stroke();
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.needsUpdate = true;
  stoneWallTexCache.set(key, tex);
  return tex;
}

const woodTexCache = new Map<string, THREE.CanvasTexture>();

/**
 * Generates a warm hand-inked Wood Grain / Palm Bark Texture for piers, palm trunks, crates, and wooden beams.
 */
export function createCrayonWoodTexture(
  baseHex: string = '#A16207',
  grainHex: string = '#713F12'
): THREE.CanvasTexture {
  const key = `${baseHex}_${grainHex}`;
  if (woodTexCache.has(key)) return woodTexCache.get(key)!;

  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const baseCol = new THREE.Color(baseHex);
  const lightCol = baseCol.clone().offsetHSL(0, 0.04, 0.06);
  const darkCol = new THREE.Color(grainHex);

  ctx.fillStyle = `#${baseCol.getHexString()}`;
  ctx.fillRect(0, 0, size, size);

  const planks = 4;
  const pw = size / planks;
  for (let p = 0; p < planks; p++) {
    const px = p * pw;
    ctx.fillStyle = `#${(p % 2 === 0 ? lightCol : baseCol).getHexString()}`;
    ctx.fillRect(px + 2, 0, pw - 4, size);

    // Plank seam
    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 3;
    ctx.strokeRect(px + 1, 1, pw - 2, size - 2);

    // Wood grain lines & knots
    ctx.strokeStyle = `#${darkCol.getHexString()}`;
    ctx.lineWidth = 2.4;
    for (let g = 0; g < 5; g++) {
      const gx = px + 8 + g * ((pw - 16) / 4);
      ctx.beginPath();
      ctx.moveTo(gx, 0);
      ctx.bezierCurveTo(
        gx + (g % 2 === 0 ? 4 : -4),
        size * 0.33,
        gx + (g % 2 === 0 ? -4 : 4),
        size * 0.66,
        gx,
        size
      );
      ctx.stroke();
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.needsUpdate = true;
  woodTexCache.set(key, tex);
  return tex;
}
