import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("socket.io-client", () => ({
  io: vi.fn(),
}));

import { io } from "socket.io-client";
import { initNetwork } from "../adapters/network.js";

describe("initNetwork (backglass)", () => {
  let handlers;

  beforeEach(() => {
    handlers = {};
    io.mockReturnValue({
      on: (event, handler) => { handlers[event] = handler; },
    });
  });

  it("1 — enregistre les listeners socket attendus", () => {
    initNetwork({});
    expect(Object.keys(handlers)).toEqual(
      expect.arrayContaining(["connect", "state_updated", "highscore_beat", "special_event"])
    );
  });

  it("2 — state_updated appelle onStateUpdated avec les donnees", () => {
    const cb = vi.fn();
    initNetwork({ onStateUpdated: cb });
    handlers["state_updated"]({ score: 100 });
    expect(cb).toHaveBeenCalledWith({ score: 100 });
  });

  it("3 — highscore_beat appelle onHighScoreBeat", () => {
    const cb = vi.fn();
    initNetwork({ onHighScoreBeat: cb });
    handlers["highscore_beat"]({ score: 500 });
    expect(cb).toHaveBeenCalledWith({ score: 500 });
  });

  it("4 — special_event appelle onSpecialEvent", () => {
    const cb = vi.fn();
    initNetwork({ onSpecialEvent: cb });
    handlers["special_event"]({ event: "tunnel" });
    expect(cb).toHaveBeenCalledWith({ event: "tunnel" });
  });
});
