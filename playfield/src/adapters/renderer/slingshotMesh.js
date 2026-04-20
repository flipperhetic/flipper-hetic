/**
 * Playfield — Meshes Three.js des slingshots.
 */
import * as THREE from "three";
import {
  TABLE_WIDTH,
  WALL_HEIGHT,
  FLIPPER_PIVOT_X,
  FLIPPER_PIVOT_Z,
  SLINGSHOT_DEPTH,
  SLINGSHOT_TOP_OFFSET,
} from "../../domain/constants.js";

const SLINGSHOT_COLOR = 0x8b4513;

function createOneSlingshotMesh(scene, side, material) {
  const isLeft = side === "left";

  const lowX = isLeft ? -FLIPPER_PIVOT_X : FLIPPER_PIVOT_X;
  const lowZ = FLIPPER_PIVOT_Z;
  const highX = isLeft
    ? -TABLE_WIDTH / 2 + SLINGSHOT_DEPTH / 2
    : TABLE_WIDTH / 2 - SLINGSHOT_DEPTH / 2;
  const highZ = FLIPPER_PIVOT_Z - SLINGSHOT_TOP_OFFSET;

  const centerX = (lowX + highX) / 2;
  const centerZ = (lowZ + highZ) / 2;
  const length = Math.hypot(lowX - highX, lowZ - highZ);
  const angle = Math.atan2(-(lowZ - highZ), lowX - highX);

  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(length, WALL_HEIGHT, SLINGSHOT_DEPTH),
    material,
  );
  mesh.position.set(centerX, WALL_HEIGHT / 2, centerZ);
  mesh.rotation.y = angle;
  scene.add(mesh);
  return mesh;
}

export function createSlingshotMeshes(scene) {
  const material = new THREE.MeshStandardMaterial({ color: SLINGSHOT_COLOR });
  return [
    createOneSlingshotMesh(scene, "left", material),
    createOneSlingshotMesh(scene, "right", material),
  ];
}
