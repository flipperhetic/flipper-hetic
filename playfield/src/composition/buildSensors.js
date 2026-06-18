import { Mesh, BoxGeometry, MeshBasicMaterial, DoubleSide } from 'three';
import {
  createSensorBoxBody,
  createStaticBoxBody,
  closeLaunchGate,
} from "../adapters/physics/index.js";

const DEG = Math.PI / 180;

export function buildSensors(world, tableMeshes, ballBody, launchGateBody, scene) {
  const syncPairs = [];
  const sensorDefs = [];

  // Static obstacle near the RV sensor zone
  const RED_RECT_DEF = { x: -4.45, y: 0.5, z: -5.8, w: 2.6, h: 1, d: 0.3, rotY: -42 };
  const redRectHy = (RED_RECT_DEF.rotY * DEG) / 2;
  const redRectPair = {
    mesh: tableMeshes[28],
    body: createStaticBoxBody(world, {
      width: RED_RECT_DEF.w, height: RED_RECT_DEF.h, depth: RED_RECT_DEF.d,
      position: { x: RED_RECT_DEF.x, y: RED_RECT_DEF.y, z: RED_RECT_DEF.z },
      rotation: { x: 0, y: Math.sin(redRectHy), z: 0, w: Math.cos(redRectHy) },
    }),
  };
  redRectPair.mesh.geometry.dispose();
  redRectPair.mesh.geometry = new BoxGeometry(RED_RECT_DEF.w, RED_RECT_DEF.h, RED_RECT_DEF.d);
  syncPairs.push(redRectPair);
  sensorDefs.push({ name: 'Obstacle RV', body: redRectPair.body, mesh: redRectPair.mesh, ix: RED_RECT_DEF.x, iy: RED_RECT_DEF.y, iz: RED_RECT_DEF.z, iry: RED_RECT_DEF.rotY, w: RED_RECT_DEF.w, h: RED_RECT_DEF.h, d: RED_RECT_DEF.d });

  // Tuco tunnel entrance sensor
  const TUCO_DEF = { x: -1.75, y: 0.5, z: -11.05, w: 0.75, h: 1, d: 0.4 };
  const tucoPair = {
    mesh: tableMeshes[26],
    body: createSensorBoxBody(world, {
      width: TUCO_DEF.w, height: TUCO_DEF.h, depth: TUCO_DEF.d,
      position: { x: TUCO_DEF.x, y: TUCO_DEF.y, z: TUCO_DEF.z },
      type: 'tunnel',
    }),
  };
  tucoPair.mesh.geometry.dispose();
  tucoPair.mesh.geometry = new BoxGeometry(TUCO_DEF.w, TUCO_DEF.h, TUCO_DEF.d);
  syncPairs.push(tucoPair);
  sensorDefs.push({ name: 'Sensor Tuco', body: tucoPair.body, mesh: tucoPair.mesh, ix: TUCO_DEF.x, iy: TUCO_DEF.y, iz: TUCO_DEF.z, iry: 0, w: TUCO_DEF.w, h: TUCO_DEF.h, d: TUCO_DEF.d });

  // RV tunnel entrance sensor
  const RV_DEF = { x: -4.55, y: 0.5, z: -4.55, w: 0.7, h: 1, d: 0.5 };
  const rvPair = {
    mesh: tableMeshes[27],
    body: createSensorBoxBody(world, {
      width: RV_DEF.w, height: RV_DEF.h, depth: RV_DEF.d,
      position: { x: RV_DEF.x, y: RV_DEF.y, z: RV_DEF.z },
      type: 'tunnel-rv',
    }),
  };
  rvPair.mesh.geometry.dispose();
  rvPair.mesh.geometry = new BoxGeometry(RV_DEF.w, RV_DEF.h, RV_DEF.d);
  syncPairs.push(rvPair);
  sensorDefs.push({ name: 'Sensor RV', body: rvPair.body, mesh: rvPair.mesh, ix: RV_DEF.x, iy: RV_DEF.y, iz: RV_DEF.z, iry: 0, w: RV_DEF.w, h: RV_DEF.h, d: RV_DEF.d });

  // Launch gate entrance sensor — closes the gate when the ball exits the tunnel
  const GATE_DEF = { x: 3.3, y: 0.5, z: -8.35, w: 6.3, h: 1.3, d: 0.4, rotY: 90 };
  const gateHy = (GATE_DEF.rotY * DEG) / 2;
  const gatePair = { mesh: tableMeshes[29], body: null };
  gatePair.body = createSensorBoxBody(world, {
    width: GATE_DEF.w, height: GATE_DEF.h, depth: GATE_DEF.d,
    position: { x: GATE_DEF.x, y: GATE_DEF.y, z: GATE_DEF.z },
    rotation: { x: 0, y: Math.sin(gateHy), z: 0, w: Math.cos(gateHy) },
    type: 'gate-entrance',
  });
  gatePair.mesh.geometry.dispose();
  gatePair.mesh.geometry = new BoxGeometry(GATE_DEF.w, GATE_DEF.h, GATE_DEF.d);
  syncPairs.push(gatePair);
  sensorDefs.push({ name: 'Sensor Gate', body: gatePair.body, mesh: gatePair.mesh, ix: GATE_DEF.x, iy: GATE_DEF.y, iz: GATE_DEF.z, iry: GATE_DEF.rotY, w: GATE_DEF.w, h: GATE_DEF.h, d: GATE_DEF.d });

  // Two generic rectangle obstacles — positioned via debug panel
  const rectDebugMat = new MeshBasicMaterial({ color: 0xff8800, transparent: true, opacity: 0.5, side: DoubleSide, depthWrite: false });

  const RECT_A_DEF = { x: -5.2, y: 0.5, z: 9.8, w: 0.6, h: 1, d: 1.1, rotY: 41 };
  const rectAHy = (RECT_A_DEF.rotY * DEG) / 2;
  const rectMeshA = new Mesh(new BoxGeometry(RECT_A_DEF.w, RECT_A_DEF.h, RECT_A_DEF.d), rectDebugMat);
  rectMeshA.visible = false;
  scene.add(rectMeshA);
  const rectBodyA = createStaticBoxBody(world, {
    width: RECT_A_DEF.w, height: RECT_A_DEF.h, depth: RECT_A_DEF.d,
    position: { x: RECT_A_DEF.x, y: RECT_A_DEF.y, z: RECT_A_DEF.z },
    rotation: { x: 0, y: Math.sin(rectAHy), z: 0, w: Math.cos(rectAHy) },
    type: 'wall',
  });
  syncPairs.push({ mesh: rectMeshA, body: rectBodyA });
  sensorDefs.push({ name: 'Rect A', body: rectBodyA, mesh: rectMeshA, ix: RECT_A_DEF.x, iy: RECT_A_DEF.y, iz: RECT_A_DEF.z, iry: RECT_A_DEF.rotY, w: RECT_A_DEF.w, h: RECT_A_DEF.h, d: RECT_A_DEF.d });

  const RECT_B_DEF = { x: 3.8, y: 0.5, z: 9.95, w: 0.35, h: 1, d: 0.7, rotY: -46 };
  const rectBHy = (RECT_B_DEF.rotY * DEG) / 2;
  const rectMeshB = new Mesh(new BoxGeometry(RECT_B_DEF.w, RECT_B_DEF.h, RECT_B_DEF.d), rectDebugMat);
  rectMeshB.visible = false;
  scene.add(rectMeshB);
  const rectBodyB = createStaticBoxBody(world, {
    width: RECT_B_DEF.w, height: RECT_B_DEF.h, depth: RECT_B_DEF.d,
    position: { x: RECT_B_DEF.x, y: RECT_B_DEF.y, z: RECT_B_DEF.z },
    rotation: { x: 0, y: Math.sin(rectBHy), z: 0, w: Math.cos(rectBHy) },
    type: 'wall',
  });
  syncPairs.push({ mesh: rectMeshB, body: rectBodyB });
  sensorDefs.push({ name: 'Rect B', body: rectBodyB, mesh: rectMeshB, ix: RECT_B_DEF.x, iy: RECT_B_DEF.y, iz: RECT_B_DEF.z, iry: RECT_B_DEF.rotY, w: RECT_B_DEF.w, h: RECT_B_DEF.h, d: RECT_B_DEF.d });

  world.addCollisionListener((h1, h2) => {
    if (!gatePair.body) return;
    const ballColHandle = ballBody.colliders[0].handle;
    if (h1 !== ballColHandle && h2 !== ballColHandle) return;
    const otherH = h1 === ballColHandle ? h2 : h1;
    const col = world.getCollider(otherH);
    if (!col) return;
    const otherRb = col.parent();
    if (!otherRb || otherRb.handle !== gatePair.body.rb.handle) return;
    if (launchGateBody.userData.state === 'open') closeLaunchGate(launchGateBody);
  });

  return { syncPairs, sensorDefs, rectMeshes: [rectMeshA, rectMeshB] };
}
