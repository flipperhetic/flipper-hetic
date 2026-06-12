import { createTableMeshes } from "../adapters/renderer/tableMesh.js";
import { setFlippersWorldRotY } from "../adapters/physics/index.js";
import { loadPlayfieldModel } from "../adapters/renderer/modelLoader.js";
import { buildWalls } from "./buildWalls.js";
import { buildBumpers } from "./buildBumpers.js";
import { buildSensors } from "./buildSensors.js";
import { buildActors } from "./buildActors.js";

export async function buildLevel({ scene, world }) {
  const gltfModel = await loadPlayfieldModel();

  const tableMeshes = createTableMeshes(scene);
  for (const m of tableMeshes) m.visible = false;

  const { wallDefs, syncPairs: wallPairs }       = buildWalls(world, tableMeshes);
  const { archBody, syncPairs: bumperPairs }      = buildBumpers(world, tableMeshes);
  const { ballBody, flipperBodies, launchGateBody, syncPairs: actorPairs } = buildActors(world, scene);
  const { syncPairs: sensorPairs }               = buildSensors(world, tableMeshes, ballBody, launchGateBody);

  const syncPairs = [...wallPairs, ...bumperPairs, ...actorPairs, ...sensorPairs];

  function physicsRotateY(angleDeg) {
    const theta = angleDeg * Math.PI / 180;
    const cos = Math.cos(theta);
    const sin = Math.sin(theta);
    const qy = { x: 0, y: Math.sin(theta / 2), z: 0, w: Math.cos(theta / 2) };
    for (const def of Object.values(wallDefs)) {
      def.body.rb.setTranslation({ x: def.x * cos - def.z * sin, y: def.y, z: def.x * sin + def.z * cos }, true);
      def.body.rb.setRotation(qy, true);
    }
    archBody.rb.setTranslation({ x: 0, y: 0, z: 0 }, true);
    archBody.rb.setRotation(qy, true);
    setFlippersWorldRotY(flipperBodies, theta);
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
    setPhysicsDebugVisible,
  };
}
