/**
 * Playfield ��� Bodies Cannon-es des flippers + logique de rotation.
 */
import * as CANNON from "cannon-es";
import {
  FLIPPER_LENGTH,
  FLIPPER_WIDTH,
  FLIPPER_HEIGHT,
  FLIPPER_REST_ANGLE,
  FLIPPER_PIVOT_X,
  FLIPPER_PIVOT_Z,
  FLIPPER_PIVOT_Y,
  FLIPPER_SPEED,
} from "../../domain/constants.js";
import { MATERIALS } from "./world.js";

function createOneFlipperBody(world, side) {
  const isLeft = side === "left";
  const pivotX = isLeft ? -FLIPPER_PIVOT_X : FLIPPER_PIVOT_X;
  const shapeOffsetX = isLeft ? FLIPPER_LENGTH / 2 : -FLIPPER_LENGTH / 2;

  const body = new CANNON.Body({
    mass: 0,
    type: CANNON.Body.KINEMATIC,
    material: MATERIALS.flipper,
  });
  const shape = new CANNON.Box(
    new CANNON.Vec3(FLIPPER_LENGTH / 2, FLIPPER_HEIGHT / 2, FLIPPER_WIDTH / 2),
  );
  body.addShape(shape, new CANNON.Vec3(shapeOffsetX, 0, 0));
  body.position.set(pivotX, FLIPPER_PIVOT_Y, FLIPPER_PIVOT_Z);
  body.userData = { type: "flipper" };
  world.addBody(body);

  const restAngle = isLeft ? -FLIPPER_REST_ANGLE : FLIPPER_REST_ANGLE;
  const activeAngle = isLeft ? FLIPPER_REST_ANGLE : -FLIPPER_REST_ANGLE;

  return { body, restAngle, activeAngle, currentAngle: restAngle, active: false };
}

function preStepFlipper(flipper) {
  const target = flipper.active ? flipper.activeAngle : flipper.restAngle;
  const diff = target - flipper.currentAngle;

  if (Math.abs(diff) < 0.001) {
    flipper.body.angularVelocity.set(0, 0, 0);
    return;
  }

  flipper.body.angularVelocity.set(0, Math.sign(diff) * FLIPPER_SPEED, 0);
}

function postStepFlipper(flipper) {
  const q = flipper.body.quaternion;
  let angle = 2 * Math.atan2(q.y, q.w);

  const minAngle = Math.min(flipper.restAngle, flipper.activeAngle);
  const maxAngle = Math.max(flipper.restAngle, flipper.activeAngle);
  const clamped = Math.max(minAngle, Math.min(maxAngle, angle));

  if (clamped !== angle) {
    const cq = new CANNON.Quaternion();
    cq.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), clamped);
    flipper.body.quaternion.copy(cq);
    flipper.body.angularVelocity.set(0, 0, 0);
  }

  flipper.currentAngle = clamped;
}

// ── API publique ──────────────────────────────────────

export function createFlipperBodies(world) {
  const left = createOneFlipperBody(world, "left");
  const right = createOneFlipperBody(world, "right");

  world.addContactMaterial(
    new CANNON.ContactMaterial(MATERIALS.flipper, MATERIALS.ball, {
      friction: 0.3,
      restitution: 0.8,
    }),
  );

  for (const f of [left, right]) {
    const q = new CANNON.Quaternion();
    q.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), f.restAngle);
    f.body.quaternion.copy(q);
  }

  return { left, right };
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
