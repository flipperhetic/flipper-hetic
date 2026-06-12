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
  emitResetHighScore,
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
await initRapier();

const audio = createAudioEngine(updateAudioHud);
audio.startTheme(0.18);
audio.setMuted(true, false);
mountAudioControls(audio);
const audioHud = document.getElementById("audio-hud");
if (audioHud) audioHud.style.display = "none";
const actuators = createActuators(audio);

const { scene, camera, renderer, dirLight } = createScene();
const world = createPhysicsWorld();
const level = await buildLevel({ scene, world });
const levelGroup = groupLevelMeshes(scene, level.syncPairs);
levelGroup.add(level.gltfModel);

const viewRuntime = createPlayfieldViewRuntime({
  camera,
  renderer,
  scene,
  levelGroup,
  world,
  dirLight,
});

window.addEventListener("resize", viewRuntime.onResize);

const serverOverlay = document.createElement("div");
serverOverlay.style.cssText = [
  "display:none;position:fixed;inset:0;z-index:9999",
  "background:rgba(0,0,0,.88);align-items:center;justify-content:center",
  "flex-direction:column;gap:12px",
  "font-family:'Courier New',monospace;color:#ff4444;font-size:1.1rem;text-align:center",
].join(";");
serverOverlay.innerHTML = "<strong>Serveur hors ligne</strong><span>Reconnexion en cours…</span>";
document.body.appendChild(serverOverlay);

let socket;

const readyDebug = async () => {
  if (!import.meta.env.DEV) return;
  const { wirePlayfieldDebug } = await import("./adapters/debug/wirePlayfieldDebug.js");
  wirePlayfieldDebug({
    viewRuntime,
    camera,
    renderer,
    scene,
    levelGroup,
    world,
    dirLight,
    audio,
    level,
    onResetHighScore: () => {
      if (socket) {
        emitResetHighScore(socket);
      }
    },
    onResetBall: () => {
      resetBallBody(level.ballBody);
      openLaunchGate(level.launchGateBody);
    },
    onTriggerSpecialEvent: (type) => {
      emitCollision(socket, type);
      if (type === 'tunnel') audio?.play('milestone-2');
      else if (type === 'tunnel-rv') audio?.play('milestone-1');
    },
  });
};

let pendingLaunchAfterStart = false;

socket = initNetwork({
  onConnect() { serverOverlay.style.display = "none"; },
  onConnectionError() { serverOverlay.style.display = "flex"; },
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

readyDebug();

const BUMPER_SERVER_TYPE = {
  'bumper-cyl-0':   'bumper_100',
  'bumper-cyl-1':   'bumper_50',
  'bumper-cyl-2':   'bumper_25',
  'bumper-diamond':   'bumper_10',
  'bumper-diamond-2': 'bumper_10',
  'bumper-tri-left':  'bumper_10',
  'bumper-tri-right': 'bumper_10',
};

const collisionHandler = createCollisionHandler({
  onCollision: (type) => {
    const serverType = type.startsWith("bumper")
      ? (BUMPER_SERVER_TYPE[type] ?? "bumper")
      : type;
    emitCollision(socket, serverType);
    if (type.startsWith("bumper")) actuators.onBumperHit();
    else if (type === "slingshot") actuators.onSlingshotHit();
    else if (type === "tunnel") audio?.play('milestone-2');
    else if (type === "tunnel-rv") audio?.play('milestone-1');
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
