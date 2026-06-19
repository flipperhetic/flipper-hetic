/**
 * Use case : appliquer une collision typee (bumper, tunnel, mur…).
 *
 * Le calcul des points + la garde "hors partie / type invalide" vivent dans le
 * domaine (`state.applyCollision`). Ce use case y ajoute la seule regle
 * applicative : detecter un record battu EN COURS de partie.
 *
 * @returns {{changed: boolean, highScoreBeat: boolean}}
 *  - changed       : la collision a modifie l'etat (score) -> a diffuser
 *  - highScoreBeat : le score vient de depasser l'ancien record (>0)
 */
export class ApplyCollision {
  execute(state, type) {
    const changed = state.applyCollision(type);
    let highScoreBeat = false;
    if (changed) {
      const previousHigh = state.highScore || 0;
      // On n'annonce un record que s'il en existait deja un (>0) : depasser un
      // record a 0 (premiere partie) n'est pas un "record battu" cote UI.
      if (previousHigh > 0 && state.score > previousHigh) {
        highScoreBeat = true;
        state.highScore = state.score; // le record suit le score en direct
      }
    }
    return { changed, highScoreBeat };
  }
}
