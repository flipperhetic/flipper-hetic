/**
 * Construction du plateau : meshes Three.js + corps Rapier synchronisés.
 * Aucune logique réseau ni boucle de jeu — uniquement la scène et la physique.
 */
import {
  TABLE_WIDTH,
  TABLE_DEPTH,
  TABLE_THICKNESS,
  WALL_HEIGHT,
  WALL_THICKNESS,
  DRAIN_OPENING_WIDTH,
  TUNNEL_LENGTH,
  TUNNEL_WALL_X,
  TUNNEL_WALL_Z,
} from "../domain/constants.js";
import { createTableMeshes } from "../adapters/renderer/tableMesh.js";
import { createBallMesh } from "../adapters/renderer/ballMesh.js";
import { createFlipperMeshes } from "../adapters/renderer/flipperMesh.js";
import { createBumperMeshes } from "../adapters/renderer/bumperMesh.js";
import { createSlingshotMeshes } from "../adapters/renderer/slingshotMesh.js";
import { createCornerDeflectorMeshes } from "../adapters/renderer/cornerDeflectorMesh.js";
import { createLaunchGateMesh } from "../adapters/renderer/launchGateMesh.js";
import {
  createStaticBoxBody,
  createBallBody,
  createFlipperBodies,
  createBumperBodies,
  createSlingshotBodies,
  createCornerDeflectorBodies,
  createLaunchGateBody,
} from "../adapters/physics/index.js";

function createWallBody(world, w, h, d, x, y, z) {
  return createStaticBoxBody(world, {
    width: w,
    height: h,
    depth: d,
    position: { x, y, z },
  });
}

/**
 * @param {{ scene: import("three").Scene; world: object }} deps
 */
export function buildLevel({ scene, world }) {
  const syncPairs = [];

  const tableMeshes = createTableMeshes(scene);

  const tableBody = createStaticBoxBody(world, {
    width: TABLE_WIDTH,
    height: TABLE_THICKNESS,
    depth: TABLE_DEPTH,
    position: { x: 0, y: -TABLE_THICKNESS / 2, z: 0 },
    material: "table",
    type: "table",
  });
  syncPairs.push({ mesh: tableMeshes[0], body: tableBody });

  const wallLeftBody = createWallBody(
    world,
    WALL_THICKNESS,
    WALL_HEIGHT,
    TABLE_DEPTH,
    -TABLE_WIDTH / 2 - WALL_THICKNESS / 2,
    WALL_HEIGHT / 2,
    0,
  );
  syncPairs.push({ mesh: tableMeshes[1], body: wallLeftBody });

  const wallRightBody = createWallBody(
    world,
    WALL_THICKNESS,
    WALL_HEIGHT,
    TABLE_DEPTH,
    TABLE_WIDTH / 2 + WALL_THICKNESS / 2,
    WALL_HEIGHT / 2,
    0,
  );
  syncPairs.push({ mesh: tableMeshes[2], body: wallRightBody });

  const wallTopBody = createWallBody(
    world,
    TABLE_WIDTH + WALL_THICKNESS * 2,
    WALL_HEIGHT,
    WALL_THICKNESS,
    0,
    WALL_HEIGHT / 2,
    -TABLE_DEPTH / 2 - WALL_THICKNESS / 2,
  );
  syncPairs.push({ mesh: tableMeshes[3], body: wallTopBody });

  const bottomWallWidth = (TABLE_WIDTH - DRAIN_OPENING_WIDTH) / 2;
  const bottomZ = TABLE_DEPTH / 2 + WALL_THICKNESS / 2;

  const wallBottomLeftBody = createWallBody(
    world,
    bottomWallWidth,
    WALL_HEIGHT,
    WALL_THICKNESS,
    -(DRAIN_OPENING_WIDTH / 2 + bottomWallWidth / 2),
    WALL_HEIGHT / 2,
    bottomZ,
  );
  syncPairs.push({ mesh: tableMeshes[4], body: wallBottomLeftBody });

  const wallBottomRightBody = createWallBody(
    world,
    bottomWallWidth,
    WALL_HEIGHT,
    WALL_THICKNESS,
    DRAIN_OPENING_WIDTH / 2 + bottomWallWidth / 2,
    WALL_HEIGHT / 2,
    bottomZ,
  );
  syncPairs.push({ mesh: tableMeshes[5], body: wallBottomRightBody });

  const tunnelWallBody = createWallBody(
    world,
    WALL_THICKNESS,
    WALL_HEIGHT,
    TUNNEL_LENGTH,
    TUNNEL_WALL_X,
    WALL_HEIGHT / 2,
    TUNNEL_WALL_Z,
  );
  syncPairs.push({ mesh: tableMeshes[6], body: tunnelWallBody });

  const ballMesh = createBallMesh(scene);
  const ballBody = createBallBody(world);
  syncPairs.push({ mesh: ballMesh, body: ballBody });

  const flipperMeshes = createFlipperMeshes(scene);
  const flipperBodies = createFlipperBodies(world);
  syncPairs.push(
    { mesh: flipperMeshes.left, body: flipperBodies.left.body },
    { mesh: flipperMeshes.right, body: flipperBodies.right.body },
  );

  const slingshotMeshes = createSlingshotMeshes(scene);
  const slingshotBodies = createSlingshotBodies(world);
  for (let i = 0; i < slingshotMeshes.length; i++) {
    syncPairs.push({ mesh: slingshotMeshes[i], body: slingshotBodies[i] });
  }

  const cornerDeflectorMeshes = createCornerDeflectorMeshes(scene);
  const cornerDeflectorBodies = createCornerDeflectorBodies(world);
  for (let i = 0; i < cornerDeflectorMeshes.length; i++) {
    syncPairs.push({ mesh: cornerDeflectorMeshes[i], body: cornerDeflectorBodies[i] });
  }

  const bumperMeshes = createBumperMeshes(scene);
  const bumperBodies = createBumperBodies(world);
  for (let i = 0; i < bumperMeshes.length; i++) {
    syncPairs.push({ mesh: bumperMeshes[i], body: bumperBodies[i] });
  }

  const launchGateMesh = createLaunchGateMesh(scene);
  const launchGateBody = createLaunchGateBody(world);
  syncPairs.push({ mesh: launchGateMesh, body: launchGateBody });

  return {
    syncPairs,
    ballMesh,
    ballBody,
    flipperMeshes,
    flipperBodies,
    slingshotMeshes,
    slingshotBodies,
    bumperMeshes,
    bumperBodies,
    launchGateBody,
  };
}
