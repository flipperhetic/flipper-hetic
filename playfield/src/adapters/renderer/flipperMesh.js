/**
 * Playfield — Meshes Three.js des flippers.
 */
import * as THREE from "three";
import {
  FLIPPER_LENGTH,
  FLIPPER_WIDTH,
  FLIPPER_HEIGHT,
  FLIPPER_PIVOT_X,
  FLIPPER_PIVOT_Z,
  FLIPPER_PIVOT_Y,
} from "../../domain/constants.js";

function createOneFlipperMesh(scene, side) {
  const isLeft = side === "left";
  const pivotX = isLeft ? -FLIPPER_PIVOT_X : FLIPPER_PIVOT_X;
  const shapeOffsetX = isLeft ? FLIPPER_LENGTH / 2 : -FLIPPER_LENGTH / 2;

  const geometry = new THREE.BoxGeometry(FLIPPER_LENGTH, FLIPPER_HEIGHT, FLIPPER_WIDTH);
  geometry.translate(shapeOffsetX, 0, 0);
  const mesh = new THREE.Mesh(
    geometry,
    new THREE.MeshStandardMaterial({ color: 0xff6600, metalness: 0.5, roughness: 0.5 }),
  );
  mesh.position.set(pivotX, FLIPPER_PIVOT_Y, FLIPPER_PIVOT_Z);
  scene.add(mesh);
  return mesh;
}

export function createFlipperMeshes(scene) {
  return {
    left: createOneFlipperMesh(scene, "left"),
    right: createOneFlipperMesh(scene, "right"),
  };
}
