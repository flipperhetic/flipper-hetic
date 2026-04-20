/**
 * Playfield — Composition root.
 * Instancie les adaptateurs (renderer, physics, network, input)
 * et les connecte entre eux.
 */
import {
  TABLE_WIDTH,
  TABLE_DEPTH,
  TABLE_THICKNESS,
  WALL_HEIGHT,
  WALL_THICKNESS,
  DRAIN_OPENING_WIDTH,
} from "./domain/constants.js";

// Renderer
import { createScene } from "./adapters/renderer/scene.js";
import { createTableMeshes } from "./adapters/renderer/tableMesh.js";
import { createBallMesh } from "./adapters/renderer/ballMesh.js";
import { createFlipperMeshes } from "./adapters/renderer/flipperMesh.js";
import { createBumperMeshes } from "./adapters/renderer/bumperMesh.js";
import { createSlingshotMeshes } from "./adapters/renderer/slingshotMesh.js";

// Physics
import {
  createPhysicsWorld,
  createStaticBoxBody,
  syncMeshesWithBodies,
  FIXED_TIME_STEP,
  MAX_SUB_STEPS,
} from "./adapters/physics/world.js";
import { createBallBody, launchBallBody, resetBallBody, clampBallBody } from "./adapters/physics/ballBody.js";
import { createFlipperBodies, setFlipperActive, updateFlippers, postStepFlippers } from "./adapters/physics/flipperBody.js";
import { createBumperBodies } from "./adapters/physics/bumperBody.js";
import { createSlingshotBodies } from "./adapters/physics/slingshotBody.js";
import { attachCollisionListener } from "./adapters/physics/collisionListener.js";

// Network
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

// Use cases
import { createCollisionHandler } from "./usecases/collisionHandler.js";

// Input
import { createGameInputController, bindKeyboardInput } from "./adapters/input.js";

// ── Scene + Renderer ──────────────────────────────────
const { scene, camera, renderer } = createScene();

// ── Monde physique ────────────────────────────────────
const world = createPhysicsWorld();
const syncPairs = [];

// ── Plateau (meshes + bodies) ─────────────────────────
const tableMeshes = createTableMeshes(scene);

// Body du plateau
const tableBody = createStaticBoxBody(world, {
  width: TABLE_WIDTH,
  height: TABLE_THICKNESS,
  depth: TABLE_DEPTH,
  position: { x: 0, y: -TABLE_THICKNESS / 2, z: 0 },
  material: "table",
  type: "table",
});
syncPairs.push({ mesh: tableMeshes[0], body: tableBody });

// Bodies des murs
function createWallBody(w, h, d, x, y, z) {
  return createStaticBoxBody(world, {
    width: w, height: h, depth: d,
    position: { x, y, z },
  });
}

// Mur gauche
const wallLeftBody = createWallBody(
  WALL_THICKNESS, WALL_HEIGHT, TABLE_DEPTH,
  -TABLE_WIDTH / 2 - WALL_THICKNESS / 2, WALL_HEIGHT / 2, 0,
);
syncPairs.push({ mesh: tableMeshes[1], body: wallLeftBody });

// Mur droit
const wallRightBody = createWallBody(
  WALL_THICKNESS, WALL_HEIGHT, TABLE_DEPTH,
  TABLE_WIDTH / 2 + WALL_THICKNESS / 2, WALL_HEIGHT / 2, 0,
);
syncPairs.push({ mesh: tableMeshes[2], body: wallRightBody });

// Mur haut
const wallTopBody = createWallBody(
  TABLE_WIDTH + WALL_THICKNESS * 2, WALL_HEIGHT, WALL_THICKNESS,
  0, WALL_HEIGHT / 2, -TABLE_DEPTH / 2 - WALL_THICKNESS / 2,
);
syncPairs.push({ mesh: tableMeshes[3], body: wallTopBody });

// Murs bas (drain)
const bottomWallWidth = (TABLE_WIDTH - DRAIN_OPENING_WIDTH) / 2;
const bottomZ = TABLE_DEPTH / 2 + WALL_THICKNESS / 2;

const wallBottomLeftBody = createWallBody(
  bottomWallWidth, WALL_HEIGHT, WALL_THICKNESS,
  -(DRAIN_OPENING_WIDTH / 2 + bottomWallWidth / 2), WALL_HEIGHT / 2, bottomZ,
);
syncPairs.push({ mesh: tableMeshes[4], body: wallBottomLeftBody });

const wallBottomRightBody = createWallBody(
  bottomWallWidth, WALL_HEIGHT, WALL_THICKNESS,
  (DRAIN_OPENING_WIDTH / 2 + bottomWallWidth / 2), WALL_HEIGHT / 2, bottomZ,
);
syncPairs.push({ mesh: tableMeshes[5], body: wallBottomRightBody });

// ── Bille ─────────────────────────────────────────────
const ballMesh = createBallMesh(scene);
const ballBody = createBallBody(world);
syncPairs.push({ mesh: ballMesh, body: ballBody });

// ── Flippers ──────────────────────────────────────────
const flipperMeshes = createFlipperMeshes(scene);
const flipperBodies = createFlipperBodies(world);
syncPairs.push(
  { mesh: flipperMeshes.left, body: flipperBodies.left.body },
  { mesh: flipperMeshes.right, body: flipperBodies.right.body },
);

// ── Slingshots ────────────────────────────────────────
const slingshotMeshes = createSlingshotMeshes(scene);
const slingshotBodies = createSlingshotBodies(world);
for (let i = 0; i < slingshotMeshes.length; i++) {
  syncPairs.push({ mesh: slingshotMeshes[i], body: slingshotBodies[i] });
}

// ── Bumpers ───────────────────────────────────────────
const bumperMeshes = createBumperMeshes(scene);
const bumperBodies = createBumperBodies(world);
for (let i = 0; i < bumperMeshes.length; i++) {
  syncPairs.push({ mesh: bumperMeshes[i], body: bumperBodies[i] });
}

// ── Reseau Socket.IO ──────────────────────────────────
const socket = initNetwork({
  onGameStarted() {
    resetBallBody(ballBody);
    collisionHandler.resetDrainFlag();
    collisionHandler.resetCollisionCooldowns();
    setFlipperActive(flipperBodies, "left", false);
    setFlipperActive(flipperBodies, "right", false);
    console.log("[main] game started — bille au spawn");
  },
  onGameOver(data) {
    console.log("[main] game over — score final :", data.score);
  },
});

// ── Collisions (use case pur + adapter Cannon-es) ─────
const collisionHandler = createCollisionHandler({
  onCollision: (type) => emitCollision(socket, type),
  onBallLost: () => emitBallLost(socket),
});
attachCollisionListener(ballBody, collisionHandler);

// ── Input ─────────────────────────────────────────────
const inputController = createGameInputController({
  onStart() {
    emitStartGame(socket);
  },
  onLaunch() {
    if (gameState.status === "playing" && launchBallBody(ballBody)) {
      emitLaunchBall(socket);
    }
  },
  onLeftFlipperDown() {
    setFlipperActive(flipperBodies, "left", true);
    emitFlipperLeftDown(socket);
  },
  onLeftFlipperUp() {
    setFlipperActive(flipperBodies, "left", false);
    emitFlipperLeftUp(socket);
  },
  onRightFlipperDown() {
    setFlipperActive(flipperBodies, "right", true);
    emitFlipperRightDown(socket);
  },
  onRightFlipperUp() {
    setFlipperActive(flipperBodies, "right", false);
    emitFlipperRightUp(socket);
  },
  onDebugResetBall() {
    resetBallBody(ballBody);
  },
});

bindKeyboardInput(inputController);

// ── Boucle de rendu + physique ────────────────────────
let lastTime = performance.now();

function animate() {
  requestAnimationFrame(animate);

  const now = performance.now();
  const delta = Math.min((now - lastTime) / 1000, 0.1);
  lastTime = now;

  updateFlippers(flipperBodies);
  world.step(FIXED_TIME_STEP, delta, MAX_SUB_STEPS);
  postStepFlippers(flipperBodies);
  clampBallBody(ballBody);

  if (collisionHandler.checkDrain(ballBody.position.z, gameState.status)) {
    resetBallBody(ballBody);
    collisionHandler.resetDrainFlag();
  }

  syncMeshesWithBodies(syncPairs);
  renderer.render(scene, camera);
}

animate();
