/**
 * DMD — Branchement Socket.IO sur le renderer et les indicateurs DOM.
 */
import { initNetwork } from "../adapters/network.js";

/**
 * @param {object} opts
 * @param {{ socketStatus: HTMLElement; stateStatus: HTMLElement; canvas: HTMLCanvasElement }} opts.refs
 * @param {ReturnType<typeof import("../renderer/dotMatrix.js").createDotMatrixRenderer>} opts.renderer
 */
export function wireDmdNetwork({ refs, renderer }) {
  const { socketStatus, stateStatus } = refs;

  initNetwork({
    onConnect() {
      socketStatus.textContent = "socket: connected";
    },
    onDisconnect() {
      socketStatus.textContent = "socket: disconnected";
    },
    onConnectionError() {
      socketStatus.textContent = "socket: error";
    },
    onDmdMessage(text) {
      // On n'affiche que les messages "BALL N" (flash bref a chaque nouvelle
      // bille, puis retour aux POINTS). Les autres (PRESS START, GAME OVER)
      // restent pilotes par le `status` via onStateUpdated/onGameOver.
      if (typeof text === "string" && text.trim().toUpperCase().startsWith("BALL")) {
        renderer.flashBallMessage(text);
      }
    },
    onStateUpdated(data) {
      renderer.renderScore(data?.score);
      renderer.updateStatus(data?.status);
      stateStatus.textContent = `state: ${data?.status ?? "idle"}`;
    },
    onGameStarted(data) {
      renderer.renderScore(data?.score);
      renderer.updateStatus("playing");
      stateStatus.textContent = "state: playing";
    },
    onGameOver(data) {
      renderer.renderScore(data?.score);
      renderer.updateStatus("game_over");
      stateStatus.textContent = "state: game_over";
    },
  });
}
