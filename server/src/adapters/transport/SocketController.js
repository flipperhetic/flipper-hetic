import { CLIENT_EVENTS } from "shared";

// Flippers : relais purs (pas de logique metier).
const FLIPPER_EVENTS = [
  CLIENT_EVENTS.FLIPPER_LEFT_DOWN,
  CLIENT_EVENTS.FLIPPER_LEFT_UP,
  CLIENT_EVENTS.FLIPPER_RIGHT_DOWN,
  CLIENT_EVENTS.FLIPPER_RIGHT_UP,
];

/**
 * Couche transport ENTRANTE : branche les evenements Socket.IO sur les
 * methodes nommees de la session. Aucune logique metier ici — chaque `.on`
 * ne fait que deleguer a une methode de `GameSession`.
 */
export class SocketController {
  #io;       // serveur Socket.IO — injecte
  #session;  // orchestration metier vers laquelle chaque evenement est delegue

  constructor(io, session) {
    this.#io = io;
    this.#session = session;
  }

  // Point d'entree : ecoute les nouvelles connexions clients.
  register() {
    this.#io.on("connection", (socket) => this.#onConnection(socket));
  }

  // Cable un client fraichement connecte : d'abord la resync, puis un handler
  // par evenement. IMPORTANT : chaque `.on` ne contient AUCUNE logique — il se
  // contente d'appeler la methode nommee correspondante de la session. C'est ce
  // qui garde ce controller mince et la logique testable dans GameSession.
  #onConnection(socket) {
    console.log("[socket] client connected", socket.id);
    this.#session.sendSnapshotTo(socket); // envoie l'etat courant au nouvel arrivant

    socket.on(CLIENT_EVENTS.START_GAME, () => this.#session.startGame());
    socket.on(CLIENT_EVENTS.LAUNCH_BALL, () => this.#session.launchBall());
    socket.on(CLIENT_EVENTS.COLLISION, (payload) => this.#session.applyCollision(payload));
    socket.on(CLIENT_EVENTS.BALL_LOST, () => this.#session.loseBall());
    socket.on(CLIENT_EVENTS.RESET_HIGHSCORE, () => this.#session.resetHighScore());
    socket.on(CLIENT_EVENTS.CABINET_BUTTON, (payload) => this.#session.relayCabinetButton(socket, payload));

    // Les 4 evenements flipper partagent le meme handler (relai aux autres ecrans).
    for (const ev of FLIPPER_EVENTS) {
      socket.on(ev, (payload) => this.#session.relayFlipper(socket, ev, payload));
    }
  }
}
