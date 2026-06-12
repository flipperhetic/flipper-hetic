import { BoxGeometry } from 'three';
import {
  createBallBody,
  createFlipperBodies,
  createLaunchGateBody,
} from "../adapters/physics/index.js";
import { createBallMesh } from "../adapters/renderer/ballMesh.js";
import { createFlipperMeshes } from "../adapters/renderer/flipperMesh.js";
import { createLaunchGateMesh } from "../adapters/renderer/launchGateMesh.js";

export function buildActors(world, scene) {
  const syncPairs = [];

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

  return { ballBody, flipperBodies, launchGateBody, syncPairs };
}
