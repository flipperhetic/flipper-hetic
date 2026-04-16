/**
 * Tests unitaires — playfield/src/ball.js
 *
 * Couvre : resetBall, launchBall, clampBall, anti-double-launch.
 * Three.js et Cannon-es sont mockes a minima.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Three.js
vi.mock("three", () => ({
  Mesh: class {
    constructor() {}
  },
  SphereGeometry: class {
    constructor() {}
  },
  MeshStandardMaterial: class {
    constructor() {}
  },
}));

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

// Mock physics.js
vi.mock("../physics.js", () => ({
  MATERIALS: {
    ball: {},
    static: {},
  },
}));

import { resetBall, launchBall, clampBall, BALL_RADIUS } from "../ball.js";
import * as CANNON from "cannon-es";

function makeTestBall() {
  const body = new CANNON.Body({ mass: 1 });
  return { mesh: {}, body };
}

describe("resetBall", () => {
  it("1 — place le body au spawn plunger", () => {
    const ball = makeTestBall();
    resetBall(ball);

    // PLUNGER_SPAWN_X = 0, PLUNGER_SPAWN_Y = 0.26, PLUNGER_SPAWN_Z = 8.5
    expect(ball.body.position.set).toHaveBeenCalledWith(0, 0.26, 8.5);
  });

  it("2 — remet les velocites a zero", () => {
    const ball = makeTestBall();
    resetBall(ball);

    expect(ball.body.velocity.set).toHaveBeenCalledWith(0, 0, 0);
    expect(ball.body.angularVelocity.set).toHaveBeenCalledWith(0, 0, 0);
    expect(ball.body.force.set).toHaveBeenCalledWith(0, 0, 0);
    expect(ball.body.torque.set).toHaveBeenCalledWith(0, 0, 0);
  });

  it("3 — fige le body en STATIC", () => {
    const ball = makeTestBall();
    resetBall(ball);

    expect(ball.body.type).toBe(CANNON.Body.STATIC);
    expect(ball.body.updateMassProperties).toHaveBeenCalled();
  });
});

describe("launchBall", () => {
  it("4 — debloque en DYNAMIC et applique l'impulsion", () => {
    const ball = makeTestBall();
    resetBall(ball);

    const result = launchBall(ball);
    expect(result).toBe(true);
    expect(ball.body.type).toBe(CANNON.Body.DYNAMIC);
    expect(ball.body.applyImpulse).toHaveBeenCalledOnce();
    // Impulsion en Z negatif (vers le haut du plateau)
    const impulse = ball.body.applyImpulse.mock.calls[0][0];
    expect(impulse.x).toBe(0);
    expect(impulse.z).toBeLessThan(0);
  });

  it("5 — double launchBall refuse", () => {
    const ball = makeTestBall();
    resetBall(ball);

    expect(launchBall(ball)).toBe(true);
    expect(launchBall(ball)).toBe(false);
    expect(ball.body.applyImpulse).toHaveBeenCalledOnce();
  });

  it("6 — resetBall puis launchBall re-autorise", () => {
    const ball = makeTestBall();
    resetBall(ball);

    launchBall(ball);
    resetBall(ball);
    expect(launchBall(ball)).toBe(true);
    expect(ball.body.applyImpulse).toHaveBeenCalledTimes(2);
  });
});

describe("clampBall", () => {
  it("verrouille Y a BALL_RADIUS + 0.01", () => {
    const ball = makeTestBall();
    ball.body.position.y = 5;
    ball.body.velocity.y = 10;
    ball.body.velocity.x = 3;
    ball.body.velocity.z = 4;

    clampBall(ball);
    expect(ball.body.position.y).toBe(BALL_RADIUS + 0.01);
    expect(ball.body.velocity.y).toBe(0);
  });

  it("plafonne la vitesse quand elle depasse le max", () => {
    const ball = makeTestBall();
    // Vitesse = sqrt(20^2 + 20^2) ≈ 28.28, > MAX_BALL_SPEED (25)
    ball.body.velocity.x = 20;
    ball.body.velocity.z = 20;

    clampBall(ball);

    const speed = Math.sqrt(
      ball.body.velocity.x ** 2 + ball.body.velocity.z ** 2,
    );
    expect(speed).toBeCloseTo(25, 1);
  });

  it("ne modifie pas la vitesse quand elle est sous le max", () => {
    const ball = makeTestBall();
    ball.body.velocity.x = 3;
    ball.body.velocity.z = 4;

    clampBall(ball);

    expect(ball.body.velocity.x).toBe(3);
    expect(ball.body.velocity.z).toBe(4);
  });
});
