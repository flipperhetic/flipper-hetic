import {
  DRAIN_Z_THRESHOLD,
  COLLISION_COOLDOWN_MS,
  BUMPER_REPULSE_FORCE,
} from "../domain/constants.js";

const IGNORED_TYPES = new Set(["ball", "table", "triangle", "arch"]);

class CollisionHandler {
  #onCollision;
  #onBallLost;
  #onBumperImpulse;
  #lastEmitByType = {};
  #ballLostEmitted = false;
  #drainZ = DRAIN_Z_THRESHOLD;

  constructor({ onCollision, onBallLost, onBumperImpulse }) {
    this.#onCollision = onCollision;
    this.#onBallLost = onBallLost;
    this.#onBumperImpulse = onBumperImpulse;
  }

  setDrainThreshold(z) {
    this.#drainZ = z;
  }

  handleCollision(type, now, ctx = {}) {
    if (!type || IGNORED_TYPES.has(type)) return false;
    const last = this.#lastEmitByType[type];
    if (last && now - last < COLLISION_COOLDOWN_MS) return false;
    this.#lastEmitByType[type] = now;
    this.#onCollision(type);
    if (type.startsWith("bumper")) this.#emitBumperImpulse(ctx.ballPos, ctx.otherPos);
    return true;
  }

  checkDrain(ballZ, gameStatus) {
    if (ballZ > this.#drainZ) {
      if (!this.#ballLostEmitted) {
        this.#ballLostEmitted = true;
        if (gameStatus === "playing") this.#onBallLost();
        return true;
      }
    } else {
      this.#ballLostEmitted = false;
    }
    return false;
  }

  resetDrainFlag() {
    this.#ballLostEmitted = false;
  }

  resetCollisionCooldowns() {
    for (const key of Object.keys(this.#lastEmitByType)) {
      delete this.#lastEmitByType[key];
    }
  }

  #emitBumperImpulse(ballPos, otherPos) {
    if (!this.#onBumperImpulse || !ballPos || !otherPos) return;
    const dx = ballPos.x - otherPos.x;
    const dz = ballPos.z - otherPos.z;
    const len = Math.hypot(dx, dz) || 1;
    this.#onBumperImpulse({
      x: (dx / len) * BUMPER_REPULSE_FORCE,
      y: 0,
      z: (dz / len) * BUMPER_REPULSE_FORCE,
    });
  }
}

export default CollisionHandler;