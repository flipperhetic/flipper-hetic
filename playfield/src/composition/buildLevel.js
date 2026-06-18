import { Mesh, BoxGeometry, MeshBasicMaterial, DoubleSide } from 'three';
import { createTableMeshes } from "../adapters/renderer/tableMesh.js";
import { setFlippersWorldRotY, createStaticBoxBody } from "../adapters/physics/index.js";
import { loadPlayfieldModel } from "../adapters/renderer/modelLoader.js";
import { buildSensors } from "./buildSensors.js";
import { buildActors } from "./buildActors.js";
import { buildGLBCollisions } from "./buildGLBCollisions.js";
import { DRAIN_Z_THRESHOLD, TABLE_WIDTH, WALL_HEIGHT } from '../domain/constants.js';
import { setDrainThreshold } from '../usecases/collisionHandler.js';

// -- Temporarily disabled: manual Rapier box bodies replaced by GLB trimesh colliders.
// import { buildWalls } from "./buildWalls.js";
// import { buildBumpers } from "./buildBumpers.js";

export async function buildLevel({ scene, world }) {
  const { scaleGroup, innerModel } = await loadPlayfieldModel();

  // Force world matrix update before extracting GLB mesh vertices for physics.
  scaleGroup.updateMatrixWorld(true);
  buildGLBCollisions(world, scaleGroup);

  // Glass ceiling — static body just above the ball (Y=0.65+radius=0.9) to block upward bounce.
  // No visible mesh: present in physics only, does not affect rendering.
  const glassMesh = new Mesh(
    new BoxGeometry(20, 0.1, 30),
    new MeshBasicMaterial({ transparent: true, opacity: 0 }),
  );
  glassMesh.visible = false;
  scene.add(glassMesh);
  glassMesh.position.set(0, 0.95, 0);
  createStaticBoxBody(world, {
    width: 20, height: 0.1, depth: 30,
    position: { x: 0, y: 0.95, z: 0 },
    type: 'table',
  });

  // tableMeshes are kept for sensor debug visuals (indices 26-29).
  const tableMeshes = createTableMeshes(scene);
  for (const m of tableMeshes) m.visible = false;

  const { ballBody, flipperBodies, launchGateBody, launchGateMesh, syncPairs: actorPairs } = buildActors(world, scene);
  const { syncPairs: sensorPairs, sensorDefs, rectMeshes } = buildSensors(world, tableMeshes, ballBody, launchGateBody, scene);

  // Launch gate — expose in debug (fake body keeps userData.closedX/Z in sync with position sliders)
  const launchGateFakeBody = {
    rb: {
      setTranslation({ x, y, z }) {
        launchGateBody.userData.closedX = x;
        launchGateBody.userData.closedZ = z;
        launchGateBody.rb.setTranslation({ x, y, z }, true);
      },
      setRotation(q) { launchGateBody.rb.setRotation(q, true); },
    },
    colliders: [{
      setHalfExtents({ x, y, z }) {
        launchGateBody.colliders[0].setHalfExtents({ x, y, z });
        launchGateMesh.geometry.dispose();
        launchGateMesh.geometry = new BoxGeometry(x * 2, y * 2, z * 2);
      },
    }],
  };
  sensorDefs.unshift({
    name: 'Launch Gate',
    body: launchGateFakeBody,
    mesh: launchGateMesh,
    ix: launchGateBody.userData.closedX,
    iy: WALL_HEIGHT / 2,
    iz: launchGateBody.userData.closedZ,
    iry: launchGateBody.userData.rotY,
    w: launchGateBody.userData.w,
    h: launchGateBody.userData.h,
    d: launchGateBody.userData.d,
  });

  // Drain zone — visual marker; drain detected by Z threshold in collisionHandler.
  // Moving the Z slider in the debug panel updates the live threshold via setDrainThreshold.
  const DRAIN_DEF = { w: TABLE_WIDTH, h: 0.75, d: 0.6 };
  const drainMesh = new Mesh(
    new BoxGeometry(DRAIN_DEF.w, DRAIN_DEF.h, DRAIN_DEF.d),
    new MeshBasicMaterial({ color: 0xff2200, transparent: true, opacity: 0.5, side: DoubleSide, depthWrite: false }),
  );
  drainMesh.position.set(-0.55, 3.95, DRAIN_Z_THRESHOLD);
  scene.add(drainMesh);

  const drainFakeBody = {
    rb: {
      setTranslation({ x, y, z }) {
        drainMesh.position.set(x, y, z);
        setDrainThreshold(z);
      },
      setRotation() {},
    },
    colliders: [{ setHalfExtents({ x, y, z }) {
      drainMesh.geometry.dispose();
      drainMesh.geometry = new BoxGeometry(x * 2, y * 2, z * 2);
    } }],
  };

  sensorDefs.push({ name: 'Drain Zone', body: drainFakeBody, mesh: drainMesh, ix: -0.55, iy: 3.95, iz: DRAIN_Z_THRESHOLD, iry: 0, w: DRAIN_DEF.w, h: DRAIN_DEF.h, d: DRAIN_DEF.d });

  const syncPairs = [...actorPairs, ...sensorPairs];

  function physicsRotateY(angleDeg) {
    setFlippersWorldRotY(flipperBodies, angleDeg * Math.PI / 180);
  }

  function setPhysicsDebugVisible(v) {
    for (let i = 26; i < 30; i++) tableMeshes[i].visible = v;
    for (const m of rectMeshes) m.visible = v;
  }

  return {
    syncPairs,
    archMesh: null,
    ballBody,
    flipperBodies,
    launchGateBody,
    gltfModel: scaleGroup,
    gltfInner: innerModel,
    physicsRotateY,
    setPhysicsDebugVisible,
    triggers: sensorDefs,
  };
}
