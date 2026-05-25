/**
 * Playfield — Composition root.
 */
import { createScene } from "./adapters/renderer/scene.js";
import {
  initRapier,
  createPhysicsWorld,
  attachCollisionListener,
  launchBallBody,
  resetBallBody,
  setFlipperActive,
  openLaunchGate,
} from "./adapters/physics/index.js";
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
import { createAudioEngine } from "./adapters/audio.js";
import { mountAudioControls, updateAudioHud } from "./adapters/audio-controls.js";
import { createGameInputController, bindKeyboardInput, bindExternalInputSource } from "./adapters/input.js";
import { createWebSerialInputSource } from "./adapters/webSerial.js";
import { buildLevel } from "./composition/buildLevel.js";
import { groupLevelMeshes } from "./composition/levelGroup.js";
import { startPlayfieldLoop } from "./composition/runGameLoop.js";
import { createPlayfieldViewRuntime } from "./composition/playfieldViewRuntime.js";
import { wirePlayfieldDebug } from "./adapters/debug/wirePlayfieldDebug.js";

await initRapier();

const audio = createAudioEngine(updateAudioHud);
audio.startTheme(0.18);
mountAudioControls(audio);
const audioHud = document.getElementById("audio-hud");
if (audioHud) audioHud.style.display = "none";
const actuators = createActuators(audio);
window.actuators = actuators;

const { scene, camera, renderer, dirLight } = createScene();
const world = createPhysicsWorld();
const level = buildLevel({ scene, world });
const levelGroup = groupLevelMeshes(scene, level.syncPairs);

const viewRuntime = createPlayfieldViewRuntime({
  camera,
  renderer,
  scene,
  levelGroup,
  world,
  dirLight,
});

window.addEventListener("resize", viewRuntime.onResize);

wirePlayfieldDebug({ viewRuntime, camera, renderer, scene, levelGroup, world, dirLight, audio });

let pendingLaunchAfterStart = false;

const socket = initNetwork({
  onGameStarted() {
    resetBallBody(level.ballBody);
    openLaunchGate(level.launchGateBody);
    collisionHandler.resetDrainFlag();
    collisionHandler.resetCollisionCooldowns();
    setFlipperActive(level.flipperBodies, "left", false);
    setFlipperActive(level.flipperBodies, "right", false);
    console.log("[main] game started — bille au spawn");

    if (pendingLaunchAfterStart) {
      pendingLaunchAfterStart = false;
      if (launchBallBody(level.ballBody)) {
        audio.play("start");
        emitLaunchBall(socket);
      }
    }
  },
  onHighScoreBeat(data) {
    // Play one random highscore sound (handled by audio engine randomness/persistence)
    try { audio.playRandom(["highscore-1", "highscore-2"]); } catch (e) { /* ignore */ }
  },
  onGameOver(data) {
    actuators.onGameOver();
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
    if (gameState.status === "playing") {
      if (launchBallBody(level.ballBody)) {
        audio.play("start");
        emitLaunchBall(socket);
      }
      return;
    }

    pendingLaunchAfterStart = true;
    emitStartGame(socket);
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
    openLaunchGate(level.launchGateBody);
  },
});

bindKeyboardInput(inputController);

// Source d'input ESP32 via Web Serial : auto-connexion au demarrage si un port
// a deja ete autorise. Le bouton #connect-serial ne sert qu'au tout 1er octroi.
const webSerialSource = createWebSerialInputSource();
bindExternalInputSource(webSerialSource.subscribe, inputController);

startPlayfieldLoop({
  world,
  syncPairs: level.syncPairs,
  collisionHandler,
  ballBody: level.ballBody,
  flipperBodies: level.flipperBodies,
  launchGateBody: level.launchGateBody,
  renderer,
  scene,
  getCamera: viewRuntime.getCamera,
  gameState,
});
