import { describe, it, expect, vi, beforeEach } from "vitest";
import { createActuators } from "../adapters/actuators.js";

function makeAudio() {
  return { play: vi.fn(), playRandom: vi.fn(), startTheme: vi.fn() };
}

describe("createActuators", () => {
  it("1 — expose les methodes attendues", () => {
    const a = createActuators();
    expect(typeof a.onBumperHit).toBe("function");
    expect(typeof a.onSlingshotHit).toBe("function");
    expect(typeof a.onFlipperFire).toBe("function");
    expect(typeof a.onBallLost).toBe("function");
    expect(typeof a.onGameOver).toBe("function");
    expect(typeof a.onGameStart).toBe("function");
    expect(typeof a.onMilestone).toBe("function");
  });

  it("2 — fonctionne sans audio (pas d'erreur)", () => {
    const a = createActuators();
    expect(() => {
      a.onBumperHit();
      a.onSlingshotHit();
      a.onFlipperFire("left");
      a.onBallLost();
      a.onGameOver();
      a.onGameStart();
      a.onMilestone();
    }).not.toThrow();
  });

  it("3 — onBumperHit joue un son bumper aleatoire", () => {
    const audio = makeAudio();
    createActuators(audio).onBumperHit();
    expect(audio.playRandom).toHaveBeenCalledWith(["bumper-1", "bumper-2", "bumper-3"]);
  });

  it("4 — onGameStart demarre le theme", () => {
    const audio = makeAudio();
    createActuators(audio).onGameStart();
    expect(audio.play).toHaveBeenCalledWith("start");
    expect(audio.startTheme).toHaveBeenCalled();
  });

  it("5 — deux instances sont independantes", () => {
    const audioA = makeAudio();
    const audioB = makeAudio();
    createActuators(audioA).onBumperHit();
    expect(audioA.playRandom).toHaveBeenCalledTimes(1);
    expect(audioB.playRandom).not.toHaveBeenCalled();
  });
});
