/**
 * Adaptateur Socket.IO — couche transport uniquement.
 * Recoit les evenements clients, appelle les use cases, emet les resultats.
 */
import { CLIENT_EVENTS, SERVER_EVENTS } from "shared";
import { GameState } from "../domain/GameState.js";
import { startGame } from "../usecases/startGame.js";
import { loseBall } from "../usecases/loseBall.js";
import { applyCollision } from "../usecases/applyCollision.js";
import fs from "fs/promises";
import { join } from "path";

const HIGHSCORE_FILE = join(process.cwd(), "server", "highscore.json");

async function loadSavedHighScore() {
  try {
    const raw = await fs.readFile(HIGHSCORE_FILE, "utf-8");
    const obj = JSON.parse(raw);
    return Number.isFinite(obj.highScore) ? obj.highScore : 0;
  } catch (e) {
    return 0;
  }
}

async function saveHighScore(hs) {
  try {
    await fs.mkdir(join(process.cwd(), "server"), { recursive: true });
    await fs.writeFile(HIGHSCORE_FILE, JSON.stringify({ highScore: hs }), "utf-8");
  } catch (e) {
    console.warn("failed to save highscore", e);
  }
}

let state = new GameState();
// Initialize highScore from disk if possible (fire-and-forget)
loadSavedHighScore().then((hs) => { state.highScore = hs || 0; }).catch(() => {});
let lastDmdMessage = null;
let gameOverTimeoutId = null;
let highScoreBeatAnnounced = false;
let highScoreBeatAnnouncedTime = 0;
const GAME_OVER_BLOCK_MS = 5000;
const HIGHSCORE_ANIMATION_MS = 3500;

/**
 * Remet l'etat a zero (utilise par les tests pour l'isolation).
 */
export function resetState() {
  state = new GameState();
  lastDmdMessage = null;
  clearGameOverTimer();
}

function emitState(io) {
  io.emit(SERVER_EVENTS.STATE_UPDATED, state.toJSON());
}

function emitDmd(io, text) {
  lastDmdMessage = text;
  io.emit(SERVER_EVENTS.DMD_MESSAGE, { text });
}

function clearGameOverTimer() {
  if (gameOverTimeoutId !== null) {
    clearTimeout(gameOverTimeoutId);
    gameOverTimeoutId = null;
  }
}

function scheduleGameOverUnlock(io) {
  clearGameOverTimer();
    gameOverTimeoutId = setTimeout(() => {
      gameOverTimeoutId = null;
      if (state.status !== "game_over") {
        return;
      }
      // Move to idle and clear transient gameplay fields while preserving highScore
      state.status = "idle";
      state.score = 0;
      state.ballsLeft = 3;
      state.currentBall = 1;
      state.lastEvent = null;
      emitState(io);
      emitDmd(io, "PRESS START");
    }, GAME_OVER_BLOCK_MS);
}

/**
 * Enregistre les handlers Socket.IO sur le serveur.
 */
export function registerSocketHandlers(io) {
  io.on("connection", (socket) => {
    socket.emit(SERVER_EVENTS.STATE_UPDATED, state.toJSON());
    if (lastDmdMessage) {
      socket.emit(SERVER_EVENTS.DMD_MESSAGE, { text: lastDmdMessage });
    }

    socket.on(CLIENT_EVENTS.START_GAME, () => {
      if (state.status === "game_over" && gameOverTimeoutId !== null) {
        return;
      }
      const result = startGame(state);
      if (!result.changed) return;
      clearGameOverTimer();
      highScoreBeatAnnounced = false;
      io.emit(SERVER_EVENTS.GAME_STARTED, state.toJSON());
      emitState(io);
      emitDmd(io, result.dmdMessage);
    });

    socket.on(CLIENT_EVENTS.LAUNCH_BALL, () => {
      if (!state.isPlaying) return;
      state.lastEvent = CLIENT_EVENTS.LAUNCH_BALL;
      emitState(io);
    });

    // Flippers : relay pur, pas de logique metier.
    const flipperEvents = [
      CLIENT_EVENTS.FLIPPER_LEFT_DOWN,
      CLIENT_EVENTS.FLIPPER_LEFT_UP,
      CLIENT_EVENTS.FLIPPER_RIGHT_DOWN,
      CLIENT_EVENTS.FLIPPER_RIGHT_UP,
    ];

    for (const ev of flipperEvents) {
      socket.on(ev, (payload) => {
        state.lastEvent = ev;
        socket.broadcast.emit(ev, payload ?? {});
      });
    }

    socket.on(CLIENT_EVENTS.COLLISION, (payload) => {
      const type = payload && typeof payload.type === "string" ? payload.type : null;
      if (!type) return;
      const result = applyCollision(state, type);
      if (result.changed) {
        emitState(io);
        // Emit high score beat immediately if just detected and not yet announced
        if (result.highScoreBeat && !highScoreBeatAnnounced) {
          highScoreBeatAnnounced = true;
          highScoreBeatAnnouncedTime = performance.now();
          saveHighScore(state.highScore).catch(() => {});
          io.emit(SERVER_EVENTS.HIGH_SCORE_BEAT, { score: state.score, highScore: state.highScore });
        }
      }
    });

    socket.on(CLIENT_EVENTS.BALL_LOST, () => {
      const result = loseBall(state);
      if (!result.changed) return;
      emitState(io);
      emitDmd(io, result.dmdMessage);
      if (result.gameOver) {
        // If highscore beat animation is still running, delay game-over emission
        const timeSinceBeat = performance.now() - highScoreBeatAnnouncedTime;
        const animationStillRunning = highScoreBeatAnnounced && timeSinceBeat < HIGHSCORE_ANIMATION_MS;
        
        if (animationStillRunning) {
          // Delay game-over until animation finishes
          const delayMs = HIGHSCORE_ANIMATION_MS - timeSinceBeat;
          setTimeout(() => {
            io.emit(SERVER_EVENTS.GAME_OVER, state.toJSON());
            scheduleGameOverUnlock(io);
          }, delayMs);
        } else {
          io.emit(SERVER_EVENTS.GAME_OVER, state.toJSON());
          scheduleGameOverUnlock(io);
        }
        
        // If the usecase reported a high score update, persist it.
        if (result.highScoreUpdated) {
          saveHighScore(state.highScore).catch(() => {});
        }
        // Only emit HIGH_SCORE_BEAT if not already announced during collision
        if (result.highScoreBeat && !highScoreBeatAnnounced) {
          highScoreBeatAnnounced = true;
          highScoreBeatAnnouncedTime = performance.now();
          io.emit(SERVER_EVENTS.HIGH_SCORE_BEAT, { score: state.score, highScore: state.highScore });
        }
      }
    });
  });
}
