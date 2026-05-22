/**
 * Affichage volume/mute en haut a droite + raccourcis clavier (M, +/-).
 */

const HUD_STYLES = `
#audio-hud {
  position: fixed; top: 16px; right: 16px; z-index: 10000;
  display: flex; align-items: center; gap: 10px;
  padding: 8px 14px; border-radius: 999px;
  background: rgba(0, 0, 0, 0.55);
  border: 1px solid rgba(199, 231, 60, 0.3);
  color: #c7e73c;
  font-family: 'Courier New', monospace;
  font-size: 14px; letter-spacing: 1px;
  opacity: 0.25; transition: opacity 250ms ease;
  user-select: none;
  backdrop-filter: blur(6px);
}
#audio-hud:hover, #audio-hud.active { opacity: 1; }
#audio-hud .icon { cursor: pointer; font-size: 18px; }
#audio-hud .bar {
  width: 80px; height: 6px; border-radius: 3px;
  background: rgba(255, 255, 255, 0.12); overflow: hidden;
}
#audio-hud .bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #ffb300, #c7e73c);
  transition: width 120ms ease;
}
#audio-hud .val { min-width: 32px; text-align: right; font-size: 12px; }
#audio-hud .hint { font-size: 10px; opacity: 0.55; letter-spacing: 0.5px; }
#audio-hud.muted { border-color: rgba(255, 45, 45, 0.4); color: #ff6b6b; }
#audio-hud.muted .bar-fill { background: #555; }
`;

let hud = null;
let icon = null;
let fill = null;
let val = null;
let activeTimer = null;

function pulse() {
  hud.classList.add("active");
  clearTimeout(activeTimer);
  activeTimer = setTimeout(() => hud.classList.remove("active"), 1400);
}

// Appele par le moteur audio a chaque changement de volume/mute
export function updateAudioHud({ volume, muted }) {
  if (!hud) return;
  const pct = Math.round(volume * 100);
  fill.style.width = (muted ? 0 : pct) + "%";
  val.textContent = muted ? "MUTE" : `${pct}%`;
  icon.textContent = muted ? "🔇" : (pct === 0 ? "🔈" : pct < 50 ? "🔉" : "🔊");
  hud.classList.toggle("muted", muted);
}

export function mountAudioControls(audio) {
  if (document.getElementById("audio-hud-style")) return;

  const style = document.createElement("style");
  style.id = "audio-hud-style";
  style.textContent = HUD_STYLES;
  document.head.appendChild(style);

  hud = document.createElement("div");
  hud.id = "audio-hud";
  hud.innerHTML = `
    <span class="icon" title="Mute / Unmute (M)">🔊</span>
    <div class="bar"><div class="bar-fill"></div></div>
    <span class="val">60%</span>
    <span class="hint">M · +/-</span>
  `;
  document.body.appendChild(hud);

  icon = hud.querySelector(".icon");
  fill = hud.querySelector(".bar-fill");
  val = hud.querySelector(".val");

  updateAudioHud(audio.getState());

  icon.addEventListener("click", () => { audio.toggleMute(); pulse(); });

  window.addEventListener("keydown", (e) => {
    if (e.repeat) return;
    if (e.code === "KeyM") {
      e.preventDefault(); audio.toggleMute(); pulse();
    } else if (e.key === "+" || e.key === "=" || e.code === "NumpadAdd") {
      e.preventDefault(); audio.adjustVolume(0.05); pulse();
    } else if (e.key === "-" || e.key === "_" || e.code === "NumpadSubtract") {
      e.preventDefault(); audio.adjustVolume(-0.05); pulse();
    }
  });
}
