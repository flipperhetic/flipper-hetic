/**
 * Playfield — Collisions & drain (etape 10 du plan MVP).
 *
 * Detecte la perte de bille (zone drain) et les collisions typees
 * (bumper, wall, flipper) via les evenements Cannon-es.
 * Emet ball_lost et collision vers le serveur avec debounce par type.
 */
import {
  DRAIN_Z_THRESHOLD,
  BUMPER_REPULSE_FORCE,
  COLLISION_COOLDOWN_MS,
} from "./constants.js";
import { emitBallLost, emitCollision } from "./network.js";
import * as CANNON from "cannon-es";

// Dernier timestamp d'emission par type de collision.
const lastEmitByType = {};

// Flag pour ne pas emettre ball_lost plusieurs fois par perte.
let ballLostEmitted = false;

/**
 * Verifie si le cooldown est passe pour un type donne.
 */
function canEmit(type) {
  const now = performance.now();
  if (lastEmitByType[type] && now - lastEmitByType[type] < COLLISION_COOLDOWN_MS) {
    return false;
  }
  lastEmitByType[type] = now;
  return true;
}

/**
 * Enregistre les listeners de collision sur le body de la bille.
 * `socket` : instance socket.io pour emettre les evenements.
 * `ballBody` : le body Cannon-es de la bille.
 */
export function setupCollisionListeners(socket, ballBody) {
  ballBody.addEventListener("collide", (event) => {
    const type = event.body.userData?.type;
    if (!type || type === "ball" || type === "table") return;

    console.log("[collision] bille →", type);

    if (canEmit(type)) {
      emitCollision(socket, type);
    }

    // Impulsion de repousse pour les bumpers.
    if (type === "bumper") {
      const contact = event.contact;
      const normal = new CANNON.Vec3();
      // La normale pointe de B vers A ; s'assurer qu'elle repousse la bille.
      if (contact.bi === ballBody) {
        contact.ni.negate(normal);
      } else {
        normal.copy(contact.ni);
      }
      normal.y = 0; // Repousse uniquement sur le plan du plateau.
      normal.normalize();
      normal.scale(BUMPER_REPULSE_FORCE, normal);
      ballBody.applyImpulse(normal);
    }
  });
}

/**
 * Verifie a chaque frame si la bille est dans la zone drain.
 * Appeler dans la boucle de rendu APRES world.step().
 * Retourne true si la bille vient d'etre perdue (pour declencher resetBall).
 */
export function checkDrain(socket, ballBody, gameStatus) {
  if (gameStatus !== "playing") {
    ballLostEmitted = false;
    return false;
  }

  if (ballBody.position.z > DRAIN_Z_THRESHOLD) {
    if (!ballLostEmitted) {
      ballLostEmitted = true;
      emitBallLost(socket);
      return true;
    }
  } else {
    // Bille revenue sur le plateau (apres reset) → re-armer le flag.
    ballLostEmitted = false;
  }

  return false;
}

/**
 * Re-arme le flag ball_lost (a appeler apres resetBall).
 */
export function resetDrainFlag() {
  ballLostEmitted = false;
}
