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
import ModelLoader from './adapters/renderer/modelLoader.js';

// Filet de diagnostic : sur la cabine, le kiosk n'a pas de devtools. Toute erreur
// d'initialisation (WASM Rapier, WebGL, chargement d'un asset, module…) laisserait
// sinon un ecran noir muet. On affiche ici l'erreur reelle DIRECTEMENT a l'ecran.
function showFatalError(detail) {
  let el = document.getElementById('playfield-fatal');
  if (!el) {
    el = document.createElement('div');
    el.id = 'playfield-fatal';
    el.style.cssText = 'position:fixed;inset:0;z-index:100000;background:#160000;color:#ff9a9a;'
      + "font-family:'Courier New',monospace;font-size:13px;line-height:1.5;padding:22px;overflow:auto;white-space:pre-wrap;word-break:break-word";
    document.body.appendChild(el);
  }
  el.textContent = 'PLAYFIELD — erreur d\'initialisation\n\n' + detail;
}
window.addEventListener('error', (e) => showFatalError((e.error && e.error.stack) || e.message || String(e)));
window.addEventListener('unhandledrejection', (e) => {
  const r = e.reason;
  showFatalError((r && (r.stack || r.message)) || String(r));
});

// #2 — Précharge les GLB en parallèle de l'init WASM Rapier. Le fetch/parse des
// modèles ne dépend pas de Rapier (seul buildGLBCollisions en a besoin, et il
// tourne plus tard, une fois Rapier prêt), donc on recouvre les deux coûts.
const extraScenesPromise = new ModelLoader().loadExtra();

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
  extraScenesPromise,
  onDrainZChange: (z) => collisionHandler.setDrainThreshold(z),
}).build();
levelRef = level;

wireCollisions(physicsWorld, level, collisionHandler);

const viewRuntime = new ViewRuntime({ camera, renderer, scene, levelGroup: level.group, world: physicsWorld, dirLight });
if (level.archMesh) level.group.attach(level.archMesh);
window.addEventListener('resize', viewRuntime.onResize);

const bloom = new BloomRenderer(renderer, scene, camera);
window.addEventListener('resize', () => bloom.onResize());

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
