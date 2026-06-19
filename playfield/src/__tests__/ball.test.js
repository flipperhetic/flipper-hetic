import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../adapters/physics/rapier/PhysicsWorld.js", () => ({
  MATERIALS: {
    ball: { friction: 0.3, restitution: 0.35 },
  },
  createBodyHandle: (rb, { userData = {} } = {}) => ({
    rb,
    userData,
    position: rb._position,
  }),
  bodyHandlesByRapierHandle: new Map(),
  default: class PhysicsWorld {},
}));

vi.mock("../adapters/physics/rapier/init.js", () => {
  const fakeRapier = {
    RigidBodyDesc: {
      dynamic: () => ({
        setTranslation() { return this; },
        setLinearDamping() { return this; },
        setCanSleep() { return this; },
      }),
    },
    ColliderDesc: {
      ball: () => ({
        setDensity() { return this; },
        setFriction() { return this; },
        setRestitution() { return this; },
        setActiveEvents() { return this; },
      }),
    },
    ActiveEvents: { COLLISION_EVENTS: 1 },
  };
  return {
    initRapier: vi.fn(async () => fakeRapier),
    getRapier: () => fakeRapier,
  };
});

import BallBody from "../adapters/physics/rapier/BallBody.js";
import { PLUNGER_SPAWN_X, PLUNGER_SPAWN_Y, PLUNGER_SPAWN_Z } from "../domain/constants.js";

function makeFakeRb() {
  const state = {
    translation: { x: 0, y: 0, z: 0 },
    linvel: { x: 0, y: 0, z: 0 },
    angvel: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0, w: 1 },
    bodyType: 0,
    handle: Math.floor(Math.random() * 1e6),
  };
  return {
    _state: state,
    setTranslation: vi.fn((t) => { state.translation = { ...t }; }),
    setLinvel: vi.fn((v) => { state.linvel = { ...v }; }),
    setAngvel: vi.fn((v) => { state.angvel = { ...v }; }),
    setRotation: vi.fn((q) => { state.rotation = { ...q }; }),
    setBodyType: vi.fn((t) => { state.bodyType = t; }),
    enableCcd: vi.fn(),
    applyImpulse: vi.fn(),
    wakeUp: vi.fn(),
    translation: () => state.translation,
    linvel: () => state.linvel,
    angvel: () => state.angvel,
    rotation: () => state.rotation,
    handle: state.handle,
  };
}

function makeFakePhysicsWorld() {
  const rb = makeFakeRb();
  return {
    world: {
      createRigidBody: () => rb,
      createCollider: vi.fn(() => ({ handle: 0 })),
    },
    _rb: rb,
  };
}

function makeTestBody() {
  const pw = makeFakePhysicsWorld();
  return new BallBody(pw);
}

describe("BallBody reset", () => {
  it("1 - place le body au spawn plunger", () => {
    const body = makeTestBody();
    body.rb.setTranslation.mockClear();
    body.reset();

    expect(body.rb.setTranslation).toHaveBeenCalledWith(
      { x: PLUNGER_SPAWN_X, y: PLUNGER_SPAWN_Y, z: PLUNGER_SPAWN_Z },
      true,
    );
  });

  it("2 - remet les velocites a zero", () => {
    const body = makeTestBody();
    body.rb.setLinvel.mockClear();
    body.rb.setAngvel.mockClear();
    body.reset();

    expect(body.rb.setLinvel).toHaveBeenCalledWith({ x: 0, y: 0, z: 0 }, true);
    expect(body.rb.setAngvel).toHaveBeenCalledWith({ x: 0, y: 0, z: 0 }, true);
  });

  it("3 - fige le body en KinematicPositionBased (type 2)", () => {
    const body = makeTestBody();
    body.rb.setBodyType.mockClear();
    body.reset();

    expect(body.rb.setBodyType).toHaveBeenCalledWith(2, true);
  });
});

describe("BallBody launch", () => {
  it("4 - debloque en Dynamic (type 0) et fixe la velocite vers Z-", () => {
    const body = makeTestBody();
    body.reset();
    body.rb.setBodyType.mockClear();
    body.rb.setLinvel.mockClear();

    const result = body.launch();
    expect(result).toBe(true);
    expect(body.rb.setBodyType).toHaveBeenCalledWith(0, true);
    const lastV = body.rb.setLinvel.mock.calls.at(-1)[0];
    expect(lastV.x).toBeLessThan(0);
    expect(lastV.y).toBe(0);
    expect(lastV.z).toBeLessThan(0);
  });

  it("5 - double launch refuse", () => {
    const body = makeTestBody();
    body.reset();

    expect(body.launch()).toBe(true);
    const callsAfterFirst = body.rb.setLinvel.mock.calls.length;

    expect(body.launch()).toBe(false);
    expect(body.rb.setLinvel.mock.calls.length).toBe(callsAfterFirst);
  });

  it("6 - reset puis launch re-autorise", () => {
    const body = makeTestBody();
    body.reset();

    expect(body.launch()).toBe(true);
    body.reset();
    expect(body.launch()).toBe(true);
  });
});

describe("BallBody clamp", () => {
  it("verrouille Y a PLUNGER_SPAWN_Y quand la bille s eloigne du plateau", () => {
    const body = makeTestBody();
    body.rb._state.translation = { x: 0, y: 5, z: 0 };
    body.rb._state.linvel = { x: 3, y: 10, z: 4 };

    body.clamp();

    const lastT = body.rb.setTranslation.mock.calls.at(-1)[0];
    const lastV = body.rb.setLinvel.mock.calls.at(-1)[0];
    expect(lastT.y).toBe(PLUNGER_SPAWN_Y);
    expect(lastV.y).toBe(0);
  });

  it("plafonne la vitesse quand elle depasse le max", () => {
    const body = makeTestBody();
    body.rb._state.linvel = { x: 35, y: 0, z: 35 };

    body.clamp();

    const lastV = body.rb.setLinvel.mock.calls.at(-1)[0];
    const speed = Math.sqrt(lastV.x ** 2 + lastV.z ** 2);
    expect(speed).toBeCloseTo(45, 1);
  });

  it("ne modifie pas la vitesse XZ quand elle est sous le max", () => {
    const body = makeTestBody();
    body.rb._state.linvel = { x: 3, y: 0, z: 4 };

    body.clamp();

    const lastV = body.rb.setLinvel.mock.calls.at(-1)[0];
    expect(lastV.x).toBe(3);
    expect(lastV.z).toBe(4);
  });
});
