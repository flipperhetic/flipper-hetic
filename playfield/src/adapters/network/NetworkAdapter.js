import { io } from "socket.io-client";
import { CLIENT_EVENTS, SERVER_EVENTS } from "shared";

const SERVER_URL = "http://localhost:3000";

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

    this.#socket = io(SERVER_URL);

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
