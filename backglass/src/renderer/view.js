/**
 * Backglass — Mise à jour de la vue à partir de l'état serveur.
 */

/**
 * @param {{ scoreValue: HTMLElement; ballsLeftValue: HTMLElement; statusValue: HTMLElement }} refs
 */
export function createBackglassView(refs) {
  const { scoreValue, ballsLeftValue, statusValue } = refs;

  return {
    renderState(nextState) {
      scoreValue.textContent = String(nextState.score ?? 0);
      ballsLeftValue.textContent = String(nextState.ballsLeft ?? 0);
      statusValue.textContent = String(nextState.status ?? "idle");
    },
  };
}
