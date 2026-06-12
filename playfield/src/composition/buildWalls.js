import { BoxGeometry, Quaternion, Euler } from 'three';
import {
  TABLE_WIDTH, TABLE_DEPTH, TABLE_THICKNESS,
  WALL_HEIGHT, WALL_THICKNESS, TUNNEL_WALL_X,
} from "../domain/constants.js";
import { createStaticBoxBody } from "../adapters/physics/index.js";

const DEG = Math.PI / 180;

export function buildWalls(world, tableMeshes) {
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
    table:           { w: TABLE_WIDTH,                       h: TABLE_THICKNESS, d: TABLE_DEPTH,              x: 0,                                     y: -0.3,            z: 0,                                    _material: 'table', _type: 'table', _meshIdx: 0 },
    wallLeft:        { w: WALL_THICKNESS,                    h: WALL_HEIGHT,     d: TABLE_DEPTH,              x: -TABLE_WIDTH / 2 - WALL_THICKNESS / 2, y: WALL_HEIGHT / 2, z: 0,                                    _meshIdx: 1 },
    wallRight:       { w: WALL_THICKNESS,                    h: WALL_HEIGHT,     d: TABLE_DEPTH,              x:  TABLE_WIDTH / 2 + WALL_THICKNESS / 2, y: WALL_HEIGHT / 2, z: 0,                                    _meshIdx: 2 },
    wallTop:         { w: TABLE_WIDTH + WALL_THICKNESS * 2,  h: WALL_HEIGHT,     d: WALL_THICKNESS,           x: 0,                                     y: WALL_HEIGHT / 2, z: -TABLE_DEPTH / 2 - WALL_THICKNESS / 2, _meshIdx: 3 },
    bottomLeft:      { w: 2.65,                              h: WALL_HEIGHT,     d: WALL_THICKNESS,           x: -3.7,                                  y: WALL_HEIGHT / 2, z: TABLE_DEPTH / 2 + WALL_THICKNESS / 2,  _meshIdx: 4 },
    bottomRight:     { w: 3.45,                              h: WALL_HEIGHT,     d: WALL_THICKNESS,           x:  2.975,                                y: WALL_HEIGHT / 2, z: TABLE_DEPTH / 2 + WALL_THICKNESS / 2,  _meshIdx: 5 },
    tunnel:          { w: WALL_THICKNESS,                    h: WALL_HEIGHT,     d: 9.75,                     x: TUNNEL_WALL_X,                         y: WALL_HEIGHT / 2, z: 1.65,                                  _meshIdx: 6 },
    glass:           { w: TABLE_WIDTH + WALL_THICKNESS * 2,  h: 0.1,             d: TABLE_DEPTH + 6,          x: 0,                                     y: 0.7,             z: 0 },
    dropBorderLeft:  { w: WALL_THICKNESS, h: WALL_HEIGHT, d: 3.95, x: -3.05, y: WALL_HEIGHT / 2, z: 6.3,  ry:  60, _meshIdx: 8 },
    dropBorderRight: { w: WALL_THICKNESS, h: WALL_HEIGHT, d: 3.95, x:  1.9,  y: WALL_HEIGHT / 2, z: 6.3,  ry: -60, _meshIdx: 9 },
    slingshotLeftVert:  { w: 0.2,  h: WALL_HEIGHT, d: 0.7,  x: -3.85, y: WALL_HEIGHT / 2, z: 3.6, ry:   0, _meshIdx: 11 },
    slingshotRightVert: { w: 0.15, h: WALL_HEIGHT, d: 0.65, x:  2.75, y: WALL_HEIGHT / 2, z: 3.5, ry:   0, _meshIdx: 12 },
    slingshotLeftDiag:  { w: 0.2,  h: WALL_HEIGHT, d: 1.95, x: -3.05, y: WALL_HEIGHT / 2, z: 4.4, ry:  56, _meshIdx: 13 },
    slingshotRightDiag: { w: 0.2,  h: WALL_HEIGHT, d: 1.95, x:  1.95, y: WALL_HEIGHT / 2, z: 4.4, ry: -56, _meshIdx: 14 },
    bustGuideLeft:      { w: 0.25, h: 0.7,  d: 2.05, x: -1.1,  y: 0.3,  z: -5.15, ry: 0, _meshIdx: 15 },
    bustGuide2:         { w: 0.2,  h: 1.55, d: 0.95, x: -1.95, y: 0.75, z: -4.6,  ry: 0, _meshIdx: 16 },
  };

  const syncPairs = [];

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

  return { wallDefs, syncPairs };
}
