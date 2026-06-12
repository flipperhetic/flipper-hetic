/**
 * Tests unitaires — playfield/src/adapters/physics/rapier/ballBody.js
 *
 * Couvre : resetBallBody, launchBallBody, clampBallBody, anti-double-launch.
 * Rapier (`@dimforge/rapier3d-compat`) est mocke via init.js + world fake.
 *
 * Codes Rapier RigidBodyType :
 *   - 0 = Dynamic
 *   - 2 = KinematicPositionBased
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock world.js : ballBody.js importe MATERIALS depuis ce module.
vi.mock("../adapters/physics/rapier/world.js", () => ({
  MATERIALS: {
    ball: { friction: 0.3, restitution: 0.35 },
  },
}));

// Mock Rapier — uniquement les primitives utilisees par ballBody.js
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

// Mock du wrapper bodyHandle pour qu'il expose directement `rb` sans Proxy.
// `userData` est partage entre createBodyHandle et le caller (createBallBody)
// pour que `body.userData.launched` soit accessible et mutable cote test.
vi.mock("../adapters/physics/rapier/bodyHandle.js", () => ({
  createBodyHandle: (rb, world, { userData = {} } = {}) => ({
    rb,
    world,
    userData,
    position: rb._position,
  }),
  bodyHandlesByRapierHandle: new Map(),
}));

import {
  resetBallBody,
  launchBallBody,
  clampBallBody,
  createBallBody,
} from "../adapters/physics/rapier/ballBody.js";
import { BALL_RADIUS } from "../domain/constants.js";

function makeFakeRb() {
  const state = {
    translation: { x: 0, y: 0, z: 0 },
    linvel: { x: 0, y: 0, z: 0 },
    angvel: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0, w: 1 },
    bodyType: 0,
    handle: Math.floor(Math.random() * 1e6),
  };
  const rb = {
    _state: state,
    setTranslation: vi.fn((t) => { state.translation = { ...t }; }),
    setLinvel: vi.fn((v) => { state.linvel = { ...v }; }),
    setAngvel: vi.fn((v) => { state.angvel = { ...v }; }),
    setRotation: vi.fn((q) => { state.rotation = { ...q }; }),
    setBodyType: vi.fn((t) => { state.bodyType = t; }),
    applyImpulse: vi.fn(),
    wakeUp: vi.fn(),
    translation: () => state.translation,
    linvel: () => state.linvel,
    angvel: () => state.angvel,
    rotation: () => state.rotation,
    handle: state.handle,
  };
  return rb;
}

function makeFakeWorld() {
  return {
    createRigidBody: () => makeFakeRb(),
    createCollider: vi.fn(),
  };
}

function makeTestBody() {
  return createBallBody(makeFakeWorld());
}

describe("resetBallBody", () => {
  it("1 — place le body au spawn plunger", () => {
    const body = makeTestBody();
    body.rb.setTranslation.mockClear();
    resetBallBody(body);

    expect(body.rb.setTranslation).toHaveBeenCalledWith(
      { x: 4.2, y: 0.26, z: 6.05 },
      true,
    );
  });

  it("2 — remet les velocites a zero", () => {
    const body = makeTestBody();
    body.rb.setLinvel.mockClear();
    body.rb.setAngvel.mockClear();
    resetBallBody(body);

    expect(body.rb.setLinvel).toHaveBeenCalledWith({ x: 0, y: 0, z: 0 }, true);
    expect(body.rb.setAngvel).toHaveBeenCalledWith({ x: 0, y: 0, z: 0 }, true);
  });

  it("3 — fige le body en KinematicPositionBased (type 2)", () => {
    const body = makeTestBody();
    body.rb.setBodyType.mockClear();
    resetBallBody(body);

    expect(body.rb.setBodyType).toHaveBeenCalledWith(2, true);
  });
});

describe("launchBallBody", () => {
  it("4 — debloque en Dynamic (type 0) et fixe la velocite vers Z-", () => {
    const body = makeTestBody();
    resetBallBody(body);
    body.rb.setBodyType.mockClear();
    body.rb.setLinvel.mockClear();

    const result = launchBallBody(body);
    expect(result).toBe(true);
    expect(body.rb.setBodyType).toHaveBeenCalledWith(0, true);
    // Le dernier setLinvel doit etre l'impulsion plunger (z negatif).
    const lastV = body.rb.setLinvel.mock.calls.at(-1)[0];
    expect(lastV.x).toBeLessThan(0);
    expect(lastV.y).toBe(0);
    expect(lastV.z).toBeLessThan(0);
  });

  it("5 — double launchBallBody refuse", () => {
    const body = makeTestBody();
    resetBallBody(body);

    expect(launchBallBody(body)).toBe(true);
    const callsAfterFirst = body.rb.setLinvel.mock.calls.length;

    expect(launchBallBody(body)).toBe(false);
    // Aucun setLinvel supplementaire entre le 1er launch et le 2nd refus.
    expect(body.rb.setLinvel.mock.calls.length).toBe(callsAfterFirst);
  });

  it("6 — resetBallBody puis launchBallBody re-autorise", () => {
    const body = makeTestBody();
    resetBallBody(body);

    expect(launchBallBody(body)).toBe(true);
    resetBallBody(body);
    expect(launchBallBody(body)).toBe(true);
  });
});

describe("clampBallBody", () => {
  it("verrouille Y a BALL_RADIUS + 0.01 quand la bille s'eloigne du plateau", () => {
    const body = makeTestBody();
    body.rb._state.translation = { x: 0, y: 5, z: 0 };
    body.rb._state.linvel = { x: 3, y: 10, z: 4 };

    clampBallBody(body);

    const lastT = body.rb.setTranslation.mock.calls.at(-1)[0];
    const lastV = body.rb.setLinvel.mock.calls.at(-1)[0];
    expect(lastT.y).toBe(BALL_RADIUS + 0.01);
    expect(lastV.y).toBe(0);
  });

  it("plafonne la vitesse quand elle depasse le max", () => {
    const body = makeTestBody();
    body.rb._state.linvel = { x: 35, y: 0, z: 35 };

    clampBallBody(body);

    const lastV = body.rb.setLinvel.mock.calls.at(-1)[0];
    const speed = Math.sqrt(lastV.x ** 2 + lastV.z ** 2);
    expect(speed).toBeCloseTo(45, 1);
  });

  it("ne modifie pas la vitesse XZ quand elle est sous le max", () => {
    const body = makeTestBody();
    body.rb._state.linvel = { x: 3, y: 0, z: 4 };

    clampBallBody(body);

    const lastV = body.rb.setLinvel.mock.calls.at(-1)[0];
    expect(lastV.x).toBe(3);
    expect(lastV.z).toBe(4);
  });
});
