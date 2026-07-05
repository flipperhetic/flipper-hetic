import { CLIENT_EVENTS, MessageProtocol } from "shared";

// Flippers : relais purs (pas de logique metier), meme traitement pour les 4.
const FLIPPER_EVENTS = [
  CLIENT_EVENTS.FLIPPER_LEFT_DOWN,
  CLIENT_EVENTS.FLIPPER_LEFT_UP,
  CLIENT_EVENTS.FLIPPER_RIGHT_DOWN,
  CLIENT_EVENTS.FLIPPER_RIGHT_UP,
];

/**
 * Couche transport ENTRANTE (WebSocket natif).
 *
 * Le WebSocket natif n'a pas d'evenements nommes : tout arrive sur un seul canal
 * `message`. On decode l'enveloppe { event, data } puis on aiguille vers la
 * methode nommee de la session via une TABLE de dispatch (event -> handler) —
 * pas de gros `switch`, et aucune logique metier ici.
 */
export class SocketController {
  #wss;          // serveur WebSocket (lib `ws`) — injecte
  #session;      // orchestration metier
  #broadcaster;  // pour (de)referencer les clients connectes

  constructor(wss, session, broadcaster) {
    this.#wss = wss;
    this.#session = session;
    this.#broadcaster = broadcaster;
  }

  register() {
    this.#wss.on("connection", (ws) => this.#onConnection(ws));
  }

  #onConnection(ws) {
    this.#broadcaster.addClient(ws);   // memorise le client pour les emissions
    this.#session.sendSnapshotTo(ws);  // resync : etat courant pour le nouvel arrivant

    const handlers = this.#buildHandlers(ws);

    ws.on("message", (raw) => {
      const msg = MessageProtocol.decode(raw);
      if (!msg) return;                       // trame invalide -> ignoree
      handlers.get(msg.event)?.(msg.data);    // event inconnu -> ignore
    });

    ws.on("close", () => {
      this.#broadcaster.removeClient(ws);
    });
  }

  /**
   * Construit la table event -> handler pour CE client (closure sur `ws`, requis
   * par les relais qui doivent exclure l'emetteur). Chaque handler delegue a une
   * methode nommee de la session.
   */
  #buildHandlers(ws) {
    const session = this.#session;
    const handlers = new Map([
      [CLIENT_EVENTS.START_GAME, () => session.startGame()],
      [CLIENT_EVENTS.LAUNCH_BALL, () => session.launchBall()],
      [CLIENT_EVENTS.COLLISION, (data) => session.applyCollision(data)],
      [CLIENT_EVENTS.BALL_LOST, () => session.loseBall()],
      [CLIENT_EVENTS.RESET_HIGHSCORE, () => session.resetHighScore()],
      [CLIENT_EVENTS.CABINET_BUTTON, (data) => session.relayCabinetButton(ws, data)],
    ]);
    for (const ev of FLIPPER_EVENTS) {
      handlers.set(ev, (data) => session.relayFlipper(ws, ev, data));
    }
    return handlers;
  }
}
