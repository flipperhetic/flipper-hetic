/**
 * DMD — Couche reseau WebSocket (POO).
 *
 * Ecoute les evenements serveur et delegue aux callbacks fournis a la
 * construction. Meme contrat que l'adapter reseau du playfield.
 */
import { RealtimeClient, SERVER_EVENTS } from "shared";

const SERVER_URL = "ws://localhost:3000";

export class NetworkAdapter {
  #socket;

  /**
   * @param {object} callbacks
   *   - onConnect() / onDisconnect() / onConnectionError()
   *   - onDmdMessage(text)
   *   - onStateUpdated(data)
   *   - onGameStarted(data) / onGameOver(data)
   */
  constructor(callbacks = {}) {
    this.#socket = new RealtimeClient(SERVER_URL);

    this.#socket.on("connect", () => {
      callbacks.onConnect?.();
    });

    this.#socket.on("disconnect", () => {
      callbacks.onDisconnect?.();
    });

    this.#socket.on("connect_error", () => {
      callbacks.onConnectionError?.();
    });

    this.#socket.on(SERVER_EVENTS.DMD_MESSAGE, (payload) => {
      callbacks.onDmdMessage?.(payload?.text);
    });

    this.#socket.on(SERVER_EVENTS.STATE_UPDATED, (data) => {
      callbacks.onStateUpdated?.(data);
    });

    this.#socket.on(SERVER_EVENTS.GAME_STARTED, (payload) => {
      callbacks.onGameStarted?.(payload);
    });

    this.#socket.on(SERVER_EVENTS.GAME_OVER, (payload) => {
      callbacks.onGameOver?.(payload);
    });
  }

  get socket() {
    return this.#socket;
  }
}
