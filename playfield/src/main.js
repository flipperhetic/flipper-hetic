import PlayfieldScene from './adapters/renderer/PlayfieldScene.js';
import BloomRenderer from './adapters/renderer/BloomRenderer.js';
import { initRapier, PhysicsWorld } from './adapters/physics/index.js';
import NetworkAdapter from './adapters/network/NetworkAdapter.js';
import CollisionHandler from './usecases/CollisionHandler.js';
import { createActuators } from './adapters/actuators.js';
import AudioEngine from './adapters/audio/AudioEngine.js';
import InputController from './adapters/input/InputController.js';
import Level from './composition/Level.js';
import GameLoop from './composition/GameLoop.js';
import ViewRuntime from './composition/ViewRuntime.js';
import { wireCollisions } from './composition/wireCollisions.js';

await initRapier();

const audio = new AudioEngine();
audio.startTheme(0.18);
audio.setMuted(false, false);
const actuators = createActuators(audio);

const playfieldScene = new PlayfieldScene();
const { scene, camera, renderer, dirLight } = playfieldScene;
const physicsWorld = new PhysicsWorld();

let levelRef = null;
const collisionHandler = new CollisionHandler({
  onCollision: (type) => {
    network.emitCollision(type);
    if (type.startsWith('bumper'))  { actuators.onBumperHit(); viewRuntime.shake(); }
    else if (type === 'slingshot') actuators.onSlingshotHit();
    else if (type === 'tunnel')    audio.play('milestone-2');
    else if (type === 'tunnel-rv') audio.play('milestone-1');
  },
  onBallLost: () => {
    network.emitBallLost();
    actuators.onBallLost();
    audio.play('lose-ball');
  },
  onBumperImpulse: (vec3) => levelRef?.ballActor.applyImpulse(vec3),
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
let isGameOver = false;

const network = new NetworkAdapter({
  onConnect() { serverOverlay.style.display = 'none'; },
  onConnectionError() { serverOverlay.style.display = 'flex'; },
  onGameStarted() {
    isGameOver = false;
    level.ballActor.reset();
    level.launchGateActor.open();
    collisionHandler.resetDrainFlag();
    collisionHandler.resetCollisionCooldowns();
    level.flipperActor.setActive('left', false);
    level.flipperActor.setActive('right', false);
    if (pendingLaunchAfterStart) {
      pendingLaunchAfterStart = false;
      if (level.ballActor.launch()) { audio.play('start'); network.emitLaunchBall(); }
    }
  },
  onHighScoreBeat() {
    try { audio.playRandom(['highscore-1', 'highscore-2']); } catch { /* ignore */ }
  },
  onGameOver() {
    isGameOver = true;
    pendingLaunchAfterStart = false;
    actuators.onGameOver();
  },
});

const inputController = new InputController({
  onStart() { network.emitStartGame(); },
  onLaunch() {
    if (isGameOver) return;
    if (network.gameState.status === 'playing') {
      if (level.ballActor.launch()) { audio.play('start'); network.emitLaunchBall(); }
      return;
    }
    pendingLaunchAfterStart = true;
    network.emitStartGame();
  },
  onLeftFlipperDown()  { level.flipperActor.setActive('left', true);  network.emitFlipperLeftDown();  actuators.onFlipperFire(); },
  onLeftFlipperUp()    { level.flipperActor.setActive('left', false); network.emitFlipperLeftUp(); },
  onRightFlipperDown() { level.flipperActor.setActive('right', true); network.emitFlipperRightDown(); actuators.onFlipperFire(); },
  onRightFlipperUp()   { level.flipperActor.setActive('right', false); network.emitFlipperRightUp(); },
});
inputController.bindKeyboard();
inputController.bindCabinet(network.socket);

new GameLoop({
  physicsWorld,
  actors:    level.actors,
  collisionHandler,
  ballActor: level.ballActor,
  onDrain:   () => {
    level.ballActor.reset();
    level.launchGateActor.open();
  },
  gameState: network.gameState,
  renderFn:  () => { viewRuntime.tickShake(); bloom.render(viewRuntime.getCamera()); },
}).start();
