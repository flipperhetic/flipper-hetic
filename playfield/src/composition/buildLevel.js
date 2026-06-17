import { createTableMeshes } from "../adapters/renderer/tableMesh.js";
import { setFlippersWorldRotY } from "../adapters/physics/index.js";
import { loadPlayfieldModel } from "../adapters/renderer/modelLoader.js";
import { buildWalls } from "./buildWalls.js";
import { buildBumpers } from "./buildBumpers.js";
import { buildSensors } from "./buildSensors.js";
import { buildActors } from "./buildActors.js";
import { ARCH_OFFSET_X, ARCH_OFFSET_Z } from '../domain/constants.js';

export async function buildLevel({ scene, world }) {
  const gltfModel = await loadPlayfieldModel();

  const tableMeshes = createTableMeshes(scene);
  for (const m of tableMeshes) m.visible = false;

  const { wallDefs, syncPairs: wallPairs }       = buildWalls(world, tableMeshes);
  const { archBody, syncPairs: bumperPairs }      = buildBumpers(world, tableMeshes);
  const { ballBody, flipperBodies, launchGateBody, syncPairs: actorPairs } = buildActors(world, scene);
  const { syncPairs: sensorPairs }               = buildSensors(world, tableMeshes, ballBody, launchGateBody);

  const syncPairs = [...wallPairs, ...bumperPairs, ...actorPairs, ...sensorPairs];

  // Snapshot bumper starting positions so physicsTranslate can offset from origin.
  const bumperSnapshots = bumperPairs.map(p => {
    const t = p.body.rb.translation();
    return { rb: p.body.rb, x0: t.x, y0: t.y, z0: t.z };
  });

  let _rotY = 0;
  let _dx = 0, _dz = 0;

  function _applyWorldTransform() {
    const cos = Math.cos(_rotY);
    const sin = Math.sin(_rotY);
    const qy = { x: 0, y: Math.sin(_rotY / 2), z: 0, w: Math.cos(_rotY / 2) };
    for (const def of Object.values(wallDefs)) {
      def.body.rb.setTranslation({
        x: def.x * cos - def.z * sin + _dx,
        y: def.y,
        z: def.x * sin + def.z * cos + _dz,
      }, true);
      def.body.rb.setRotation(qy, true);
    }
    archBody.rb.setTranslation({
      x: ARCH_OFFSET_X * cos - ARCH_OFFSET_Z * sin + _dx,
      y: 0,
      z: ARCH_OFFSET_X * sin + ARCH_OFFSET_Z * cos + _dz,
    }, true);
    archBody.rb.setRotation(qy, true);
    for (const snap of bumperSnapshots) {
      snap.rb.setTranslation({
        x: snap.x0 * cos - snap.z0 * sin + _dx,
        y: snap.y0,
        z: snap.x0 * sin + snap.z0 * cos + _dz,
      }, true);
    }
    setFlippersWorldRotY(flipperBodies, _rotY);
  }

  function physicsRotateY(angleDeg) {
    _rotY = angleDeg * Math.PI / 180;
    _applyWorldTransform();
  }

  function physicsTranslate(dx, dz) {
    _dx = dx;
    _dz = dz;
    _applyWorldTransform();
  }

  function setPhysicsDebugVisible(v) {
    for (const m of tableMeshes) m.visible = v;
  }

  return {
    syncPairs,
    ballBody,
    flipperBodies,
    launchGateBody,
    gltfModel,
    physicsRotateY,
    physicsTranslate,
    setPhysicsDebugVisible,
  };
}
