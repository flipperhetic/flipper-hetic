import {
  BALL_RADIUS,
  PLUNGER_SPAWN_X,
  PLUNGER_SPAWN_Y,
  PLUNGER_SPAWN_Z,
} from "../../../domain/constants.js";
import { getRapier } from "./init.js";
import { MATERIALS, createBodyHandle } from "./PhysicsWorld.js";

const BALL_MASS = 1;
const BALL_LINEAR_DAMPING = 0.02;
const MAX_BALL_SPEED = 45;

class BallBody {
  #rb;
  #colliders;
  #userData;
  #fixedY = PLUNGER_SPAWN_Y;

  constructor(physicsWorld) {
    const RAPIER = getRapier();
    const world = physicsWorld.world;

    const bodyDesc = RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(PLUNGER_SPAWN_X, PLUNGER_SPAWN_Y, PLUNGER_SPAWN_Z)
      .setLinearDamping(BALL_LINEAR_DAMPING)
      .setCanSleep(false);

    this.#rb = world.createRigidBody(bodyDesc);
    this.#rb.enableCcd(true);

    const colliderDesc = RAPIER.ColliderDesc.ball(BALL_RADIUS)
      .setDensity(BALL_MASS / ((4 / 3) * Math.PI * BALL_RADIUS ** 3))
      .setFriction(MATERIALS.ball.friction)
      .setRestitution(MATERIALS.ball.restitution)
      .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS);

    const collider = world.createCollider(colliderDesc, this.#rb);
    this.#userData = { type: "ball", launched: false };
    this.#colliders = [collider];

    createBodyHandle(this.#rb, { userData: this.#userData, colliders: this.#colliders });

    this.reset();
  }

  get rb() { return this.#rb; }
  get colliders() { return this.#colliders; }
  get launched() { return this.#userData.launched; }
  get userData() { return this.#userData; }

  get translation() {
    return this.#rb.translation();
  }

  get position() {
    const t = this.#rb.translation();
    return { x: t.x, y: t.y, z: t.z };
  }

  reset() {
    this.#rb.setTranslation({ x: PLUNGER_SPAWN_X, y: PLUNGER_SPAWN_Y, z: PLUNGER_SPAWN_Z }, true);
    this.#rb.setLinvel({ x: 0, y: 0, z: 0 }, true);
    this.#rb.setAngvel({ x: 0, y: 0, z: 0 }, true);
    this.#rb.setRotation({ x: 0, y: 0, z: 0, w: 1 }, true);
    this.#rb.setBodyType(2, true);
    this.#rb.wakeUp();
    this.#userData.launched = false;
  }

  launch() {
    if (this.#userData.launched) return false;
    this.#rb.setBodyType(0, true);
    // Kinematic->Dynamic can leave body massless; recompute prevents applyImpulse being a no-op.
    if (typeof this.#rb.recomputeMassPropertiesFromColliders === "function") {
      this.#rb.recomputeMassPropertiesFromColliders();
    }
    this.#rb.wakeUp();
    const zForce = 32 + Math.random() * 12;
    const xForce = 1 + Math.random() * 2;
    this.#rb.setLinvel({ x: -xForce, y: 0, z: -zForce }, true);
    this.#userData.launched = true;
    return true;
  }

  clamp() {
    const t = this.#rb.translation();
    if (t.y !== this.#fixedY) {
      this.#rb.setTranslation({ x: t.x, y: this.#fixedY, z: t.z }, true);
    }
    const v = this.#rb.linvel();
    let vx = v.x;
    let vz = v.z;
    const speed = Math.sqrt(vx * vx + vz * vz);
    if (speed > MAX_BALL_SPEED) {
      const scale = MAX_BALL_SPEED / speed;
      vx *= scale;
      vz *= scale;
    }
    this.#rb.setLinvel({ x: vx, y: 0, z: vz }, true);
  }

  applyImpulse(vec3) {
    this.#rb.applyImpulse({ x: vec3.x, y: vec3.y, z: vec3.z }, true);
  }

  setFixedY(y) {
    this.#fixedY = y;
  }
}

export default BallBody;