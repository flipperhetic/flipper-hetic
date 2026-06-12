import { BoxGeometry } from 'three';
import {
  createSensorBoxBody,
  createStaticBoxBody,
  closeLaunchGate,
} from "../adapters/physics/index.js";

const DEG = Math.PI / 180;

export function buildSensors(world, tableMeshes, ballBody, launchGateBody) {
  const syncPairs = [];

  // Static obstacle near the RV sensor zone
  const RED_RECT_DEF = { x: -3.6, y: 0.5, z: -4.15, w: 4.35, h: 1, d: 0.3, rotY: -82 };
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

  // Tuco tunnel entrance sensor
  const TUCO_DEF = { x: -1.6, y: 0.5, z: -5.8, w: 0.75, h: 1, d: 0.4 };
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

  // RV tunnel entrance sensor
  const RV_DEF = { x: -4.25, y: 0.5, z: -2.6, w: 0.85, h: 1, d: 0.5 };
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

  // Launch gate entrance sensor — closes the gate when the ball exits the tunnel
  const GATE_DEF = { x: 3.15, y: 0.5, z: -4.3, w: 3.55, h: 1.3, d: 0.4, rotY: 90 };
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

  return { syncPairs };
}
