import PlayfieldScene from './adapters/renderer/PlayfieldScene.js';
import BloomRenderer from './adapters/renderer/BloomRenderer.js';
import { initRapier, PhysicsWorld } from './adapters/physics/index.js';
import NetworkAdapter from './adapters/network/NetworkAdapter.js';
import CollisionHandler from './usecases/CollisionHandler.js';
import { createActuators } from './adapters/actuators.js';
import AudioEngine from './adapters/audio/AudioEngine.js';
import { mountAudioControls, updateAudioHud } from './adapters/audio-controls.js';
import InputController from './adapters/input/InputController.js';
import Level from './composition/Level.js';
import GameLoop from './composition/GameLoop.js';
import ViewRuntime from './composition/ViewRuntime.js';
import { wireCollisions } from './composition/wireCollisions.js';
import { BUMPER_SERVER_TYPE } from './domain/constants.js';

await initRapier();

const audio = new AudioEngine(updateAudioHud);
audio.startTheme(0.18);
audio.setMuted(true, false);
mountAudioControls(audio);
const audioHud = document.getElementById('audio-hud');
if (audioHud) audioHud.style.display = 'none';
const actuators = createActuators(audio);

const playfieldScene = new PlayfieldScene();
const { scene, camera, renderer, ambientLight, dirLight, pointLights } = playfieldScene;
const physicsWorld = new PhysicsWorld();

let levelRef = null;
const collisionHandler = new CollisionHandler({
  onCollision: (type) => {
    const serverType = type.startsWith('bumper') ? (BUMPER_SERVER_TYPE[type] ?? 'bumper') : type;
    network.emitCollision(serverType);
    if (type.startsWith('bumper')) actuators.onBumperHit();
    else if (type === 'slingshot') actuators.onSlingshotHit();
    else if (type === 'tunnel') audio.play('milestone-2');
    else if (type === 'tunnel-rv') audio.play('milestone-1');
  },
  onBallLost: () => {
    network.emitBallLost();
    actuators.onBallLost();
  },
  onBumperImpulse: (vec3) => levelRef?.ballBody.applyImpulse(vec3),
});

const level = await new Level({
  scene,
  physicsWorld,
  onDrainZChange: (z) => collisionHandler.setDrainThreshold(z),
}).build();
levelRef = level;

wireCollisions(physicsWorld, level, collisionHandler);

const viewRuntime = new ViewRuntime({ camera, renderer, scene, levelGroup: level.group, world: physicsWorld, dirLight });
if (level.archMesh) level.group.attach(level.archMesh);
window.addEventListener('resize', viewRuntime.onResize);

const bloom = new BloomRenderer(renderer, scene, camera);
const { composer, bloomPass } = bloom;
window.addEventListener('resize', () => bloom.onResize());

const serverOverlay = document.createElement('div');
serverOverlay.style.cssText = [
  'display:none;position:fixed;inset:0;z-index:9999',
  'background:rgba(0,0,0,.88);align-items:center;justify-content:center',
  'flex-direction:column;gap:12px',
  "font-family:'Courier New',monospace;color:#ff4444;font-size:1.1rem;text-align:center",
].join(';');
serverOverlay.innerHTML = '<strong>Serveur hors ligne</strong><span>Reconnexion en cours…</span>';
document.body.appendChild(serverOverlay);

let pendingLaunchAfterStart = false;

const network = new NetworkAdapter({
  onConnect() { serverOverlay.style.display = 'none'; },
  onConnectionError() { serverOverlay.style.display = 'flex'; },
  onGameStarted() {
    level.ballBody.reset();
    level.launchGateBody.open();
    collisionHandler.resetDrainFlag();
    collisionHandler.resetCollisionCooldowns();
    level.flipperBodies.setActive('left', false);
    level.flipperBodies.setActive('right', false);
    if (pendingLaunchAfterStart) {
      pendingLaunchAfterStart = false;
      if (level.ballBody.launch()) { audio.play('start'); network.emitLaunchBall(); }
    }
  },
  onHighScoreBeat() {
    try { audio.playRandom(['highscore-1', 'highscore-2']); } catch { /* ignore */ }
  },
  onGameOver() {
    actuators.onGameOver();
  },
});

const readyDebug = async () => {
  if (!import.meta.env.DEV) return;
  const { wirePlayfieldDebug } = await import('./adapters/debug/wirePlayfieldDebug.js');
  wirePlayfieldDebug({
    viewRuntime, camera, renderer, scene,
    levelGroup: level.group, world: physicsWorld,
    ambientLight, dirLight, pointLights,
    bloomPass, composer, audio, level,
    onResetHighScore: () => network.emitResetHighScore(),
    onResetBall: () => { level.ballBody.reset(); level.launchGateBody.open(); },
    onTriggerSpecialEvent: (type) => {
      network.emitCollision(type);
      if (type === 'tunnel') audio.play('milestone-2');
      else if (type === 'tunnel-rv') audio.play('milestone-1');
    },
  });
};
readyDebug();

const inputController = new InputController({
  onStart() { network.emitStartGame(); },
  onLaunch() {
    if (network.gameState.status === 'playing') {
      if (level.ballBody.launch()) { audio.play('start'); network.emitLaunchBall(); }
      return;
    }
    pendingLaunchAfterStart = true;
    network.emitStartGame();
  },
  onLeftFlipperDown()  { level.flipperBodies.setActive('left', true);  network.emitFlipperLeftDown();  actuators.onFlipperFire('left'); },
  onLeftFlipperUp()    { level.flipperBodies.setActive('left', false); network.emitFlipperLeftUp(); },
  onRightFlipperDown() { level.flipperBodies.setActive('right', true); network.emitFlipperRightDown(); actuators.onFlipperFire('right'); },
  onRightFlipperUp()   { level.flipperBodies.setActive('right', false); network.emitFlipperRightUp(); },
  onDebugResetBall()   { level.ballBody.reset(); level.launchGateBody.open(); },
});
inputController.bindKeyboard();
inputController.bindCabinet(network.socket);

new GameLoop({
  physicsWorld,
  syncPairs: level.syncPairs,
  collisionHandler,
  ballBody: level.ballBody,
  flipperBodies: level.flipperBodies,
  launchGateBody: level.launchGateBody,
  gameState: network.gameState,
  renderFn: () => bloom.render(viewRuntime.getCamera()),
}).start();
