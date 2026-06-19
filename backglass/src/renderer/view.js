/**
 * Backglass — Mise à jour de la vue à partir de l'état serveur.
 */

const VIDEO_BY_EVENT = {
  'tunnel':    '/assets/video/tight-tight-tight.mov',
  'tunnel-rv': '/assets/video/own-private-domicile-video.mp4.mov',
};

const COUNT_UP_DURATION = 600;

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/**
 * Renvoie l'intensité du « punch » (scale + inclinaison) selon l'ampleur du gain.
 * Petit gain → petit pop ; gros jackpot (tunnel) → gros impact.
 */
function punchIntensity(delta) {
  if (delta >= 2000) return { scale: 1.7, tilt: 9 };
  if (delta >= 500)  return { scale: 1.5, tilt: 6 };
  if (delta >= 50)   return { scale: 1.32, tilt: 4 };
  return { scale: 1.18, tilt: 2 };
}

/**
 * (Re)déclenche l'animation CSS `score-punch` sur un élément, avec une intensité
 * proportionnelle au gain et une inclinaison alternée gauche/droite.
 */
function triggerPunch(el, delta, flip) {
  const { scale, tilt } = punchIntensity(delta);
  el.classList.remove('punch');
  void el.offsetWidth; // force reflow pour pouvoir relancer l'animation
  el.style.setProperty('--punch-scale', String(scale));
  el.style.setProperty('--punch-tilt', `${flip ? -tilt : tilt}deg`);
  el.classList.add('punch');
}

/**
 * Anime le texte d'un élément de `from` vers `to` (entiers).
 * Ne défile que vers le haut ; toute baisse est appliquée instantanément.
 * Avec `{ punch: true }`, joue en plus un effet d'impact à chaque hausse.
 * Retourne une fonction `set(value)` qui annule l'animation en cours.
 */
function createCountUp(el, { punch = false } = {}) {
  let current = el ? Number(el.textContent) || 0 : 0;
  let rafId = 0;
  let flip = false;

  if (el && typeof el.addEventListener === 'function') {
    el.addEventListener('animationend', (e) => {
      if (e.animationName === 'score-punch') el.classList.remove('punch');
    });
  }

  return function set(value) {
    if (!el) return;
    const target = Math.round(value);
    const canAnimate = typeof requestAnimationFrame === 'function';
    if (canAnimate) cancelAnimationFrame(rafId);

    if (target <= current || !canAnimate || prefersReducedMotion()) {
      current = target;
      el.textContent = String(target);
      return;
    }

    if (punch) {
      flip = !flip;
      triggerPunch(el, target - current, flip);
    }

    const from = current;
    const delta = target - from;
    const start = performance.now();

    const tick = (now) => {
      const t = Math.min((now - start) / COUNT_UP_DURATION, 1);
      const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
      current = Math.round(from + delta * eased);
      el.textContent = String(current);
      if (t < 1) {
        rafId = requestAnimationFrame(tick);
      } else {
        current = target;
        el.textContent = String(target);
      }
    };

    rafId = requestAnimationFrame(tick);
  };
}

export function createBackglassView(refs) {
  const { scoreValue, ballsLeftValue, highscoreValue, ballIcons, ballsCount, ballLossOverlay } = refs;
  const TOTAL_BALLS = Array.isArray(ballIcons) ? ballIcons.length : 3;
  let prevBallsLeft = null;
  let ballLossTimer = 0;

  const setScore = createCountUp(scoreValue, { punch: true });
  const setHighscore = createCountUp(highscoreValue, { punch: true });

  // Animation plein écran : le sachet grossit, se déchire, les cristaux jaillissent.
  function playBallLoss(lostIndex) {
    const el = ballLossOverlay;
    if (!el || typeof requestAnimationFrame !== "function" || prefersReducedMotion()) return;
    clearTimeout(ballLossTimer);
    el.classList.remove("active", "closing");

    // Le gros sachet part de la place du sachet perdu dans la rangée (effet FLIP).
    const stage = el.querySelector(".ball-loss__stage");
    const icon = Array.isArray(ballIcons) ? ballIcons[lostIndex] : null;
    if (stage && icon && typeof icon.getBoundingClientRect === "function") {
      const ir = icon.getBoundingClientRect();
      const sr = stage.getBoundingClientRect();
      if (sr.width > 0) {
        const fromX = Math.round(ir.left + ir.width / 2 - (sr.left + sr.width / 2));
        const fromY = Math.round(ir.top + ir.height / 2 - (sr.top + sr.height / 2));
        stage.style.setProperty("--from-x", `${fromX}px`);
        stage.style.setProperty("--from-y", `${fromY}px`);
        stage.style.setProperty("--from-scale", (ir.width / sr.width).toFixed(3));
      }
    }

    void el.offsetWidth; // reflow pour relancer les animations CSS
    el.setAttribute("aria-hidden", "false");
    el.classList.add("active");
    // Fermeture en 2 temps : on fait disparaître l'overlay AVANT de retirer .active,
    // sinon les fragments reviennent visibles (le sachet réapparaît) pendant le fondu.
    ballLossTimer = setTimeout(() => {
      el.classList.add("closing");
      ballLossTimer = setTimeout(() => {
        el.classList.remove("active", "closing");
        el.setAttribute("aria-hidden", "true");
      }, 320);
    }, 3400);
  }

  // Sachets de meth : un par balle. On "vide" (classe lost) ceux des balles perdues.
  function renderBalls(ballsLeft) {
    if (Array.isArray(ballIcons)) {
      ballIcons.forEach((icon, index) => {
        icon.classList.toggle("lost", index >= ballsLeft);
      });
    }
    if (ballsCount) {
      ballsCount.textContent = `${Math.max(0, ballsLeft)}/${TOTAL_BALLS}`;
    }
    if (prevBallsLeft !== null && ballsLeft < prevBallsLeft) {
      // Le sachet qui vient d'être perdu est celui d'index `ballsLeft` (0-based).
      playBallLoss(ballsLeft);
    }
    prevBallsLeft = ballsLeft;
  }

  // Machine d'états des écrans (accueil / jeu / game over).
  // Le serveur repasse en "idle" ~6 s après la défaite, mais on MAINTIENT
  // l'écran Game Over pendant 2 min avant de laisser revenir l'accueil.
  const GAME_OVER_HOLD_MS = 2 * 60 * 1000;
  let gameOverActive = false;
  let gameOverTimer = 0;

  function showAttract() {
    refs.root?.classList.remove("show-game-over");
    refs.root?.classList.remove("entered");
  }
  function showBackglass() {
    refs.root?.classList.remove("show-game-over");
    refs.root?.classList.add("entered");
  }

  function syncScreens(status, score, highScore) {
    if (!refs.root) return;

    if (status === "playing") {
      clearTimeout(gameOverTimer);
      gameOverActive = false;
      showBackglass();
      return;
    }

    if (status === "game_over") {
      if (!gameOverActive) {
        gameOverActive = true;
        fillGameOver(score, highScore);
        // Au bout de 2 min : on lâche le game over et l'accueil réapparaît.
        clearTimeout(gameOverTimer);
        gameOverTimer = setTimeout(() => {
          gameOverActive = false;
          showAttract();
        }, GAME_OVER_HOLD_MS);
      }
      refs.root.classList.add("entered"); // accueil masqué
      refs.root.classList.add("show-game-over");
      return;
    }

    // status "idle" : si on tient encore le game over (fenêtre 2 min), on l'ignore.
    if (gameOverActive) return;
    showAttract();
  }

  // Groupe les chiffres par 3 (ex. 12450 -> "12 450").
  function formatScore(n) {
    return String(n ?? 0).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  }

  // Remplit le dossier "scène de crime" (une seule fois par game over).
  function fillGameOver(score, highScore) {
    if (refs.gameOverScore) refs.gameOverScore.textContent = formatScore(score);
    if (refs.gameOverRecord) refs.gameOverRecord.textContent = formatScore(highScore);
    if (refs.gameOverCase) {
      refs.gameOverCase.textContent = `CASE #${String(Math.floor(Math.random() * 900) + 100)}`;
    }
    const beatRecord = (score ?? 0) > 0 && (score ?? 0) >= (highScore ?? 0);
    refs.gameOverNewRecord?.classList.toggle("visible", beatRecord);
  }

  return {
    // Quitte l'écran d'accueil (appelé sur "Press Enter").
    dismissAttract() {
      refs.root?.classList.add("entered");
    },
    renderState(nextState) {
      setScore(nextState.score ?? 0);
      setHighscore(nextState.highScore ?? 0);
      renderBalls(nextState.ballsLeft ?? 0);
      syncScreens(nextState.status, nextState.score, nextState.highScore);
    },
    showHighScorePopup() {
      const popup = refs.highscorePopup;
      if (!popup) return;
      popup.setAttribute("aria-hidden", "false");
      popup.classList.add("visible");
      const ANIMATION_DURATION = 3500;
      setTimeout(() => {
        popup.classList.remove("visible");
        popup.setAttribute("aria-hidden", "true");
      }, ANIMATION_DURATION);
    },
    showVideoPopup(eventType) {
      const popup = refs.videoPopup;
      const video = refs.specialEventVideo;
      if (!popup || !video) return;
      if (!video.paused && !video.ended) return;
      const src = VIDEO_BY_EVENT[eventType];
      if (!src) return;

      const hide = () => {
        popup.classList.remove("visible");
        popup.setAttribute("aria-hidden", "true");
        video.src = "";
        video.onerror = null;
        video.onended = null;
      };

      video.src = src;
      video.load();
      popup.setAttribute("aria-hidden", "false");
      popup.classList.add("visible");
      video.onended = hide;
      video.onerror = hide;
      video.addEventListener('canplay', function onCanPlay() {
        video.removeEventListener('canplay', onCanPlay);
        video.play().catch(hide);
      });
    },
  };
}
