import { describe, it, expect, vi, beforeEach } from "vitest";

// On conserve les vrais noms d'evenements / le codec, mais on stube le client
// temps reel pour capturer les handlers sans vrai WebSocket.
// Un constructeur mocke qui renvoie un objet fait que `new` retourne cet objet.
vi.mock("shared", async (importActual) => {
  const actual = await importActual();
  return { ...actual, RealtimeClient: vi.fn() };
});

import { RealtimeClient } from "shared";
import { NetworkAdapter } from "../net/NetworkAdapter.js";

describe("NetworkAdapter (backglass)", () => {
  let handlers;

  beforeEach(() => {
    handlers = {};
    RealtimeClient.mockReturnValue({
      on(event, handler) { handlers[event] = handler; return this; },
    });
  });

  it("1 — enregistre les listeners socket attendus", () => {
    new NetworkAdapter({});
    expect(Object.keys(handlers)).toEqual(
      expect.arrayContaining(["connect", "state_updated", "highscore_beat", "special_event"])
    );
  });

  it("2 — state_updated appelle onStateUpdated avec les donnees", () => {
    const cb = vi.fn();
    new NetworkAdapter({ onStateUpdated: cb });
    handlers["state_updated"]({ score: 100 });
    expect(cb).toHaveBeenCalledWith({ score: 100 });
  });

  it("3 — highscore_beat appelle onHighScoreBeat", () => {
    const cb = vi.fn();
    new NetworkAdapter({ onHighScoreBeat: cb });
    handlers["highscore_beat"]({ score: 500 });
    expect(cb).toHaveBeenCalledWith({ score: 500 });
  });

  it("4 — special_event appelle onSpecialEvent", () => {
    const cb = vi.fn();
    new NetworkAdapter({ onSpecialEvent: cb });
    handlers["special_event"]({ event: "tunnel" });
    expect(cb).toHaveBeenCalledWith({ event: "tunnel" });
  });
});
