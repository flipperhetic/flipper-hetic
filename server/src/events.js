/**
 * Contrat MVP (plan d’implémentation — étape 2) : événements client → serveur.
 * collision : { type: "bumper" | "wall" | "flipper" | "drain" }
 */
export const CLIENT_EVENTS = {
  START_GAME: "start_game",
  LAUNCH_BALL: "launch_ball",
  FLIPPER_LEFT_DOWN: "flipper_left_down",
  FLIPPER_LEFT_UP: "flipper_left_up",
  FLIPPER_RIGHT_DOWN: "flipper_right_down",
  FLIPPER_RIGHT_UP: "flipper_right_up",
  BALL_LOST: "ball_lost",
  COLLISION: "collision",
};

/** Serveur → clients (étape 2) */
export const SERVER_EVENTS = {
  STATE_UPDATED: "state_updated",
  GAME_STARTED: "game_started",
  GAME_OVER: "game_over",
  DMD_MESSAGE: "dmd_message",
};
/** État initial (étape 2) — status : "idle" | "playing" | "game_over" */
export const INITIAL_STATE = {
  status: "idle",
  score: 0,
  ballsLeft: 3,
  currentBall: 1,
  lastEvent: null,
};

function cloneInitialState() {  return JSON.parse(JSON.stringify(INITIAL_STATE));
}

let state = cloneInitialState();
// Dernier message DMD envoye — re-emis a la connexion d'un client pour resync.
let lastDmdMessage = null;

/**
 * Remet l'etat a zero (utilise par les tests pour l'isolation).
 */
export function resetState() {
  state = cloneInitialState();
  lastDmdMessage = null;
}

function emitStateUpdated(io) {
  io.emit(SERVER_EVENTS.STATE_UPDATED, { ...state });
}

function emitDmdMessage(io, text) {
  lastDmdMessage = text;
  io.emit(SERVER_EVENTS.DMD_MESSAGE, { text });
}

/**
 * Étape 3 du plan : handlers Socket.io (état en mémoire = copie logique de INITIAL_STATE au reset).
 */
export function registerSocketHandlers(io) {
  io.on("connection", (socket) => {
    socket.emit(SERVER_EVENTS.STATE_UPDATED, { ...state });
    // Re-emettre le dernier message DMD pour resync apres refresh/reconnexion.
    if (lastDmdMessage) {
      socket.emit(SERVER_EVENTS.DMD_MESSAGE, { text: lastDmdMessage });
    }

    socket.on(CLIENT_EVENTS.START_GAME, () => {
      if (state.status === "playing") return;

      state = cloneInitialState();
      state.status = "playing";
      state.lastEvent = CLIENT_EVENTS.START_GAME;

      io.emit(SERVER_EVENTS.GAME_STARTED, {
        status: state.status,
        score: state.score,
        ballsLeft: state.ballsLeft,
        currentBall: state.currentBall,
      });
      emitStateUpdated(io);
      emitDmdMessage(io, "BALL 1");
    });
    socket.on(CLIENT_EVENTS.LAUNCH_BALL, () => {
      if (state.status !== "playing") return;
      state.lastEvent = CLIENT_EVENTS.LAUNCH_BALL;
      emitStateUpdated(io);
    });

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
      if (state.status !== "playing") return;

      const type = payload && typeof payload.type === "string" ? payload.type : null;
      if (!type) return;

      const pointsByType = {
        bumper: 100,
        wall: 0,
        flipper: 0,
        drain: 0,
      };

      if (!(type in pointsByType)) return;

      state.score += pointsByType[type];
      state.lastEvent = `${CLIENT_EVENTS.COLLISION}:${type}`;
      emitStateUpdated(io);
    });
    socket.on(CLIENT_EVENTS.BALL_LOST, () => {
      if (state.status !== "playing") return;
      // Guard contre double-emission reseau : ignorer si le dernier event
      // etait deja ball_lost (la bille n'a pas ete relancee entre-temps).
      if (state.lastEvent === CLIENT_EVENTS.BALL_LOST) return;

      state.ballsLeft -= 1;
      state.currentBall += 1;
      state.lastEvent = CLIENT_EVENTS.BALL_LOST;

      if (state.ballsLeft === 0) {
        state.status = "game_over";
        emitStateUpdated(io);
        emitDmdMessage(io, "GAME OVER");
        io.emit(SERVER_EVENTS.GAME_OVER, {
          status: state.status,
          score: state.score,
          ballsLeft: state.ballsLeft,
          currentBall: state.currentBall,
        });
        return;      }

      emitStateUpdated(io);
      emitDmdMessage(io, `BALL ${state.currentBall}`);
    });
  });
}
