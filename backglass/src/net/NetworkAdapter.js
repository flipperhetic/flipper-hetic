/**
 * Backglass — Couche reseau WebSocket (POO).
 *
 * Ecoute les evenements serveur et delegue aux callbacks fournis a la
 * construction. Expose `socket` pour emettre (ex. start_game) et `emitStartGame`.
 */
import { RealtimeClient, CLIENT_EVENTS, SERVER_EVENTS } from "shared";

const SERVER_URL = "ws://localhost:3000";

export class NetworkAdapter {
  #socket;

  /**
   * @param {object} callbacks
   *   - onConnect() / onConnectionError()
   *   - onStateUpdated(data)
   *   - onHighScoreBeat(data) / onSpecialEvent(data)
   */
  constructor(callbacks = {}) {
    this.#socket = new RealtimeClient(SERVER_URL);

    this.#socket.on("connect", () => {
      callbacks.onConnect?.();
    });

    this.#socket.on("disconnect", () => {
      callbacks.onConnectionError?.();
    });

    this.#socket.on("connect_error", () => {
      callbacks.onConnectionError?.();
    });

    this.#socket.on(SERVER_EVENTS.STATE_UPDATED, (data) => {
      callbacks.onStateUpdated?.(data);
    });

    this.#socket.on(SERVER_EVENTS.HIGH_SCORE_BEAT, (data) => {
      callbacks.onHighScoreBeat?.(data);
    });

    this.#socket.on(SERVER_EVENTS.SPECIAL_EVENT, (data) => {
      callbacks.onSpecialEvent?.(data);
    });
  }

  get socket() {
    return this.#socket;
  }

  emitStartGame() {
    this.#socket.emit(CLIENT_EVENTS.START_GAME);
  }
}
