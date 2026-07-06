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

const bloom = new BloomRenderer(renderer, scene, camera);

// Un seul point de resync taille : caméra + renderer + composer bloom. On écoute
// l'event window 'resize' MAIS aussi un ResizeObserver sur le canvas — les kiosks
// (et changements d'orientation/DPI) ne déclenchent pas toujours 'resize'. Un
// appel initial garantit un aspect correct dès le premier rendu.
const onViewportResize = () => { viewRuntime.onResize(); bloom.onResize(); };
window.addEventListener('resize', onViewportResize);
new ResizeObserver(onViewportResize).observe(renderer.domElement);
onViewportResize();

// Bandeau "hors ligne" NON bloquant : un petit ruban en haut de l'ecran plutot
// qu'un voile noir plein ecran. Le playfield reste visible et jouable meme si le
// serveur est injoignable — la perte de connexion ne doit pas simuler un ecran mort.
const serverOverlay = document.createElement('div');
serverOverlay.style.cssText = [
  'display:none;position:fixed;top:12px;left:50%;transform:translateX(-50%);z-index:9999',
  'align-items:center;gap:10px;pointer-events:none',
  'padding:7px 15px;border-radius:9px;border:1px solid rgba(255,68,68,.55)',
  'background:rgba(24,4,4,.82);box-shadow:0 4px 18px rgba(0,0,0,.4)',
  "font-family:'Courier New',monospace;color:#ff6b6b;font-size:.8rem;letter-spacing:.02em",
].join(';');
serverOverlay.innerHTML =
  '<span style="width:8px;height:8px;border-radius:50%;background:#ff4444;box-shadow:0 0 8px #ff4444"></span>'
  + '<span><strong>Serveur hors ligne</strong> — reconnexion en cours…</span>';
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
