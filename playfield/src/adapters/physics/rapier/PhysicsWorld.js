import { getRapier } from "./init.js";
import { PLAYFIELD_VIEW_DEFAULTS } from "../../../domain/viewConfig.js";

const TILT_DEG = PLAYFIELD_VIEW_DEFAULTS.gravityTiltDeg;
const GRAVITY = PLAYFIELD_VIEW_DEFAULTS.gravityMagnitude;

export const FIXED_TIME_STEP = 1 / 60;
export const MAX_SUB_STEPS = 10;

const MATERIALS = {
  ball:    { name: "ball",    friction: 0.15, restitution: 0.35 },
  static:  { name: "static",  friction: 0.15, restitution: 0.35 },
  table:   { name: "table",   friction: 0.1,  restitution: 0.2  },
  flipper: { name: "flipper", friction: 0.2,  restitution: 0.85 },
  bumper:  { name: "bumper",  friction: 0.1,  restitution: 0.9  },
};

const bodyHandlesByRapierHandle = new Map();

function createBodyHandle(rb, { userData = {}, colliders = [] } = {}) {
  const handle = {
    rb,
    colliders,
    userData,
    position: {
      get x() { return rb.translation().x; },
      get y() { return rb.translation().y; },
      get z() { return rb.translation().z; },
    },
    applyImpulse(vec3) {
      rb.applyImpulse({ x: vec3.x, y: vec3.y, z: vec3.z }, true);
    },
  };
  bodyHandlesByRapierHandle.set(rb.handle, handle);
  return handle;
}

class PhysicsWorld {
  #world;
  #eventQueue;
  #collisionListeners = [];

  constructor() {
    const RAPIER = getRapier();
    const tilt = (TILT_DEG * Math.PI) / 180;
    this.#world = new RAPIER.World({
      x: 0,
      y: -GRAVITY * Math.cos(tilt),
      z: GRAVITY * Math.sin(tilt),
    });
    this.#world.timestep = FIXED_TIME_STEP;
    this.#eventQueue = new RAPIER.EventQueue(true);
  }

  get world() {
    return this.#world;
  }

  setGravity(tiltDeg, magnitude) {
    const tilt = (tiltDeg * Math.PI) / 180;
    this.#world.gravity = {
      x: 0,
      y: -magnitude * Math.cos(tilt),
      z: magnitude * Math.sin(tilt),
    };
  }

  createStaticBox({ width, height, depth, position, rotation, material, type = "wall" }) {
    const RAPIER = getRapier();
    const mat = MATERIALS[material] || MATERIALS.static;
    const bodyDesc = RAPIER.RigidBodyDesc.fixed()
      .setTranslation(position.x, position.y, position.z);
    if (rotation) bodyDesc.setRotation(rotation);
    const rb = this.#world.createRigidBody(bodyDesc);
    const collider = this.#world.createCollider(
      RAPIER.ColliderDesc.cuboid(width / 2, height / 2, depth / 2)
        .setFriction(mat.friction)
        .setRestitution(mat.restitution)
        .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS),
      rb,
    );
    return createBodyHandle(rb, { userData: { type }, colliders: [collider] });
  }

  createSensor({ width, height, depth, position, rotation, type = "sensor" }) {
    const RAPIER = getRapier();
    const bodyDesc = RAPIER.RigidBodyDesc.fixed()
      .setTranslation(position.x, position.y, position.z);
    if (rotation) bodyDesc.setRotation(rotation);
    const rb = this.#world.createRigidBody(bodyDesc);
    const collider = this.#world.createCollider(
      RAPIER.ColliderDesc.cuboid(width / 2, height / 2, depth / 2)
        .setSensor(true)
        .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS),
      rb,
    );
    return createBodyHandle(rb, { userData: { type }, colliders: [collider] });
  }

  addCollisionListener(fn) {
    this.#collisionListeners.push(fn);
  }

  getCollider(handle) {
    return this.#world.getCollider(handle);
  }

  getBodyByHandle(rb) {
    return bodyHandlesByRapierHandle.get(rb.handle);
  }

  step() {
    this.#world.step(this.#eventQueue);
    this.#eventQueue.drainCollisionEvents((h1, h2, started) => {
      if (!started) return;
      for (const listener of this.#collisionListeners) {
        listener(h1, h2, this.#world);
      }
    });
  }
}

export function syncMeshesWithBodies(pairs) {
  for (const { mesh, body } of pairs) {
    const t = body.rb.translation();
    const q = body.rb.rotation();
    mesh.position.set(t.x, t.y, t.z);
    mesh.quaternion.set(q.x, q.y, q.z, q.w);
  }
}

export { MATERIALS, bodyHandlesByRapierHandle, createBodyHandle };
export default PhysicsWorld;
