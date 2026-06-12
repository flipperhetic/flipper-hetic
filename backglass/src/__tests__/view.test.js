import { describe, it, expect, vi, beforeEach } from "vitest";
import { createBackglassView } from "../renderer/view.js";

function makeRefs() {
  return {
    scoreValue: { textContent: "" },
    ballsLeftValue: { textContent: "" },
    highscoreValue: { textContent: "" },
    highscorePopup: {
      setAttribute: vi.fn(),
      classList: { add: vi.fn(), remove: vi.fn() },
    },
    videoPopup: {
      setAttribute: vi.fn(),
      classList: { add: vi.fn(), remove: vi.fn() },
    },
    specialEventVideo: {
      paused: true,
      ended: false,
      src: "",
      load: vi.fn(),
      play: vi.fn().mockResolvedValue(undefined),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    },
  };
}

describe("renderState", () => {
  it("1 — met a jour score, highScore, ballsLeft", () => {
    const refs = makeRefs();
    const { renderState } = createBackglassView(refs);
    renderState({ score: 1500, highScore: 3000, ballsLeft: 2 });
    expect(refs.scoreValue.textContent).toBe("1500");
    expect(refs.highscoreValue.textContent).toBe("3000");
    expect(refs.ballsLeftValue.textContent).toBe("2/3");
  });

  it("2 — valeurs absentes affichees comme 0", () => {
    const refs = makeRefs();
    const { renderState } = createBackglassView(refs);
    renderState({});
    expect(refs.scoreValue.textContent).toBe("0");
    expect(refs.ballsLeftValue.textContent).toBe("0/3");
  });
});

describe("showHighScorePopup", () => {
  it("3 — rend le popup visible (aria-hidden false + classe visible)", () => {
    const refs = makeRefs();
    const { showHighScorePopup } = createBackglassView(refs);
    showHighScorePopup();
    expect(refs.highscorePopup.setAttribute).toHaveBeenCalledWith("aria-hidden", "false");
    expect(refs.highscorePopup.classList.add).toHaveBeenCalledWith("visible");
  });

  it("4 — isHighScoreAnimationBlocking retourne false par defaut, true juste apres", () => {
    const refs = makeRefs();
    const { showHighScorePopup, isHighScoreAnimationBlocking } = createBackglassView(refs);
    expect(isHighScoreAnimationBlocking()).toBe(false);
    showHighScorePopup();
    expect(isHighScoreAnimationBlocking()).toBe(true);
  });
});

describe("showVideoPopup", () => {
  it("5 — type inconnu : ne fait rien", () => {
    const refs = makeRefs();
    const { showVideoPopup } = createBackglassView(refs);
    showVideoPopup("inexistant");
    expect(refs.videoPopup.classList.add).not.toHaveBeenCalled();
  });

  it("6 — type tunnel : set src video et rend le popup visible", () => {
    const refs = makeRefs();
    const { showVideoPopup } = createBackglassView(refs);
    showVideoPopup("tunnel");
    expect(refs.specialEventVideo.src).toBeTruthy();
    expect(refs.videoPopup.setAttribute).toHaveBeenCalledWith("aria-hidden", "false");
    expect(refs.videoPopup.classList.add).toHaveBeenCalledWith("visible");
  });

  it("7 — video deja en lecture : ne relance pas", () => {
    const refs = makeRefs();
    refs.specialEventVideo.paused = false;
    refs.specialEventVideo.ended = false;
    const { showVideoPopup } = createBackglassView(refs);
    showVideoPopup("tunnel");
    expect(refs.videoPopup.classList.add).not.toHaveBeenCalled();
  });
});
