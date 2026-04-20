/**
 * Tests unitaires — playfield/src/adapters/physics/ballBody.js
 *
 * Couvre : resetBallBody, launchBallBody, clampBallBody, anti-double-launch.
 * Cannon-es est mocke a minima.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Cannon-es
vi.mock("cannon-es", () => {
  const STATIC = 2;
  const DYNAMIC = 1;
  return {
    default: {},
    Body: class {
      static STATIC = STATIC;
      static DYNAMIC = DYNAMIC;
      constructor(opts = {}) {
        this.mass = opts.mass ?? 0;
        this.type = opts.mass > 0 ? DYNAMIC : STATIC;
        this.shape = opts.shape;
        this.material = opts.material;
        this.position = { x: 0, y: 0, z: 0, set: vi.fn(function(x, y, z) { this.x = x; this.y = y; this.z = z; }) };
        this.velocity = { x: 0, y: 0, z: 0, set: vi.fn(function(x, y, z) { this.x = x; this.y = y; this.z = z; }) };
        this.angularVelocity = { x: 0, y: 0, z: 0, set: vi.fn(function(x, y, z) { this.x = x; this.y = y; this.z = z; }) };
        this.force = { x: 0, y: 0, z: 0, set: vi.fn(function(x, y, z) { this.x = x; this.y = y; this.z = z; }) };
        this.torque = { x: 0, y: 0, z: 0, set: vi.fn(function(x, y, z) { this.x = x; this.y = y; this.z = z; }) };
        this.quaternion = { x: 0, y: 0, z: 0, w: 1, set: vi.fn(function(x, y, z, w) { this.x = x; this.y = y; this.z = z; this.w = w; }) };
        this.userData = {};
        this.updateMassProperties = vi.fn();
        this.wakeUp = vi.fn();
        this.applyImpulse = vi.fn();
      }
    },
    Sphere: class {
      constructor(r) { this.radius = r; }
    },
    ContactMaterial: class {
      constructor() {}
    },
    Vec3: class {
      constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; }
    },
  };
});

// Mock world.js (ex physics.js)
vi.mock("../adapters/physics/world.js", () => ({
  MATERIALS: {
    ball: {},
    static: {},
  },
}));

import { resetBallBody, launchBallBody, clampBallBody, BALL_RADIUS } from "../adapters/physics/ballBody.js";
import * as CANNON from "cannon-es";

function makeTestBody() {
  return new CANNON.Body({ mass: 1 });
}

describe("resetBallBody", () => {
  it("1 — place le body au spawn plunger", () => {
    const body = makeTestBody();
    resetBallBody(body);

    // PLUNGER_SPAWN_X = 0, PLUNGER_SPAWN_Y = 0.26, PLUNGER_SPAWN_Z = 8.5
    expect(body.position.set).toHaveBeenCalledWith(0, 0.26, 8.5);
  });

  it("2 — remet les velocites a zero", () => {
    const body = makeTestBody();
    resetBallBody(body);

    expect(body.velocity.set).toHaveBeenCalledWith(0, 0, 0);
    expect(body.angularVelocity.set).toHaveBeenCalledWith(0, 0, 0);
    expect(body.force.set).toHaveBeenCalledWith(0, 0, 0);
    expect(body.torque.set).toHaveBeenCalledWith(0, 0, 0);
  });

  it("3 — fige le body en STATIC", () => {
    const body = makeTestBody();
    resetBallBody(body);

    expect(body.type).toBe(CANNON.Body.STATIC);
    expect(body.updateMassProperties).toHaveBeenCalled();
  });
});

describe("launchBallBody", () => {
  it("4 — debloque en DYNAMIC et applique l'impulsion", () => {
    const body = makeTestBody();
    resetBallBody(body);

    const result = launchBallBody(body);
    expect(result).toBe(true);
    expect(body.type).toBe(CANNON.Body.DYNAMIC);
    expect(body.applyImpulse).toHaveBeenCalledOnce();
    const impulse = body.applyImpulse.mock.calls[0][0];
    expect(impulse.x).toBe(0);
    expect(impulse.z).toBeLessThan(0);
  });

  it("5 — double launchBallBody refuse", () => {
    const body = makeTestBody();
    resetBallBody(body);

    expect(launchBallBody(body)).toBe(true);
    expect(launchBallBody(body)).toBe(false);
    expect(body.applyImpulse).toHaveBeenCalledOnce();
  });

  it("6 — resetBallBody puis launchBallBody re-autorise", () => {
    const body = makeTestBody();
    resetBallBody(body);

    launchBallBody(body);
    resetBallBody(body);
    expect(launchBallBody(body)).toBe(true);
    expect(body.applyImpulse).toHaveBeenCalledTimes(2);
  });
});

describe("clampBallBody", () => {
  it("verrouille Y a BALL_RADIUS + 0.01", () => {
    const body = makeTestBody();
    body.position.y = 5;
    body.velocity.y = 10;
    body.velocity.x = 3;
    body.velocity.z = 4;

    clampBallBody(body);
    expect(body.position.y).toBe(BALL_RADIUS + 0.01);
    expect(body.velocity.y).toBe(0);
  });

  it("plafonne la vitesse quand elle depasse le max", () => {
    const body = makeTestBody();
    body.velocity.x = 20;
    body.velocity.z = 20;

    clampBallBody(body);

    const speed = Math.sqrt(
      body.velocity.x ** 2 + body.velocity.z ** 2,
    );
    expect(speed).toBeCloseTo(25, 1);
  });

  it("ne modifie pas la vitesse quand elle est sous le max", () => {
    const body = makeTestBody();
    body.velocity.x = 3;
    body.velocity.z = 4;

    clampBallBody(body);

    expect(body.velocity.x).toBe(3);
    expect(body.velocity.z).toBe(4);
  });
});
