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
  updateLaunchGate,
  openLaunchGate,
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
    launchGateBody,
    renderer,
    scene,
    camera,
    getCamera,
    onResize,
    gameState,
  } = deps;

  const resolveCamera = typeof getCamera === "function" ? getCamera : () => camera;
  const renderFn = typeof deps.renderFn === 'function'
    ? deps.renderFn
    : () => renderer.render(scene, resolveCamera());

  let lastTime = performance.now();
  let accumulator = 0;

  function animate() {
    requestAnimationFrame(animate);

    const now = performance.now();
    const delta = Math.min((now - lastTime) / 1000, 0.1);
    lastTime = now;

    accumulator += delta;
    while (accumulator >= FIXED_TIME_STEP) {
      updateFlippers(flipperBodies);
      world.step(FIXED_TIME_STEP, FIXED_TIME_STEP, 1);
      postStepFlippers(flipperBodies);
      accumulator -= FIXED_TIME_STEP;
    }

    clampBallBody(ballBody);
    updateLaunchGate(launchGateBody, ballBody.position.z);

    if (collisionHandler.checkDrain(ballBody.position.z, gameState.status)) {
      resetBallBody(ballBody);
      openLaunchGate(launchGateBody);
      collisionHandler.resetDrainFlag();
    }

    syncMeshesWithBodies(syncPairs);
    renderFn();
  }

  if (typeof onResize === "function") {
    window.addEventListener("resize", onResize);
  }

  animate();
}
