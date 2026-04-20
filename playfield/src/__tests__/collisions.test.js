/**
 * Tests unitaires — playfield/src/usecases/collisionHandler.js
 *
 * API pure : aucun import de framework, aucun mock Cannon-es necessaire.
 * Couvre : debounce par type, drain detection, reset des flags et cooldowns.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createCollisionHandler } from "../usecases/collisionHandler.js";

let onCollision;
let onBallLost;
let handler;

beforeEach(() => {
  onCollision = vi.fn();
  onBallLost = vi.fn();
  handler = createCollisionHandler({ onCollision, onBallLost });
});

// ── Drain ───────────────────────────────────────────────

describe("checkDrain", () => {
  const PAST_DRAIN = 10;
  const BEFORE_DRAIN = 5;

  it("1 — retourne true et appelle onBallLost quand z > seuil et status playing", () => {
    expect(handler.checkDrain(PAST_DRAIN, "playing")).toBe(true);
    expect(onBallLost).toHaveBeenCalledOnce();
  });

  it("2 — ne re-appelle pas sans resetDrainFlag", () => {
    handler.checkDrain(PAST_DRAIN, "playing");
    handler.checkDrain(PAST_DRAIN, "playing");
    handler.checkDrain(PAST_DRAIN, "playing");
    expect(onBallLost).toHaveBeenCalledOnce();
  });

  it("3 — ignore si status !== playing", () => {
    expect(handler.checkDrain(PAST_DRAIN, "idle")).toBe(false);
    expect(handler.checkDrain(PAST_DRAIN, "game_over")).toBe(false);
    expect(onBallLost).not.toHaveBeenCalled();
  });

  it("4 — resetDrainFlag re-arme le flag", () => {
    handler.checkDrain(PAST_DRAIN, "playing");
    expect(onBallLost).toHaveBeenCalledOnce();

    handler.resetDrainFlag();
    handler.checkDrain(PAST_DRAIN, "playing");
    expect(onBallLost).toHaveBeenCalledTimes(2);
  });

  it("retourne false quand z < seuil", () => {
    expect(handler.checkDrain(BEFORE_DRAIN, "playing")).toBe(false);
    expect(onBallLost).not.toHaveBeenCalled();
  });

  it("re-arme naturellement quand la bille revient sur le plateau", () => {
    handler.checkDrain(PAST_DRAIN, "playing");
    expect(onBallLost).toHaveBeenCalledOnce();

    handler.checkDrain(BEFORE_DRAIN, "playing");
    handler.checkDrain(PAST_DRAIN, "playing");
    expect(onBallLost).toHaveBeenCalledTimes(2);
  });
});

// ── Debounce collision ──────────────────────────────────

describe("handleCollision", () => {
  it("5 — deux bumpers < 300ms : onCollision appele une seule fois", () => {
    expect(handler.handleCollision("bumper", 1000)).toBe(true);
    expect(handler.handleCollision("bumper", 1100)).toBe(false);
    expect(onCollision).toHaveBeenCalledOnce();
  });

  it("6 — deux bumpers > 300ms : onCollision appele deux fois", () => {
    expect(handler.handleCollision("bumper", 1000)).toBe(true);
    expect(handler.handleCollision("bumper", 1350)).toBe(true);
    expect(onCollision).toHaveBeenCalledTimes(2);
  });

  it("ignore les types ball et table", () => {
    handler.handleCollision("ball", 1000);
    handler.handleCollision("table", 1000);
    expect(onCollision).not.toHaveBeenCalled();
  });

  it("ignore les types absents ou null", () => {
    handler.handleCollision(undefined, 1000);
    handler.handleCollision(null, 1000);
    handler.handleCollision("", 1000);
    expect(onCollision).not.toHaveBeenCalled();
  });
});

// ── resetCollisionCooldowns ─────────────────────────────

describe("resetCollisionCooldowns", () => {
  it("remet les cooldowns a zero entre parties", () => {
    expect(handler.handleCollision("bumper", 1000)).toBe(true);
    expect(handler.handleCollision("bumper", 1050)).toBe(false);

    handler.resetCollisionCooldowns();

    expect(handler.handleCollision("bumper", 1050)).toBe(true);
    expect(onCollision).toHaveBeenCalledTimes(2);
  });
});
