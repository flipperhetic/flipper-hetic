/**
 * Playfield — Mesh Three.js de la bille.
 */
import * as THREE from "three";

export const BALL_RADIUS = 0.25;

export function createBallMesh(scene) {
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(BALL_RADIUS, 32, 32),
    new THREE.MeshStandardMaterial({
      color: 0xcccccc,
      metalness: 0.9,
      roughness: 0.2,
    }),
  );
  scene.add(mesh);
  return mesh;
}
