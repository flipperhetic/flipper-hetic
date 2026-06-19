/**
 * Backglass — Montage du DOM (structure statique uniquement).
 */

// Sachet de "blue meth" (thème Breaking Bad) — un par balle restante.
const methBag = () =>
  `<span class="backglass__ball"><img class="backglass__ball-icon" src="/assets/img/meth-bag.png" alt="" /></span>`;

// Particules projetées quand un sachet se déchire (overlay de perte de balle).
const SHARD_COUNT = 34;
const SMOKE_COUNT = 22;
const SMOKE_SRCS = [
  "/assets/img/smoke-1.png",
  "/assets/img/smoke-2.png",
  "/assets/img/smoke-3.png",
];

function buildParticles(count, className, minDist, maxDist) {
  let html = "";
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.7;
    const dist = minDist + Math.random() * (maxDist - minDist);
    const tx = Math.cos(angle) * dist;
    const ty = Math.sin(angle) * dist;
    const rot = Math.random() * 1000 - 500;
    const delay = Math.floor(Math.random() * 160);
    const scale = 0.6 + Math.random() * 1.4;
    html += `<span class="${className}" style="--tx:${tx.toFixed(0)}px;--ty:${ty.toFixed(0)}px;--rot:${rot.toFixed(0)}deg;--d:${delay}ms;--s:${scale.toFixed(2)}"></span>`;
  }
  return html;
}

// Bouffées de fumée (images PNG) : couvrent tout l'écran pour un effet "reset".
// Distances en vmin pour s'étaler sur tout le viewport quelle que soit la taille.
function buildSmoke(count) {
  let html = "";
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 1.1;
    const dist = 18 + Math.random() * 48; // 18 → 66vmax : pousse jusque dans les coins
    const tx = Math.cos(angle) * dist;
    const ty = Math.sin(angle) * dist;
    const rot = Math.random() * 180 - 90;
    const delay = Math.floor(Math.random() * 280);
    const scale = 3.6 + Math.random() * 3.8; // énormes, pour saturer l'écran
    const src = SMOKE_SRCS[i % SMOKE_SRCS.length];
    html += `<img class="ball-loss__smoke" src="${src}" alt="" style="--tx:${tx.toFixed(1)}vmax;--ty:${ty.toFixed(1)}vmax;--rot:${rot.toFixed(0)}deg;--d:${delay}ms;--s:${scale.toFixed(2)}" />`;
  }
  return html;
}

// Fragments irréguliers du sachet (déchirure "sale" en plusieurs morceaux).
const FRAGMENTS = [
  { clip: "polygon(0% 0%, 26% 0%, 20% 18%, 27% 38%, 18% 58%, 25% 80%, 17% 100%, 0% 100%)", fx: -420, fy: 70, rot: -52 },
  { clip: "polygon(26% 0%, 52% 0%, 46% 22%, 53% 44%, 44% 66%, 50% 100%, 17% 100%, 25% 80%, 18% 58%, 27% 38%, 20% 18%)", fx: -180, fy: -360, rot: -28 },
  { clip: "polygon(52% 0%, 78% 0%, 72% 24%, 80% 50%, 71% 74%, 78% 100%, 50% 100%, 44% 66%, 53% 44%, 46% 22%)", fx: 180, fy: -340, rot: 30 },
  { clip: "polygon(78% 0%, 100% 0%, 100% 100%, 78% 100%, 71% 74%, 80% 50%, 72% 24%)", fx: 430, fy: 90, rot: 54 },
  { clip: "polygon(17% 100%, 50% 100%, 78% 100%, 70% 78%, 40% 70%, 24% 82%)", fx: 30, fy: 440, rot: 18 },
];

function buildFragments() {
  return FRAGMENTS.map(
    (f) =>
      `<img class="ball-loss__frag" src="/assets/img/meth-bag.png" alt="" style="clip-path:${f.clip};--fx:${f.fx}px;--fy:${f.fy}px;--frot:${f.rot}deg" />`,
  ).join("");
}

// Overlay plein écran joué à chaque balle perdue.
const ballLossOverlay = () => `
  <div id="ball-loss-overlay" class="ball-loss" aria-hidden="true">
    <div class="ball-loss__flash"></div>
    <span class="ball-loss__shockwave"></span>
    <div class="ball-loss__stage">
      ${buildFragments()}
      <div class="ball-loss__particles">
        ${buildParticles(SHARD_COUNT, "ball-loss__shard", 240, 560)}
      </div>
    </div>
    <div class="ball-loss__smokes">
      <div class="ball-loss__veil"></div>
      ${buildSmoke(SMOKE_COUNT)}
    </div>
  </div>`;

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
          <div id="ballsLeftValue" class="backglass__balls" role="img" aria-label="Balles restantes">
            ${methBag()}${methBag()}${methBag()}
            <span id="ballsCount" class="backglass__balls-count">3/3</span>
          </div>
        </div>
      </div>
      <div id="highscore-popup" class="highscore-popup" aria-hidden="true">New Highest score !</div>
    </div>
    <div id="video-popup" class="video-popup" aria-hidden="true">
      <video id="special-event-video" class="video-popup__video" playsinline muted></video>
    </div>
    ${ballLossOverlay()}
    <div id="game-over" class="game-over" aria-hidden="true">
      <div class="game-over__bg"></div>
      <img class="game-over__prop game-over__prop--chalk" src="/assets/img/chalk-outline.png" alt="" />
      <img class="game-over__prop game-over__prop--marker game-over__prop--marker-1" src="/assets/img/evidence-marker.png" alt="" />
      <img class="game-over__prop game-over__prop--marker game-over__prop--marker-2" src="/assets/img/evidence-marker.png" alt="" />
      <img class="game-over__prop game-over__prop--marker game-over__prop--marker-3" src="/assets/img/evidence-marker.png" alt="" />
      <div class="police-tape police-tape--top">POLICE LINE · DO NOT CROSS · POLICE LINE · DO NOT CROSS · POLICE LINE · DO NOT CROSS · POLICE LINE · DO NOT CROSS · </div>
      <div class="police-tape police-tape--bottom">POLICE LINE · DO NOT CROSS · POLICE LINE · DO NOT CROSS · POLICE LINE · DO NOT CROSS · POLICE LINE · DO NOT CROSS · </div>
      <div class="game-over__content">
        <img class="game-over__title" src="/assets/img/game-over-title.png" alt="Game Over" />
        <div class="case-file">
          <div class="case-file__header">
            <span>Evidence report</span>
            <span class="case-file__num" id="gameOverCase">CASE #000</span>
          </div>
          <dl class="case-file__rows">
            <div class="case-file__row"><dt>Score</dt><dd id="gameOverScore">0</dd></div>
            <div class="case-file__row"><dt>Record</dt><dd id="gameOverRecord">0</dd></div>
          </dl>
          <img class="case-file__stamp" id="gameOverNewRecord" src="/assets/img/stamp-record.png" alt="New record" />
        </div>
        <div class="game-over__replay">Press the <kbd>green button</kbd> to play again</div>
      </div>
    </div>
    <div id="attract-screen" class="attract-screen">
      <div class="attract-screen__bg"></div>
      <div class="attract-screen__scanlines"></div>
      <div class="attract-screen__flicker"></div>
      <div class="attract-screen__inner">
        <img class="attract-screen__logo" src="/assets/img/brbra-logo.png" alt="Breaking Ball" />
        <p class="attract-screen__sub">Heisenberg Pinball</p>
        <div class="attract-screen__quote" aria-hidden="true">
          <span>"Say my name."</span>
          <span>"I am the one who knocks."</span>
          <span>"Tread lightly."</span>
          <span>"Yeah, science!"</span>
        </div>
        <div class="attract-screen__press">Press the <kbd>green button</kbd> to play</div>
        <div class="attract-screen__hint">Insert coin · 1 credit</div>
      </div>
    </div>
    <div id="backglass-warm" class="backglass-warm" aria-hidden="true"></div>
  `;

  document.body.append(app);

  return {
    root: app,
    scoreValue: document.getElementById("scoreValue"),
    ballsLeftValue: document.getElementById("ballsLeftValue"),
    ballsCount: document.getElementById("ballsCount"),
    ballIcons: Array.from(app.querySelectorAll(".backglass__ball")),
    highscoreValue: document.getElementById("highscoreValue"),
    highscorePopup: document.getElementById("highscore-popup"),
    videoPopup: document.getElementById("video-popup"),
    specialEventVideo: document.getElementById("special-event-video"),
    ballLossOverlay: document.getElementById("ball-loss-overlay"),
    attractScreen: document.getElementById("attract-screen"),
    gameOverScore: document.getElementById("gameOverScore"),
    gameOverRecord: document.getElementById("gameOverRecord"),
    gameOverNewRecord: document.getElementById("gameOverNewRecord"),
    gameOverCase: document.getElementById("gameOverCase"),
  };
}
