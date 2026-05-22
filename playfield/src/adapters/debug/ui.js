/**
 * Debug menu UI — panel with sliders, inputs, buttons.
 * Isolated in adapters/debug/ for easy removal.
 */
import { PLAYFIELD_VIEW_DEFAULTS } from "../../domain/viewConfig.js";

const PRESETS = {
  "Vue dessus": {
    cameraMode: "orthographic",
    cameraPosX: 0,
    cameraPosY: 25,
    cameraPosZ: 0.5,
    lookAtX: 0,
    lookAtY: 0,
    lookAtZ: 0,
    cameraUpX: 0,
    cameraUpY: 0,
    cameraUpZ: -1,
    orthoZoom: 1.1,
  },
  Cabinet: {
    cameraMode: "perspective",
    cameraPosX: 0,
    cameraPosY: 15,
    cameraPosZ: 15,
    lookAtX: 0,
    lookAtY: 5,
    lookAtZ: 0,
    cameraUpX: 0,
    cameraUpY: 1,
    cameraUpZ: 0,
    fov: 50,
  },
};

const SLIDERS = {
  "Mode caméra": {
    cameraMode: {
      type: "select",
      options: ["perspective", "orthographic"],
      default: PLAYFIELD_VIEW_DEFAULTS.cameraMode,
    },
  },
  "Caméra": {
    cameraPosX: { type: "range", min: -20, max: 20, default: PLAYFIELD_VIEW_DEFAULTS.cameraPosX, step: 0.1 },
    cameraPosY: { type: "range", min: 5, max: 50, default: PLAYFIELD_VIEW_DEFAULTS.cameraPosY, step: 0.1 },
    cameraPosZ: { type: "range", min: -20, max: 30, default: PLAYFIELD_VIEW_DEFAULTS.cameraPosZ, step: 0.1 },
    lookAtX: { type: "range", min: -20, max: 20, default: PLAYFIELD_VIEW_DEFAULTS.lookAtX, step: 0.1 },
    lookAtY: { type: "range", min: -20, max: 20, default: PLAYFIELD_VIEW_DEFAULTS.lookAtY, step: 0.1 },
    lookAtZ: { type: "range", min: -20, max: 20, default: PLAYFIELD_VIEW_DEFAULTS.lookAtZ, step: 0.1 },
    cameraUpX: { type: "range", min: -1, max: 1, default: PLAYFIELD_VIEW_DEFAULTS.cameraUpX, step: 0.1 },
    cameraUpY: { type: "range", min: -1, max: 1, default: PLAYFIELD_VIEW_DEFAULTS.cameraUpY, step: 0.1 },
    cameraUpZ: { type: "range", min: -1, max: 1, default: PLAYFIELD_VIEW_DEFAULTS.cameraUpZ, step: 0.1 },
    fov: { type: "range", min: 10, max: 120, default: PLAYFIELD_VIEW_DEFAULTS.fov, step: 1 },
    orthoZoom: { type: "range", min: 0.1, max: 5, default: PLAYFIELD_VIEW_DEFAULTS.orthoZoom, step: 0.1 },
    near: { type: "range", min: 0.01, max: 1, default: PLAYFIELD_VIEW_DEFAULTS.near, step: 0.01 },
    far: { type: "range", min: 10, max: 500, default: PLAYFIELD_VIEW_DEFAULTS.far, step: 10 },
  },
  "Plateau": {
    levelPosX: { type: "range", min: -10, max: 10, default: PLAYFIELD_VIEW_DEFAULTS.levelPosX, step: 0.1 },
    levelPosY: { type: "range", min: -10, max: 10, default: PLAYFIELD_VIEW_DEFAULTS.levelPosY, step: 0.1 },
    levelPosZ: { type: "range", min: -10, max: 10, default: PLAYFIELD_VIEW_DEFAULTS.levelPosZ, step: 0.1 },
    levelRotX: { type: "range", min: -180, max: 180, default: PLAYFIELD_VIEW_DEFAULTS.levelRotX, step: 1 },
    levelRotY: { type: "range", min: -180, max: 180, default: PLAYFIELD_VIEW_DEFAULTS.levelRotY, step: 1 },
    levelRotZ: { type: "range", min: -180, max: 180, default: PLAYFIELD_VIEW_DEFAULTS.levelRotZ, step: 1 },
  },
  "Physique": {
    gravityTiltDeg: { type: "range", min: 0, max: 45, default: PLAYFIELD_VIEW_DEFAULTS.gravityTiltDeg, step: 0.1 },
    gravityMagnitude: { type: "range", min: 1, max: 50, default: PLAYFIELD_VIEW_DEFAULTS.gravityMagnitude, step: 0.1 },
  },
  "Lumières": {
    ambientIntensity: { type: "range", min: 0, max: 2, default: PLAYFIELD_VIEW_DEFAULTS.ambientIntensity, step: 0.1 },
    dirLightX: { type: "range", min: -20, max: 20, default: PLAYFIELD_VIEW_DEFAULTS.dirLightX, step: 0.1 },
    dirLightY: { type: "range", min: -20, max: 50, default: PLAYFIELD_VIEW_DEFAULTS.dirLightY, step: 0.1 },
    dirLightZ: { type: "range", min: -20, max: 20, default: PLAYFIELD_VIEW_DEFAULTS.dirLightZ, step: 0.1 },
    dirLightIntensity: { type: "range", min: 0, max: 2, default: PLAYFIELD_VIEW_DEFAULTS.dirLightIntensity, step: 0.1 },
  },
};

export function createDebugUI(onConfigChange) {
  const container = document.createElement("div");
  container.id = "debug-panel";
  container.style.cssText = `
    position: fixed;
    top: 50px;
    right: 10px;
    width: 420px;
    min-width: 280px;
    min-height: 220px;
    max-width: calc(100vw - 20px);
    max-height: calc(100vh - 20px);
    background: rgba(20, 20, 30, 0.95);
    border: 2px solid #00ff00;
    border-radius: 6px;
    padding: 12px;
    color: #0f0;
    font-family: 'Courier New', monospace;
    font-size: 11px;
    z-index: 10000;
    resize: both;
    overflow: auto;
    box-shadow: 0 0 20px rgba(0, 255, 0, 0.3);
    display: none;
  `;

  const title = document.createElement("div");
  title.style.cssText = "font-weight: bold; margin-bottom: 10px; color: #0f0; font-size: 12px;";
  title.textContent = "[DEBUG] Playfield View Config";
  container.appendChild(title);

  const state = { ...PLAYFIELD_VIEW_DEFAULTS };
  const inputRefs = {};

  // Rapport live (défini avant les sliders pour être utilisable)
  const reportDiv = document.createElement("div");
  reportDiv.style.cssText = `
    margin-top: 12px;
    border-top: 1px solid #0f0;
    padding-top: 8px;
    background: rgba(0, 20, 0, 0.5);
    padding: 8px;
    border-radius: 3px;
    max-height: 200px;
    overflow-y: auto;
  `;

  const reportTitle = document.createElement("div");
  reportTitle.style.cssText = "font-weight: bold; color: #00ff00; margin-bottom: 6px;";
  reportTitle.textContent = "=== PLAYFIELD_VIEW_CONFIG ===";
  reportDiv.appendChild(reportTitle);

  const reportContent = document.createElement("div");
  reportContent.style.cssText = "color: #0f0; white-space: pre-wrap; word-break: break-all; font-size: 10px; line-height: 1.2;";
  reportDiv.appendChild(reportContent);

  const updateReport = () => {
    const changes = [];
    Object.entries(state).forEach(([k, v]) => {
      if (PLAYFIELD_VIEW_DEFAULTS[k] !== v) {
        changes.push(`  • ${k}: ${PLAYFIELD_VIEW_DEFAULTS[k]} → ${v}`);
      }
    });

    let report = "";
    if (changes.length > 0) {
      report += `Paramètres modifiés (${changes.length}) :\n${changes.join("\n")}\n\n`;
    }
    report += `--- JSON ---\n${JSON.stringify(state, null, 2)}`;

    reportContent.textContent = report;
  };

  // Wrapper qui appelle updateReport après onConfigChange
  const callConfigChange = (cfg) => {
    updateReport();
    onConfigChange(cfg);
  };

  // Helper: create slider + input for range/number
  const createSlider = (key, config) => {
    const wrapper = document.createElement("div");
    wrapper.style.cssText = "margin-bottom: 8px; display: flex; gap: 6px; align-items: center;";

    const label = document.createElement("label");
    label.style.cssText = "flex: 0 0 140px; color: #0f0;";
    label.textContent = key;
    wrapper.appendChild(label);

    const slider = document.createElement("input");
    slider.type = "range";
    slider.min = config.min;
    slider.max = config.max;
    slider.step = config.step;
    slider.value = state[key];
    slider.style.cssText = "flex: 1; cursor: pointer;";
    wrapper.appendChild(slider);

    const input = document.createElement("input");
    input.type = "number";
    input.value = state[key];
    input.style.cssText = "width: 70px; padding: 2px; background: #1a1a2e; color: #0f0; border: 1px solid #0f0;";
    wrapper.appendChild(input);
    inputRefs[key] = input;

    const resetBtn = document.createElement("button");
    resetBtn.textContent = "↺";
    resetBtn.style.cssText = `
      padding: 2px 6px;
      background: #0f0;
      color: #000;
      border: none;
      border-radius: 3px;
      cursor: pointer;
      font-weight: bold;
    `;
    wrapper.appendChild(resetBtn);

    const update = () => {
      const val = Math.max(config.min, Math.min(config.max, parseFloat(input.value) || state[key]));
      state[key] = val;
      slider.value = val;
      input.value = val;
      callConfigChange(state);
    };

    slider.addEventListener("input", () => {
      input.value = slider.value;
      update();
    });
    input.addEventListener("change", update);
    input.addEventListener("blur", update);

    resetBtn.addEventListener("click", () => {
      state[key] = config.default;
      input.value = config.default;
      slider.value = config.default;
      onConfigChange(state);
    });

    return wrapper;
  };

  // Helper: create select for cameraMode
  const createSelect = (key, config) => {
    const wrapper = document.createElement("div");
    wrapper.style.cssText = "margin-bottom: 8px; display: flex; gap: 6px; align-items: center;";

    const label = document.createElement("label");
    label.style.cssText = "flex: 0 0 140px; color: #0f0;";
    label.textContent = key;
    wrapper.appendChild(label);

    const select = document.createElement("select");
    select.style.cssText = "flex: 1; padding: 2px; background: #1a1a2e; color: #0f0; border: 1px solid #0f0;";
    config.options.forEach((opt) => {
      const option = document.createElement("option");
      option.value = opt;
      option.textContent = opt;
      if (opt === state[key]) option.selected = true;
      select.appendChild(option);
    });
    wrapper.appendChild(select);

    const resetBtn = document.createElement("button");
    resetBtn.textContent = "↺";
    resetBtn.style.cssText = `
      padding: 2px 6px;
      background: #0f0;
      color: #000;
      border: none;
      border-radius: 3px;
      cursor: pointer;
      font-weight: bold;
    `;
    wrapper.appendChild(resetBtn);

    select.addEventListener("change", () => {
      state[key] = select.value;
      callConfigChange(state);
    });

    resetBtn.addEventListener("click", () => {
      state[key] = config.default;
      select.value = config.default;
      onConfigChange(state);
    });

    return wrapper;
  };

  // Build sections
  Object.entries(SLIDERS).forEach(([section, sliders]) => {
    const sectionDiv = document.createElement("div");
    sectionDiv.style.cssText = "margin-top: 12px; border-top: 1px solid #0f0; padding-top: 8px;";

    const sectionTitle = document.createElement("div");
    sectionTitle.style.cssText = "font-weight: bold; color: #00ff00; font-size: 12px; margin-bottom: 8px; display: flex; gap: 8px;";

    const titleSpan = document.createElement("span");
    titleSpan.textContent = section;
    sectionTitle.appendChild(titleSpan);

    const sectionResetBtn = document.createElement("button");
    sectionResetBtn.textContent = "↺ section";
    sectionResetBtn.style.cssText = `
      padding: 2px 6px;
      background: #0f0;
      color: #000;
      border: none;
      border-radius: 3px;
      cursor: pointer;
      font-weight: bold;
      font-size: 10px;
    `;
    sectionTitle.appendChild(sectionResetBtn);

    sectionResetBtn.addEventListener("click", () => {
      Object.entries(sliders).forEach(([key]) => {
        state[key] = PLAYFIELD_VIEW_DEFAULTS[key];
        const input = inputRefs[key];
        if (input) input.value = state[key];
        const slider = input.previousElementSibling;
        if (slider && slider.type === "range") slider.value = state[key];
      });
      callConfigChange(state);
    });

    sectionDiv.appendChild(sectionTitle);

    Object.entries(sliders).forEach(([key, config]) => {
      if (config.type === "range") {
        sectionDiv.appendChild(createSlider(key, config));
      } else if (config.type === "select") {
        sectionDiv.appendChild(createSelect(key, config));
      }
    });

    container.appendChild(sectionDiv);
  });

  // Presets
  const presetsDiv = document.createElement("div");
  presetsDiv.style.cssText = "margin-top: 12px; border-top: 1px solid #0f0; padding-top: 8px;";

  const presetsTitle = document.createElement("div");
  presetsTitle.style.cssText = "font-weight: bold; color: #00ff00; font-size: 12px; margin-bottom: 6px;";
  presetsTitle.textContent = "Présets rapides";
  presetsDiv.appendChild(presetsTitle);

  Object.entries(PRESETS).forEach(([name, preset]) => {
    const btn = document.createElement("button");
    btn.textContent = name;
    btn.style.cssText = `
      display: inline-block;
      padding: 4px 8px;
      margin-right: 6px;
      margin-bottom: 6px;
      background: #0f0;
      color: #000;
      border: none;
      border-radius: 3px;
      cursor: pointer;
      font-weight: bold;
    `;
    btn.addEventListener("click", () => {
      Object.assign(state, preset);
      Object.entries(state).forEach(([k, v]) => {
        const input = inputRefs[k];
        if (input) input.value = v;
      });
      callConfigChange(state);
    });
    presetsDiv.appendChild(btn);
  });

  container.appendChild(presetsDiv);

  // Buttons: Copy JSON, Paste JSON, Reset All
  const buttonsDiv = document.createElement("div");
  buttonsDiv.style.cssText = "margin-top: 12px; border-top: 1px solid #0f0; padding-top: 8px; display: flex; gap: 6px; flex-wrap: wrap;";

  const copyJsonBtn = document.createElement("button");
  copyJsonBtn.textContent = "Copier JSON";
  copyJsonBtn.style.cssText = `
    flex: 1;
    padding: 6px;
    background: #0f0;
    color: #000;
    border: none;
    border-radius: 3px;
    cursor: pointer;
    font-weight: bold;
  `;
  copyJsonBtn.addEventListener("click", () => {
    navigator.clipboard.writeText(JSON.stringify(state, null, 2));
    copyJsonBtn.textContent = "✓ Copié";
    setTimeout(() => (copyJsonBtn.textContent = "Copier JSON"), 2000);
  });
  buttonsDiv.appendChild(copyJsonBtn);

  const pasteJsonBtn = document.createElement("button");
  pasteJsonBtn.textContent = "Coller JSON";
  pasteJsonBtn.style.cssText = `
    flex: 1;
    padding: 6px;
    background: #0f0;
    color: #000;
    border: none;
    border-radius: 3px;
    cursor: pointer;
    font-weight: bold;
  `;
  pasteJsonBtn.addEventListener("click", async () => {
    try {
      const json = await navigator.clipboard.readText();
      const parsed = JSON.parse(json);
      Object.assign(state, parsed);
      Object.entries(state).forEach(([k, v]) => {
        const input = inputRefs[k];
        if (input) input.value = v;
      });
      callConfigChange(state);
      pasteJsonBtn.textContent = "✓ Collé";
      setTimeout(() => (pasteJsonBtn.textContent = "Coller JSON"), 2000);
    } catch (e) {
      console.error("Erreur collage JSON:", e);
    }
  });
  buttonsDiv.appendChild(pasteJsonBtn);

  const resetAllBtn = document.createElement("button");
  resetAllBtn.textContent = "↺ Tout";
  resetAllBtn.style.cssText = `
    flex: 1;
    padding: 6px;
    background: #0f0;
    color: #000;
    border: none;
    border-radius: 3px;
    cursor: pointer;
    font-weight: bold;
  `;
  resetAllBtn.addEventListener("click", () => {
    Object.assign(state, PLAYFIELD_VIEW_DEFAULTS);
    Object.entries(state).forEach(([k, v]) => {
      const input = inputRefs[k];
      if (input) input.value = v;
    });
    callConfigChange(state);
  });
  buttonsDiv.appendChild(resetAllBtn);

  container.appendChild(buttonsDiv);

  container.appendChild(reportDiv);

  const toggleButton = document.createElement("button");
  toggleButton.id = "debug-toggle-button";
  toggleButton.textContent = "DBG";
  toggleButton.title = "Ouvrir / fermer le debug";
  toggleButton.style.cssText = `
    position: fixed;
    top: 10px;
    right: 10px;
    width: 48px;
    height: 28px;
    padding: 0;
    margin: 0;
    background: #0f0;
    color: #000;
    border: none;
    border-radius: 4px;
    font-family: 'Courier New', monospace;
    font-weight: bold;
    cursor: pointer;
    z-index: 10001;
  `;

  let panelVisible = false;
  const setPanelVisibility = (visible) => {
    panelVisible = visible;
    container.style.display = visible ? "block" : "none";
    toggleButton.textContent = visible ? "×" : "DBG";
  };

  toggleButton.addEventListener("click", () => setPanelVisibility(!panelVisible));
  document.body.appendChild(toggleButton);

  // Toggle visibility with backtick
  document.addEventListener("keydown", (e) => {
    if (e.key === "`") {
      setPanelVisibility(!panelVisible);
    }
  });

  document.body.appendChild(container);
  updateReport();

  return { container, state };
}
