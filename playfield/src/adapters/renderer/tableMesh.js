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
  TUNNEL_LENGTH,
  TUNNEL_WALL_X,
  TUNNEL_WALL_Z,
  ARCH_HALF_WIDTH,
  ARCH_HALF_DEPTH,
  ARCH_HEIGHT,
  ARCH_CENTER_Z,
  ARCH_SEGMENTS,
  ARCH_OFFSET_X,
  ARCH_OFFSET_Z,
  ARCH_ROT_Y,
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

  // Mur separateur du tunnel de lancement (couloir bas-droite)
  addWall(
    WALL_THICKNESS, WALL_HEIGHT, TUNNEL_LENGTH,
    TUNNEL_WALL_X, WALL_HEIGHT / 2, TUNNEL_WALL_Z,
  );

  const archPts = [];
  for (let i = 0; i <= ARCH_SEGMENTS * 2; i++) {
    const theta = (i / (ARCH_SEGMENTS * 2) - 0.5) * Math.PI;
    archPts.push(new THREE.Vector3(
      ARCH_HALF_WIDTH * Math.sin(theta),
      ARCH_HEIGHT / 2,
      ARCH_CENTER_Z - ARCH_HALF_DEPTH * Math.cos(theta),
    ));
  }
  const archMesh = new THREE.Mesh(
    new THREE.TubeGeometry(new THREE.CatmullRomCurve3(archPts), ARCH_SEGMENTS * 2, 0.55, 6, false),
    wallMat,
  );
  archMesh.position.set(ARCH_OFFSET_X, 0, ARCH_OFFSET_Z);
  archMesh.rotation.y = ARCH_ROT_Y;
  scene.add(archMesh);
  meshes.push(archMesh);

  // Drop border gauche
  addWall(WALL_THICKNESS, WALL_HEIGHT, 3, -3.5, WALL_HEIGHT / 2, 4);

  // Drop border droit
  addWall(WALL_THICKNESS, WALL_HEIGHT, 3, 3.5, WALL_HEIGHT / 2, 4);

  // Triangle guide
  const triShape = new THREE.Shape([
    new THREE.Vector2(-1.325, -0.8),
    new THREE.Vector2( 1.325, -0.8),
    new THREE.Vector2(0,       0.8),
  ]);
  const triGeo = new THREE.ExtrudeGeometry(triShape, { depth: 0.95, bevelEnabled: false });
  triGeo.rotateX(-Math.PI / 2);
  const triMesh = new THREE.Mesh(
    triGeo,
    new THREE.MeshStandardMaterial({ color: 0xff2222, transparent: true, opacity: 0.6 }),
  );
  triMesh.position.set(2.8, 3.4, -2);
  triMesh.rotation.y = 89 * (Math.PI / 180);
  scene.add(triMesh);
  meshes.push(triMesh); // index 10

  // Slingshot gauche vertical
  addWall(WALL_THICKNESS, WALL_HEIGHT, 1, -3, WALL_HEIGHT / 2, 2.5);

  // Slingshot droit vertical
  addWall(WALL_THICKNESS, WALL_HEIGHT, 1, 2, WALL_HEIGHT / 2, 2.5);

  // Slingshot gauche diagonal
  addWall(WALL_THICKNESS, WALL_HEIGHT, 3, -2.5, WALL_HEIGHT / 2, 3.5);

  // Slingshot droit diagonal
  addWall(WALL_THICKNESS, WALL_HEIGHT, 3, 1.5, WALL_HEIGHT / 2, 3.5);

  return meshes;
}
