import { createDebugUI } from "./ui.js";
import { createAudioDebugUI } from "./audioDebug.js";
import { createPlayfieldDebugUI } from "./playfieldDebug.js";
import { createPhysicsDebugUI } from "./physicsDebug.js";
import { createLightsDebugUI } from "./lightsDebug.js";

function createAspectOverlay() {
  const overlay = document.createElement("div");
  overlay.style.cssText = [
    "position:fixed;top:50%;left:50%;transform:translate(-50%,-50%)",
    "border:2px solid #fff;background:transparent;pointer-events:none",
    "z-index:9998;display:none;box-sizing:border-box",
  ].join(";");
  document.body.appendChild(overlay);

  function resize() {
    const W = window.innerWidth;
    const H = window.innerHeight;
    let w, h;
    if (H * 9 / 16 <= W) { h = H; w = h * 9 / 16; }
    else { w = W; h = w * 16 / 9; }
    overlay.style.width = w + "px";
    overlay.style.height = h + "px";
  }
  resize();
  window.addEventListener("resize", resize);

  let visible = false;
  const btn = document.createElement("button");
  btn.textContent = "9:16";
  btn.style.cssText = "position:fixed;top:10px;right:270px;padding:4px 8px;background:#fff;color:#000;border:none;border-radius:3px;font:bold 11px 'Courier New';cursor:pointer;z-index:10001";
  btn.addEventListener("click", () => {
    visible = !visible;
    overlay.style.display = visible ? "block" : "none";
    btn.style.background = visible ? "#ff0" : "#fff";
  });
  document.body.appendChild(btn);
}

export function wirePlayfieldDebug(deps) {
  const { viewRuntime, audio, onResetHighScore, onResetBall, level, renderer, ambientLight, dirLight, pointLights, bloomPass, composer } = deps;
  createAspectOverlay();

  if (level) level.setPhysicsDebugVisible(true);

  const onConfigChange = (config) => {
    Object.assign(viewRuntime.params, config);
    viewRuntime.apply();
  };

  const { container, syncInputs } = createDebugUI({ onConfigChange, onResetHighScore, onResetBall });

  new MutationObserver(() => {
    if (container.style.display !== 'none') {
      syncInputs({ ...viewRuntime.params });
    }
  }).observe(container, { attributes: true, attributeFilter: ['style'] });

  if (audio) {
    createAudioDebugUI(audio);
  }
  if (level) {
    createPlayfieldDebugUI({
      gltfModel:              level.gltfModel,
      gltfInner:              level.gltfInner,
      flipperBodies:          level.flipperBodies,
      ballBody:               level.ballBody,
      world:                  deps.world,
      onConfigChange,
      physicsRotateY:         level.physicsRotateY,
      setPhysicsDebugVisible: level.setPhysicsDebugVisible,
      triggers:               level.triggers,
    });
    createPhysicsDebugUI({
      onTriggerSpecialEvent: deps.onTriggerSpecialEvent,
    });
  }

  if (ambientLight && dirLight) {
    createLightsDebugUI({ renderer, ambientLight, dirLight, pointLights: pointLights ?? [], bloomPass });
  }

  console.log("[debug] menu initialized — press ` to toggle");
}
