import { RealtimeClient, CLIENT_EVENTS, SERVER_EVENTS } from "shared";

// Le serveur WebSocket est publie sur le port 3000 du meme hote que les ecrans
// (cf. docker-compose). On derive l'hote depuis la page courante au lieu de coder
// "localhost" en dur : ainsi le playfield reste correct que la cabine serve l'ecran
// en localhost OU via son IP / hostname Tailscale. `wss` si la page est en https.
const loc = typeof location !== "undefined" ? location : { protocol: "http:", hostname: "localhost" };
const SERVER_URL = `${loc.protocol === "https:" ? "wss" : "ws"}://${loc.hostname || "localhost"}:3000`;

class NetworkAdapter {
  #socket;
  #gameState;

  constructor({ onConnect, onConnectionError, onGameStarted, onHighScoreBeat, onGameOver } = {}) {
    this.#gameState = {
      status: "idle",
      score: 0,
      ballsLeft: 3,
      currentBall: 1,
      lastEvent: null,
    };

    this.#socket = new RealtimeClient(SERVER_URL);

    this.#socket.on("connect", () => {
      onConnect?.();
    });

    this.#socket.on("disconnect", () => {
      onConnectionError?.();
    });

    this.#socket.on("connect_error", () => {
      onConnectionError?.();
    });

    this.#socket.on(SERVER_EVENTS.STATE_UPDATED, (data) => {
      Object.assign(this.#gameState, data);
    });

    this.#socket.on(SERVER_EVENTS.GAME_STARTED, (data) => {
      Object.assign(this.#gameState, data);
      onGameStarted?.(data);
    });

    this.#socket.on(SERVER_EVENTS.GAME_OVER, (data) => {
      Object.assign(this.#gameState, data);
      onGameOver?.(data);
    });

    this.#socket.on(SERVER_EVENTS.HIGH_SCORE_BEAT, (data) => {
      onHighScoreBeat?.(data);
    });
  }

  get socket() {
    return this.#socket;
  }

  get gameState() {
    return this.#gameState;
  }

  emitStartGame() {
    this.#socket.emit(CLIENT_EVENTS.START_GAME);
  }

  emitLaunchBall() {
    this.#socket.emit(CLIENT_EVENTS.LAUNCH_BALL);
  }

  emitCollision(type) {
    this.#socket.emit(CLIENT_EVENTS.COLLISION, { type });
  }

  emitBallLost() {
    this.#socket.emit(CLIENT_EVENTS.BALL_LOST);
  }

  emitFlipperLeftDown() {
    this.#socket.emit(CLIENT_EVENTS.FLIPPER_LEFT_DOWN);
  }

  emitFlipperLeftUp() {
    this.#socket.emit(CLIENT_EVENTS.FLIPPER_LEFT_UP);
  }

  emitFlipperRightDown() {
    this.#socket.emit(CLIENT_EVENTS.FLIPPER_RIGHT_DOWN);
  }

  emitFlipperRightUp() {
    this.#socket.emit(CLIENT_EVENTS.FLIPPER_RIGHT_UP);
  }

  emitResetHighScore() {
    this.#socket.emit(CLIENT_EVENTS.RESET_HIGHSCORE);
  }
}

export default NetworkAdapter;
