/**
 * Playfield — Meshes Three.js des bumpers.
 */
import * as THREE from "three";
import {
  BUMPER_RADIUS,
  BUMPER_HEIGHT,
  BUMPER_POSITIONS,
} from "../../domain/constants.js";

const BUMPER_COLOR = 0xff2266;

export function createBumperMeshes(scene) {
  const material = new THREE.MeshStandardMaterial({
    color: BUMPER_COLOR,
    metalness: 0.6,
    roughness: 0.3,
  });

  const meshes = [];

  for (const pos of BUMPER_POSITIONS) {
    const mesh = new THREE.Mesh(
      new THREE.CylinderGeometry(BUMPER_RADIUS, BUMPER_RADIUS, BUMPER_HEIGHT, 24),
      material,
    );
    mesh.position.set(pos.x, BUMPER_HEIGHT / 2, pos.z);
    scene.add(mesh);
    meshes.push(mesh);
  }

  return meshes;
}
