/**
 * Presenter : transforme l'entite de domaine `GameState` en DTO « fil »
 * (la forme JSON envoyee aux clients). La serialisation est une preoccupation
 * de la couche transport, pas du domaine — l'entite ignore tout du format reseau.
 */
export class GameStatePresenter {
  present(state) {
    return {
      status: state.status,
      score: state.score,
      highScore: state.highScore || 0,
      ballsLeft: state.ballsLeft,
      currentBall: state.currentBall,
      lastEvent: state.lastEvent,
    };
  }
}
