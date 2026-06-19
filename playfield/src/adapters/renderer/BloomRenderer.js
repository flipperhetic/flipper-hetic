import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import * as THREE from 'three';

export const BLOOM_DEFAULTS = {
  enabled:   true,
  strength:  0.35,
  threshold: 0.75,
  radius:    0.4,
  exposure:  1.0,
};

class BloomRenderer {
  #composer;
  #renderPass;
  #bloomPass;

  constructor(renderer, scene, camera) {
    this.#composer = new EffectComposer(renderer);
    this.#renderPass = new RenderPass(scene, camera);
    this.#composer.addPass(this.#renderPass);

    this.#bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      BLOOM_DEFAULTS.strength,
      BLOOM_DEFAULTS.radius,
      BLOOM_DEFAULTS.threshold,
    );
    this.#composer.addPass(this.#bloomPass);
    this.#composer.addPass(new OutputPass());
  }

  get composer()   { return this.#composer; }
  get bloomPass()  { return this.#bloomPass; }
  get renderPass() { return this.#renderPass; }

  render(camera) {
    this.#renderPass.camera = camera;
    this.#composer.render();
  }

  onResize() {
    this.#composer.setSize(window.innerWidth, window.innerHeight);
  }
}

export default BloomRenderer;
