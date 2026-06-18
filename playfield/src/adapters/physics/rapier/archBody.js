import { getRapier } from './init.js';
import { createBodyHandle } from './bodyHandle.js';
import {
  ARCH_HALF_WIDTH, ARCH_HALF_DEPTH, ARCH_HEIGHT,
  ARCH_CENTER_Z, ARCH_SEGMENTS,
  ARCH_OFFSET_X, ARCH_OFFSET_Y, ARCH_OFFSET_Z, ARCH_ROT_Y,
} from '../../../domain/constants.js';

export function createArchBody(world, {
  halfWidth     = ARCH_HALF_WIDTH,
  halfDepth     = ARCH_HALF_DEPTH,
  height        = ARCH_HEIGHT,
  centerZ       = ARCH_CENTER_Z,
  segments      = ARCH_SEGMENTS,
  offsetX       = ARCH_OFFSET_X,
  offsetY       = ARCH_OFFSET_Y,
  offsetZ       = ARCH_OFFSET_Z,
  rotY          = ARCH_ROT_Y,
  wallThickness = 1.1,
} = {}) {
  const RAPIER = getRapier();
  const h = rotY / 2;

  const rb = world.createRigidBody(
    RAPIER.RigidBodyDesc.fixed()
      .setTranslation(offsetX, offsetY, offsetZ)
      .setRotation({ x: 0, y: Math.sin(h), z: 0, w: Math.cos(h) }),
  );

  const halfT = wallThickness / 2;
  const halfH = height / 2;
  const colliders = [];

  for (let i = 0; i < segments; i++) {
    const t0 = (i / segments - 0.5) * Math.PI;
    const t1 = ((i + 1) / segments - 0.5) * Math.PI;

    const x0 = halfWidth * Math.sin(t0);
    const z0 = centerZ - halfDepth * Math.cos(t0);
    const x1 = halfWidth * Math.sin(t1);
    const z1 = centerZ - halfDepth * Math.cos(t1);

    const cx = (x0 + x1) / 2;
    const cz = (z0 + z1) / 2;
    const dx = x1 - x0;
    const dz = z1 - z0;
    const segLen = Math.sqrt(dx * dx + dz * dz);
    const ha = Math.atan2(dx, dz) / 2;

    const col = RAPIER.ColliderDesc
      .cuboid(halfT, halfH, segLen / 2 + 0.02)
      .setTranslation(cx, halfH, cz)
      .setRotation({ x: 0, y: Math.sin(ha), z: 0, w: Math.cos(ha) })
      .setFriction(0.15)
      .setRestitution(0.35)
      .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS);

    colliders.push(world.createCollider(col, rb));
  }

  return createBodyHandle(rb, world, { userData: { type: 'arch' }, colliders });
}

export function createCylinderBody(world, {
  radius = 0.5,
  height = 1,
  x      = 0,
  y      = 0,
  z      = 0,
  rotX   = 0,
  rotY   = 0,
  type   = 'bumper',
} = {}) {
  const RAPIER = getRapier();
  const hx = rotX / 2, hy = rotY / 2;
  const sx = Math.sin(hx), cx = Math.cos(hx), sy = Math.sin(hy), cy = Math.cos(hy);
  const rb = world.createRigidBody(
    RAPIER.RigidBodyDesc.fixed()
      .setTranslation(x, y, z)
      .setRotation({ x: cy * sx, y: sy * cx, z: -sy * sx, w: cy * cx }),
  );
  const col = RAPIER.ColliderDesc
    .cylinder(height / 2, radius)
    .setFriction(0.15)
    .setRestitution(0.6)
    .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS);
  return createBodyHandle(rb, world, { userData: { type }, colliders: [world.createCollider(col, rb)] });
}

export function createDiamondBody(world, {
  base  = 2,
  triH  = 1.5,
  wallH = 0.9,
  x     = 0,
  y     = 0,
  z     = 0,
  rotY  = 0,
  type  = 'bumper-diamond',
} = {}) {
  const RAPIER = getRapier();
  const h = rotY / 2;
  const rb = world.createRigidBody(
    RAPIER.RigidBodyDesc.fixed()
      .setTranslation(x, y, z)
      .setRotation({ x: 0, y: Math.sin(h), z: 0, w: Math.cos(h) }),
  );
  const pts = new Float32Array([
    -base / 2, 0,      0,
     base / 2, 0,      0,
     0,        0,      triH / 2,
     0,        0,     -triH / 2,
    -base / 2, wallH,  0,
     base / 2, wallH,  0,
     0,        wallH,  triH / 2,
     0,        wallH, -triH / 2,
  ]);
  const col = RAPIER.ColliderDesc
    .convexHull(pts)
    .setFriction(0.15)
    .setRestitution(0.6)
    .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS);
  return createBodyHandle(rb, world, { userData: { type }, colliders: [world.createCollider(col, rb)] });
}

export function createTriangleBody(world, {
  base        = 4,
  triH        = 4,
  wallH       = 1,
  x           = 3,
  y           = 0,
  z           = 0,
  rotY        = 0,
  type        = 'triangle',
  restitution = 0.35,
} = {}) {
  const RAPIER = getRapier();
  const h = rotY / 2;
  const rb = world.createRigidBody(
    RAPIER.RigidBodyDesc.fixed()
      .setTranslation(x, y, z)
      .setRotation({ x: 0, y: Math.sin(h), z: 0, w: Math.cos(h) }),
  );
  const pts = new Float32Array([
    -base / 2, 0,     triH / 2,
     base / 2, 0,     triH / 2,
     0,        0,    -triH / 2,
    -base / 2, wallH, triH / 2,
     base / 2, wallH, triH / 2,
     0,        wallH, -triH / 2,
  ]);
  const col = RAPIER.ColliderDesc
    .convexHull(pts)
    .setFriction(0.15)
    .setRestitution(restitution)
    .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS);
  return createBodyHandle(rb, world, { userData: { type }, colliders: [world.createCollider(col, rb)] });
}
