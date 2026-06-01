/**
 * Backglass — Montage du DOM (structure statique uniquement).
 */
export function mountBackglassRoot() {
  const app = document.createElement("main");
  app.className = "backglass";
  app.innerHTML = `
    <div class="backglass__background"></div>
    <div class="backglass__overlay" aria-live="polite">
      <div class="backglass__metrics">
        <div class="backglass__metric-row">
          <img class="backglass__element" src="/assets/img/Sc-score.png" alt="Score element" />
          <div class="backglass__metric-label">ore</div>
          <div id="scoreValue" class="backglass__metric-value">0</div>
        </div>
        <div class="backglass__metric-row">
          <img class="backglass__element" src="/assets/img/Hi-highscore.png" alt="Highscore element" />
          <div class="backglass__metric-label">ghscore</div>
          <div id="highscoreValue" class="backglass__metric-value">0</div>
        </div>
        <div class="backglass__metric-row">
          <img class="backglass__element" src="/assets/img/Ba-ballsleft.png" alt="Balls left element" />
          <div class="backglass__metric-label">lls left</div>
          <div id="ballsLeftValue" class="backglass__metric-value">3/3</div>
        </div>
      </div>
      <div id="highscore-popup" class="highscore-popup" aria-hidden="true">New Highest score !</div>
    </div>
  `;

  document.body.append(app);

  return {
    scoreValue: document.getElementById("scoreValue"),
    ballsLeftValue: document.getElementById("ballsLeftValue"),
    highscoreValue: document.getElementById("highscoreValue"),
    highscorePopup: document.getElementById("highscore-popup"),
  };
}
