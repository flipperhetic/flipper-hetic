import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../adapters/network.js", () => ({
  initNetwork: vi.fn(),
}));

import { initNetwork } from "../adapters/network.js";
import { wireDmdNetwork } from "../composition/wireDmdNetwork.js";

describe("wireDmdNetwork", () => {
  let refs, renderer, callbacks;

  beforeEach(() => {
    refs = {
      socketStatus: { textContent: "" },
      stateStatus: { textContent: "" },
      canvas: {},
    };
    renderer = {
      renderScore: vi.fn(),
      updateStatus: vi.fn(),
      flashBallMessage: vi.fn(),
    };
    callbacks = {};
    initNetwork.mockImplementation((cbs) => { callbacks = cbs; });
    wireDmdNetwork({ refs, renderer });
  });

  it("1 — onConnect met socketStatus a connected", () => {
    callbacks.onConnect();
    expect(refs.socketStatus.textContent).toBe("socket: connected");
  });

  it("2 — onDisconnect met socketStatus a disconnected", () => {
    callbacks.onDisconnect();
    expect(refs.socketStatus.textContent).toBe("socket: disconnected");
  });

  it("3 — onStateUpdated appelle renderScore, updateStatus et met a jour stateStatus", () => {
    callbacks.onStateUpdated({ score: 500, status: "playing" });
    expect(renderer.renderScore).toHaveBeenCalledWith(500);
    expect(renderer.updateStatus).toHaveBeenCalledWith("playing");
    expect(refs.stateStatus.textContent).toBe("state: playing");
  });

  it("4 — onGameOver appelle renderer avec game_over", () => {
    callbacks.onGameOver({ score: 1200, status: "game_over" });
    expect(renderer.renderScore).toHaveBeenCalledWith(1200);
    expect(renderer.updateStatus).toHaveBeenCalledWith("game_over");
    expect(refs.stateStatus.textContent).toBe("state: game_over");
  });

  it("5 — onGameStarted reinitialise le renderer en playing", () => {
    callbacks.onGameStarted({ score: 0 });
    expect(renderer.renderScore).toHaveBeenCalledWith(0);
    expect(renderer.updateStatus).toHaveBeenCalledWith("playing");
    expect(refs.stateStatus.textContent).toBe("state: playing");
  });

  it("6 — onDmdMessage 'BALL 2' declenche flashBallMessage", () => {
    callbacks.onDmdMessage("BALL 2");
    expect(renderer.flashBallMessage).toHaveBeenCalledWith("BALL 2");
  });

  it("7 — onDmdMessage ignore les messages non-BALL (GAME OVER, PRESS START)", () => {
    callbacks.onDmdMessage("GAME OVER");
    callbacks.onDmdMessage("PRESS START");
    expect(renderer.flashBallMessage).not.toHaveBeenCalled();
  });
});
