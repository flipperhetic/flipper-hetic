/**
 * Composition root de la couche transport.
 *
 * Assemble les classes (repository de persistance, presenter, broadcaster,
 * session d'orchestration, controller) et expose le contrat utilise par
 * `index.js` et les tests : `registerSocketHandlers(wss)` + `resetState()`.
 *
 * Aucune logique metier ici : elle vit dans `domain/` et `usecases/`,
 * l'orchestration dans `transport/GameSession`, le transport (WebSocket natif)
 * dans `transport/GameBroadcaster` + `transport/SocketController`.
 */
import { HighScoreRepository } from "./persistence/HighScoreRepository.js";
import { GameBroadcaster } from "./transport/GameBroadcaster.js";
import { GameStatePresenter } from "./transport/GameStatePresenter.js";
import { GameSession } from "./transport/GameSession.js";
import { SocketController } from "./transport/SocketController.js";

let session = null;

/**
 * Branche les handlers sur le serveur WebSocket (`ws`).
 * @param {import("ws").WebSocketServer} wss
 */
export function registerSocketHandlers(wss) {
  const broadcaster = new GameBroadcaster(new GameStatePresenter());
  const repository = new HighScoreRepository();
  session = new GameSession({ broadcaster, highScoreRepository: repository });
  session.init();
  new SocketController(wss, session, broadcaster).register();
}

/**
 * Remet l'etat a zero (utilise par les tests pour l'isolation).
 */
export function resetState() {
  session?.reset();
}
