import { SERVER_EVENTS } from "shared";

/**
 * Couche transport SORTANTE : centralise toutes les emissions vers les clients.
 * Seule cette classe connait l'API d'emission Socket.IO (en phase B, elle sera
 * la seule — avec le controller — a basculer vers WebSocket natif).
 */
export class GameBroadcaster {
  #io;       // instance Socket.IO (le serveur), injectee : aucune creation ici
  #presenter; // transforme l'entite GameState en DTO « fil » avant emission

  constructor(io, presenter) {
    this.#io = io;
    this.#presenter = presenter;
  }

  // ── Emissions GLOBALES : envoyees a TOUS les clients connectes (io.emit) ──

  // Diffuse l'etat courant de la partie (score, billes, statut…) a tout le monde.
  emitState(state) {
    this.#io.emit(SERVER_EVENTS.STATE_UPDATED, this.#presenter.present(state));
  }

  // Message du dot-matrix (DMD), ex. "BALL 2" / "GAME OVER".
  emitDmd(text) {
    this.#io.emit(SERVER_EVENTS.DMD_MESSAGE, { text });
  }

  // Signale le demarrage d'une partie (les clients basculent en mode jeu).
  emitGameStarted(state) {
    this.#io.emit(SERVER_EVENTS.GAME_STARTED, this.#presenter.present(state));
  }

  // Signale la fin de partie (les clients affichent l'ecran game over).
  emitGameOver(state) {
    this.#io.emit(SERVER_EVENTS.GAME_OVER, this.#presenter.present(state));
  }

  // Collision speciale (tunnel) -> declenche une video/animation cote clients.
  emitSpecialEvent(type) {
    this.#io.emit(SERVER_EVENTS.SPECIAL_EVENT, { event: type });
  }

  // Record battu en cours de partie -> popup/son cote clients.
  emitHighScoreBeat(score, highScore) {
    this.#io.emit(SERVER_EVENTS.HIGH_SCORE_BEAT, { score, highScore });
  }

  // ── Emissions CIBLEES : vers UN seul client (resync a la connexion) ──
  // Un client qui se connecte en cours de partie doit recevoir l'etat deja en
  // cours ; inutile de rediffuser a tout le monde, on emet juste vers lui.

  emitStateTo(socket, state) {
    socket.emit(SERVER_EVENTS.STATE_UPDATED, this.#presenter.present(state));
  }

  emitDmdTo(socket, text) {
    socket.emit(SERVER_EVENTS.DMD_MESSAGE, { text });
  }

  // ── Relai ──
  // Broadcast a tous SAUF l'emetteur : un input local (flipper, bouton cabinet)
  // est rejoue sur les autres ecrans, mais pas renvoye a celui qui l'a produit.
  relayToOthers(socket, event, payload) {
    socket.broadcast.emit(event, payload);
  }
}
