/**
 * Use case : demarrer une nouvelle partie.
 */
export function startGame(state) {
  if (state.isPlaying) return { changed: false };
  state.start();
  return {
    changed: true,
    dmdMessage: `BALL ${state.currentBall}`,
  };
}
