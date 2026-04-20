/**
 * Playfield — Meshes Three.js du plateau et des murs.
 */
import * as THREE from "three";
import {
  TABLE_WIDTH,
  TABLE_DEPTH,
  TABLE_THICKNESS,
  WALL_HEIGHT,
  WALL_THICKNESS,
  DRAIN_OPENING_WIDTH,
} from "../../domain/constants.js";

export function createTableMeshes(scene) {
  const tableMat = new THREE.MeshStandardMaterial({ color: 0x2d5a27 });
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x8b4513 });

  const meshes = [];

  // Plateau
  const table = new THREE.Mesh(
    new THREE.BoxGeometry(TABLE_WIDTH, TABLE_THICKNESS, TABLE_DEPTH),
    tableMat,
  );
  table.position.y = -TABLE_THICKNESS / 2;
  scene.add(table);
  meshes.push(table);

  function addWall(w, h, d, x, y, z) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat);
    mesh.position.set(x, y, z);
    scene.add(mesh);
    meshes.push(mesh);
    return mesh;
  }

  // Mur gauche
  addWall(
    WALL_THICKNESS, WALL_HEIGHT, TABLE_DEPTH,
    -TABLE_WIDTH / 2 - WALL_THICKNESS / 2, WALL_HEIGHT / 2, 0,
  );

  // Mur droit
  addWall(
    WALL_THICKNESS, WALL_HEIGHT, TABLE_DEPTH,
    TABLE_WIDTH / 2 + WALL_THICKNESS / 2, WALL_HEIGHT / 2, 0,
  );

  // Mur haut
  addWall(
    TABLE_WIDTH + WALL_THICKNESS * 2, WALL_HEIGHT, WALL_THICKNESS,
    0, WALL_HEIGHT / 2, -TABLE_DEPTH / 2 - WALL_THICKNESS / 2,
  );

  // Mur bas — deux segments avec ouverture drain
  const bottomWallWidth = (TABLE_WIDTH - DRAIN_OPENING_WIDTH) / 2;
  const bottomZ = TABLE_DEPTH / 2 + WALL_THICKNESS / 2;

  addWall(
    bottomWallWidth, WALL_HEIGHT, WALL_THICKNESS,
    -(DRAIN_OPENING_WIDTH / 2 + bottomWallWidth / 2), WALL_HEIGHT / 2, bottomZ,
  );

  addWall(
    bottomWallWidth, WALL_HEIGHT, WALL_THICKNESS,
    (DRAIN_OPENING_WIDTH / 2 + bottomWallWidth / 2), WALL_HEIGHT / 2, bottomZ,
  );

  return meshes;
}
