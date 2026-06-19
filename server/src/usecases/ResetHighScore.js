/**
 * Use case : remettre le high score a zero.
 * Le use case reste pur : la persistance disque est geree par l'appelant
 * (la session), pas ici.
 */
export class ResetHighScore {
  execute(state) {
    state.highScore = 0;
    return { changed: true };
  }
}
