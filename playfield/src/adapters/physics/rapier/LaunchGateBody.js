import { WALL_HEIGHT } from "../../../domain/constants.js";
import { getRapier } from "./init.js";
import { MATERIALS, createBodyHandle } from "./PhysicsWorld.js";

const GATE_X        = 4;
const GATE_Z        = -8.75;
const GATE_W        = 5.7;
const GATE_H        = 1;
const GATE_D        = 0.35;
const GATE_ROTY_DEG = 90;
const GATE_Y_CLOSED = WALL_HEIGHT / 2;
const GATE_Y_OPEN   = -10;

class LaunchGateBody {
  #rb;
  #colliders;
  #userData;

  constructor(physicsWorld) {
    const RAPIER = getRapier();
    const world = physicsWorld.world;

    const rotRad = GATE_ROTY_DEG * Math.PI / 180;
    const h = rotRad / 2;
    this.#rb = world.createRigidBody(
      RAPIER.RigidBodyDesc.kinematicPositionBased()
        .setTranslation(GATE_X, GATE_Y_OPEN, GATE_Z)
        .setRotation({ x: 0, y: Math.sin(h), z: 0, w: Math.cos(h) }),
    );

    const collider = world.createCollider(
      RAPIER.ColliderDesc.cuboid(GATE_W / 2, GATE_H / 2, GATE_D / 2)
        .setFriction(MATERIALS.static.friction)
        .setRestitution(MATERIALS.static.restitution),
      this.#rb,
    );

    this.#userData = {
      type: "launch_gate", state: "open",
      closedX: GATE_X, closedZ: GATE_Z,
      w: GATE_W, h: GATE_H, d: GATE_D, rotY: GATE_ROTY_DEG,
    };
    this.#colliders = [collider];

    createBodyHandle(this.#rb, { userData: this.#userData, colliders: this.#colliders });
  }

  get rb()       { return this.#rb; }
  get colliders(){ return this.#colliders; }
  get userData() { return this.#userData; }

  open() {
    this.#userData.pendingCloseAt = undefined;
    this.#rb.setTranslation({ x: this.#userData.closedX, y: GATE_Y_OPEN, z: this.#userData.closedZ }, true);
    this.#userData.state = "open";
  }

  close() {
    this.#rb.setTranslation({ x: this.#userData.closedX, y: GATE_Y_CLOSED, z: this.#userData.closedZ }, true);
    this.#userData.state = "closed";
  }

  update(ballZ) {
    if (this.#userData.state !== "open") return;
    const triggerZ = this.#userData.closedZ - this.#userData.d / 2;
    if (ballZ < triggerZ && this.#userData.pendingCloseAt === undefined) {
      this.#userData.pendingCloseAt = performance.now() + 140;
    }
    if (this.#userData.pendingCloseAt !== undefined && performance.now() >= this.#userData.pendingCloseAt) {
      this.#userData.pendingCloseAt = undefined;
      this.close();
    }
  }
}

export default LaunchGateBody;