/**
 * Playfield — Use case : decisions collision + drain.
 *
 * Logique pure, aucun import de framework.
 * Recoit des callbacks injectes par la composition root :
 *   - onCollision(type)      : declenche les emit/actuators externes
 *   - onBallLost()           : declenche emit ball_lost / actuator
 *   - onBumperImpulse(vec3)  : applique une force radiale a la bille (regle bumper)
 *
 * Les adapters physiques (Rapier) appellent `handleCollision` en passant
 * la position de la bille et de l'objet impacte dans `ctx`. Le calcul du vecteur
 * de repulsion est fait ici (regle de gameplay), l'application est deleguee a la
 * composition root via `onBumperImpulse`.
 */
import {
  DRAIN_Z_THRESHOLD,
  COLLISION_COOLDOWN_MS,
  BUMPER_REPULSE_FORCE,
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

  function emitBumperImpulse(ballPos, otherPos) {
    if (!callbacks.onBumperImpulse || !ballPos || !otherPos) return;
    const dx = ballPos.x - otherPos.x;
    const dz = ballPos.z - otherPos.z;
    const len = Math.hypot(dx, dz) || 1;
    callbacks.onBumperImpulse({
      x: (dx / len) * BUMPER_REPULSE_FORCE,
      y: 0,
      z: (dz / len) * BUMPER_REPULSE_FORCE,
    });
  }

  return {
    /**
     * Decide s'il faut emettre une collision. Retourne true si onCollision a ete appele.
     * `now` est un timestamp en ms fourni par l'appelant (performance.now / Date.now).
     * `ctx` (optionnel) : { ballPos: {x,y,z}, otherPos: {x,y,z} } — utilise pour la
     * regle bumper (calcul de la repulsion radiale).
     */
    handleCollision(type, now, ctx = {}) {
      if (!type || IGNORED_TYPES.has(type)) return false;
      if (!canEmit(type, now)) return false;
      callbacks.onCollision(type);
      if (type === "bumper") emitBumperImpulse(ctx.ballPos, ctx.otherPos);
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
