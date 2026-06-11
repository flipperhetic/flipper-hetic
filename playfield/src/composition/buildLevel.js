import { BoxGeometry, CylinderGeometry, ExtrudeGeometry, Shape, Vector2, Quaternion, Euler } from 'three';

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
  createSensorBoxBody,
  createBallBody,
  createFlipperBodies,
  createLaunchGateBody,
  createArchBody,
  createTriangleBody,
  createCylinderBody,
  createDiamondBody,
  setFlippersWorldRotY,
  setGateConfig as _setGateConfig,
  closeLaunchGate,
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
    bustGuideLeft:       { w: 0.25, h: 0.7, d: 2.05, x: -1.1, y: 0.3,  z: -5.15, ry: 0, _meshIdx: 15 },
    bustGuide2:          { w: 0.2,  h: 1.55, d: 0.95, x: -1.95, y: 0.75, z: -4.6, ry: 0, _meshIdx: 16 },
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

  const TUCO_SENSOR_DEF = { x: -1.6, y: 0.5, z: -5.8, w: 0.75, h: 1, d: 0.4, rotY: 0 };
  const tucoSensorPair = { mesh: tableMeshes[26], body: null };
  function setTucoSensor(p) {
    const hy = p.rotY / 2;
    if (tucoSensorPair.body) world.removeRigidBody(tucoSensorPair.body.rb);
    tucoSensorPair.body = createSensorBoxBody(world, {
      width: p.w, height: p.h, depth: p.d,
      position: { x: p.x, y: p.y, z: p.z },
      ...(p.rotY ? { rotation: { x: 0, y: Math.sin(hy), z: 0, w: Math.cos(hy) } } : {}),
      type: 'tunnel',
    });
    tucoSensorPair.mesh.geometry.dispose();
    tucoSensorPair.mesh.geometry = new BoxGeometry(p.w, p.h, p.d);
  }
  setTucoSensor({ ...TUCO_SENSOR_DEF, rotY: TUCO_SENSOR_DEF.rotY * DEG });
  syncPairs.push(tucoSensorPair);

  const RV_SENSOR_DEF = { x: -4.25, y: 0.5, z: -2.6, w: 0.85, h: 1, d: 0.5, rotY: 0 };
  const rvSensorPair = { mesh: tableMeshes[27], body: null };
  function setRvSensor(p) {
    const hy = p.rotY / 2;
    if (rvSensorPair.body) world.removeRigidBody(rvSensorPair.body.rb);
    rvSensorPair.body = createSensorBoxBody(world, {
      width: p.w, height: p.h, depth: p.d,
      position: { x: p.x, y: p.y, z: p.z },
      ...(p.rotY ? { rotation: { x: 0, y: Math.sin(hy), z: 0, w: Math.cos(hy) } } : {}),
      type: 'tunnel-rv',
    });
    rvSensorPair.mesh.geometry.dispose();
    rvSensorPair.mesh.geometry = new BoxGeometry(p.w, p.h, p.d);
  }
  setRvSensor({ ...RV_SENSOR_DEF, rotY: RV_SENSOR_DEF.rotY * DEG });
  syncPairs.push(rvSensorPair);

  const archOrigin = { body: createArchBody(world), ox: 0, oy: 0, oz: 0 };
  const triBody = createTriangleBody(world, { x: 2.8, y: 0, z: -2, rotY: 89 * DEG, base: 2.65, triH: 1.6, wallH: 0.95 });
  syncPairs.push({ mesh: tableMeshes[10], body: triBody });

  const CYL_Y = 0.65; // height/2 = 1.3/2, centre du cylindre dans l'espace physique
  const CYLINDER_DEFS = [
    { x: 1.7,  y: CYL_Y, z: -3.2,  radius: 0.4, height: 1.3, rotY: 0 },
    { x: 0.3,  y: CYL_Y, z: -2.7,  radius: 0.4, height: 1.3, rotY: 0 },
    { x: 0.75, y: CYL_Y, z: -1.2,  radius: 0.4, height: 1.3, rotY: 0 },
  ];
  const cylBodies = CYLINDER_DEFS.map((d, i) => createCylinderBody(world, { ...d, rotY: d.rotY * DEG, type: `bumper-cyl-${i}` }));
  for (let i = 0; i < cylBodies.length; i++) {
    syncPairs.push({ mesh: tableMeshes[17 + i], body: cylBodies[i] });
  }

  const DIAMOND_DEF = { x: -1.45, y: 0, z: -0.25, base: 2.05, triH: 1.2, wallH: 0.9, rotY: 0 };
  function buildDiamondGeo(base, triH, wallH) {
    const s = new Shape([
      new Vector2(0, -triH / 2),
      new Vector2(base / 2, 0),
      new Vector2(0, triH / 2),
      new Vector2(-base / 2, 0),
    ]);
    const g = new ExtrudeGeometry(s, { depth: wallH, bevelEnabled: false });
    g.rotateX(-Math.PI / 2);
    return g;
  }
  const diamondPair = {
    mesh: tableMeshes[20],
    body: createDiamondBody(world, { ...DIAMOND_DEF, rotY: DIAMOND_DEF.rotY * DEG, type: 'bumper-diamond' }),
  };
  diamondPair.mesh.geometry.dispose();
  diamondPair.mesh.geometry = buildDiamondGeo(DIAMOND_DEF.base, DIAMOND_DEF.triH, DIAMOND_DEF.wallH);
  syncPairs.push(diamondPair);

  const RV_RECT_DEF = { x: -5.05, y: 0.5, z: -0.7, w: 1.3, h: 1, d: 1.3, rotY: 53 };
  const rvRectPair = { mesh: tableMeshes[21], body: null };
  function setRvRect(p) {
    const hy = p.rotY / 2;
    if (rvRectPair.body) world.removeRigidBody(rvRectPair.body.rb);
    rvRectPair.body = createStaticBoxBody(world, {
      width: p.w, height: p.h, depth: p.d,
      position: { x: p.x, y: p.y, z: p.z },
      ...(p.rotY ? { rotation: { x: 0, y: Math.sin(hy), z: 0, w: Math.cos(hy) } } : {}),
    });
    rvRectPair.mesh.geometry.dispose();
    rvRectPair.mesh.geometry = new BoxGeometry(p.w, p.h, p.d);
  }
  setRvRect({ ...RV_RECT_DEF, rotY: RV_RECT_DEF.rotY * DEG });
  syncPairs.push(rvRectPair);

  const RV_TRI_DEF = { x: -3.4, y: 0, z: -2, base: 1.05, triH: 0.6, wallH: 0.9, rotY: -84 };
  const rvTriPair = { mesh: tableMeshes[22], body: null };
  function buildRvTriGeo(base, triH, wallH) {
    const s = new Shape([
      new Vector2(-base / 2, -triH / 2),
      new Vector2( base / 2, -triH / 2),
      new Vector2(0,          triH / 2),
    ]);
    const g = new ExtrudeGeometry(s, { depth: wallH, bevelEnabled: false });
    g.rotateX(-Math.PI / 2);
    return g;
  }
  function setRvTriangle(p) {
    if (rvTriPair.body) world.removeRigidBody(rvTriPair.body.rb);
    rvTriPair.body = createTriangleBody(world, { ...p });
    rvTriPair.mesh.geometry.dispose();
    rvTriPair.mesh.geometry = buildRvTriGeo(p.base, p.triH, p.wallH);
  }
  setRvTriangle({ ...RV_TRI_DEF, rotY: RV_TRI_DEF.rotY * DEG });
  syncPairs.push(rvTriPair);

  const DIAMOND2_DEF = { x: 0.95, y: 0, z: -4.75, base: 1.25, triH: 0.8, wallH: 0.9, rotY: 25 };
  const diamond2Pair = { mesh: tableMeshes[23], body: null };
  function setDiamond2(p) {
    if (diamond2Pair.body) world.removeRigidBody(diamond2Pair.body.rb);
    diamond2Pair.body = createDiamondBody(world, { ...p, type: 'bumper-diamond-2' });
    diamond2Pair.mesh.geometry.dispose();
    diamond2Pair.mesh.geometry = buildDiamondGeo(p.base, p.triH, p.wallH);
  }
  setDiamond2({ ...DIAMOND2_DEF, rotY: DIAMOND2_DEF.rotY * DEG });
  syncPairs.push(diamond2Pair);

  const TRI_LEFT_DEF = { x: -3, y: 0, z: 2.5, base: 2, triH: 0.7, wallH: 0.9, rotY: 117 };
  const triLeftPair = { mesh: tableMeshes[24], body: null };
  function setTriLeft(p) {
    if (triLeftPair.body) world.removeRigidBody(triLeftPair.body.rb);
    triLeftPair.body = createTriangleBody(world, { ...p, type: 'bumper-tri-left', restitution: 0.6 });
    triLeftPair.mesh.geometry.dispose();
    triLeftPair.mesh.geometry = buildRvTriGeo(p.base, p.triH, p.wallH);
  }
  setTriLeft({ ...TRI_LEFT_DEF, rotY: TRI_LEFT_DEF.rotY * DEG });
  syncPairs.push(triLeftPair);

  const TRI_RIGHT_DEF = { x: 1.85, y: 0, z: 2.55, base: 1.9, triH: 0.7, wallH: 0.9, rotY: -115 };
  const triRightPair = { mesh: tableMeshes[25], body: null };
  function setTriRight(p) {
    if (triRightPair.body) world.removeRigidBody(triRightPair.body.rb);
    triRightPair.body = createTriangleBody(world, { ...p, type: 'bumper-tri-right', restitution: 0.6 });
    triRightPair.mesh.geometry.dispose();
    triRightPair.mesh.geometry = buildRvTriGeo(p.base, p.triH, p.wallH);
  }
  setTriRight({ ...TRI_RIGHT_DEF, rotY: TRI_RIGHT_DEF.rotY * DEG });
  syncPairs.push(triRightPair);

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
  launchGateMesh.geometry.dispose();
  launchGateMesh.geometry = new BoxGeometry(
    launchGateBody.userData.w,
    launchGateBody.userData.h,
    launchGateBody.userData.d,
  );
  syncPairs.push({ mesh: launchGateMesh, body: launchGateBody });

  const _gHalfRot = (launchGateBody.userData.rotY * DEG) / 2;
  const gateEntranceSensor = createSensorBoxBody(world, {
    width: launchGateBody.userData.w,
    height: launchGateBody.userData.h + 0.3,
    depth: 0.8,
    position: { x: launchGateBody.userData.closedX - 1.5, y: WALL_HEIGHT / 2, z: launchGateBody.userData.closedZ },
    rotation: { x: 0, y: Math.sin(_gHalfRot), z: 0, w: Math.cos(_gHalfRot) },
    type: 'gate-entrance',
  });
  world.addCollisionListener((h1, h2) => {
    const ballColHandle = ballBody.colliders[0].handle;
    if (h1 !== ballColHandle && h2 !== ballColHandle) return;
    const otherH = h1 === ballColHandle ? h2 : h1;
    const col = world.getCollider(otherH);
    if (!col) return;
    const otherRb = col.parent();
    if (!otherRb || otherRb.handle !== gateEntranceSensor.rb.handle) return;
    if (launchGateBody.userData.state === 'open') closeLaunchGate(launchGateBody);
  });

  function setDiamond(p) {
    world.removeRigidBody(diamondPair.body.rb);
    diamondPair.body = createDiamondBody(world, { ...p, type: 'bumper-diamond' });
    diamondPair.mesh.geometry.dispose();
    diamondPair.mesh.geometry = buildDiamondGeo(p.base, p.triH, p.wallH);
  }

  function setCylinder(idx, p) {
    world.removeRigidBody(cylBodies[idx].rb);
    cylBodies[idx] = createCylinderBody(world, { ...p, type: `bumper-cyl-${idx}` });
    const mesh = tableMeshes[17 + idx];
    if (mesh) {
      mesh.geometry.dispose();
      mesh.geometry = new CylinderGeometry(p.radius, p.radius, p.height, 24);
      mesh.position.set(p.x, p.y, p.z);
      mesh.rotation.y = p.rotY ?? 0;
    }
  }

  function updateWall(name, p) {
    const def = wallDefs[name];
    const sizeChanged = p.w !== def.w || p.h !== def.h || p.d !== def.d;
    world.removeRigidBody(def.body.rb);
    def.body = makeBody(p, def._material, def._type);
    Object.assign(def, p);
    if (def._pair) {
      def._pair.body = def.body;
      def._pair.mesh.position.set(p.x, p.y, p.z);
      def._pair.mesh.rotation.set((p.rx || 0) * DEG, (p.ry || 0) * DEG, (p.rz || 0) * DEG);
      if (sizeChanged) {
        def._pair.mesh.geometry.dispose();
        def._pair.mesh.geometry = new BoxGeometry(p.w, p.h, p.d);
      }
    }
  }

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
    wallDefs,
    updateWall,
    setCylinder,
    gateDefaults: {
      x: launchGateBody.userData.closedX, z: launchGateBody.userData.closedZ,
      w: launchGateBody.userData.w, h: launchGateBody.userData.h,
      d: launchGateBody.userData.d, rotY: launchGateBody.userData.rotY,
    },
    setGateConfig: (config) => {
      _setGateConfig(launchGateBody, config);
      launchGateMesh.geometry.dispose();
      launchGateMesh.geometry = new BoxGeometry(config.w, config.h, config.d);
    },
    cylinderDebugConfigs: [],
    setTucoSensor,
    tucoSensorDebugConfig: { label: 'Tuco Sensor', defaults: { ...TUCO_SENSOR_DEF } },
    setRvSensor,
    rvSensorDebugConfig: { label: 'RV Sensor', defaults: { ...RV_SENSOR_DEF } },
  };
}
