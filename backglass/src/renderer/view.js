/**
 * Backglass — Mise à jour de la vue à partir de l'état serveur.
 */

/**
 * @param {{ scoreValue: HTMLElement; ballsLeftValue: HTMLElement; highscoreValue: HTMLElement; highscorePopup: HTMLElement }} refs
 */
export function createBackglassView(refs) {
  const { scoreValue, ballsLeftValue, highscoreValue } = refs;
  let highscoreBeatAnimationEndTime = 0;

  return {
    renderState(nextState) {
      scoreValue.textContent = String(nextState.score ?? 0);
      if (highscoreValue) highscoreValue.textContent = String(nextState.highScore ?? 0);
      ballsLeftValue.textContent = `${String(nextState.ballsLeft ?? 0)}/3`;
    },
    showHighScorePopup() {
      const popup = refs.highscorePopup;
      if (!popup) return;
      popup.setAttribute("aria-hidden", "false");
      popup.classList.add("visible");
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
