/**
 * DMD — Rendu dot-matrix sur canvas.
 */
import { drawCenteredBitmapText } from "./font.js";

const DOT_COLS = 96;
const DOT_ROWS = 24;
const DOT_PITCH = 10;
const DOT_RADIUS = 2.9;
const DOT_ON = "#ff7a2a";
const DOT_OFF = "rgba(255, 122, 42, 0.08)";
const DISPLAY_BG = "#0d0401";

/**
 * Cree un renderer dot-matrix attache au canvas fourni.
 * Retourne des fonctions `renderMessage(text)`, `renderScore(score)`,
 * `updateStatus(status)`.
 */
export function createDotMatrixRenderer(canvas) {
  const ctx = canvas.getContext("2d");

  canvas.width = DOT_COLS * DOT_PITCH;
  canvas.height = DOT_ROWS * DOT_PITCH;

  const rasterCanvas = document.createElement("canvas");
  rasterCanvas.width = DOT_COLS;
  rasterCanvas.height = DOT_ROWS;
  const rasterCtx = rasterCanvas.getContext("2d", { willReadFrequently: true });

  const dmdState = {
    message: "PRESS START",
    score: 0,
    status: "idle",
  };

  function normalizeMessage(input) {
    const src = typeof input === "string" ? input : "";
    const up = src.trim().toUpperCase();
    if (!up) return "READY";
    return up.slice(0, 16);
  }

  function render() {
    rasterCtx.clearRect(0, 0, DOT_COLS, DOT_ROWS);
    rasterCtx.fillStyle = "#ffffff";

    drawCenteredBitmapText(rasterCtx, dmdState.message, 3, DOT_COLS);
    drawCenteredBitmapText(rasterCtx, `PTS ${String(dmdState.score).slice(0, 8)}`, 14, DOT_COLS);

    const pixels = rasterCtx.getImageData(0, 0, DOT_COLS, DOT_ROWS).data;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = DISPLAY_BG;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let y = 0; y < DOT_ROWS; y += 1) {
      for (let x = 0; x < DOT_COLS; x += 1) {
        const idx = (y * DOT_COLS + x) * 4;
        const isOn = pixels[idx + 3] > 170;
        const drawX = x * DOT_PITCH + DOT_PITCH / 2;
        const drawY = y * DOT_PITCH + DOT_PITCH / 2;

        ctx.beginPath();
        ctx.fillStyle = isOn ? DOT_ON : DOT_OFF;
        ctx.shadowColor = isOn ? "rgba(255, 122, 42, 0.7)" : "transparent";
        ctx.shadowBlur = isOn ? 6 : 0;
        ctx.arc(drawX, drawY, DOT_RADIUS, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.shadowBlur = 0;
  }

  return {
    renderMessage(text) {
      dmdState.message = normalizeMessage(text);
      render();
    },

    renderScore(score) {
      dmdState.score = Number.isFinite(score) ? score : 0;
      render();
    },

    updateStatus(status) {
      dmdState.status = status ?? "idle";
    },

    /** Rendu initial. */
    init() {
      render();
    },
  };
}
