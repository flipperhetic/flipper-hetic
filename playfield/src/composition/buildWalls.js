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
    table:           { w: 11.45,                              h: TABLE_THICKNESS, d: 29,                       x: 0,                                     y: -0.2,            z: 1.35,                                 _material: 'table', _type: 'table', _meshIdx: 0 },
    wallLeft:        { w: WALL_THICKNESS,                    h: WALL_HEIGHT,     d: 28.5,                     x: -5.4,                                  y: WALL_HEIGHT / 2, z: 1.1,                                  _meshIdx: 1 },
    wallRight:       { w: WALL_THICKNESS,                    h: WALL_HEIGHT,     d: 28.5,                     x:  5.45,                                 y: WALL_HEIGHT / 2, z: 1.1,                                  _meshIdx: 2 },
    wallTop:         { w: 11.1,                               h: WALL_HEIGHT,     d: WALL_THICKNESS,           x: 0,                                     y: WALL_HEIGHT / 2, z: -13.1,                                  _meshIdx: 3 },
    bottomLeft:      { w: 2.65,                              h: WALL_HEIGHT,     d: WALL_THICKNESS,           x: -4.2,                                  y: WALL_HEIGHT / 2, z: 12.2,                                   _meshIdx: 4 },
    bottomRight:     { w: 3.85,                              h: WALL_HEIGHT,     d: WALL_THICKNESS,           x:  3.5,                                  y: WALL_HEIGHT / 2, z: 11.9,                                   _meshIdx: 5 },
    tunnel:          { w: 0.2,                               h: WALL_HEIGHT,     d: 20,                       x: 4.1,                                   y: WALL_HEIGHT / 2, z: 3.4,                                   _meshIdx: 6 },
    glass:           { w: TABLE_WIDTH + WALL_THICKNESS * 2,  h: 0.1,             d: TABLE_DEPTH + 6,          x: 0,                                     y: 0.7,             z: 0 },
    dropBorderLeft:  { w: 0.2, h: WALL_HEIGHT, d: 5.75, x: -4.15, y: WALL_HEIGHT / 2, z: 10.55, ry:  49, _meshIdx: 8 },
    dropBorderRight: { w: 0.2, h: WALL_HEIGHT, d: 4.35, x:  2.45, y: WALL_HEIGHT / 2, z: 11.05, ry: -49, _meshIdx: 9 },
    slingshotLeftVert:  { w: 0.2,  h: WALL_HEIGHT, d: 0.95, x: -4.35, y: WALL_HEIGHT / 2, z: 6.25, ry:   0, _meshIdx: 11 },
    slingshotRightVert: { w: 0.2,  h: WALL_HEIGHT, d: 0.95, x:  3.2,  y: WALL_HEIGHT / 2, z: 6.25, ry:   0, _meshIdx: 12 },
    slingshotLeftDiag:  { w: 0.2,  h: WALL_HEIGHT, d: 2.7,  x: -3.55, y: WALL_HEIGHT / 2, z: 7.7,  ry:  42, _meshIdx: 13 },
    slingshotRightDiag: { w: 0.2,  h: WALL_HEIGHT, d: 2.7,  x:  2.3,  y: WALL_HEIGHT / 2, z: 7.7,  ry: -42, _meshIdx: 14 },
    bustGuideLeft:      { w: 0.25, h: 0.7,  d: 4.2,  x: -1.2,  y: 0.3,  z: -10.9,  ry: 0, _meshIdx: 15 },
    bustGuide2:         { w: 0.2,  h: 0.7,  d: 4.2,  x: -2.2,  y: 0.75, z: -10.75, ry: 0, _meshIdx: 16 },
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
