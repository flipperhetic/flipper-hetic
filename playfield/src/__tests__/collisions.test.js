/**
 * Tests unitaires — playfield/src/collisions.js
 *
 * Couvre : debounce par type, drain detection, reset des flags et cooldowns.
 * Les imports reseau sont mockes.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mocker network.js avant l'import de collisions.js.
vi.mock("../network.js", () => ({
  emitBallLost: vi.fn(),
  emitCollision: vi.fn(),
}));

// Mocker cannon-es (utilise uniquement pour le type Vec3 dans bumper repulse)
vi.mock("cannon-es", () => ({
  default: {},
  Vec3: class {
    constructor(x, y, z) { this.x = x; this.y = y; this.z = z; }
    copy(v) { this.x = v.x; this.y = v.y; this.z = v.z; }
    negate(v) { v.x = -this.x; v.y = -this.y; v.z = -this.z; }
    normalize() { return this; }
    scale(s, out) { out.x = this.x * s; out.y = this.y * s; out.z = this.z * s; }
  },
}));

import { checkDrain, resetDrainFlag, resetCollisionCooldowns, setupCollisionListeners } from "../collisions.js";
import { emitBallLost, emitCollision } from "../network.js";

// Stub de body bille pour les tests drain
function makeBallBody(z = 0) {
  return {
    position: { x: 0, y: 0.26, z },
    velocity: { x: 0, y: 0, z: 0 },
    addEventListener: vi.fn(),
    applyImpulse: vi.fn(),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  resetDrainFlag();
  resetCollisionCooldowns();
  vi.useRealTimers();
});

// ── Drain ───────────────────────────────────────────────

describe("checkDrain", () => {
  // DRAIN_Z_THRESHOLD = TABLE_DEPTH/2 + WALL_THICKNESS + 0.3 = 9 + 0.3 + 0.3 = 9.6
  const PAST_DRAIN = 10;
  const BEFORE_DRAIN = 5;

  it("1 — retourne true et emet ball_lost quand z > seuil et status playing", () => {
    const socket = {};
    const body = makeBallBody(PAST_DRAIN);
    const result = checkDrain(socket, body, "playing");
    expect(result).toBe(true);
    expect(emitBallLost).toHaveBeenCalledOnce();
    expect(emitBallLost).toHaveBeenCalledWith(socket);
  });

  it("2 — ne re-emet pas sans resetDrainFlag", () => {
    const socket = {};
    const body = makeBallBody(PAST_DRAIN);
    checkDrain(socket, body, "playing");
    checkDrain(socket, body, "playing");
    checkDrain(socket, body, "playing");
    expect(emitBallLost).toHaveBeenCalledOnce();
  });

  it("3 — ignore si status !== playing", () => {
    const socket = {};
    const body = makeBallBody(PAST_DRAIN);
    expect(checkDrain(socket, body, "idle")).toBe(false);
    expect(checkDrain(socket, body, "game_over")).toBe(false);
    expect(emitBallLost).not.toHaveBeenCalled();
  });

  it("4 — resetDrainFlag re-arme le flag", () => {
    const socket = {};
    const body = makeBallBody(PAST_DRAIN);
    checkDrain(socket, body, "playing");
    expect(emitBallLost).toHaveBeenCalledOnce();

    resetDrainFlag();
    checkDrain(socket, body, "playing");
    expect(emitBallLost).toHaveBeenCalledTimes(2);
  });

  it("retourne false quand z < seuil", () => {
    const socket = {};
    const body = makeBallBody(BEFORE_DRAIN);
    expect(checkDrain(socket, body, "playing")).toBe(false);
    expect(emitBallLost).not.toHaveBeenCalled();
  });

  it("re-arme naturellement quand la bille revient sur le plateau", () => {
    const socket = {};
    const body = makeBallBody(PAST_DRAIN);
    checkDrain(socket, body, "playing");
    expect(emitBallLost).toHaveBeenCalledOnce();

    // Bille remise sur le plateau (apres resetBall)
    body.position.z = BEFORE_DRAIN;
    checkDrain(socket, body, "playing"); // else branch reset le flag

    // Nouveau drain
    body.position.z = PAST_DRAIN;
    checkDrain(socket, body, "playing");
    expect(emitBallLost).toHaveBeenCalledTimes(2);
  });
});

// ── Debounce collision ──────────────────────────────────

describe("Debounce collision (via setupCollisionListeners)", () => {
  it("5 — deux bumpers < 300ms : emitCollision appele une seule fois", () => {
    let now = 1000;
    vi.spyOn(performance, "now").mockImplementation(() => now);

    const socket = {};
    const body = makeBallBody();
    setupCollisionListeners(socket, body);

    const handler = body.addEventListener.mock.calls[0][1];

    // Premier bumper
    handler({
      body: { userData: { type: "bumper" } },
      contact: { bi: body, ni: { negate: vi.fn() } },
    });
    expect(emitCollision).toHaveBeenCalledOnce();

    // Second bumper 100ms plus tard (< 300ms cooldown)
    now = 1100;
    handler({
      body: { userData: { type: "bumper" } },
      contact: { bi: body, ni: { negate: vi.fn() } },
    });
    expect(emitCollision).toHaveBeenCalledOnce(); // toujours 1

    vi.restoreAllMocks();
  });

  it("6 — deux bumpers > 300ms : emitCollision appele deux fois", () => {
    let now = 1000;
    vi.spyOn(performance, "now").mockImplementation(() => now);

    const socket = {};
    const body = makeBallBody();
    setupCollisionListeners(socket, body);

    const handler = body.addEventListener.mock.calls[0][1];

    handler({
      body: { userData: { type: "bumper" } },
      contact: { bi: body, ni: { negate: vi.fn() } },
    });
    expect(emitCollision).toHaveBeenCalledOnce();

    now = 1350;
    handler({
      body: { userData: { type: "bumper" } },
      contact: { bi: body, ni: { negate: vi.fn() } },
    });
    expect(emitCollision).toHaveBeenCalledTimes(2);

    vi.restoreAllMocks();
  });

  it("ignore les types ball et table", () => {
    const socket = {};
    const body = makeBallBody();
    setupCollisionListeners(socket, body);

    const handler = body.addEventListener.mock.calls[0][1];
    handler({ body: { userData: { type: "ball" } }, contact: {} });
    handler({ body: { userData: { type: "table" } }, contact: {} });
    expect(emitCollision).not.toHaveBeenCalled();
  });

  it("ignore les bodies sans userData", () => {
    const socket = {};
    const body = makeBallBody();
    setupCollisionListeners(socket, body);

    const handler = body.addEventListener.mock.calls[0][1];
    handler({ body: {}, contact: {} });
    handler({ body: { userData: null }, contact: {} });
    expect(emitCollision).not.toHaveBeenCalled();
  });
});

// ── resetCollisionCooldowns ─────────────────────────────

describe("resetCollisionCooldowns", () => {
  it("remet les cooldowns a zero entre parties", () => {
    let now = 1000;
    vi.spyOn(performance, "now").mockImplementation(() => now);

    const socket = {};
    const body = makeBallBody();
    setupCollisionListeners(socket, body);
    const handler = body.addEventListener.mock.calls[0][1];

    // Premier bumper
    handler({
      body: { userData: { type: "bumper" } },
      contact: { bi: body, ni: { negate: vi.fn() } },
    });
    expect(emitCollision).toHaveBeenCalledOnce();

    // Seulement 50ms plus tard, mais on reset les cooldowns
    now = 1050;
    resetCollisionCooldowns();

    // Le bumper passe maintenant car le cooldown a ete reset
    handler({
      body: { userData: { type: "bumper" } },
      contact: { bi: body, ni: { negate: vi.fn() } },
    });
    expect(emitCollision).toHaveBeenCalledTimes(2);

    vi.restoreAllMocks();
  });
});
