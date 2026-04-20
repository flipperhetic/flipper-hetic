/**
 * Playfield — Adapter physique : branchement Cannon-es du use case collisions.
 *
 * Ecoute l'evenement "collide" sur le body de la bille, extrait le type
 * depuis userData et delegue la decision au use case. Applique aussi
 * l'impulsion de repousse des bumpers (specifique Cannon-es).
 */
import * as CANNON from "cannon-es";
import { BUMPER_REPULSE_FORCE } from "../../domain/constants.js";

export function attachCollisionListener(ballBody, handler) {
  ballBody.addEventListener("collide", (event) => {
    const type = event.body.userData?.type;
    handler.handleCollision(type, performance.now());

    if (type === "bumper") {
      const contact = event.contact;
      const normal = new CANNON.Vec3();
      if (contact.bi === ballBody) {
        contact.ni.negate(normal);
      } else {
        normal.copy(contact.ni);
      }
      normal.y = 0;
      normal.normalize();
      normal.scale(BUMPER_REPULSE_FORCE, normal);
      ballBody.applyImpulse(normal);
    }
  });
}
