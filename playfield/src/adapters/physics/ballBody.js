/**
 * Playfield — Body Cannon-es de la bille + launch/reset/clamp.
 */
import * as CANNON from "cannon-es";
import {
  PLUNGER_SPAWN_X,
  PLUNGER_SPAWN_Y,
  PLUNGER_SPAWN_Z,
  PLUNGER_IMPULSE_FORCE,
} from "../../domain/constants.js";
import { MATERIALS } from "./world.js";

export const BALL_RADIUS = 0.25;
const BALL_MASS = 1;
const BALL_RESTITUTION = 0.35;
const BALL_FRICTION = 0.3;
const BALL_LINEAR_DAMPING = 0.1;
const BALL_FIXED_Y = BALL_RADIUS + 0.01;
const MAX_BALL_SPEED = 25;

// Flag anti double-lancement.
let launched = false;

/**
 * Cree le body de la bille, ajoute le ContactMaterial ball<->static.
 */
export function createBallBody(world) {
  const body = new CANNON.Body({
    mass: BALL_MASS,
    shape: new CANNON.Sphere(BALL_RADIUS),
    material: MATERIALS.ball,
    linearDamping: BALL_LINEAR_DAMPING,
  });
  body.userData = { type: "ball" };
  world.addBody(body);

  world.addContactMaterial(
    new CANNON.ContactMaterial(MATERIALS.ball, MATERIALS.static, {
      friction: BALL_FRICTION,
      restitution: BALL_RESTITUTION,
    }),
  );

  resetBallBody(body);
  return body;
}

/**
 * Verrouille la bille sur le plan du plateau et plafonne sa vitesse.
 */
export function clampBallBody(body) {
  body.position.y = BALL_FIXED_Y;
  body.velocity.y = 0;

  const vx = body.velocity.x;
  const vz = body.velocity.z;
  const speed = Math.sqrt(vx * vx + vz * vz);
  if (speed > MAX_BALL_SPEED) {
    const scale = MAX_BALL_SPEED / speed;
    body.velocity.x *= scale;
    body.velocity.z *= scale;
  }
}

/**
 * Replace la bille au spawn plunger et la fige.
 */
export function resetBallBody(body) {
  body.position.set(PLUNGER_SPAWN_X, PLUNGER_SPAWN_Y, PLUNGER_SPAWN_Z);
  body.velocity.set(0, 0, 0);
  body.angularVelocity.set(0, 0, 0);
  body.force.set(0, 0, 0);
  body.torque.set(0, 0, 0);
  body.quaternion.set(0, 0, 0, 1);
  body.type = CANNON.Body.STATIC;
  body.updateMassProperties();
  body.wakeUp();
  launched = false;
}

/**
 * Lance la bille depuis le spawn plunger.
 * Retourne true si le lancement a eu lieu.
 */
export function launchBallBody(body) {
  if (launched) return false;
  body.type = CANNON.Body.DYNAMIC;
  body.updateMassProperties();
  body.wakeUp();
  body.applyImpulse(new CANNON.Vec3(0, 0, -PLUNGER_IMPULSE_FORCE));
  launched = true;
  return true;
}
