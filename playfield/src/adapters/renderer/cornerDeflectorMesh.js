/**
 * Playfield — Meshes Three.js des deflecteurs d'angle (coins superieurs).
 */
import * as THREE from "three";
import {
  TABLE_WIDTH,
  TABLE_DEPTH,
  WALL_HEIGHT,
  CORNER_DEFLECTOR_SIZE,
  CORNER_DEFLECTOR_DEPTH,
} from "../../domain/constants.js";

const CORNER_DEFLECTOR_COLOR = 0x8b4513;

function createOneCornerDeflectorMesh(scene, side, material) {
  const isLeft = side === "left";

  const wallX = isLeft ? -TABLE_WIDTH / 2 : TABLE_WIDTH / 2;
  const topZ = -TABLE_DEPTH / 2;
  const lowX = wallX;
  const lowZ = topZ + CORNER_DEFLECTOR_SIZE;
  const highX = isLeft
    ? wallX + CORNER_DEFLECTOR_SIZE
    : wallX - CORNER_DEFLECTOR_SIZE;
  const highZ = topZ;

  const centerX = (lowX + highX) / 2;
  const centerZ = (lowZ + highZ) / 2;
  const length = Math.hypot(lowX - highX, lowZ - highZ);
  const angle = Math.atan2(-(lowZ - highZ), lowX - highX);

  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(length, WALL_HEIGHT, CORNER_DEFLECTOR_DEPTH),
    material,
  );
  mesh.position.set(centerX, WALL_HEIGHT / 2, centerZ);
  mesh.rotation.y = angle;
  scene.add(mesh);
  return mesh;
}

export function createCornerDeflectorMeshes(scene) {
  const material = new THREE.MeshStandardMaterial({ color: CORNER_DEFLECTOR_COLOR });
  return [
    createOneCornerDeflectorMesh(scene, "left", material),
    createOneCornerDeflectorMesh(scene, "right", material),
  ];
}
