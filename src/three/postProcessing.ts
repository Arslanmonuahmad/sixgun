import * as THREE from 'three';

export interface StylizedPostPipeline {
  setSize: (width: number, height: number) => void;
  render: (elapsedSec?: number) => void;
  dispose: () => void;
}

/**
 * Lightweight, 60FPS single-pass hardware-accelerated render pipeline.
 * Uses native WebGLRenderer MSAA, ACESFilmicToneMapping, and SRGBColorSpace
 * without expensive multi-pass HalfFloat EffectComposer / UnrealBloom framebuffers.
 */
export function createStylizedPostPipeline(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera,
  _width: number,
  _height: number,
  _options?: {
    bloomStrength?: number;
    bloomRadius?: number;
    bloomThreshold?: number;
    vignetteIntensity?: number;
  }
): StylizedPostPipeline {
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.02;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const setSize = (_w: number, _h: number) => {
    // Size is managed directly by renderer.setSize
  };

  const render = () => {
    renderer.render(scene, camera);
  };

  const dispose = () => {
    // No offscreen render targets to dispose
  };

  return {
    setSize,
    render,
    dispose,
  };
}
