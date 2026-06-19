import { describe, it, expect, vi, beforeEach } from "vitest";
import CollisionHandler from "../usecases/CollisionHandler.js";

const TEST_DRAIN_Z = 8;
const PAST_DRAIN   = 10;
const BEFORE_DRAIN = 5;

let onCollision;
let onBallLost;
let onBumperImpulse;
let handler;

beforeEach(() => {
  onCollision = vi.fn();
  onBallLost = vi.fn();
  onBumperImpulse = vi.fn();
  handler = new CollisionHandler({ onCollision, onBallLost, onBumperImpulse });
  handler.setDrainThreshold(TEST_DRAIN_Z);
});

describe("checkDrain", () => {
  it("1 - retourne true et appelle onBallLost quand z > seuil et status playing", () => {
    expect(handler.checkDrain(PAST_DRAIN, "playing")).toBe(true);
    expect(onBallLost).toHaveBeenCalledOnce();
  });

  it("2 - ne re-appelle pas onBallLost sans resetDrainFlag", () => {
    handler.checkDrain(PAST_DRAIN, "playing");
    handler.checkDrain(PAST_DRAIN, "playing");
    handler.checkDrain(PAST_DRAIN, "playing");
    expect(onBallLost).toHaveBeenCalledOnce();
  });

  it("3 - retourne true mais sans onBallLost si status !== playing", () => {
    expect(handler.checkDrain(PAST_DRAIN, "idle")).toBe(true);
    expect(onBallLost).not.toHaveBeenCalled();
    handler.resetDrainFlag();
    expect(handler.checkDrain(PAST_DRAIN, "game_over")).toBe(true);
    expect(onBallLost).not.toHaveBeenCalled();
  });

  it("4 - resetDrainFlag re-arme le flag", () => {
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

describe("handleCollision", () => {
  it("5 - deux bumpers < 300ms : onCollision appele une seule fois", () => {
    expect(handler.handleCollision("bumper", 1000)).toBe(true);
    expect(handler.handleCollision("bumper", 1100)).toBe(false);
    expect(onCollision).toHaveBeenCalledOnce();
  });

  it("6 - deux bumpers > 300ms : onCollision appele deux fois", () => {
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

describe("bumper repulse", () => {
  it("calcule un vecteur radial bumper -> bille et appelle onBumperImpulse", () => {
    handler.handleCollision("bumper", 1000, {
      ballPos: { x: 5, y: 0, z: 0 },
      otherPos: { x: 0, y: 0, z: 0 },
    });
    expect(onBumperImpulse).toHaveBeenCalledOnce();
    const v = onBumperImpulse.mock.calls[0][0];
    expect(v.x).toBeGreaterThan(0);
    expect(v.y).toBe(0);
    expect(v.z).toBe(0);
  });

  it("n appelle pas onBumperImpulse si le contexte est absent", () => {
    handler.handleCollision("bumper", 1000);
    expect(onBumperImpulse).not.toHaveBeenCalled();
  });

  it("n appelle pas onBumperImpulse pour un autre type", () => {
    handler.handleCollision("flipper", 1000, {
      ballPos: { x: 5, y: 0, z: 0 },
      otherPos: { x: 0, y: 0, z: 0 },
    });
    expect(onBumperImpulse).not.toHaveBeenCalled();
  });

  it("respecte le debounce : pas de repulse pendant le cooldown", () => {
    handler.handleCollision("bumper", 1000, {
      ballPos: { x: 5, y: 0, z: 0 },
      otherPos: { x: 0, y: 0, z: 0 },
    });
    handler.handleCollision("bumper", 1100, {
      ballPos: { x: 5, y: 0, z: 0 },
      otherPos: { x: 0, y: 0, z: 0 },
    });
    expect(onBumperImpulse).toHaveBeenCalledOnce();
  });
});

describe("resetCollisionCooldowns", () => {
  it("remet les cooldowns a zero entre parties", () => {
    expect(handler.handleCollision("bumper", 1000)).toBe(true);
    expect(handler.handleCollision("bumper", 1050)).toBe(false);

    handler.resetCollisionCooldowns();

    expect(handler.handleCollision("bumper", 1050)).toBe(true);
    expect(onCollision).toHaveBeenCalledTimes(2);
  });
});
