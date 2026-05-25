/**
 * DMD — Rendu dot-matrix sur canvas.
 */
import { drawBitmapText, drawBitmapTextSmall } from "./font.js";

const DOT_COLS = 96;
const DOT_ROWS = 54;
const CANVAS_WIDTH = 1920;
const CANVAS_HEIGHT = 1080;
const DOT_RADIUS_RATIO = 0.35;
// LED color changed to green as requested
const DOT_ON = "#7AFB7B";
const DOT_OFF = "rgba(14, 129, 66, 0.16)";
const DISPLAY_BG = "#0d0401";
const TEXT_MARGIN = 2;
const TEXT_LINE_Y = Math.floor((DOT_ROWS - 7) / 2);
const TEXT_BG_PADDING = 1;
const TEXT_BG_OPACITY = 0.65;
const VISIBLE_TEXT_WIDTH = DOT_COLS - TEXT_MARGIN * 2;
const SCROLL_STEP_MS = 50;
const SCROLL_PAUSE_MS = 2500;
const GAME_OVER_PAUSE_MS = 7000;
const TRANSITION_SPACES = 4;

/**
 * Cree un renderer dot-matrix attache au canvas fourni.
 * Retourne des fonctions `renderMessage(text)`, `renderScore(score)`,
 * `updateStatus(status)`.
 */
export function createDotMatrixRenderer(canvas) {
  const ctx = canvas.getContext("2d");

  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;

  const imageCanvas = document.createElement("canvas");
  imageCanvas.width = CANVAS_WIDTH;
  imageCanvas.height = CANVAS_HEIGHT;
  const imageCtx = imageCanvas.getContext("2d", { willReadFrequently: true });

  const textMaskCanvas = document.createElement("canvas");
  textMaskCanvas.width = DOT_COLS;
  textMaskCanvas.height = DOT_ROWS;
  const textMaskCtx = textMaskCanvas.getContext("2d", { willReadFrequently: true });

  const dmdState = {
    message: "PRESS START",
    score: 0,
    status: "idle",
  };

  const scrollState = {
    offsetX: TEXT_MARGIN,
    pauseUntil: 0,
    lastUpdate: performance.now(),
    active: false,
    textWidth: 0,
    targetX: TEXT_MARGIN,
    loop: false,
    text: "",
    finalText: "",
    isTransition: false,
  };
  let gameOverTimeoutId = null;

  function clearGameOverTimeout() {
    if (gameOverTimeoutId !== null) {
      clearTimeout(gameOverTimeoutId);
      gameOverTimeoutId = null;
    }
  }

  // Load pixel-art image from dmd/img — draw it full-screen on the real 16:9 canvas
  const img = new Image();
  let imgLoaded = false;
  let imgNaturalW = 0;
  let imgNaturalH = 0;
  img.onload = () => {
    imgLoaded = true;
    imgNaturalW = img.naturalWidth;
    imgNaturalH = img.naturalHeight;
    render();
  };
  img.onerror = () => {
    const normalizedBaseUrl = (import.meta?.env?.BASE_URL ?? "/").replace(/\/$/, "");
    const assetPath = `${normalizedBaseUrl}/assets/img/BB-Pixel-DMD.jpg`;
    console.warn(`[dmd] failed to load image from ${assetPath}`);
  };
  const normalizedBaseUrl = (import.meta?.env?.BASE_URL ?? "/").replace(/\/$/, "");
  img.src = `${normalizedBaseUrl}/assets/img/BB-Pixel-DMD.jpg`;

  function normalizeMessage(input) {
    const src = typeof input === "string" ? input : "";
    const up = src.trim().toUpperCase();
    if (!up) return "PRESS START";
    return up.slice(0, 16);
  }

  function measureTextWidth(text) {
    if (!text) return 0;
    return text.length * 5 + Math.max(0, text.length - 1);
  }

  function getScoreText() {
    return `POINTS : ${String(dmdState.score).slice(0, 8)}`;
  }

  function getTextForStatus(status) {
    if (status === "playing") {
      return getScoreText();
    }
    if (status === "game_over") {
      return "GAME OVER!";
    }
    return dmdState.message || "PRESS START";
  }

  function getCurrentText() {
    if (scrollState.isTransition) {
      return scrollState.text;
    }
    return getTextForStatus(dmdState.status);
  }

  function resetTextScroll(text, options = {}) {
    const normalized = (text || "").toUpperCase().slice(0, 32);
    const width = measureTextWidth(normalized);
    scrollState.text = normalized;
    scrollState.textWidth = width;
    scrollState.lastUpdate = performance.now();
    scrollState.pauseUntil = options.pauseMs != null ? performance.now() + options.pauseMs : 0;
    scrollState.offsetX = options.offsetX ?? DOT_COLS;
    scrollState.finalText = options.finalText ?? normalized;
    scrollState.isTransition = !!options.isTransition;

    if (options.isTransition) {
      scrollState.targetX = options.targetX ?? Math.floor((DOT_COLS - width) / 2);
      scrollState.loop = false;
      scrollState.active = true;
    } else {
      scrollState.loop = width > VISIBLE_TEXT_WIDTH;
      scrollState.targetX = Math.floor((DOT_COLS - width) / 2);
      // Only mark active (scrolling) when text is wider than viewport; otherwise
      // keep it static and let rendering use the status-based centered text.
      scrollState.active = scrollState.loop;
      if (!scrollState.loop) {
        scrollState.offsetX = scrollState.targetX;
      }
    }
  }

  function scheduleTextTransition(nextText, currentText = getCurrentText()) {
    if (!nextText || currentText === nextText) {
      return;
    }

    const spacer = " ".repeat(TRANSITION_SPACES);
    const compositeText = `${currentText}${spacer}${nextText}`;
    const currentWidth = measureTextWidth(currentText);
    const nextWidth = measureTextWidth(nextText);
    const spacerWidth = measureTextWidth(spacer);
    const offsetX = scrollState.active
      ? scrollState.offsetX
      : Math.floor((DOT_COLS - currentWidth) / 2);
    const targetX = Math.floor((DOT_COLS - nextWidth) / 2) - (currentWidth + spacerWidth);

    resetTextScroll(compositeText, {
      offsetX,
      isTransition: true,
      targetX,
      finalText: nextText,
    });
  }

  function updateTextScroll(now) {
    if (!scrollState.active) {
      return;
    }
    if (now < scrollState.pauseUntil) {
      return;
    }
    if (now - scrollState.lastUpdate < SCROLL_STEP_MS) {
      return;
    }

    scrollState.lastUpdate = now;
    scrollState.offsetX -= 1;

    if (scrollState.isTransition) {
      if (scrollState.offsetX <= scrollState.targetX) {
        scrollState.offsetX = scrollState.targetX;
        scrollState.isTransition = false;
        const finalText = scrollState.finalText;
        const width = measureTextWidth(finalText);
        scrollState.text = finalText;
        scrollState.textWidth = width;
        scrollState.loop = width > VISIBLE_TEXT_WIDTH;
        scrollState.targetX = Math.floor((DOT_COLS - width) / 2);
        if (scrollState.loop) {
          scrollState.active = true;
        } else {
          scrollState.active = false;
          scrollState.offsetX = scrollState.targetX;
        }
      }
      return;
    }

    if (scrollState.loop) {
      if (scrollState.offsetX <= -scrollState.textWidth - TEXT_MARGIN) {
        scrollState.offsetX = DOT_COLS;
        scrollState.pauseUntil = now + SCROLL_PAUSE_MS;
      }
    } else {
      if (scrollState.offsetX <= scrollState.targetX) {
        scrollState.offsetX = scrollState.targetX;
        scrollState.active = false;
      }
    }
  }

  function render() {
    imageCtx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    textMaskCtx.clearRect(0, 0, DOT_COLS, DOT_ROWS);
    textMaskCtx.fillStyle = "#ffffff";

    // If image loaded, draw it full-screen in the 16:9 canvas and preserve the entire image.
    if (imgLoaded) {
      const scaleH = CANVAS_HEIGHT / imgNaturalH || 1;
      const scaleW = CANVAS_WIDTH / imgNaturalW || 1;
      const scale = Math.min(scaleH, scaleW); // contain

      const drawW = Math.max(1, Math.round(imgNaturalW * scale));
      const drawH = Math.max(1, Math.round(imgNaturalH * scale));
      const dstX = Math.round((CANVAS_WIDTH - drawW) / 2);
      const dstY = Math.round((CANVAS_HEIGHT - drawH) / 2);

      try {
        imageCtx.drawImage(img, 0, 0, imgNaturalW, imgNaturalH, dstX, dstY, drawW, drawH);
      } catch (e) {
        // ignore
      }
    }

    let text, textWidth, textX;

    if (scrollState.isTransition || scrollState.active) {
      // During a transition or an active scroll we render the composite/scrolling text.
      text = scrollState.text;
      textWidth = scrollState.textWidth;
      textX = Math.floor(scrollState.offsetX);
    } else {
      // Otherwise render the canonical text for the current status, centered.
      text = getTextForStatus(dmdState.status);
      textWidth = measureTextWidth(text);
      textX = Math.floor((DOT_COLS - textWidth) / 2);
    }

    drawBitmapText(textMaskCtx, text, textX, TEXT_LINE_Y, { spacing: 1 });

    const imagePixels = imageCtx.getImageData(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT).data;
    const textPixels = textMaskCtx.getImageData(0, 0, DOT_COLS, DOT_ROWS).data;
    const dotPitchX = canvas.width / DOT_COLS;
    const dotPitchY = canvas.height / DOT_ROWS;
    const dotRadius = Math.min(dotPitchX, dotPitchY) * DOT_RADIUS_RATIO;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = DISPLAY_BG;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.globalAlpha = 0.25;
    ctx.drawImage(imageCanvas, 0, 0);
    ctx.globalAlpha = 1;

    if (textWidth > 0) {
      const textRectY = Math.max(0, TEXT_LINE_Y * dotPitchY - TEXT_BG_PADDING * dotPitchY);
      const textRectH = Math.min(canvas.height - textRectY, (7 + TEXT_BG_PADDING * 2) * dotPitchY);
      ctx.fillStyle = `rgba(0, 0, 0, ${TEXT_BG_OPACITY})`;
      ctx.fillRect(0, textRectY, canvas.width, textRectH);
    }

    for (let y = 0; y < DOT_ROWS; y += 1) {
      for (let x = 0; x < DOT_COLS; x += 1) {
        const sampleX = Math.min(CANVAS_WIDTH - 1, Math.round((x + 0.5) * (CANVAS_WIDTH / DOT_COLS)));
        const sampleY = Math.min(CANVAS_HEIGHT - 1, Math.round((y + 0.5) * (CANVAS_HEIGHT / DOT_ROWS)));
        const idx = (sampleY * CANVAS_WIDTH + sampleX) * 4;
        const imgR = imagePixels[idx + 0];
        const imgG = imagePixels[idx + 1];
        const imgB = imagePixels[idx + 2];
        const imgA = imagePixels[idx + 3];
        const textA = textPixels[(y * DOT_COLS + x) * 4 + 3];
        const drawX = x * dotPitchX + dotPitchX / 2;
        const drawY = y * dotPitchY + dotPitchY / 2;
        let fillStyle = DOT_OFF;
        let shadowColor = "transparent";
        let shadowBlur = 0;

        if (textA > 0) {
          // draw a black outline behind text dots for better contrast
          ctx.beginPath();
          ctx.fillStyle = "rgba(0, 0, 0, 0.85)";
          ctx.shadowColor = "transparent";
          ctx.shadowBlur = 0;
          ctx.arc(drawX, drawY, dotRadius * 1.2, 0, Math.PI * 2);
          ctx.fill();

          fillStyle = DOT_ON;
          shadowColor = "rgba(255, 122, 42, 0.7)";
          shadowBlur = 6;
          ctx.beginPath();
          ctx.fillStyle = fillStyle;
          ctx.shadowColor = shadowColor;
          ctx.shadowBlur = shadowBlur;
          ctx.arc(drawX, drawY, dotRadius * 0.7, 0, Math.PI * 2);
          ctx.fill();
          continue;
        } else if (imgA > 16) {
          fillStyle = `rgba(${imgR}, ${imgG}, ${imgB}, 0.9)`;
        }

        ctx.beginPath();
        ctx.fillStyle = fillStyle;
        ctx.shadowColor = shadowColor;
        ctx.shadowBlur = shadowBlur;
        ctx.arc(drawX, drawY, dotRadius, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.shadowBlur = 0;
  }

  function animate(now) {
    updateTextScroll(now);
    render();
    requestAnimationFrame(animate);
  }

  return {
    renderMessage(text) {
      const normalized = normalizeMessage(text);
      dmdState.message = normalized;

      if (dmdState.status === "idle") {
        scheduleTextTransition(dmdState.message);
        render();
        return;
      }

      if (dmdState.status === "game_over") {
        scheduleTextTransition(dmdState.message);
        render();
        return;
      }

      render();
    },

    renderScore(score) {
      dmdState.score = Number.isFinite(score) ? score : 0;
      if (!scrollState.isTransition && dmdState.status === "playing") {
        const updatedText = getTextForStatus(dmdState.status);
        scrollState.text = updatedText;
        scrollState.textWidth = measureTextWidth(updatedText);
        scrollState.loop = false;
        scrollState.targetX = Math.floor((DOT_COLS - scrollState.textWidth) / 2);
        scrollState.active = false;
        scrollState.offsetX = scrollState.targetX;
      }
      render();
    },

    updateStatus(status) {
      const nextStatus = status ?? "idle";
      const currentStatus = dmdState.status;
      if (nextStatus === currentStatus) {
        return;
      }

      clearGameOverTimeout();
      const currentText = getTextForStatus(currentStatus);
      dmdState.status = nextStatus;
      if (nextStatus === "playing" && currentStatus !== "playing") {
        dmdState.score = 0;
      }
      const nextText = getTextForStatus(nextStatus);

      if (nextStatus === "game_over") {
        const currentWidth = measureTextWidth(currentText);
        const spacerWidth = measureTextWidth(" ".repeat(TRANSITION_SPACES));
        const nextWidth = measureTextWidth(nextText);
        const startX = scrollState.active
          ? scrollState.offsetX
          : Math.floor((DOT_COLS - currentWidth) / 2);
        const targetX = Math.floor((DOT_COLS - nextWidth) / 2) - (currentWidth + spacerWidth);
        const transitionTime = Math.max(0, startX - targetX) * SCROLL_STEP_MS;

        scheduleTextTransition(nextText, currentText);
        gameOverTimeoutId = setTimeout(() => {
          if (dmdState.status !== "game_over") return;
          dmdState.status = "idle";
          scheduleTextTransition("PRESS START", nextText);
        }, GAME_OVER_PAUSE_MS + transitionTime);
        return;
      }

      if (nextStatus === "idle") {
        scheduleTextTransition(nextText, currentText);
        return;
      }

      // Other statuses (playing): transition from the current text.
      scheduleTextTransition(nextText, currentText);
    },

    /** Rendu initial. */
    init() {
      resetTextScroll(getTextForStatus(dmdState.status));
      render();
      requestAnimationFrame(animate);
    },
  };
}
