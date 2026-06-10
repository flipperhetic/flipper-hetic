import { BoxGeometry, Quaternion, Euler } from 'three';

const DEG = Math.PI / 180;
import {
  TABLE_WIDTH,
  TABLE_DEPTH,
  TABLE_THICKNESS,
  WALL_HEIGHT,
  WALL_THICKNESS,
  TUNNEL_WALL_X,
} from "../domain/constants.js";
import { createTableMeshes } from "../adapters/renderer/tableMesh.js";
import { createBallMesh } from "../adapters/renderer/ballMesh.js";
import { createFlipperMeshes } from "../adapters/renderer/flipperMesh.js";
import { createLaunchGateMesh } from "../adapters/renderer/launchGateMesh.js";
import {
  createStaticBoxBody,
  createBallBody,
  createFlipperBodies,
  createLaunchGateBody,
  createArchBody,
  createTriangleBody,
  setFlippersWorldRotY,
} from "../adapters/physics/index.js";
import { loadPlayfieldModel } from "../adapters/renderer/modelLoader.js";

export async function buildLevel({ scene, world }) {
  const syncPairs = [];

  const gltfModel = await loadPlayfieldModel();

  const tableMeshes = createTableMeshes(scene);
  for (const m of tableMeshes) m.visible = true;

  tableMeshes[0].material.color.setHex(0x4fc3f7);
  tableMeshes[0].material.transparent = true;
  tableMeshes[0].material.opacity = 0.5;

  tableMeshes[1].material.color.setHex(0xff2222);
  tableMeshes[1].material.transparent = true;
  tableMeshes[1].material.opacity = 0.4;
  tableMeshes[1].material.depthWrite = false;

  function makeBody(p, material, type) {
    const rx = (p.rx || 0) * DEG;
    const ry = (p.ry || 0) * DEG;
    const rz = (p.rz || 0) * DEG;
    const q = new Quaternion().setFromEuler(new Euler(rx, ry, rz));
    return createStaticBoxBody(world, {
      width: p.w, height: p.h, depth: p.d,
      position: { x: p.x, y: p.y, z: p.z },
      rotation: (rx || ry || rz) ? { x: q.x, y: q.y, z: q.z, w: q.w } : undefined,
      ...(material ? { material } : {}),
      type: type || 'wall',
    });
  }

  const wallDefs = {
    table:    { w: TABLE_WIDTH,              h: TABLE_THICKNESS, d: TABLE_DEPTH,              x: 0,                                  y: -0.3,                              z: 0,                                   _material: 'table', _type: 'table',  _meshIdx: 0 },
    wallLeft: { w: WALL_THICKNESS,           h: WALL_HEIGHT,     d: TABLE_DEPTH,              x: -TABLE_WIDTH / 2 - WALL_THICKNESS / 2, y: WALL_HEIGHT / 2,                z: 0,                                   _meshIdx: 1 },
    wallRight:{ w: WALL_THICKNESS,           h: WALL_HEIGHT,     d: TABLE_DEPTH,              x:  TABLE_WIDTH / 2 + WALL_THICKNESS / 2, y: WALL_HEIGHT / 2,                z: 0,                                   _meshIdx: 2 },
    wallTop:  { w: TABLE_WIDTH + WALL_THICKNESS * 2, h: WALL_HEIGHT, d: WALL_THICKNESS,       x: 0,                                  y: WALL_HEIGHT / 2,                   z: -TABLE_DEPTH / 2 - WALL_THICKNESS / 2, _meshIdx: 3 },
    tunnel:      { w: WALL_THICKNESS,                              h: WALL_HEIGHT, d: 9.75,          x: TUNNEL_WALL_X,                                                              y: WALL_HEIGHT / 2, z: 1.65,                                _meshIdx: 6 },
    bottomLeft:  { w: 2.65, h: WALL_HEIGHT, d: WALL_THICKNESS, x: -3.7,    y: WALL_HEIGHT / 2, z: TABLE_DEPTH / 2 + WALL_THICKNESS / 2, _meshIdx: 4 },
    bottomRight: { w: 3.45, h: WALL_HEIGHT, d: WALL_THICKNESS, x:  2.975, y: WALL_HEIGHT / 2, z: TABLE_DEPTH / 2 + WALL_THICKNESS / 2, _meshIdx: 5 },
    glass:           { w: TABLE_WIDTH + WALL_THICKNESS * 2,          h: 0.1,         d: TABLE_DEPTH + 6, x: 0,                                                                   y: 0.7,             z: 0 },
    dropBorderLeft:      { w: WALL_THICKNESS, h: WALL_HEIGHT, d: 3.95, x: -3.05, y: WALL_HEIGHT / 2, z: 6.3,  ry:  60, _meshIdx: 8 },
    dropBorderRight:     { w: WALL_THICKNESS, h: WALL_HEIGHT, d: 3.95, x:  1.9,  y: WALL_HEIGHT / 2, z: 6.3,  ry: -60, _meshIdx: 9 },
    slingshotLeftVert:   { w: 0.2, h: WALL_HEIGHT, d: 0.7,  x: -3.85, y: WALL_HEIGHT / 2, z: 3.6, ry:   0, _meshIdx: 11 },
    slingshotRightVert:  { w: 0.15, h: WALL_HEIGHT, d: 0.65, x:  2.75,  y: WALL_HEIGHT / 2, z: 3.5, ry:   0, _meshIdx: 12 },
    slingshotLeftDiag:   { w: 0.2, h: WALL_HEIGHT, d: 1.95, x: -3.05, y: WALL_HEIGHT / 2, z: 4.4, ry:  56, _meshIdx: 13 },
    slingshotRightDiag:  { w: 0.2, h: WALL_HEIGHT, d: 1.95, x:  1.95, y: WALL_HEIGHT / 2, z: 4.4, ry: -56, _meshIdx: 14 },
  };

  for (const [, def] of Object.entries(wallDefs)) {
    def.body = makeBody(def, def._material, def._type);
    if (def._meshIdx != null) {
      def._pair = { mesh: tableMeshes[def._meshIdx], body: def.body };
      syncPairs.push(def._pair);
    }
  }

  for (const def of Object.values(wallDefs)) {
    if (def._pair) {
      def._pair.mesh.position.set(def.x, def.y, def.z);
      def._pair.mesh.rotation.set((def.rx || 0) * DEG, (def.ry || 0) * DEG, (def.rz || 0) * DEG);
      def._pair.mesh.geometry.dispose();
      def._pair.mesh.geometry = new BoxGeometry(def.w, def.h, def.d);
    }
  }

  const archOrigin = { body: createArchBody(world), ox: 0, oy: 0, oz: 0 };
  createTriangleBody(world, { x: 2.8, y: 3.4, z: -2, rotY: 89 * DEG, base: 2.65, triH: 1.6, wallH: 0.95 });

  const ballMesh = createBallMesh(scene);
  const ballBody = createBallBody(world);
  syncPairs.push({ mesh: ballMesh, body: ballBody });

  const flipperMeshes = createFlipperMeshes(scene);
  const flipperBodies = createFlipperBodies(world);
  syncPairs.push(
    { mesh: flipperMeshes.left,  body: flipperBodies.left.body },
    { mesh: flipperMeshes.right, body: flipperBodies.right.body },
  );

  const launchGateMesh = createLaunchGateMesh(scene);
  const launchGateBody = createLaunchGateBody(world);
  syncPairs.push({ mesh: launchGateMesh, body: launchGateBody });

  function setPhysicsDebugVisible(v) {
    for (const m of tableMeshes) m.visible = v;
  }

  function physicsRotateY(angleDeg) {
    const theta = angleDeg * Math.PI / 180;
    const cos = Math.cos(theta);
    const sin = Math.sin(theta);
    const qy = { x: 0, y: Math.sin(theta / 2), z: 0, w: Math.cos(theta / 2) };
    for (const def of Object.values(wallDefs)) {
      def.body.rb.setTranslation({ x: def.x * cos - def.z * sin, y: def.y, z: def.x * sin + def.z * cos }, true);
      def.body.rb.setRotation(qy, true);
    }
    archOrigin.body.rb.setTranslation({ x: 0, y: 0, z: 0 }, true);
    archOrigin.body.rb.setRotation(qy, true);
    setFlippersWorldRotY(flipperBodies, theta);
  }

  return {
    syncPairs,
    ballMesh,
    ballBody,
    flipperBodies,
    launchGateBody,
    gltfModel,
    physicsRotateY,
    setPhysicsDebugVisible,
  };
}
