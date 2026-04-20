/**
 * DMD — Composition root.
 */
import { createDotMatrixRenderer } from "./renderer/dotMatrix.js";
import { initNetwork } from "./adapters/network.js";

// ── DOM ───────────────────────────────────────────────
const app = document.createElement("main");
app.className = "dmd";
app.innerHTML = `
  <section class="dmd__screen" aria-live="polite">
    <div class="dmd__meta">
      <span id="socketStatus">socket: connecting...</span>
      <span id="stateStatus">state: idle</span>
    </div>
    <canvas id="dmdCanvas" class="dmd__canvas" aria-label="Dot matrix display"></canvas>
  </section>
`;

document.body.append(app);

const styles = document.createElement("style");
styles.textContent = `
  * {
    box-sizing: border-box;
  }

  body {
    margin: 0;
    min-height: 100vh;
    display: grid;
    place-items: center;
    background: #050505;
    color: #ff5a1f;
    font-family: "Courier New", Courier, monospace;
  }

  .dmd {
    width: min(920px, 94vw);
    padding: 1rem;
  }

  .dmd__screen {
    border: 3px solid #ff7a2a;
    border-radius: 10px;
    padding: 0.8rem;
    background: #120701;
    box-shadow: 0 0 24px rgba(255, 90, 31, 0.25) inset;
  }

  .dmd__meta {
    display: flex;
    justify-content: space-between;
    gap: 0.8rem;
    margin: 0 0 0.6rem;
    font-size: 0.9rem;
    color: #ffb48f;
    opacity: 0.95;
  }

  .dmd__canvas {
    width: 100%;
    height: auto;
    display: block;
    border-radius: 6px;
    background: #0d0401;
  }
`;
document.head.append(styles);

// ── Renderer ────────���─────────────────────────────────
const socketStatus = document.getElementById("socketStatus");
const stateStatus = document.getElementById("stateStatus");
const canvas = document.getElementById("dmdCanvas");

const renderer = createDotMatrixRenderer(canvas);

// ── Reseau ────────────��───────────────────────────────
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

// ── Init ──────────────────────────────────��───────────
renderer.init();
