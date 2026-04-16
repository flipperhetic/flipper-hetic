import { io } from "socket.io-client";

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

const DOT_COLS = 96;
const DOT_ROWS = 24;
const DOT_PITCH = 10;
const DOT_RADIUS = 2.9;
const DOT_ON = "#ff7a2a";
const DOT_OFF = "rgba(255, 122, 42, 0.08)";
const DISPLAY_BG = "#0d0401";

const canvas = document.getElementById("dmdCanvas");
const ctx = canvas.getContext("2d");
const socketStatus = document.getElementById("socketStatus");
const stateStatus = document.getElementById("stateStatus");

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

const FONT_5X7 = {
  " ": ["00000", "00000", "00000", "00000", "00000", "00000", "00000"],
  "!": ["00100", "00100", "00100", "00100", "00100", "00000", "00100"],
  "0": ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
  "1": ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
  "2": ["01110", "10001", "00001", "00010", "00100", "01000", "11111"],
  "3": ["11110", "00001", "00001", "01110", "00001", "00001", "11110"],
  "4": ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
  "5": ["11111", "10000", "10000", "11110", "00001", "00001", "11110"],
  "6": ["01110", "10000", "10000", "11110", "10001", "10001", "01110"],
  "7": ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
  "8": ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
  "9": ["01110", "10001", "10001", "01111", "00001", "00001", "01110"],
  "A": ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
  "B": ["11110", "10001", "10001", "11110", "10001", "10001", "11110"],
  "C": ["01110", "10001", "10000", "10000", "10000", "10001", "01110"],
  "D": ["11110", "10001", "10001", "10001", "10001", "10001", "11110"],
  "E": ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
  "F": ["11111", "10000", "10000", "11110", "10000", "10000", "10000"],
  "G": ["01110", "10001", "10000", "10111", "10001", "10001", "01110"],
  "H": ["10001", "10001", "10001", "11111", "10001", "10001", "10001"],
  "I": ["01110", "00100", "00100", "00100", "00100", "00100", "01110"],
  "J": ["00001", "00001", "00001", "00001", "10001", "10001", "01110"],
  "K": ["10001", "10010", "10100", "11000", "10100", "10010", "10001"],
  "L": ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
  "M": ["10001", "11011", "10101", "10101", "10001", "10001", "10001"],
  "N": ["10001", "10001", "11001", "10101", "10011", "10001", "10001"],
  "O": ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
  "P": ["11110", "10001", "10001", "11110", "10000", "10000", "10000"],
  "Q": ["01110", "10001", "10001", "10001", "10101", "10010", "01101"],
  "R": ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
  "S": ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
  "T": ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
  "U": ["10001", "10001", "10001", "10001", "10001", "10001", "01110"],
  "V": ["10001", "10001", "10001", "10001", "10001", "01010", "00100"],
  "W": ["10001", "10001", "10001", "10101", "10101", "10101", "01010"],
  "X": ["10001", "10001", "01010", "00100", "01010", "10001", "10001"],
  "Y": ["10001", "10001", "01010", "00100", "00100", "00100", "00100"],
  "Z": ["11111", "00001", "00010", "00100", "01000", "10000", "11111"],
};

function drawBitmapText(text, originX, originY, opts = {}) {
  const pixelOn = opts.pixelOn ?? 1;
  const spacing = opts.spacing ?? 1;
  let xCursor = originX;
  for (const ch of text) {
    const glyph = FONT_5X7[ch] ?? FONT_5X7[" "];
    for (let row = 0; row < glyph.length; row += 1) {
      const bits = glyph[row];
      for (let col = 0; col < bits.length; col += 1) {
        if (bits[col] === "1") {
          rasterCtx.fillRect(xCursor + col, originY + row, pixelOn, pixelOn);
        }
      }
    }
    xCursor += 5 + spacing;
  }
}

function drawCenteredBitmapText(text, y) {
  const normalized = text.trim();
  const width = normalized.length > 0 ? normalized.length * 5 + (normalized.length - 1) : 0;
  const startX = Math.max(0, Math.floor((DOT_COLS - width) / 2));
  drawBitmapText(normalized, startX, y, { spacing: 1 });
}

function normalizeMessage(input) {
  const src = typeof input === "string" ? input : "";
  const up = src.trim().toUpperCase();
  if (!up) return "READY";
  return up.slice(0, 16);
}

function renderMessage(text) {
  dmdState.message = normalizeMessage(text);
  renderDotMatrix();
}

function renderScore(score) {
  dmdState.score = Number.isFinite(score) ? score : 0;
  renderDotMatrix();
}

function renderDotMatrix() {
  rasterCtx.clearRect(0, 0, DOT_COLS, DOT_ROWS);
  rasterCtx.fillStyle = "#ffffff";

  // Police bitmap 5x7 lisible sur grille dot-matrix.
  drawCenteredBitmapText(dmdState.message, 3);
  drawCenteredBitmapText(`PTS ${String(dmdState.score).slice(0, 8)}`, 14);

  const pixels = rasterCtx.getImageData(0, 0, DOT_COLS, DOT_ROWS).data;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = DISPLAY_BG;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let y = 0; y < DOT_ROWS; y += 1) {
    for (let x = 0; x < DOT_COLS; x += 1) {
      const idx = (y * DOT_COLS + x) * 4;
      // Seuil plus strict pour garder les "trous" des caractères (0, O...).
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

const socket = io("http://localhost:3000");

socket.on("connect", () => {
  socketStatus.textContent = "socket: connected";
});

socket.on("disconnect", () => {
  socketStatus.textContent = "socket: disconnected";
});

socket.on("dmd_message", (payload) => {
  renderMessage(payload?.text);
});

socket.on("state_updated", (nextState) => {
  renderScore(nextState?.score);
  dmdState.status = nextState?.status ?? "idle";
  stateStatus.textContent = `state: ${dmdState.status}`;
});

socket.on("game_started", () => {
  dmdState.status = "playing";
  stateStatus.textContent = "state: playing";
  renderMessage("BALL 1");
});

socket.on("game_over", () => {
  dmdState.status = "game_over";
  stateStatus.textContent = "state: game_over";
  renderMessage("GAME OVER");
});

renderDotMatrix();
