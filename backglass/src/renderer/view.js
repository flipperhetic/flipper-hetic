/**
 * Backglass — Mise à jour de la vue à partir de l'état serveur.
 */

/**
 * @param {{ scoreValue: HTMLElement; ballsLeftValue: HTMLElement; statusValue: HTMLElement }} refs
 */
export function createBackglassView(refs) {
  const { scoreValue, ballsLeftValue, statusValue, highscoreValue } = refs;
  let highscoreBeatAnimationEndTime = 0;

  return {
    renderState(nextState) {
      scoreValue.textContent = String(nextState.score ?? 0);
      if (highscoreValue) highscoreValue.textContent = String(nextState.highScore ?? 0);
      ballsLeftValue.textContent = String(nextState.ballsLeft ?? 0);
      statusValue.textContent = String(nextState.status ?? "idle");
    },
    showHighScorePopup() {
      const popup = refs.highscorePopup;
      if (!popup) return;
      popup.setAttribute("aria-hidden", "false");
      popup.classList.add("visible");
      // Animation blocks for 3.5 seconds
      const ANIMATION_DURATION = 3500;
      highscoreBeatAnimationEndTime = performance.now() + ANIMATION_DURATION;
      setTimeout(() => {
        popup.classList.remove("visible");
        popup.setAttribute("aria-hidden", "true");
      }, ANIMATION_DURATION);
    },
    isHighScoreAnimationBlocking() {
      return performance.now() < highscoreBeatAnimationEndTime;
    },
  };
}
