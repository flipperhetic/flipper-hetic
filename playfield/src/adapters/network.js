/**
 * Playfield — Couche reseau Socket.IO.
 *
 * Connexion au serveur, ecoute des evenements serveur,
 * helpers d'emission pour les evenements client.
 */
import { io } from "socket.io-client";
import { CLIENT_EVENTS, SERVER_EVENTS } from "shared";

const SERVER_URL = "http://localhost:3000";

// Etat local synchronise avec le serveur.
export const gameState = {
  status: "idle",
  score: 0,
  ballsLeft: 3,
  currentBall: 1,
  lastEvent: null,
};

/**
 * Initialise la connexion Socket.io et enregistre les listeners serveur.
 * `callbacks` est un objet optionnel :
 *   - onGameStarted(data)  : appele sur game_started
 *   - onGameOver(data)     : appele sur game_over
 *   - onStateUpdated(data) : appele sur state_updated
 *
 * Retourne le socket pour les emit directs si besoin.
 */
export function initNetwork(callbacks = {}) {
  const socket = io(SERVER_URL);

  socket.on("connect", () => {
    console.log("[network] connecte au serveur", socket.id);
  });

  socket.on("disconnect", (reason) => {
    console.log("[network] deconnecte :", reason);
  });

  socket.on(SERVER_EVENTS.STATE_UPDATED, (data) => {
    Object.assign(gameState, data);
    callbacks.onStateUpdated?.(data);
  });

  socket.on(SERVER_EVENTS.GAME_STARTED, (data) => {
    Object.assign(gameState, data);
    callbacks.onGameStarted?.(data);
  });

  socket.on(SERVER_EVENTS.GAME_OVER, (data) => {
    Object.assign(gameState, data);
    callbacks.onGameOver?.(data);
  });

  socket.on(SERVER_EVENTS.DMD_MESSAGE, (data) => {
    console.log("[network] DMD :", data.text);
  });

  return socket;
}

// ── Helpers d'emission ────────────────────────────────

export function emitStartGame(socket) {
  socket.emit(CLIENT_EVENTS.START_GAME);
}

export function emitLaunchBall(socket) {
  socket.emit(CLIENT_EVENTS.LAUNCH_BALL);
}

export function emitFlipperLeftDown(socket) {
  socket.emit(CLIENT_EVENTS.FLIPPER_LEFT_DOWN);
}

export function emitFlipperLeftUp(socket) {
  socket.emit(CLIENT_EVENTS.FLIPPER_LEFT_UP);
}

export function emitFlipperRightDown(socket) {
  socket.emit(CLIENT_EVENTS.FLIPPER_RIGHT_DOWN);
}

export function emitFlipperRightUp(socket) {
  socket.emit(CLIENT_EVENTS.FLIPPER_RIGHT_UP);
}

export function emitBallLost(socket) {
  socket.emit(CLIENT_EVENTS.BALL_LOST);
}

export function emitCollision(socket, type) {
  socket.emit(CLIENT_EVENTS.COLLISION, { type });
}
