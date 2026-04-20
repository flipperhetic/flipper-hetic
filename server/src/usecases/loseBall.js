/**
 * Use case : perte d'une bille.
 */
export function loseBall(state) {
  const result = state.loseBall();
  if (!result) return { changed: false };

  if (result === "game_over") {
    return { changed: true, gameOver: true, dmdMessage: "GAME OVER" };
  }
  return { changed: true, gameOver: false, dmdMessage: `BALL ${state.currentBall}` };
}
