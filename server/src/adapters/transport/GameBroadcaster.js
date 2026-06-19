import { SERVER_EVENTS, encodeMessage } from "shared";

/**
 * Couche transport SORTANTE (WebSocket natif).
 *
 * Le WebSocket natif ne fournit ni « emit a tous » ni « broadcast » : il sait
 * seulement `client.send(string)` vers UN client. Cette classe recree donc les
 * 3 portees a la main, a partir du Set des clients connectes qu'elle maintient :
 *   - emitXxx()      -> a TOUS les clients          (#broadcast)
 *   - emitXxxTo()    -> a UN seul client            (#send, resync a la connexion)
 *   - relayToOthers()-> a tous SAUF l'emetteur       (relai d'un input local)
 *
 * Chaque message part en JSON via le codec d'enveloppe { event, data }.
 */
export class GameBroadcaster {
  #presenter;          // GameState -> DTO « fil »
  #clients = new Set(); // sockets `ws` des clients connectes

  constructor(presenter) {
    this.#presenter = presenter;
  }

  // Le controller alimente ce Set sur connexion/deconnexion.
  addClient(client) {
    this.#clients.add(client);
  }

  removeClient(client) {
    this.#clients.delete(client);
  }

  // ── Emissions GLOBALES : a TOUS les clients connectes ──

  emitState(state) {
    this.#broadcast(SERVER_EVENTS.STATE_UPDATED, this.#presenter.present(state));
  }

  emitDmd(text) {
    this.#broadcast(SERVER_EVENTS.DMD_MESSAGE, { text });
  }

  emitGameStarted(state) {
    this.#broadcast(SERVER_EVENTS.GAME_STARTED, this.#presenter.present(state));
  }

  emitGameOver(state) {
    this.#broadcast(SERVER_EVENTS.GAME_OVER, this.#presenter.present(state));
  }

  emitSpecialEvent(type) {
    this.#broadcast(SERVER_EVENTS.SPECIAL_EVENT, { event: type });
  }

  emitHighScoreBeat(score, highScore) {
    this.#broadcast(SERVER_EVENTS.HIGH_SCORE_BEAT, { score, highScore });
  }

  // ── Emissions CIBLEES : vers UN seul client (resync a la connexion) ──

  emitStateTo(client, state) {
    this.#send(client, SERVER_EVENTS.STATE_UPDATED, this.#presenter.present(state));
  }

  emitDmdTo(client, text) {
    this.#send(client, SERVER_EVENTS.DMD_MESSAGE, { text });
  }

  // ── Relai : a tous SAUF l'emetteur ──
  // Un input local (flipper, bouton cabinet) est rejoue sur les autres ecrans,
  // mais pas renvoye a celui qui l'a produit.
  relayToOthers(sender, event, payload) {
    const message = encodeMessage(event, payload);
    for (const client of this.#clients) {
      if (client !== sender && this.#isOpen(client)) client.send(message);
    }
  }

  // ── Helpers prives ──

  #broadcast(event, data) {
    const message = encodeMessage(event, data);
    for (const client of this.#clients) {
      if (this.#isOpen(client)) client.send(message);
    }
  }

  #send(client, event, data) {
    if (this.#isOpen(client)) client.send(encodeMessage(event, data));
  }

  // OPEN === 1 : on n'ecrit pas sur une socket en cours de connexion/fermeture.
  #isOpen(client) {
    return client.readyState === 1;
  }
}
