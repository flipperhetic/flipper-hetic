/**
 * Use case : perte d'une bille (drain).
 *
 * Le domaine (`state.loseBall`) decremente les billes et decide s'il reste des
 * billes ou si c'est la fin de partie ; il renvoie :
 *   - null         : action ignoree (hors partie, ou double ball_lost)
 *   - "ball_lost"  : bille suivante
 *   - "game_over"  : derniere bille perdue
 *
 * Ce use case traduit ce resultat en instructions pour la session (message DMD,
 * fin de partie, gestion du record).
 *
 * Distinction importante sur le record en fin de partie :
 *   - highScoreUpdated : le score final bat l'ancien record -> il faut PERSISTER.
 *   - highScoreBeat    : en plus, il y avait deja un record (>0) -> il faut
 *                        ANNONCER (popup/son). Battre un record a 0 ne s'annonce pas.
 */
export class LoseBall {
  execute(state) {
    const result = state.loseBall();
    if (!result) return { changed: false };

    if (result === "game_over") {
      const previousHigh = state.highScore || 0;
      let highScoreUpdated = false;
      let highScoreBeat = false;
      if (state.score > previousHigh) {
        state.highScore = state.score;
        highScoreUpdated = true;            // toujours persister un nouveau record
        if (previousHigh > 0) highScoreBeat = true; // n'annoncer que s'il y avait un record
      }
      return { changed: true, gameOver: true, dmdMessage: "GAME OVER", highScoreUpdated, highScoreBeat, highScore: state.highScore };
    }

    // Bille suivante : le DMD affiche le numero de la bille en cours.
    return { changed: true, gameOver: false, dmdMessage: `BALL ${state.currentBall}` };
  }
}
