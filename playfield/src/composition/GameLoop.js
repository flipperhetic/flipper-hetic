import { syncMeshesWithBodies, FIXED_TIME_STEP } from '../adapters/physics/index.js';

export default class GameLoop {
  #rafId = null;
  #lastTime = 0;
  #accumulator = 0;
  #physicsWorld;
  #syncPairs;
  #collisionHandler;
  #ballBody;
  #flipperBodies;
  #launchGateBody;
  #gameState;
  #renderFn;

  constructor({ physicsWorld, syncPairs, collisionHandler, ballBody, flipperBodies, launchGateBody, gameState, renderFn }) {
    this.#physicsWorld = physicsWorld;
    this.#syncPairs = syncPairs;
    this.#collisionHandler = collisionHandler;
    this.#ballBody = ballBody;
    this.#flipperBodies = flipperBodies;
    this.#launchGateBody = launchGateBody;
    this.#gameState = gameState;
    this.#renderFn = renderFn;
  }

  start() {
    this.#lastTime = performance.now();
    this.#accumulator = 0;
    this.#tick();
  }

  stop() {
    if (this.#rafId !== null) {
      cancelAnimationFrame(this.#rafId);
      this.#rafId = null;
    }
  }

  #tick = () => {
    this.#rafId = requestAnimationFrame(this.#tick);

    const now = performance.now();
    const delta = Math.min((now - this.#lastTime) / 1000, 0.1);
    this.#lastTime = now;

    this.#accumulator += delta;
    while (this.#accumulator >= FIXED_TIME_STEP) {
      this.#flipperBodies.preStep();
      this.#physicsWorld.step();
      this.#flipperBodies.postStep();
      this.#ballBody.clamp();
      this.#accumulator -= FIXED_TIME_STEP;
    }

    this.#launchGateBody.update(this.#ballBody.position.z);

    if (this.#collisionHandler.checkDrain(this.#ballBody.position.z, this.#gameState.status)) {
      this.#ballBody.reset();
      this.#launchGateBody.open();
      this.#collisionHandler.resetDrainFlag();
    }

    syncMeshesWithBodies(this.#syncPairs);
    this.#renderFn();
  };
}
