import { CLIENT_EVENTS } from "shared";

/**
 * Use case : lancer la bille (plunger). Pas de physique cote serveur :
 * on enregistre seulement l'evenement pour resynchroniser les clients.
 */
export class LaunchBall {
  execute(state) {
    if (!state.isPlaying) return { changed: false };
    state.lastEvent = CLIENT_EVENTS.LAUNCH_BALL;
    return { changed: true };
  }
}
