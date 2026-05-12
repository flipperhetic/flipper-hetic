/**
 * Rapier — Bodies des flippers (kinematic).
 *
 * Note migration : Rapier expose `KinematicPositionBased` et `KinematicVelocityBased`.
 * On utilise une approche velocity-based pour conserver un ressenti de flipper reactif.
 */
import {
  FLIPPER_LENGTH,
  FLIPPER_WIDTH,
  FLIPPER_HEIGHT,
  FLIPPER_REST_ANGLE,
  FLIPPER_PIVOT_X,
  FLIPPER_PIVOT_Z,
  FLIPPER_PIVOT_Y,
  FLIPPER_SPEED,
} from "../../../domain/constants.js";
import { getRapier } from "./init.js";
import { createBodyHandle } from "./bodyHandle.js";
import { MATERIALS } from "./world.js";

function quatFromYaw(angle) {
  const half = angle / 2;
  return { x: 0, y: Math.sin(half), z: 0, w: Math.cos(half) };
}

function angleFromQuat(q) {
  return 2 * Math.atan2(q.y, q.w);
}

function createOneFlipperBody(world, side) {
  const RAPIER = getRapier();
  const isLeft = side === "left";
  const pivotX = isLeft ? -FLIPPER_PIVOT_X : FLIPPER_PIVOT_X;
  const shapeOffsetX = isLeft ? FLIPPER_LENGTH / 2 : -FLIPPER_LENGTH / 2;

  // Note Rapier : pour un kinematicVelocityBased, l'angvel applique un spin
  // autour du **centre de masse**, pas autour du body translation. Si on
  // laisse le collider auto-calculer le COM (densite par defaut), le COM
  // tombe au milieu de la batte et la batte pivote sur son centre. On force
  // donc le COM a l'origine du body (= le pivot) via setAdditionalMassProperties,
  // et on neutralise la contribution massique du collider via setDensity(0).
  const bodyDesc = RAPIER.RigidBodyDesc.kinematicVelocityBased()
    .setTranslation(pivotX, FLIPPER_PIVOT_Y, FLIPPER_PIVOT_Z)
    .setAdditionalMassProperties(
      1,
      { x: 0, y: 0, z: 0 },
      { x: 1, y: 1, z: 1 },
      { x: 0, y: 0, z: 0, w: 1 },
    );

  const rb = world.createRigidBody(bodyDesc);

  // Box collider decalee : extension geometrique de la batte autour du pivot.
  // Densite 0 pour que le collider ne deplace pas le COM (cf. note ci-dessus).
  const colliderDesc = RAPIER.ColliderDesc.cuboid(FLIPPER_LENGTH / 2, FLIPPER_HEIGHT / 2, FLIPPER_WIDTH / 2)
    .setTranslation(shapeOffsetX, 0, 0)
    .setDensity(0)
    .setFriction(MATERIALS.flipper.friction)
    .setRestitution(MATERIALS.flipper.restitution)
    .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS);
  world.createCollider(colliderDesc, rb);

  const handle = createBodyHandle(rb, world, { userData: { type: "flipper" } });

  const restAngle = isLeft ? -FLIPPER_REST_ANGLE : FLIPPER_REST_ANGLE;
  const activeAngle = isLeft ? FLIPPER_REST_ANGLE : -FLIPPER_REST_ANGLE;

  rb.setRotation(quatFromYaw(restAngle), true);

  return { body: handle, restAngle, activeAngle, currentAngle: restAngle, active: false };
}

function preStepFlipper(flipper) {
  const target = flipper.active ? flipper.activeAngle : flipper.restAngle;
  const diff = target - flipper.currentAngle;
  if (Math.abs(diff) < 0.001) {
    flipper.body.rb.setAngvel({ x: 0, y: 0, z: 0 }, true);
    return;
  }
  flipper.body.rb.setAngvel({ x: 0, y: Math.sign(diff) * FLIPPER_SPEED, z: 0 }, true);
}

function postStepFlipper(flipper) {
  const q = flipper.body.rb.rotation();
  const angle = angleFromQuat(q);
  const minAngle = Math.min(flipper.restAngle, flipper.activeAngle);
  const maxAngle = Math.max(flipper.restAngle, flipper.activeAngle);
  const clamped = Math.max(minAngle, Math.min(maxAngle, angle));
  if (clamped !== angle) {
    flipper.body.rb.setRotation(quatFromYaw(clamped), true);
    flipper.body.rb.setAngvel({ x: 0, y: 0, z: 0 }, true);
  }
  flipper.currentAngle = clamped;
}

export function createFlipperBodies(world) {
  return {
    left: createOneFlipperBody(world, "left"),
    right: createOneFlipperBody(world, "right"),
  };
}

export function setFlipperActive(flippers, side, active) {
  flippers[side].active = active;
}

export function updateFlippers(flippers) {
  preStepFlipper(flippers.left);
  preStepFlipper(flippers.right);
}

export function postStepFlippers(flippers) {
  postStepFlipper(flippers.left);
  postStepFlipper(flippers.right);
}
