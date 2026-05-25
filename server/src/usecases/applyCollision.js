/**
 * Use case : appliquer une collision typee.
 */
export function applyCollision(state, type) {
  const changed = state.applyCollision(type);
  // Check if this collision caused a high score beat
  let highScoreBeat = false;
  if (changed) {
    const previousHigh = state.highScore || 0;
    if (previousHigh > 0 && state.score > previousHigh) {
      highScoreBeat = true;
      state.highScore = state.score;
    }
  }
  return { changed, highScoreBeat };
}
