import { MessageProtocol } from "./MessageProtocol.js";

/**
 * Client temps reel : facade au-dessus du `WebSocket` natif du navigateur, qui
 * offre une API facon Socket.IO (`on` / `off` / `emit`) + une reconnexion
 * automatique.
 *
 * Encapsulation par champs prives `#` (aligne sur le style POO du projet :
 * `NetworkAdapter`, `GameBroadcaster`, `SocketController`).
 *
 * Evenements de cycle de vie emis localement :
 *   - "connect"        : connexion etablie
 *   - "disconnect"     : connexion fermee (une reconnexion est planifiee)
 *   - "connect_error"  : echec/erreur de connexion
 */
export class RealtimeClient {
  #url;
  #reconnectDelayMs;
  #listeners = new Map();
  #ws = null;
  #reconnectTimer = null;
  #closedByUser = false;

  constructor(url, { reconnectDelayMs = 1000 } = {}) {
    this.#url = url;
    this.#reconnectDelayMs = reconnectDelayMs;
    this.#connect();
  }

  // ── API publique ──

  on(event, handler) {
    if (!this.#listeners.has(event)) this.#listeners.set(event, new Set());
    this.#listeners.get(event).add(handler);
    return this;
  }

  off(event, handler) {
    this.#listeners.get(event)?.delete(handler);
    return this;
  }

  emit(event, data) {
    if (this.#ws && this.#ws.readyState === WebSocket.OPEN) {
      this.#ws.send(MessageProtocol.encode(event, data));
    }
    return this;
  }

  disconnect() {
    this.#closedByUser = true;
    if (this.#reconnectTimer) {
      clearTimeout(this.#reconnectTimer);
      this.#reconnectTimer = null;
    }
    this.#ws?.close();
  }

  // ── Interne ──

  #connect() {
    this.#ws = new WebSocket(this.#url);
    this.#ws.onopen = () => this.#emitLocal("connect");
    this.#ws.onmessage = (event) => {
      const msg = MessageProtocol.decode(event.data);
      if (msg) this.#emitLocal(msg.event, msg.data);
    };
    this.#ws.onerror = () => this.#emitLocal("connect_error");
    this.#ws.onclose = () => {
      this.#emitLocal("disconnect");
      this.#scheduleReconnect();
    };
  }

  #emitLocal(event, data) {
    const set = this.#listeners.get(event);
    if (!set) return;
    for (const handler of [...set]) handler(data);
  }

  #scheduleReconnect() {
    if (this.#reconnectTimer || this.#closedByUser) return;
    this.#reconnectTimer = setTimeout(() => {
      this.#reconnectTimer = null;
      this.#connect();
    }, this.#reconnectDelayMs);
  }
}
