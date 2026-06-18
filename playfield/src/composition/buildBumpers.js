import { BoxGeometry, CylinderGeometry, ExtrudeGeometry, Shape, Vector2, Vector3, TubeGeometry, CatmullRomCurve3 } from 'three';
import {
  createStaticBoxBody,
  createArchBody,
  createTriangleBody,
  createCylinderBody,
  createDiamondBody,
} from "../adapters/physics/index.js";
import { bodyHandlesByRapierHandle } from '../adapters/physics/rapier/bodyHandle.js';
import {
  ARCH_HALF_WIDTH, ARCH_HALF_DEPTH, ARCH_HEIGHT, ARCH_CENTER_Z,
  ARCH_OFFSET_X, ARCH_OFFSET_Y, ARCH_OFFSET_Z, ARCH_SEGMENTS,
} from '../domain/constants.js';

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
  const bumperDefs = [];

  // Arch (physics guide at top) + main triangle obstacle (passive — no score, no sound)
  const archBody = createArchBody(world);
  const triBody = createTriangleBody(world, { x: 2.8, y: 0, z: -2, rotY: 89 * DEG, base: 2.65, triH: 1.6, wallH: 0.95 });
  syncPairs.push({ mesh: tableMeshes[10], body: triBody });
  const triangleDef = { name: 'Triangle', body: triBody, mesh: tableMeshes[10], ix: 2.8, iy: 0, iz: -2, iry: 89 };

  // Arch rebuild — destroys + recreates physics body + updates debug mesh geometry
  const archDefaults = {
    halfWidth: ARCH_HALF_WIDTH, halfDepth: ARCH_HALF_DEPTH, height: ARCH_HEIGHT,
    centerZ: ARCH_CENTER_Z, offsetX: ARCH_OFFSET_X, offsetY: ARCH_OFFSET_Y, offsetZ: ARCH_OFFSET_Z,
    wallThickness: 1.1,
  };
  const currentArchParams = { ...archDefaults, segments: ARCH_SEGMENTS };
  function rebuildArch(newParams) {
    Object.assign(currentArchParams, newParams);
    const oldHandle = archBody.rb.handle;
    world.removeRigidBody(archBody.rb);
    bodyHandlesByRapierHandle.delete(oldHandle);
    const newBody = createArchBody(world, currentArchParams);
    bodyHandlesByRapierHandle.delete(newBody.rb.handle);
    bodyHandlesByRapierHandle.set(newBody.rb.handle, archBody);
    archBody.rb = newBody.rb;
    archBody.colliders = newBody.colliders;
    const { halfWidth, halfDepth, height, centerZ, segments, offsetX, offsetY, offsetZ } = currentArchParams;
    const pts = [];
    for (let i = 0; i <= segments * 2; i++) {
      const theta = (i / (segments * 2) - 0.5) * Math.PI;
      pts.push(new Vector3(halfWidth * Math.sin(theta), height / 2, centerZ - halfDepth * Math.cos(theta)));
    }
    tableMeshes[7].geometry.dispose();
    tableMeshes[7].geometry = new TubeGeometry(new CatmullRomCurve3(pts), segments * 2, 0.55, 6, false);
    tableMeshes[7].position.set(offsetX, offsetY, offsetZ);
  }

  // Cylindrical bumpers (3 orange)
  const CYL_Y = 0.65;
  const CYLINDER_DEFS = [
    { x: 2,   y: CYL_Y, z: -6.7, radius: 0.45, height: 1.3, rotX: 5 },
    { x: 0.4, y: CYL_Y, z: -5.8, radius: 0.45, height: 1.3, rotX: 5 },
    { x: 0.9, y: CYL_Y, z: -2.9, radius: 0.45, height: 1.3, rotX: 5 },
  ];
  for (let i = 0; i < CYLINDER_DEFS.length; i++) {
    const d = CYLINDER_DEFS[i];
    const body = createCylinderBody(world, { ...d, rotX: d.rotX * DEG, rotY: 0, type: `bumper-cyl-${i}` });
    const mesh = tableMeshes[17 + i];
    mesh.geometry.dispose();
    mesh.geometry = new CylinderGeometry(d.radius, d.radius, d.height, 24);
    mesh.position.set(d.x, d.y, d.z);
    syncPairs.push({ mesh, body });
    bumperDefs.push({ name: `Bumper Cyl ${i}`, body, mesh, ix: d.x, iy: d.y, iz: d.z, irx: d.rotX, iry: 0, radius: d.radius, height: d.height });
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
  bumperDefs.push({ name: 'Diamond', body: diamondPair.body, mesh: diamondPair.mesh, ix: DIAMOND_DEF.x, iy: DIAMOND_DEF.y, iz: DIAMOND_DEF.z, iry: DIAMOND_DEF.rotY });

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
  bumperDefs.push({ name: 'RV Rect', body: rvRectPair.body, mesh: rvRectPair.mesh, ix: RV_RECT_DEF.x, iy: RV_RECT_DEF.y, iz: RV_RECT_DEF.z, iry: RV_RECT_DEF.rotY, w: RV_RECT_DEF.w, h: RV_RECT_DEF.h, d: RV_RECT_DEF.d });

  // RV area triangle
  const RV_TRI_DEF = { x: -3.4, y: 0, z: -2, base: 1.05, triH: 0.6, wallH: 0.9, rotY: -84 };
  const rvTriPair = {
    mesh: tableMeshes[22],
    body: createTriangleBody(world, { ...RV_TRI_DEF, rotY: RV_TRI_DEF.rotY * DEG }),
  };
  rvTriPair.mesh.geometry.dispose();
  rvTriPair.mesh.geometry = buildTriGeo(RV_TRI_DEF.base, RV_TRI_DEF.triH, RV_TRI_DEF.wallH);
  syncPairs.push(rvTriPair);
  bumperDefs.push({ name: 'RV Triangle', body: rvTriPair.body, mesh: rvTriPair.mesh, ix: RV_TRI_DEF.x, iy: RV_TRI_DEF.y, iz: RV_TRI_DEF.z, iry: RV_TRI_DEF.rotY });

  // Small diamond near bumpers
  const DIAMOND2_DEF = { x: 0.95, y: 0, z: -4.75, base: 1.25, triH: 0.8, wallH: 0.9, rotY: 25 };
  const diamond2Pair = {
    mesh: tableMeshes[23],
    body: createDiamondBody(world, { ...DIAMOND2_DEF, rotY: DIAMOND2_DEF.rotY * DEG, type: 'bumper-diamond-2' }),
  };
  diamond2Pair.mesh.geometry.dispose();
  diamond2Pair.mesh.geometry = buildDiamondGeo(DIAMOND2_DEF.base, DIAMOND2_DEF.triH, DIAMOND2_DEF.wallH);
  syncPairs.push(diamond2Pair);
  bumperDefs.push({ name: 'Diamond 2', body: diamond2Pair.body, mesh: diamond2Pair.mesh, ix: DIAMOND2_DEF.x, iy: DIAMOND2_DEF.y, iz: DIAMOND2_DEF.z, iry: DIAMOND2_DEF.rotY });

  // Lower-left triangle (slingshot area)
  const TRI_LEFT_DEF = { x: -3, y: 0, z: 2.5, base: 2, triH: 0.7, wallH: 0.9, rotY: 117 };
  const triLeftPair = {
    mesh: tableMeshes[24],
    body: createTriangleBody(world, { ...TRI_LEFT_DEF, rotY: TRI_LEFT_DEF.rotY * DEG, type: 'bumper-tri-left', restitution: 0.6 }),
  };
  triLeftPair.mesh.geometry.dispose();
  triLeftPair.mesh.geometry = buildTriGeo(TRI_LEFT_DEF.base, TRI_LEFT_DEF.triH, TRI_LEFT_DEF.wallH);
  syncPairs.push(triLeftPair);
  bumperDefs.push({ name: 'Tri Gauche', body: triLeftPair.body, mesh: triLeftPair.mesh, ix: TRI_LEFT_DEF.x, iy: TRI_LEFT_DEF.y, iz: TRI_LEFT_DEF.z, iry: TRI_LEFT_DEF.rotY });

  // Lower-right triangle (slingshot area)
  const TRI_RIGHT_DEF = { x: 1.85, y: 0, z: 2.55, base: 1.9, triH: 0.7, wallH: 0.9, rotY: -115 };
  const triRightPair = {
    mesh: tableMeshes[25],
    body: createTriangleBody(world, { ...TRI_RIGHT_DEF, rotY: TRI_RIGHT_DEF.rotY * DEG, type: 'bumper-tri-right', restitution: 0.6 }),
  };
  triRightPair.mesh.geometry.dispose();
  triRightPair.mesh.geometry = buildTriGeo(TRI_RIGHT_DEF.base, TRI_RIGHT_DEF.triH, TRI_RIGHT_DEF.wallH);
  syncPairs.push(triRightPair);
  bumperDefs.push({ name: 'Tri Droit', body: triRightPair.body, mesh: triRightPair.mesh, ix: TRI_RIGHT_DEF.x, iy: TRI_RIGHT_DEF.y, iz: TRI_RIGHT_DEF.z, iry: TRI_RIGHT_DEF.rotY });

  return { archBody, syncPairs, bumperDefs, triangleDef, rebuildArch, archDefaults };
}
