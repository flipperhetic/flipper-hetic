/**
 * Rapier — bridge collisions Rapier -> use case.
 *
 * Pas de monkey-patch ici : on s'enregistre via `world.addCollisionListener`
 * (defini par world.js, qui draine deja l'EventQueue apres chaque step).
 *
 * Adapter pur : on remonte le `type` de l'objet impacte + les positions
 * ball/other au use case `collisionHandler`. Toute regle metier (debounce,
 * repulsion bumper, drain...) est decidee dans le use case.
 */
import { bodyHandlesByRapierHandle } from "./bodyHandle.js";

export function attachCollisionListener(ballBody, handler) {
  const world = ballBody.world;
  const ballColliderHandle = ballBody.colliders[0].handle;

  world.addCollisionListener((h1, h2) => {
    let otherHandle = null;
    if (h1 === ballColliderHandle) otherHandle = h2;
    else if (h2 === ballColliderHandle) otherHandle = h1;
    else return;

    // h1/h2 sont des collider handles ; on remonte au rigid body parent.
    const collider = world.getCollider(otherHandle);
    if (!collider) return;
    const otherRb = collider.parent();
    if (!otherRb) return;
    const otherBody = bodyHandlesByRapierHandle.get(otherRb.handle);
    if (!otherBody) return;

    handler.handleCollision(otherBody.userData?.type, performance.now(), {
      ballPos: ballBody.rb.translation(),
      otherPos: otherRb.translation(),
    });
  });
}
