import * as THREE from "three";
import {
  TUNNEL_WIDTH,
  WALL_HEIGHT,
} from "../../domain/constants.js";

const GATE_THICKNESS_Z = 0.15;
const GATE_COLOR = 0xffaa00;

export function createLaunchGateMesh(scene) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(TUNNEL_WIDTH, WALL_HEIGHT, GATE_THICKNESS_Z),
    new THREE.MeshStandardMaterial({ color: GATE_COLOR, metalness: 0.6, roughness: 0.4 }),
  );
  scene.add(mesh);
  return mesh;
}
