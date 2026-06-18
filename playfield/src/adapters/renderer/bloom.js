import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import * as THREE from 'three';

// Tune via LGT debug panel → Copy JSON to persist values here.
export const BLOOM_DEFAULTS = {
  enabled:   true,
  strength:  0.35,
  threshold: 0.75,
  radius:    0.4,
  exposure:  1.0,
};

export function createBloom(renderer, scene, camera) {
  const composer = new EffectComposer(renderer);
  const renderPass = new RenderPass(scene, camera);
  composer.addPass(renderPass);

  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    BLOOM_DEFAULTS.strength,
    BLOOM_DEFAULTS.radius,
    BLOOM_DEFAULTS.threshold,
  );
  composer.addPass(bloomPass);
  composer.addPass(new OutputPass());

  function onResize() {
    composer.setSize(window.innerWidth, window.innerHeight);
  }

  return { composer, bloomPass, renderPass, onResize };
}
