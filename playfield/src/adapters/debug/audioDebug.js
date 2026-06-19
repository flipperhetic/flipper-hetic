/**
 * Audio debug panel — per-sound and group volume controls.
 */
const AUDIO_DEBUG_STYLES = `
#audio-debug-panel {
  position: fixed;
  top: 10px;
  left: 10px;
  width: 380px;
  max-height: calc(100vh - 20px);
  overflow: auto;
  background: rgba(10, 10, 18, 0.95);
  border: 2px solid #71e55c;
  border-radius: 8px;
  padding: 12px;
  color: #d8ffb8;
  font-family: 'Courier New', monospace;
  font-size: 12px;
  z-index: 10001;
  box-shadow: 0 0 24px rgba(113, 229, 92, 0.35);
}
#audio-debug-panel .section {
  margin-bottom: 14px;
  border-top: 1px solid rgba(113, 229, 92, 0.25);
  padding-top: 12px;
}
#audio-debug-panel .section:first-child {
  border-top: none;
  padding-top: 0;
}
#audio-debug-panel .section-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
  color: #b3ff7f;
  font-weight: bold;
}
#audio-debug-panel .slider-row {
  display: grid;
  grid-template-columns: 1fr 60px 28px;
  gap: 8px;
  align-items: center;
  margin-bottom: 8px;
}
#audio-debug-panel label {
  color: #d8ffb8;
}
#audio-debug-panel input[type='range'] {
  width: 100%;
}
#audio-debug-panel input[type='number'] {
  width: 100%;
  background: rgba(255, 255, 255, 0.07);
  border: 1px solid rgba(113, 229, 92, 0.22);
  color: #d8ffb8;
  padding: 3px 6px;
  border-radius: 4px;
}
#audio-debug-panel button {
  padding: 4px 8px;
  border: none;
  border-radius: 4px;
  background: #71e55c;
  color: #000;
  cursor: pointer;
  font-weight: bold;
}
#audio-debug-panel button.reset-btn {
  background: rgba(255, 255, 255, 0.08);
  color: #d8ffb8;
}
#audio-debug-panel h2 {
  margin: 0 0 8px;
  font-size: 13px;
  color: #8ffff5;
}
#audio-debug-panel .group-meta {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 6px;
  color: #a8ffb4;
}
#audio-debug-toggle {
  position: fixed;
  top: 10px;
  right: 64px;
  width: 48px;
  height: 28px;
  border: none;
  background: #71e55c;
  color: #000;
  border-radius: 6px;
  cursor: pointer;
  z-index: 10002;
  font-family: 'Courier New', monospace;
  font-weight: bold;
}

#audio-mute-toggle {
  position: fixed;
  top: 10px;
  right: 118px;
  width: 48px;
  height: 28px;
  border: none;
  background: #71e55c;
  color: #000;
  border-radius: 6px;
  cursor: pointer;
  z-index: 10002;
  font-family: 'Courier New', monospace;
  font-weight: bold;
}
`;

import { AUDIO_GROUPS } from "../audio/AudioEngine.js";

const GROUPS = Object.entries(AUDIO_GROUPS).map(([label, samples]) => ({ label, samples }));

const SAMPLE_LABELS = {
  "bumper-1": "Bumper 1",
  "bumper-2": "Bumper 2",
  "bumper-3": "Bumper 3",
  "flipper-1": "Flipper 1",
  "flipper-2": "Flipper 2",
  "flipper-3": "Flipper 3",
  "start": "Start",
  "theme": "Theme",
  "game-over-1": "Game Over 1",
  "game-over-2": "Game Over 2",
  "milestone-1": "Milestone RV",
  "milestone-2": "Milestone Tuco",
};

function createSlider(labelText, initialValue, onChange, onReset) {
  const wrapper = document.createElement("div");
  wrapper.className = "slider-row";

  const label = document.createElement("label");
  label.textContent = labelText;
  wrapper.appendChild(label);

  const slider = document.createElement("input");
  slider.type = "range";
  slider.min = 0;
  slider.max = 1;
  slider.step = 0.01;
  slider.value = initialValue;
  wrapper.appendChild(slider);

  const input = document.createElement("input");
  input.type = "number";
  input.min = 0;
  input.max = 1;
  input.step = 0.01;
  input.value = initialValue;
  wrapper.appendChild(input);

  const resetBtn = document.createElement("button");
  resetBtn.type = "button";
  resetBtn.className = "reset-btn";
  resetBtn.textContent = "↺";
  wrapper.appendChild(resetBtn);

  const setValue = (value) => {
    const clamped = Math.max(0, Math.min(1, Number(value) || 0));
    slider.value = clamped;
    input.value = clamped.toFixed(2);
    onChange(clamped);
  };

  slider.addEventListener("input", () => setValue(slider.value));
  input.addEventListener("change", () => setValue(input.value));
  resetBtn.addEventListener("click", () => onReset());

  return { wrapper, setValue };
}

function normalizeSampleLabel(name) {
  return SAMPLE_LABELS[name] || name;
}

export function createAudioDebugUI(audio) {
  if (!audio) return;

  if (document.getElementById("audio-debug-style")) return;

  const style = document.createElement("style");
  style.id = "audio-debug-style";
  style.textContent = AUDIO_DEBUG_STYLES;
  document.head.appendChild(style);

  const panel = document.createElement("div");
  panel.id = "audio-debug-panel";
  panel.style.display = "none";

  const title = document.createElement("h2");
  title.textContent = "[DEBUG] Audio";
  panel.appendChild(title);

  const description = document.createElement("div");
  description.style.marginBottom = "12px";
  description.textContent = "Group and per-sound volume controls. Reset buttons are available for each section. Use Copy JSON to export current volume state.";
  panel.appendChild(description);

  const sectionRefs = {};
  const sliderRefs = {};
  const groupSliderRefs = {};

  const refreshState = () => audio.getState();

  const renderGroup = (group) => {
    const section = document.createElement("div");
    section.className = "section";

    const sectionTitle = document.createElement("div");
    sectionTitle.className = "section-title";
    sectionTitle.textContent = group.label;
    section.appendChild(sectionTitle);

    const groupMeta = document.createElement("div");
    groupMeta.className = "group-meta";
    groupMeta.innerHTML = `<span>Group volume</span><span id="group-${group.label}-value"></span>`;
    section.appendChild(groupMeta);

    const groupSlider = createSlider(
      `Groupe : ${group.label}`,
      refreshState().groupVolumes[group.label] ?? 1,
      (value) => {
        audio.setGroupVolume(group.label, value);
        groupMeta.querySelector("span:last-child").textContent = value.toFixed(2);
      },
      () => {
        audio.resetGroupVolume(group.label);
        groupSlider.setValue(audio.getGroupVolume(group.label));
        groupMeta.querySelector("span:last-child").textContent = audio.getGroupVolume(group.label).toFixed(2);
      }
    );
    section.appendChild(groupSlider.wrapper);
    groupSliderRefs[group.label] = groupSlider;
    groupMeta.querySelector("span:last-child").textContent = (refreshState().groupVolumes[group.label] ?? 1).toFixed(2);

    group.samples.forEach((sampleName) => {
      const currentValue = refreshState().sampleVolumes[sampleName] ?? 1;
      const slider = createSlider(
        normalizeSampleLabel(sampleName),
        currentValue,
        (value) => audio.setSampleVolume(sampleName, value),
        () => {
          audio.resetSampleVolume(sampleName);
          slider.setValue(audio.getSampleVolume(sampleName));
        }
      );
      section.appendChild(slider.wrapper);
      sliderRefs[sampleName] = slider;
    });

    const resetBtn = document.createElement("button");
    resetBtn.type = "button";
    resetBtn.textContent = "Réinitialiser le groupe";
    resetBtn.addEventListener("click", () => {
      audio.resetGroupVolume(group.label);
      groupSlider.setValue(audio.getGroupVolume(group.label));
      groupMeta.querySelector("span:last-child").textContent = audio.getGroupVolume(group.label).toFixed(2);
    });
    section.appendChild(resetBtn);

    sectionRefs[group.label] = { section, groupSlider, sampleSliders: sliderRefs };
    return section;
  };

  GROUPS.forEach((group) => {
    panel.appendChild(renderGroup(group));
  });

  const globalButtons = document.createElement("div");
  globalButtons.style.display = "flex";
  globalButtons.style.gap = "8px";
  globalButtons.style.flexWrap = "wrap";
  globalButtons.style.marginTop = "10px";

  const copyJsonBtn = document.createElement("button");
  copyJsonBtn.type = "button";
  copyJsonBtn.textContent = "Copier JSON";
  copyJsonBtn.addEventListener("click", async () => {
    try {
      const json = JSON.stringify(audio.getState(), null, 2);
      await navigator.clipboard.writeText(json);
      copyJsonBtn.textContent = "✓ Copié";
      setTimeout(() => { copyJsonBtn.textContent = "Copier JSON"; }, 1800);
    } catch (error) {
      console.error("Impossible de copier le JSON audio :", error);
      copyJsonBtn.textContent = "Erreur";
      setTimeout(() => { copyJsonBtn.textContent = "Copier JSON"; }, 1800);
    }
  });
  globalButtons.appendChild(copyJsonBtn);

  const resetAllBtn = document.createElement("button");
  resetAllBtn.type = "button";
  resetAllBtn.textContent = "Réinitialiser tout";
  resetAllBtn.addEventListener("click", () => {
    audio.resetAllVolumes();
    GROUPS.forEach((group) => {
      const groupSlider = groupSliderRefs[group.label];
      if (groupSlider) groupSlider.setValue(audio.getGroupVolume(group.label));
      group.samples.forEach((sampleName) => {
        const sampleSlider = sliderRefs[sampleName];
        if (sampleSlider) sampleSlider.setValue(audio.getSampleVolume(sampleName));
      });
    });
  });
  globalButtons.appendChild(resetAllBtn);

  panel.appendChild(globalButtons);
  document.body.appendChild(panel);

  const toggleBtn = document.createElement("button");
  toggleBtn.id = "audio-debug-toggle";
  toggleBtn.type = "button";
  toggleBtn.textContent = "AUD";
  toggleBtn.title = "Ouvrir / fermer le debug audio";
  toggleBtn.style.cursor = "pointer";
  document.body.appendChild(toggleBtn);

  let isOpen = false;

  const setOpen = (value) => {
    isOpen = value;
    panel.style.display = value ? "block" : "none";
    toggleBtn.textContent = value ? "×" : "AUD";
  };

  toggleBtn.addEventListener("click", () => setOpen(!isOpen));

  const muteIconBtn = document.createElement("button");
  muteIconBtn.id = "audio-mute-toggle";
  muteIconBtn.type = "button";
  muteIconBtn.title = "Mute / unmute audio";
  const refreshMuteIcon = () => {
    const state = audio.getState();
    muteIconBtn.textContent = state.muted ? "🔇" : "🔊";
  };
  muteIconBtn.addEventListener("click", () => {
    audio.toggleDebugMute?.();
    refreshMuteIcon();
  });
  refreshMuteIcon();
  document.body.appendChild(muteIconBtn);

  document.addEventListener("keydown", (e) => {
    if (e.key === "`") {
      setOpen(!isOpen);
    }
  });

  return {
    refresh() {
      const state = refreshState();
      GROUPS.forEach((group) => {
        const groupSlider = groupSliderRefs[group.label];
        if (groupSlider) groupSlider.setValue(state.groupVolumes[group.label] ?? 1);
        group.samples.forEach((sampleName) => {
          const sampleSlider = sliderRefs[sampleName];
          if (sampleSlider) sampleSlider.setValue(state.sampleVolumes[sampleName] ?? 1);
        });
      });
    },
  };
}
