/**
 * Use case : demarrer une nouvelle partie.
 *
 * @returns { changed, dmdMessage? } — `changed: false` si une partie est deja
 *   en cours (on ignore le start pour ne pas reinitialiser le score en plein jeu).
 */
export class StartGame {
  execute(state) {
    if (state.isPlaying) return { changed: false }; // garde anti-redemarrage
    state.start(); // reset des billes/score, statut -> "playing" (preserve le record)
    return {
      changed: true,
      dmdMessage: `BALL ${state.currentBall}`,
    };
  }
}
