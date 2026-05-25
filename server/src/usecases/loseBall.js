/**
 * Use case : perte d'une bille.
 */
export function loseBall(state) {
  const result = state.loseBall();
  if (!result) return { changed: false };

  if (result === "game_over") {
    // Check if the final score beats the saved high score.
    // Always update the persisted high score when beaten, but only treat
    // it as a "beat" (for sounds/popups) if there was a previous high (>0).
    const previousHigh = state.highScore || 0;
    let highScoreUpdated = false;
    let highScoreBeat = false;
    if (state.score > previousHigh) {
      state.highScore = state.score;
      highScoreUpdated = true;
      if (previousHigh > 0) highScoreBeat = true;
    }
    return { changed: true, gameOver: true, dmdMessage: "GAME OVER", highScoreUpdated, highScoreBeat, highScore: state.highScore };
  }

  return { changed: true, gameOver: false, dmdMessage: `BALL ${state.currentBall}` };
}
