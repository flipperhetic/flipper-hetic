/**
 * Backglass — Montage du DOM (structure statique uniquement).
 */
export function mountBackglassRoot() {
  const app = document.createElement("main");
  app.className = "backglass";
  app.innerHTML = `
    <h1 class="backglass__title">FLIPPER HETIC</h1>
    <section class="backglass__grid" aria-live="polite">
      <article class="card">
        <p class="card__label">Score</p>
        <p id="scoreValue" class="card__value">0</p>
      </article>
      <article class="card">
        <p class="card__label">Billes restantes</p>
        <p id="ballsLeftValue" class="card__value">3</p>
      </article>
      <article class="card">
        <p class="card__label">Statut</p>
        <p id="statusValue" class="card__value">idle</p>
      </article>
    </section>
  `;

  document.body.append(app);

  return {
    scoreValue: document.getElementById("scoreValue"),
    ballsLeftValue: document.getElementById("ballsLeftValue"),
    statusValue: document.getElementById("statusValue"),
  };
}
