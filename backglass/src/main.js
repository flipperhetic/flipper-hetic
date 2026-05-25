/**
 * Backglass — Composition root.
 */
import "./styles.css";
import { mountBackglassRoot } from "./renderer/mount.js";
import { createBackglassView } from "./renderer/view.js";
import { initNetwork } from "./adapters/network.js";

const refs = mountBackglassRoot();
const { renderState, showHighScorePopup } = createBackglassView(refs);

initNetwork({
  onStateUpdated: renderState,
  onHighScoreBeat: () => {
    showHighScorePopup();
  },
});
