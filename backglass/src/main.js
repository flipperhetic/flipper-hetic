/**
 * Backglass — Composition root.
 */
import "./styles.css";
import { createBackglassDOM } from "./renderer/dom.js";
import { initNetwork } from "./adapters/network.js";

const { renderState } = createBackglassDOM();

initNetwork({
  onStateUpdated: renderState,
});
