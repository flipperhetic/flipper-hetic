/**
 * Tests — playfield/src/adapters/input/InputController.js
 *
 * Covers the keyboard contract aligned with the HETIC IoT annex:
 * X / C / D / F + Space / Enter / arrows + R (debug),
 * press/release symmetry, blur safety net, and cleanup.
 *
 * Tested without jsdom: `createFakeTarget()` provides just
 * `addEventListener` / `removeEventListener` and `dispatch()`.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import InputController from "../adapters/input/InputController.js";

function createFakeTarget() {
  const listeners = new Map();
  return {
    addEventListener(type, fn) {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type).add(fn);
    },
    removeEventListener(type, fn) {
      listeners.get(type)?.delete(fn);
    },
    dispatch(type, event = {}) {
      const ev = { preventDefault: () => {}, ...event };
      listeners.get(type)?.forEach((fn) => fn(ev));
    },
    listenerCount(type) {
      return listeners.get(type)?.size ?? 0;
    },
  };
}

function createSpyActions() {
  return {
    onStart: vi.fn(),
    onLaunch: vi.fn(),
    onLeftFlipperDown: vi.fn(),
    onLeftFlipperUp: vi.fn(),
    onRightFlipperDown: vi.fn(),
    onRightFlipperUp: vi.fn(),
    onDebugResetBall: vi.fn(),
  };
}

let actions;
let controller;
let target;

beforeEach(() => {
  actions = createSpyActions();
  controller = new InputController(actions);
  target = createFakeTarget();
  controller.bindKeyboard(target);
});

describe("mapping annexe IoT HETIC", () => {
  it("X déclenche flipper gauche down puis up", () => {
    target.dispatch("keydown", { code: "KeyX" });
    target.dispatch("keyup", { code: "KeyX" });
    expect(actions.onLeftFlipperDown).toHaveBeenCalledTimes(1);
    expect(actions.onLeftFlipperUp).toHaveBeenCalledTimes(1);
  });

  it("C déclenche flipper droit down puis up", () => {
    target.dispatch("keydown", { code: "KeyC" });
    target.dispatch("keyup", { code: "KeyC" });
    expect(actions.onRightFlipperDown).toHaveBeenCalledTimes(1);
    expect(actions.onRightFlipperUp).toHaveBeenCalledTimes(1);
  });

  it("D déclenche start", () => {
    target.dispatch("keydown", { code: "KeyD" });
    expect(actions.onStart).toHaveBeenCalledTimes(1);
  });

  it("F déclenche start (MVP : pièce = start)", () => {
    target.dispatch("keydown", { code: "KeyF" });
    expect(actions.onStart).toHaveBeenCalledTimes(1);
  });
});

describe("raccourcis dev/accessibilité", () => {
  it("Enter déclenche start", () => {
    target.dispatch("keydown", { code: "Enter", key: "Enter" });
    expect(actions.onStart).toHaveBeenCalledTimes(1);
  });

  it("flèches mappent sur les flippers", () => {
    target.dispatch("keydown", { code: "ArrowLeft" });
    target.dispatch("keyup", { code: "ArrowLeft" });
    target.dispatch("keydown", { code: "ArrowRight" });
    target.dispatch("keyup", { code: "ArrowRight" });
    expect(actions.onLeftFlipperDown).toHaveBeenCalledTimes(1);
    expect(actions.onLeftFlipperUp).toHaveBeenCalledTimes(1);
    expect(actions.onRightFlipperDown).toHaveBeenCalledTimes(1);
    expect(actions.onRightFlipperUp).toHaveBeenCalledTimes(1);
  });

  it("Space déclenche launch", () => {
    target.dispatch("keydown", { code: "Space" });
    expect(actions.onLaunch).toHaveBeenCalledTimes(1);
  });

  it("R déclenche debugResetBall", () => {
    target.dispatch("keydown", { code: "KeyR" });
    expect(actions.onDebugResetBall).toHaveBeenCalledTimes(1);
  });
});

describe("anti-rebond et symétrie press/release", () => {
  it("event.repeat n'émet pas une seconde fois down", () => {
    target.dispatch("keydown", { code: "KeyX" });
    target.dispatch("keydown", { code: "KeyX", repeat: true });
    target.dispatch("keydown", { code: "KeyX", repeat: true });
    expect(actions.onLeftFlipperDown).toHaveBeenCalledTimes(1);
  });

  it("deux keydown distincts pour le même flipper n'émettent qu'un down", () => {
    // X and ArrowLeft both map to left flipper
    target.dispatch("keydown", { code: "KeyX" });
    target.dispatch("keydown", { code: "ArrowLeft" });
    expect(actions.onLeftFlipperDown).toHaveBeenCalledTimes(1);
  });

  it("keyup sans keydown préalable n'émet pas d'up parasite", () => {
    target.dispatch("keyup", { code: "KeyX" });
    expect(actions.onLeftFlipperUp).not.toHaveBeenCalled();
  });
});

describe("debounce start (anti-rebond switch physique)", () => {
  it("deux start dans la fenêtre debounce n'émettent qu'un start", () => {
    const t = createFakeTarget();
    const a = createSpyActions();
    const c = new InputController(a);
    const clock = vi.spyOn(performance, "now");
    clock.mockReturnValue(0);
    c.bindKeyboard(t);

    clock.mockReturnValue(0);
    t.dispatch("keydown", { code: "KeyD" });
    clock.mockReturnValue(50);
    t.dispatch("keydown", { code: "KeyD" });
    clock.mockReturnValue(199);
    t.dispatch("keydown", { code: "KeyD" });
    expect(a.onStart).toHaveBeenCalledTimes(1);

    clock.mockReturnValue(250);
    t.dispatch("keydown", { code: "KeyD" });
    expect(a.onStart).toHaveBeenCalledTimes(2);

    clock.mockRestore();
  });

  it("rebond D→F dans la fenêtre n'émet qu'un start (F = même action)", () => {
    const t = createFakeTarget();
    const a = createSpyActions();
    const c = new InputController(a);
    const clock = vi.spyOn(performance, "now");
    clock.mockReturnValue(0);
    c.bindKeyboard(t);

    clock.mockReturnValue(0);
    t.dispatch("keydown", { code: "KeyD" });
    clock.mockReturnValue(20);
    t.dispatch("keydown", { code: "KeyF" });
    expect(a.onStart).toHaveBeenCalledTimes(1);

    clock.mockRestore();
  });
});

describe("filet blur (perte de focus)", () => {
  it("relâche un flipper gauche maintenu", () => {
    target.dispatch("keydown", { code: "KeyX" });
    target.dispatch("blur");
    expect(actions.onLeftFlipperUp).toHaveBeenCalledTimes(1);
  });

  it("relâche les deux flippers si maintenus", () => {
    target.dispatch("keydown", { code: "KeyX" });
    target.dispatch("keydown", { code: "KeyC" });
    target.dispatch("blur");
    expect(actions.onLeftFlipperUp).toHaveBeenCalledTimes(1);
    expect(actions.onRightFlipperUp).toHaveBeenCalledTimes(1);
  });

  it("n'émet pas d'up si aucun flipper n'était maintenu", () => {
    target.dispatch("blur");
    expect(actions.onLeftFlipperUp).not.toHaveBeenCalled();
    expect(actions.onRightFlipperUp).not.toHaveBeenCalled();
  });

  it("blur puis keyup ne double-émet pas", () => {
    target.dispatch("keydown", { code: "KeyX" });
    target.dispatch("blur");
    target.dispatch("keyup", { code: "KeyX" });
    expect(actions.onLeftFlipperUp).toHaveBeenCalledTimes(1);
  });
});

describe("cleanup", () => {
  it("dispose() désabonne tous les listeners du clavier", () => {
    const t = createFakeTarget();
    const c = new InputController(actions);
    c.bindKeyboard(t);
    expect(t.listenerCount("keydown")).toBe(1);
    expect(t.listenerCount("keyup")).toBe(1);
    expect(t.listenerCount("blur")).toBe(1);
    c.dispose();
    expect(t.listenerCount("keydown")).toBe(0);
    expect(t.listenerCount("keyup")).toBe(0);
    expect(t.listenerCount("blur")).toBe(0);
  });
});
