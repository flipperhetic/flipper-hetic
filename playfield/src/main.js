/**
 * Playfield — Composition root.
 * Délègue la construction du niveau et la boucle de jeu à `composition/`.
 */
import { createScene } from "./adapters/renderer/scene.js";
import {
  initRapier,
  createPhysicsWorld,
  attachCollisionListener,
  launchBallBody,
  resetBallBody,
  setFlipperActive,
} from "./adapters/physics/index.js";

await initRapier();

import {
  initNetwork,
  emitStartGame,
  emitLaunchBall,
  emitFlipperLeftDown,
  emitFlipperLeftUp,
  emitFlipperRightDown,
  emitFlipperRightUp,
  emitCollision,
  emitBallLost,
  gameState,
} from "./adapters/network.js";
import { createCollisionHandler } from "./usecases/collisionHandler.js";
import { createActuators } from "./adapters/actuators.js";
import { createGameInputController, bindKeyboardInput } from "./adapters/input.js";
import { buildLevel } from "./composition/buildLevel.js";
import { startPlayfieldLoop } from "./composition/runGameLoop.js";

const actuators = createActuators();
window.actuators = actuators;

const { scene, camera, renderer } = createScene();
const world = createPhysicsWorld();
const level = buildLevel({ scene, world });

const socket = initNetwork({
  onGameStarted() {
    resetBallBody(level.ballBody);
    collisionHandler.resetDrainFlag();
    collisionHandler.resetCollisionCooldowns();
    setFlipperActive(level.flipperBodies, "left", false);
    setFlipperActive(level.flipperBodies, "right", false);
    actuators.onGameStart();
    console.log("[main] game started — bille au spawn");
  },
  onGameOver(data) {
    console.log("[main] game over — score final :", data.score);
  },
});

const collisionHandler = createCollisionHandler({
  onCollision: (type) => {
    emitCollision(socket, type);
    if (type === "bumper") actuators.onBumperHit();
    else if (type === "slingshot") actuators.onSlingshotHit();
  },
  onBallLost: () => {
    emitBallLost(socket);
    actuators.onBallLost();
  },
  onBumperImpulse: (vec3) => {
    level.ballBody.applyImpulse(vec3);
  },
});
attachCollisionListener(level.ballBody, collisionHandler);

const inputController = createGameInputController({
  onStart() {
    emitStartGame(socket);
  },
  onLaunch() {
    if (gameState.status === "playing" && launchBallBody(level.ballBody)) {
      emitLaunchBall(socket);
    }
  },
  onLeftFlipperDown() {
    setFlipperActive(level.flipperBodies, "left", true);
    emitFlipperLeftDown(socket);
    actuators.onFlipperFire("left");
  },
  onLeftFlipperUp() {
    setFlipperActive(level.flipperBodies, "left", false);
    emitFlipperLeftUp(socket);
  },
  onRightFlipperDown() {
    setFlipperActive(level.flipperBodies, "right", true);
    emitFlipperRightDown(socket);
    actuators.onFlipperFire("right");
  },
  onRightFlipperUp() {
    setFlipperActive(level.flipperBodies, "right", false);
    emitFlipperRightUp(socket);
  },
  onDebugResetBall() {
    resetBallBody(level.ballBody);
  },
});

bindKeyboardInput(inputController);

startPlayfieldLoop({
  world,
  syncPairs: level.syncPairs,
  collisionHandler,
  ballBody: level.ballBody,
  flipperBodies: level.flipperBodies,
  renderer,
  scene,
  camera,
  gameState,
});
