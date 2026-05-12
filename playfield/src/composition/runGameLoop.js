/**
 * Boucle de rendu + pas de simulation physique (séparée de la composition root).
 */
import {
  syncMeshesWithBodies,
  FIXED_TIME_STEP,
  MAX_SUB_STEPS,
  updateFlippers,
  postStepFlippers,
  clampBallBody,
  resetBallBody,
} from "../adapters/physics/index.js";

/**
 * Démarre la boucle requestAnimationFrame (physique + sync meshes + rendu).
 *
 * @param {object} deps — références partagées (monde, bille, collision handler, renderer…).
 */
export function startPlayfieldLoop(deps) {
  const {
    world,
    syncPairs,
    collisionHandler,
    ballBody,
    flipperBodies,
    renderer,
    scene,
    camera,
    gameState,
  } = deps;

  let lastTime = performance.now();

  function animate() {
    requestAnimationFrame(animate);

    const now = performance.now();
    const delta = Math.min((now - lastTime) / 1000, 0.1);
    lastTime = now;

    updateFlippers(flipperBodies);
    world.step(FIXED_TIME_STEP, delta, MAX_SUB_STEPS);
    postStepFlippers(flipperBodies);
    clampBallBody(ballBody);

    if (collisionHandler.checkDrain(ballBody.position.z, gameState.status)) {
      resetBallBody(ballBody);
      collisionHandler.resetDrainFlag();
    }

    syncMeshesWithBodies(syncPairs);
    renderer.render(scene, camera);
  }

  animate();
}
