/**
 * Adaptateur Socket.IO — couche transport uniquement.
 * Recoit les evenements clients, appelle les use cases, emet les resultats.
 */
import { CLIENT_EVENTS, SERVER_EVENTS } from "shared";
import { GameState } from "../domain/GameState.js";
import { startGame } from "../usecases/startGame.js";
import { loseBall } from "../usecases/loseBall.js";
import { applyCollision } from "../usecases/applyCollision.js";

let state = new GameState();
let lastDmdMessage = null;

/**
 * Remet l'etat a zero (utilise par les tests pour l'isolation).
 */
export function resetState() {
  state = new GameState();
  lastDmdMessage = null;
}

function emitState(io) {
  io.emit(SERVER_EVENTS.STATE_UPDATED, state.toJSON());
}

function emitDmd(io, text) {
  lastDmdMessage = text;
  io.emit(SERVER_EVENTS.DMD_MESSAGE, { text });
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
      const result = startGame(state);
      if (!result.changed) return;
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
      if (result.changed) emitState(io);
    });

    socket.on(CLIENT_EVENTS.BALL_LOST, () => {
      const result = loseBall(state);
      if (!result.changed) return;
      emitState(io);
      emitDmd(io, result.dmdMessage);
      if (result.gameOver) {
        io.emit(SERVER_EVENTS.GAME_OVER, state.toJSON());
      }
    });
  });
}
