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
  const tableMat = new THREE.MeshStandardMaterial({ color: 0x4fc3f7, transparent: true, opacity: 0.5 });
  const wallMat = new THREE.MeshStandardMaterial({ color: 0xff2222, transparent: true, opacity: 0.4, depthWrite: false });

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
  triMesh.position.set(2.8, 0, -2);
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

  // Buste — guide épaule gauche (index 15)
  addWall(0.25, 0.7, 2.05, -1.1, 0.3, -5.15);

  // Buste — guide 2 (index 16)
  addWall(0.2, 1.55, 0.95, -1.95, 0.75, -4.6);

  // Bumpers cylindriques (indices 17-19)
  const cylDefs = [
    { x: 1.7,  y: 0.65, z: -3.2,  r: 0.4, h: 1.3 },
    { x: 0.3,  y: 0.65, z: -2.7,  r: 0.4, h: 1.3 },
    { x: 0.75, y: 0.65, z: -1.2,  r: 0.4, h: 1.3 },
  ];
  const cylMat = new THREE.MeshStandardMaterial({ color: 0xff2222, transparent: true, opacity: 0.5, wireframe: true });
  for (const { x, y, z, r, h } of cylDefs) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 24), cylMat);
    m.position.set(x, y, z);
    scene.add(m);
    meshes.push(m);
  }

  // Diamond bumper (index 20) — géométrie mise à jour par buildLevel
  const diamondMesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.1, 0.1, 0.1),
    new THREE.MeshStandardMaterial({ color: 0xff2222, transparent: true, opacity: 0.6 }),
  );
  scene.add(diamondMesh);
  meshes.push(diamondMesh);

  // RV Rectangle (index 21) — géométrie mise à jour par buildLevel
  const rvRectMesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.1, 0.1, 0.1),
    new THREE.MeshStandardMaterial({ color: 0xff2222, transparent: true, opacity: 0.6 }),
  );
  scene.add(rvRectMesh);
  meshes.push(rvRectMesh);

  // RV Triangle (index 22) — géométrie mise à jour par buildLevel
  const rvTriMesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.1, 0.1, 0.1),
    new THREE.MeshStandardMaterial({ color: 0xff2222, transparent: true, opacity: 0.6 }),
  );
  scene.add(rvTriMesh);
  meshes.push(rvTriMesh);

  // Diamond Bumper 2 (index 23) — géométrie mise à jour par buildLevel
  const diamond2Mesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.1, 0.1, 0.1),
    new THREE.MeshStandardMaterial({ color: 0xff2222, transparent: true, opacity: 0.6 }),
  );
  scene.add(diamond2Mesh);
  meshes.push(diamond2Mesh);

  // Left Triangle (index 24) — géométrie mise à jour par buildLevel
  const triLeftMesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.1, 0.1, 0.1),
    new THREE.MeshStandardMaterial({ color: 0xff2222, transparent: true, opacity: 0.6 }),
  );
  scene.add(triLeftMesh);
  meshes.push(triLeftMesh);

  // Right Triangle (index 25) — géométrie mise à jour par buildLevel
  const triRightMesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.1, 0.1, 0.1),
    new THREE.MeshStandardMaterial({ color: 0xff2222, transparent: true, opacity: 0.6 }),
  );
  scene.add(triRightMesh);
  meshes.push(triRightMesh);

  // Tuco sensor zone (index 26) — vert opaque, mis à jour par buildLevel
  const tucoSensorMesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.1, 0.1, 0.1),
    new THREE.MeshStandardMaterial({ color: 0x00ff00, transparent: true, opacity: 0.45 }),
  );
  scene.add(tucoSensorMesh);
  meshes.push(tucoSensorMesh);

  // RV sensor zone (index 27) — vert opaque, mis à jour par buildLevel
  const rvSensorMesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.1, 0.1, 0.1),
    new THREE.MeshStandardMaterial({ color: 0x00ff00, transparent: true, opacity: 0.45 }),
  );
  scene.add(rvSensorMesh);
  meshes.push(rvSensorMesh);

  // Red Rect (index 28) — rouge opaque, mis à jour par buildLevel
  const redRectMesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.1, 0.1, 0.1),
    new THREE.MeshStandardMaterial({ color: 0xff2222, transparent: true, opacity: 0.7 }),
  );
  scene.add(redRectMesh);
  meshes.push(redRectMesh);

  // Gate entrance sensor (index 29) — violet opaque, mis à jour par buildLevel
  const gateEntranceMesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.1, 0.1, 0.1),
    new THREE.MeshStandardMaterial({ color: 0x8800ff, transparent: true, opacity: 0.6 }),
  );
  scene.add(gateEntranceMesh);
  meshes.push(gateEntranceMesh);

  return meshes;
}
