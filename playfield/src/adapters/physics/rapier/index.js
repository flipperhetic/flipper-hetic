/**
 * Rapier — barrel d'agregation.
 *
 * Conforme au contrat `ports/PhysicsPort.js`.
 *
 * Avant d'utiliser ce backend, main.js doit appeler :
 *
 *     import { initRapier } from "./adapters/physics/rapier/init.js";
 *     await initRapier();
 *
 * (idealement avant tout `createPhysicsWorld()`), depuis `main.js` ou tout module de composition).
 */

export { initRapier, getRapier } from "./init.js";

export {
  FIXED_TIME_STEP,
  MAX_SUB_STEPS,
  MATERIALS,
  createPhysicsWorld,
  createStaticBoxBody,
  createSensorBoxBody,
  syncMeshesWithBodies,
} from "./world.js";

export {
  createBallBody,
  resetBallBody,
  launchBallBody,
  clampBallBody,
} from "./ballBody.js";

export {
  createFlipperBodies,
  setFlipperActive,
  updateFlippers,
  postStepFlippers,
  setFlippersWorldRotY,
} from "./flipperBody.js";

export { createArchBody, createTriangleBody, createCylinderBody, createDiamondBody } from "./archBody.js";
export {
  createLaunchGateBody,
  openLaunchGate,
  closeLaunchGate,
  updateLaunchGate,
} from "./launchGateBody.js";
export { attachCollisionListener } from "./collisionListener.js";
