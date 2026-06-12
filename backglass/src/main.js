/**
 * Backglass — Composition root.
 */
import "./styles.css";
import { mountBackglassRoot } from "./renderer/mount.js";
import { createBackglassView } from "./renderer/view.js";
import { initNetwork } from "./adapters/network.js";

const refs = mountBackglassRoot();
const { renderState, showHighScorePopup, showVideoPopup } = createBackglassView(refs);

const serverOverlay = document.createElement("div");
serverOverlay.style.cssText = [
  "display:none;position:fixed;inset:0;z-index:9999",
  "background:rgba(0,0,0,.88);align-items:center;justify-content:center",
  "flex-direction:column;gap:12px",
  "font-family:'Courier New',monospace;color:#ff4444;font-size:1.1rem;text-align:center",
].join(";");
serverOverlay.innerHTML = "<strong>Serveur hors ligne</strong><span>Reconnexion en cours…</span>";
document.body.appendChild(serverOverlay);

initNetwork({
  onConnect() { serverOverlay.style.display = "none"; },
  onConnectionError() { serverOverlay.style.display = "flex"; },
  onStateUpdated: renderState,
  onHighScoreBeat: () => showHighScorePopup(),
  onSpecialEvent: ({ event }) => showVideoPopup(event),
});
