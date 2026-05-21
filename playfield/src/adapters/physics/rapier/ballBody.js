/**
 * Rapier — Body de la bille + launch / reset / clamp.
 */
import {
  BALL_RADIUS,
  PLUNGER_SPAWN_X,
  PLUNGER_SPAWN_Y,
  PLUNGER_SPAWN_Z,
  PLUNGER_IMPULSE_FORCE,
} from "../../../domain/constants.js";
import { getRapier } from "./init.js";
import { createBodyHandle } from "./bodyHandle.js";
import { MATERIALS } from "./world.js";

const BALL_MASS = 1;
const BALL_LINEAR_DAMPING = 0.02;
const BALL_FIXED_Y = BALL_RADIUS + 0.01;
const MAX_BALL_SPEED = 45;

export function createBallBody(world) {
  const RAPIER = getRapier();

  const bodyDesc = RAPIER.RigidBodyDesc.dynamic()
    .setTranslation(PLUNGER_SPAWN_X, PLUNGER_SPAWN_Y, PLUNGER_SPAWN_Z)
    .setLinearDamping(BALL_LINEAR_DAMPING)
    .setCanSleep(false);

  const rb = world.createRigidBody(bodyDesc);

  const colliderDesc = RAPIER.ColliderDesc.ball(BALL_RADIUS)
    .setDensity(BALL_MASS / ((4 / 3) * Math.PI * BALL_RADIUS ** 3))
    .setFriction(MATERIALS.ball.friction)
    .setRestitution(MATERIALS.ball.restitution)
    .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS);

  world.createCollider(colliderDesc, rb);

  // `launched` est porte par le body lui-meme (pas de global module).
  const handle = createBodyHandle(rb, world, { userData: { type: "ball", launched: false } });
  resetBallBody(handle);
  return handle;
}

export function clampBallBody(body) {
  const t = body.rb.translation();
  if (t.y !== BALL_FIXED_Y) {
    body.rb.setTranslation({ x: t.x, y: BALL_FIXED_Y, z: t.z }, true);
  }
  const v = body.rb.linvel();
  let vx = v.x;
  let vy = 0;
  let vz = v.z;
  const speed = Math.sqrt(vx * vx + vz * vz);
  if (speed > MAX_BALL_SPEED) {
    const scale = MAX_BALL_SPEED / speed;
    vx *= scale;
    vz *= scale;
  }
  body.rb.setLinvel({ x: vx, y: vy, z: vz }, true);
}

export function resetBallBody(body) {
  body.rb.setTranslation({ x: PLUNGER_SPAWN_X, y: PLUNGER_SPAWN_Y, z: PLUNGER_SPAWN_Z }, true);
  body.rb.setLinvel({ x: 0, y: 0, z: 0 }, true);
  body.rb.setAngvel({ x: 0, y: 0, z: 0 }, true);
  body.rb.setRotation({ x: 0, y: 0, z: 0, w: 1 }, true);
  // Fige la bille en kinematic le temps du lancement
  body.rb.setBodyType(2 /* KinematicPositionBased */, true);
  body.rb.wakeUp();
  body.userData.launched = false;
}

export function launchBallBody(body) {
  if (body.userData.launched) return false;
  body.rb.setBodyType(0 /* Dynamic */, true);
  // Force le recalcul des proprietes de masse a partir du collider :
  // sans ca, la transition Kinematic -> Dynamic peut laisser le body sans masse
  // et `applyImpulse` ne produit aucune velocite (impulse / 0 = NaN ignore).
  if (typeof body.rb.recomputeMassPropertiesFromColliders === "function") {
    body.rb.recomputeMassPropertiesFromColliders();
  }
  body.rb.wakeUp();
  // setLinvel direct (independant de la masse) plutot qu'applyImpulse :
  // garantit que la bille part meme si le recompute ci-dessus est ignore.
  // Avec BALL_MASS = 1, applyImpulse(F) ~ setLinvel(F), donc PLUNGER_IMPULSE_FORCE
  // garde sa magnitude historique.
  body.rb.setLinvel({ x: 0, y: 0, z: -PLUNGER_IMPULSE_FORCE }, true);
  body.userData.launched = true;
  return true;
}
