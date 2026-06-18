import { Vector3 } from 'three';
import { getRapier } from '../adapters/physics/rapier/init.js';
import { createBodyHandle } from '../adapters/physics/rapier/bodyHandle.js';

export function buildGLBCollisions(world, gltfScene) {
  const RAPIER = getRapier();
  gltfScene.updateMatrixWorld(true);

  let count = 0;
  const tmp = new Vector3();

  gltfScene.traverse((obj) => {
    if (!obj.isMesh) return;
    const geo = obj.geometry;
    if (!geo?.index) {
      console.warn(`[GLB collision] skipped non-indexed mesh: "${obj.name}"`);
      return;
    }

    const posAttr = geo.attributes.position;
    const verts = new Float32Array(posAttr.count * 3);
    for (let i = 0; i < posAttr.count; i++) {
      tmp.fromBufferAttribute(posAttr, i).applyMatrix4(obj.matrixWorld);
      verts[i * 3]     = tmp.x;
      verts[i * 3 + 1] = tmp.y;
      verts[i * 3 + 2] = tmp.z;
    }

    const indices = new Uint32Array(geo.index.array);
    const rb = world.createRigidBody(RAPIER.RigidBodyDesc.fixed());
    const col = world.createCollider(
      RAPIER.ColliderDesc.trimesh(verts, indices)
        .setFriction(0.15)
        .setRestitution(0.35)
        .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS),
      rb,
    );
    createBodyHandle(rb, world, { userData: { type: 'table' }, colliders: [col] });
    console.log(`[GLB collision] "${obj.name}" — ${posAttr.count} verts`);
    count++;
  });

  console.log(`[GLB collision] ${count} trimesh collider(s) created`);
}
