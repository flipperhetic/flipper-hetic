import { BoxGeometry, CylinderGeometry, ExtrudeGeometry, Shape, Vector2 } from 'three';
import {
  createStaticBoxBody,
  createArchBody,
  createTriangleBody,
  createCylinderBody,
  createDiamondBody,
} from "../adapters/physics/index.js";

const DEG = Math.PI / 180;

function buildDiamondGeo(base, triH, wallH) {
  const s = new Shape([
    new Vector2(0, -triH / 2),
    new Vector2(base / 2, 0),
    new Vector2(0,  triH / 2),
    new Vector2(-base / 2, 0),
  ]);
  const g = new ExtrudeGeometry(s, { depth: wallH, bevelEnabled: false });
  g.rotateX(-Math.PI / 2);
  return g;
}

function buildTriGeo(base, triH, wallH) {
  const s = new Shape([
    new Vector2(-base / 2, -triH / 2),
    new Vector2( base / 2, -triH / 2),
    new Vector2(0,          triH / 2),
  ]);
  const g = new ExtrudeGeometry(s, { depth: wallH, bevelEnabled: false });
  g.rotateX(-Math.PI / 2);
  return g;
}

export function buildBumpers(world, tableMeshes) {
  const syncPairs = [];

  // Arch (invisible physics guide at top) + main triangle obstacle
  const archBody = createArchBody(world);
  const triBody = createTriangleBody(world, { x: 2.8, y: 0, z: -2, rotY: 89 * DEG, base: 2.65, triH: 1.6, wallH: 0.95 });
  syncPairs.push({ mesh: tableMeshes[10], body: triBody });

  // Cylindrical bumpers (3 orange)
  const CYL_Y = 0.65;
  const CYLINDER_DEFS = [
    { x: 1.7,  y: CYL_Y, z: -3.2, radius: 0.4, height: 1.3 },
    { x: 0.3,  y: CYL_Y, z: -2.7, radius: 0.4, height: 1.3 },
    { x: 0.75, y: CYL_Y, z: -1.2, radius: 0.4, height: 1.3 },
  ];
  for (let i = 0; i < CYLINDER_DEFS.length; i++) {
    const d = CYLINDER_DEFS[i];
    const body = createCylinderBody(world, { ...d, rotY: 0, type: `bumper-cyl-${i}` });
    const mesh = tableMeshes[17 + i];
    mesh.geometry.dispose();
    mesh.geometry = new CylinderGeometry(d.radius, d.radius, d.height, 24);
    mesh.position.set(d.x, d.y, d.z);
    syncPairs.push({ mesh, body });
  }

  // Large diamond obstacle
  const DIAMOND_DEF = { x: -1.45, y: 0, z: -0.25, base: 2.05, triH: 1.2, wallH: 0.9, rotY: 0 };
  const diamondPair = {
    mesh: tableMeshes[20],
    body: createDiamondBody(world, { ...DIAMOND_DEF, rotY: DIAMOND_DEF.rotY * DEG, type: 'bumper-diamond' }),
  };
  diamondPair.mesh.geometry.dispose();
  diamondPair.mesh.geometry = buildDiamondGeo(DIAMOND_DEF.base, DIAMOND_DEF.triH, DIAMOND_DEF.wallH);
  syncPairs.push(diamondPair);

  // RV area rectangle
  const RV_RECT_DEF = { x: -5.05, y: 0.5, z: -0.7, w: 1.3, h: 1, d: 1.3, rotY: 53 };
  const rvRectHy = (RV_RECT_DEF.rotY * DEG) / 2;
  const rvRectPair = {
    mesh: tableMeshes[21],
    body: createStaticBoxBody(world, {
      width: RV_RECT_DEF.w, height: RV_RECT_DEF.h, depth: RV_RECT_DEF.d,
      position: { x: RV_RECT_DEF.x, y: RV_RECT_DEF.y, z: RV_RECT_DEF.z },
      rotation: { x: 0, y: Math.sin(rvRectHy), z: 0, w: Math.cos(rvRectHy) },
    }),
  };
  rvRectPair.mesh.geometry.dispose();
  rvRectPair.mesh.geometry = new BoxGeometry(RV_RECT_DEF.w, RV_RECT_DEF.h, RV_RECT_DEF.d);
  syncPairs.push(rvRectPair);

  // RV area triangle
  const RV_TRI_DEF = { x: -3.4, y: 0, z: -2, base: 1.05, triH: 0.6, wallH: 0.9, rotY: -84 };
  const rvTriPair = {
    mesh: tableMeshes[22],
    body: createTriangleBody(world, { ...RV_TRI_DEF, rotY: RV_TRI_DEF.rotY * DEG }),
  };
  rvTriPair.mesh.geometry.dispose();
  rvTriPair.mesh.geometry = buildTriGeo(RV_TRI_DEF.base, RV_TRI_DEF.triH, RV_TRI_DEF.wallH);
  syncPairs.push(rvTriPair);

  // Small diamond near bumpers
  const DIAMOND2_DEF = { x: 0.95, y: 0, z: -4.75, base: 1.25, triH: 0.8, wallH: 0.9, rotY: 25 };
  const diamond2Pair = {
    mesh: tableMeshes[23],
    body: createDiamondBody(world, { ...DIAMOND2_DEF, rotY: DIAMOND2_DEF.rotY * DEG, type: 'bumper-diamond-2' }),
  };
  diamond2Pair.mesh.geometry.dispose();
  diamond2Pair.mesh.geometry = buildDiamondGeo(DIAMOND2_DEF.base, DIAMOND2_DEF.triH, DIAMOND2_DEF.wallH);
  syncPairs.push(diamond2Pair);

  // Lower-left triangle (slingshot area)
  const TRI_LEFT_DEF = { x: -3, y: 0, z: 2.5, base: 2, triH: 0.7, wallH: 0.9, rotY: 117 };
  const triLeftPair = {
    mesh: tableMeshes[24],
    body: createTriangleBody(world, { ...TRI_LEFT_DEF, rotY: TRI_LEFT_DEF.rotY * DEG, type: 'bumper-tri-left', restitution: 0.6 }),
  };
  triLeftPair.mesh.geometry.dispose();
  triLeftPair.mesh.geometry = buildTriGeo(TRI_LEFT_DEF.base, TRI_LEFT_DEF.triH, TRI_LEFT_DEF.wallH);
  syncPairs.push(triLeftPair);

  // Lower-right triangle (slingshot area)
  const TRI_RIGHT_DEF = { x: 1.85, y: 0, z: 2.55, base: 1.9, triH: 0.7, wallH: 0.9, rotY: -115 };
  const triRightPair = {
    mesh: tableMeshes[25],
    body: createTriangleBody(world, { ...TRI_RIGHT_DEF, rotY: TRI_RIGHT_DEF.rotY * DEG, type: 'bumper-tri-right', restitution: 0.6 }),
  };
  triRightPair.mesh.geometry.dispose();
  triRightPair.mesh.geometry = buildTriGeo(TRI_RIGHT_DEF.base, TRI_RIGHT_DEF.triH, TRI_RIGHT_DEF.wallH);
  syncPairs.push(triRightPair);

  return { archBody, syncPairs };
}
