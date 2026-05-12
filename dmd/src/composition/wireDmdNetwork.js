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
    onDmdMessage(text) {
      renderer.renderMessage(text);
    },
    onStateUpdated(data) {
      renderer.renderScore(data?.score);
      renderer.updateStatus(data?.status);
      stateStatus.textContent = `state: ${data?.status ?? "idle"}`;
    },
    onGameStarted() {
      renderer.updateStatus("playing");
      stateStatus.textContent = "state: playing";
    },
    onGameOver() {
      renderer.updateStatus("game_over");
      stateStatus.textContent = "state: game_over";
    },
  });
}
