/**
 * Playfield — Use case : decisions collision + drain.
 *
 * Logique pure, aucun import de framework.
 * Recoit des callbacks `onCollision` / `onBallLost` injectes par la composition root.
 * Le branchement sur Cannon-es est dans `adapters/physics/collisionListener.js`.
 */
import {
  DRAIN_Z_THRESHOLD,
  COLLISION_COOLDOWN_MS,
} from "../domain/constants.js";

const IGNORED_TYPES = new Set(["ball", "table"]);

export function createCollisionHandler(callbacks) {
  const lastEmitByType = {};
  let ballLostEmitted = false;

  function canEmit(type, now) {
    if (lastEmitByType[type] && now - lastEmitByType[type] < COLLISION_COOLDOWN_MS) {
      return false;
    }
    lastEmitByType[type] = now;
    return true;
  }

  return {
    /**
     * Decide s'il faut emettre une collision. Retourne true si onCollision a ete appele.
     * `now` est un timestamp en ms fourni par l'appelant (performance.now / Date.now).
     */
    handleCollision(type, now) {
      if (!type || IGNORED_TYPES.has(type)) return false;
      if (!canEmit(type, now)) return false;
      callbacks.onCollision(type);
      return true;
    },

    /**
     * Verifie si la bille est dans la zone drain.
     * Retourne true si la bille vient d'etre perdue (onBallLost appele).
     */
    checkDrain(ballZ, gameStatus) {
      if (gameStatus !== "playing") {
        ballLostEmitted = false;
        return false;
      }

      if (ballZ > DRAIN_Z_THRESHOLD) {
        if (!ballLostEmitted) {
          ballLostEmitted = true;
          callbacks.onBallLost();
          return true;
        }
      } else {
        ballLostEmitted = false;
      }

      return false;
    },

    resetDrainFlag() {
      ballLostEmitted = false;
    },

    resetCollisionCooldowns() {
      for (const key of Object.keys(lastEmitByType)) {
        delete lastEmitByType[key];
      }
    },
  };
}
