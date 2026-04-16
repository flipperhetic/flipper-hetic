/**
 * Playfield — Scene Three.js + monde Cannon-es (etapes 4 et 5 du plan MVP).
 * Plateau, murs, drain cote rendu + leurs contreparties physiques statiques.
 */
import * as THREE from "three";
import {
  TABLE_WIDTH,
  TABLE_DEPTH,
  TABLE_THICKNESS,
  WALL_HEIGHT,
  WALL_THICKNESS,
  DRAIN_OPENING_WIDTH,
} from "./constants.js";
import {
  createPhysicsWorld,
  createStaticBoxBody,
  syncMeshesWithBodies,
  FIXED_TIME_STEP,
  MAX_SUB_STEPS,
} from "./physics.js";
import { createBall, launchBall, resetBall, clampBall } from "./ball.js";
import { initNetwork, emitStartGame, emitLaunchBall, emitFlipperLeftDown, emitFlipperLeftUp, emitFlipperRightDown, emitFlipperRightUp, gameState } from "./network.js";
import { createFlippers, setFlipperActive, updateFlippers, postStepFlippers } from "./flippers.js";
import { createBumpers } from "./bumpers.js";
import { createSlingshots } from "./slingshots.js";
import { setupCollisionListeners, checkDrain, resetDrainFlag } from "./collisions.js";
import { createGameInputController, bindKeyboardInput } from "./input.js";

// ── Scene ──────────────────────────────────────────────
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1a2e);

// ── Monde physique ─────────────────────────────────────
const world = createPhysicsWorld();
// Couples (mesh, body) a synchroniser a chaque frame.
const syncPairs = [];

// ── Camera (vue top-down pour ecran vertical 9:16) ────
const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  100,
);
// Camera directement au-dessus du plateau, regard vers le bas
camera.position.set(0, 20, 0);
camera.lookAt(0, 0, 0);
// Rotation pour que Z+ (bas du plateau / joueur) = bas de l'ecran
camera.up.set(0, 0, -1);

// ── Renderer ───────────────────────────────────────────
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.style.margin = "0";
document.body.style.overflow = "hidden";
document.body.appendChild(renderer.domElement);

// ── Lumieres ───────────────────────────────────────────
scene.add(new THREE.AmbientLight(0xffffff, 0.6));

const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
dirLight.position.set(5, 15, 5);
scene.add(dirLight);

// ── Materiaux ──────────────────────────────────────────
const tableMat = new THREE.MeshStandardMaterial({ color: 0x2d5a27 });
const wallMat = new THREE.MeshStandardMaterial({ color: 0x8b4513 });

// ── Plateau ────────────────────────────────────────────
const table = new THREE.Mesh(
  new THREE.BoxGeometry(TABLE_WIDTH, TABLE_THICKNESS, TABLE_DEPTH),
  tableMat,
);
table.position.y = -TABLE_THICKNESS / 2;
scene.add(table);

const tableBody = createStaticBoxBody(world, {
  width: TABLE_WIDTH,
  height: TABLE_THICKNESS,
  depth: TABLE_DEPTH,
  position: table.position,
  material: "table",
  type: "table",
});
syncPairs.push({ mesh: table, body: tableBody });

// ── Murs ───────────────────────────────────────────────
function createWall(w, h, d, x, y, z) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat);
  mesh.position.set(x, y, z);
  scene.add(mesh);

  const body = createStaticBoxBody(world, {
    width: w,
    height: h,
    depth: d,
    position: { x, y, z },
  });
  syncPairs.push({ mesh, body });

  return mesh;
}

// Mur gauche
createWall(
  WALL_THICKNESS, WALL_HEIGHT, TABLE_DEPTH,
  -TABLE_WIDTH / 2 - WALL_THICKNESS / 2,
  WALL_HEIGHT / 2,
  0,
);

// Mur droit
createWall(
  WALL_THICKNESS, WALL_HEIGHT, TABLE_DEPTH,
  TABLE_WIDTH / 2 + WALL_THICKNESS / 2,
  WALL_HEIGHT / 2,
  0,
);

// Mur haut (fond du plateau)
createWall(
  TABLE_WIDTH + WALL_THICKNESS * 2, WALL_HEIGHT, WALL_THICKNESS,
  0,
  WALL_HEIGHT / 2,
  -TABLE_DEPTH / 2 - WALL_THICKNESS / 2,
);

// Mur bas — deux segments avec ouverture drain au centre
const bottomWallWidth = (TABLE_WIDTH - DRAIN_OPENING_WIDTH) / 2;
const bottomZ = TABLE_DEPTH / 2 + WALL_THICKNESS / 2;

// Segment bas-gauche
createWall(
  bottomWallWidth, WALL_HEIGHT, WALL_THICKNESS,
  -(DRAIN_OPENING_WIDTH / 2 + bottomWallWidth / 2),
  WALL_HEIGHT / 2,
  bottomZ,
);

// Segment bas-droit
createWall(
  bottomWallWidth, WALL_HEIGHT, WALL_THICKNESS,
  (DRAIN_OPENING_WIDTH / 2 + bottomWallWidth / 2),
  WALL_HEIGHT / 2,
  bottomZ,
);

// ── Bille ──────────────────────────────────────────────
const ball = createBall(scene, world);
syncPairs.push(ball);

// ── Flippers ──────────────────────────────────────────
const flippers = createFlippers(scene, world);
syncPairs.push(flippers.left, flippers.right);

// ── Slingshots ────────────────────────────────────────
syncPairs.push(...createSlingshots(scene, world));

// ── Bumpers ─────────────────────────────────────────
syncPairs.push(...createBumpers(scene, world));

// ── Reseau Socket.io ──────────────────────────────────
const socket = initNetwork({
  onGameStarted() {
    resetBall(ball);
    resetDrainFlag();
    console.log("[main] game started — bille au spawn");
  },
  onGameOver(data) {
    console.log("[main] game over — score final :", data.score);
  },
});

// ── Collisions ────────────────────────────────────────
setupCollisionListeners(socket, ball.body);

const inputController = createGameInputController({
  onStart() {
    console.log("[input] emit start_game");
    emitStartGame(socket);
  },
  onLaunch() {
    if (gameState.status === "playing" && launchBall(ball)) {
      emitLaunchBall(socket);
    }
  },
  onLeftFlipperDown() {
    setFlipperActive(flippers, "left", true);
    emitFlipperLeftDown(socket);
  },
  onLeftFlipperUp() {
    setFlipperActive(flippers, "left", false);
    emitFlipperLeftUp(socket);
  },
  onRightFlipperDown() {
    setFlipperActive(flippers, "right", true);
    emitFlipperRightDown(socket);
  },
  onRightFlipperUp() {
    setFlipperActive(flippers, "right", false);
    emitFlipperRightUp(socket);
  },
  onDebugResetBall() {
    resetBall(ball);
  },
});

bindKeyboardInput(inputController);

// ── Resize ─────────────────────────────────────────────
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ── Boucle de rendu + physique ─────────────────────────
let lastTime = performance.now();
function animate() {
  requestAnimationFrame(animate);

  const now = performance.now();
  // Clamp pour eviter un gros step apres un onglet en arriere-plan.
  const delta = Math.min((now - lastTime) / 1000, 0.1);
  lastTime = now;

  updateFlippers(flippers);
  world.step(FIXED_TIME_STEP, delta, MAX_SUB_STEPS);
  postStepFlippers(flippers);
  clampBall(ball);

  // Verifier si la bille est dans le drain apres le step physique.
  if (checkDrain(socket, ball.body, gameState.status)) {
    resetBall(ball);
    resetDrainFlag();
  }

  syncMeshesWithBodies(syncPairs);

  renderer.render(scene, camera);
}

animate();
