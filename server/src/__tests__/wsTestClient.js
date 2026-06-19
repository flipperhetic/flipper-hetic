/**
 * Client WebSocket minimal pour les tests serveur.
 *
 * Offre la meme API que celle attendue par les tests (`emit` / `on` / `once`)
 * au-dessus de la lib `ws` + le codec d'enveloppe partage. Remplace l'ancien
 * `socket.io-client`.
 */
import { WebSocket } from "ws";
import { encodeMessage, decodeMessage } from "shared";

export class WsTestClient {
  constructor(port) {
    this.ws = new WebSocket(`ws://localhost:${port}`);
    this.handlers = new Map(); // event -> [{ cb, once }]

    this.ws.on("message", (raw) => {
      const msg = decodeMessage(raw);
      if (!msg) return;
      const arr = this.handlers.get(msg.event);
      if (!arr) return;
      const snapshot = [...arr];
      // Retire les handlers "once" AVANT d'appeler : une re-souscription
      // declenchee par un callback (waitFor enchaine) est ainsi conservee.
      this.handlers.set(msg.event, arr.filter((h) => !h.once));
      for (const h of snapshot) h.cb(msg.data);
    });
  }

  emit(event, data) {
    this.ws.send(encodeMessage(event, data));
  }

  on(event, cb) {
    this.#add(event, cb, false);
  }

  once(event, cb) {
    this.#add(event, cb, true);
  }

  disconnect() {
    this.ws.close();
  }

  #add(event, cb, once) {
    if (!this.handlers.has(event)) this.handlers.set(event, []);
    this.handlers.get(event).push({ cb, once });
  }
}
