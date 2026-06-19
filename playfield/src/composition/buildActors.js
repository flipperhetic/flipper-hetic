import { BoxGeometry } from 'three';
import { BallBody, FlipperBody, LaunchGateBody } from "../adapters/physics/index.js";
import { createBallMesh } from "../adapters/renderer/ballMesh.js";
import { createFlipperMeshes } from "../adapters/renderer/flipperMesh.js";
import { createLaunchGateMesh } from "../adapters/renderer/launchGateMesh.js";

export function buildActors(physicsWorld, scene) {
  const syncPairs = [];

  const ballMesh = createBallMesh(scene);
  ballMesh.castShadow = true;
  const ballBody = new BallBody(physicsWorld);
  syncPairs.push({ mesh: ballMesh, body: ballBody });

  const flipperMeshes = createFlipperMeshes(scene);
  flipperMeshes.left.castShadow = true;
  flipperMeshes.right.castShadow = true;
  const flipperBodies = new FlipperBody(physicsWorld);
  syncPairs.push(
    { mesh: flipperMeshes.left,  body: flipperBodies.left.body },
    { mesh: flipperMeshes.right, body: flipperBodies.right.body },
  );

  const launchGateMesh = createLaunchGateMesh(scene);
  const launchGateBody = new LaunchGateBody(physicsWorld);
  launchGateMesh.geometry.dispose();
  launchGateMesh.geometry = new BoxGeometry(
    launchGateBody.userData.w,
    launchGateBody.userData.h,
    launchGateBody.userData.d,
  );
  syncPairs.push({ mesh: launchGateMesh, body: launchGateBody });

  return { ballBody, flipperBodies, launchGateBody, launchGateMesh, syncPairs };
}
