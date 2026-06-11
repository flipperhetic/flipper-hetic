/**
 * Rapier — Monde + bodies statiques + sync mesh/body + bus collision.
 *
 * Equivalents Cannon-es :
 *   - createPhysicsWorld()       -> RAPIER.World avec gravite inclinee
 *   - createStaticBoxBody()      -> RigidBodyDesc.fixed() + ColliderDesc.cuboid()
 *   - syncMeshesWithBodies()     -> idem (lit body.rb.translation/rotation)
 *
 * Specifique Rapier :
 *   - world.step() draine l'EventQueue et notifie les listeners enregistres
 *     via world.addCollisionListener(cb). Un seul wrap, pas de monkey-patch
 *     en cascade depuis collisionListener.js.
 *
 * Cf. ports/PhysicsPort.js pour le contrat.
 */
import { getRapier } from "./init.js";
import { createBodyHandle } from "./bodyHandle.js";
import { PLAYFIELD_VIEW_DEFAULTS } from "../../../domain/viewConfig.js";

const TILT_DEG = PLAYFIELD_VIEW_DEFAULTS.gravityTiltDeg;
const GRAVITY = PLAYFIELD_VIEW_DEFAULTS.gravityMagnitude;

export const FIXED_TIME_STEP = 1 / 120;
export const MAX_SUB_STEPS = 10; // Rapier n'a pas de substeps natifs ; on garde la constante pour le port

/**
 * Materiaux : Rapier n'a pas de "Material" objet partage. Friction/restitution
 * sont definies par Collider. On centralise les coefficients ici, chaque body
 * lit `MATERIALS.<name>.friction` / `.restitution` pour rester coherent.
 */
export const MATERIALS = {
  ball: { name: "ball", friction: 0.15, restitution: 0.35 },
  static: { name: "static", friction: 0.15, restitution: 0.35 },
  table: { name: "table", friction: 0.1, restitution: 0.2 },
  flipper: { name: "flipper", friction: 0.2, restitution: 0.85 },
  bumper: { name: "bumper", friction: 0.1, restitution: 0.9 },
};

export function applyPhysicsGravity(world, tiltDeg = TILT_DEG, magnitude = GRAVITY) {
  const tilt = (tiltDeg * Math.PI) / 180;
  world.gravity = {
    x: 0,
    y: -magnitude * Math.cos(tilt),
    z: magnitude * Math.sin(tilt),
  };
}

export function createPhysicsWorld() {
  const RAPIER = getRapier();
  const tilt = (TILT_DEG * Math.PI) / 180;
  const world = new RAPIER.World({
    x: 0,
    y: -GRAVITY * Math.cos(tilt),
    z: GRAVITY * Math.sin(tilt),
  });
  world.timestep = FIXED_TIME_STEP;

  // EventQueue + bus de listeners centralises (ferme dans la closure du wrap).
  const eventQueue = new RAPIER.EventQueue(true);
  const collisionListeners = [];

  // Wrap unique de step : signature Cannon-compat (dt, delta, maxSubSteps),
  // Rapier ignore les 2 derniers. Apres step, draine l'EventQueue et notifie.
  const rawStep = world.step.bind(world);
  world.step = (_fixedTimeStep, _delta, _maxSubSteps) => {
    rawStep(eventQueue);
    eventQueue.drainCollisionEvents((h1, h2, started) => {
      if (!started) return;
      for (const listener of collisionListeners) {
        listener(h1, h2, world);
      }
    });
  };

  world.addCollisionListener = (cb) => {
    collisionListeners.push(cb);
  };

  return world;
}

export function createStaticBoxBody(world, { width, height, depth, position, material, type = "wall", rotation }) {
  const RAPIER = getRapier();
  const mat = MATERIALS[material] || MATERIALS.static;

  const bodyDesc = RAPIER.RigidBodyDesc.fixed()
    .setTranslation(position.x, position.y, position.z);

  if (rotation) {
    bodyDesc.setRotation(rotation);
  }

  const rb = world.createRigidBody(bodyDesc);

  const colliderDesc = RAPIER.ColliderDesc.cuboid(width / 2, height / 2, depth / 2)
    .setFriction(mat.friction)
    .setRestitution(mat.restitution)
    .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS);

  const collider = world.createCollider(colliderDesc, rb);

  return createBodyHandle(rb, world, {
    userData: { type },
    colliders: [collider],
  });
}

export function createSensorBoxBody(world, { width, height, depth, position, rotation, type = "sensor" }) {
  const RAPIER = getRapier();
  const bodyDesc = RAPIER.RigidBodyDesc.fixed().setTranslation(position.x, position.y, position.z);
  if (rotation) bodyDesc.setRotation(rotation);
  const rb = world.createRigidBody(bodyDesc);
  const collider = world.createCollider(
    RAPIER.ColliderDesc.cuboid(width / 2, height / 2, depth / 2)
      .setSensor(true)
      .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS),
    rb,
  );
  return createBodyHandle(rb, world, { userData: { type }, colliders: [collider] });
}

export function syncMeshesWithBodies(pairs) {
  for (const { mesh, body } of pairs) {
    const t = body.rb.translation();
    const q = body.rb.rotation();
    mesh.position.set(t.x, t.y, t.z);
    mesh.quaternion.set(q.x, q.y, q.z, q.w);
  }
}
