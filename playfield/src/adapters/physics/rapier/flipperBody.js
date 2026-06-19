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
  FLIPPER_OFFSET_X,
  FLIPPER_ROT_X,
  FLIPPER_ROT_Z,
  FLIPPER_SPEED,
} from "../../../domain/constants.js";
import { getRapier } from "./init.js";
import { createBodyHandle } from "./bodyHandle.js";
import { MATERIALS } from "./world.js";

function quatFromYaw(angle) {
  const half = angle / 2;
  return { x: 0, y: Math.sin(half), z: 0, w: Math.cos(half) };
}

function quatFromAxisAngle(ax, ay, az, angle) {
  const h = angle / 2, s = Math.sin(h);
  return { x: ax * s, y: ay * s, z: az * s, w: Math.cos(h) };
}

function multiplyQuat(a, b) {
  return {
    x: a.w * b.x + a.x * b.w + a.y * b.z - a.z * b.y,
    y: a.w * b.y - a.x * b.z + a.y * b.w + a.z * b.x,
    z: a.w * b.z + a.x * b.y - a.y * b.x + a.z * b.w,
    w: a.w * b.w - a.x * b.x - a.y * b.y - a.z * b.z,
  };
}

function composeFlipperRot(yaw, rotX, rotZ) {
  return multiplyQuat(
    multiplyQuat(quatFromYaw(yaw), quatFromAxisAngle(1, 0, 0, rotX)),
    quatFromAxisAngle(0, 0, 1, rotZ),
  );
}

// Quaternion de la composante "inclinaison" (rotX ∘ rotZ), sans le yaw.
// Utilisé pour extraire le yaw pur depuis la rotation composée.
function qTiltFrom(rotX, rotZ) {
  return multiplyQuat(quatFromAxisAngle(1, 0, 0, rotX), quatFromAxisAngle(0, 0, 1, rotZ));
}

function createOneFlipperBody(world, side) {
  const RAPIER = getRapier();
  const isLeft = side === "left";
  const pivotX = (isLeft ? -FLIPPER_PIVOT_X : FLIPPER_PIVOT_X) + FLIPPER_OFFSET_X;
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
  // CCD : la batte balaie vite (bout ~30 u/s) -> sans CCD elle traverse la bille
  // en un pas physique. Active le sweep continu du flipper (la bille a deja CCD).
  rb.enableCcd(true);

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

  rb.setRotation(composeFlipperRot(restAngle, FLIPPER_ROT_X, FLIPPER_ROT_Z), true);

  const qTilt = qTiltFrom(FLIPPER_ROT_X, FLIPPER_ROT_Z);
  return { body: handle, restAngle, activeAngle, currentAngle: restAngle, active: false, rotX: FLIPPER_ROT_X, rotZ: FLIPPER_ROT_Z, qTilt };
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
  // q = q_yaw * q_tilt → isoler q_yaw en multipliant par l'inverse de q_tilt
  const qtInv = { x: -flipper.qTilt.x, y: -flipper.qTilt.y, z: -flipper.qTilt.z, w: flipper.qTilt.w };
  const qYaw = multiplyQuat(q, qtInv);
  const angle = 2 * Math.atan2(qYaw.y, qYaw.w);
  const minAngle = Math.min(flipper.restAngle, flipper.activeAngle);
  const maxAngle = Math.max(flipper.restAngle, flipper.activeAngle);
  const clamped = Math.max(minAngle, Math.min(maxAngle, angle));
  // Recomposer à chaque frame pour éviter la dérive de l'inclinaison sous angvel monde-Y.
  flipper.body.rb.setRotation(composeFlipperRot(clamped, flipper.rotX, flipper.rotZ), true);
  if (clamped !== angle) {
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

// Rotates both flipper bodies around world Y by thetaRad, preserving relative rest/active angles.
export function setFlippersWorldRotY(flippers, thetaRad) {
  const cos = Math.cos(thetaRad);
  const sin = Math.sin(thetaRad);
  for (const [side, flipper] of Object.entries(flippers)) {
    const isLeft = side === 'left';
    const origX = (isLeft ? -FLIPPER_PIVOT_X : FLIPPER_PIVOT_X) + FLIPPER_OFFSET_X;
    flipper.body.rb.setTranslation({
      x: origX * cos - FLIPPER_PIVOT_Z * sin,
      y: FLIPPER_PIVOT_Y,
      z: origX * sin + FLIPPER_PIVOT_Z * cos,
    }, true);
    const origRest   = isLeft ? -FLIPPER_REST_ANGLE :  FLIPPER_REST_ANGLE;
    const origActive = isLeft ?  FLIPPER_REST_ANGLE : -FLIPPER_REST_ANGLE;
    flipper.restAngle    = origRest   + thetaRad;
    flipper.activeAngle  = origActive + thetaRad;
    flipper.currentAngle = flipper.restAngle;
    flipper.body.rb.setRotation(composeFlipperRot(flipper.restAngle, flipper.rotX, flipper.rotZ), true);
    flipper.body.rb.setAngvel({ x: 0, y: 0, z: 0 }, true);
  }
}
