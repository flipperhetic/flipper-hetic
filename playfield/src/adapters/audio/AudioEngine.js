const STORAGE_KEY = "flipper.audio";
const DEFAULT_VOLUME = 0.6;
const COOLDOWN_MS = 60;
const DEFAULT_SAMPLE_VOLUME = 1;
const DEFAULT_GROUP_VOLUME = 1;
const BASE_URL = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");

export const AUDIO_GROUPS = {
  "Bumper hit": ["bumper-1", "bumper-2", "bumper-3"],
  "Flipper hit": ["flipper-1", "flipper-2", "flipper-3"],
  "Start game": ["start"],
  "Main theme": ["theme"],
  "Game Over": ["game-over-1", "game-over-2"],
  "Highscore beat": ["highscore-1", "highscore-2"],
  "Special events": ["milestone-1", "milestone-2"],
};

const SAMPLES = {
  "bumper-1": `${BASE_URL}/sounds/Bumper hit/BumperIteration1.mp3`,
  "bumper-2": `${BASE_URL}/sounds/Bumper hit/BumperIteration2.mp3`,
  "bumper-3": `${BASE_URL}/sounds/Bumper hit/BumperIteration3.mp3`,
  "flipper-1": `${BASE_URL}/sounds/Flipper hit/Flipper Hit 1.mp3`,
  "flipper-2": `${BASE_URL}/sounds/Flipper hit/Flipper Hit 2.mp3`,
  "flipper-3": `${BASE_URL}/sounds/Flipper hit/Flipper Hit 3.mp3`,
  "start": `${BASE_URL}/sounds/Start game/Ball Release.mp3`,
  "game-over-1": `${BASE_URL}/sounds/Game Over/He cant keep getting away with it.mp3`,
  "game-over-2": `${BASE_URL}/sounds/Game Over/no-dice-breaking-bad-saulgoodman.mp3`,
  "milestone-1": `${BASE_URL}/sounds/Special events/RV/private-domicile.mp3`,
  "milestone-2": `${BASE_URL}/sounds/Special events/Tuco/tight-tight-tight-breaking-bad-tight-tuco-awesome.mp3`,
  "theme": `${BASE_URL}/sounds/Main theme/Breaking Bad Main Title Theme (Loop).mp3`,
  "highscore-1": `${BASE_URL}/sounds/Highscore beat/You're God damn right.mp3`,
  "highscore-2": `${BASE_URL}/sounds/Highscore beat/breaking-bad-yes.mp3`,
};

function loadPrefs() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { volume: DEFAULT_VOLUME, muted: false };
    const p = JSON.parse(raw);
    const volume = typeof p.volume === "number"
      ? Math.max(0, Math.min(1, p.volume))
      : DEFAULT_VOLUME;
    return { volume, muted: !!p.muted, lastSamples: p.lastSamples || {} };
  } catch {
    return { volume: DEFAULT_VOLUME, muted: false, lastSamples: {} };
  }
}

function savePrefs(prefs) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const current = raw ? JSON.parse(raw) : {};
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Object.assign({}, current, prefs)));
  } catch {
    // no localStorage (private browsing), ignore
  }
}

class AudioEngine {
  #ctx;
  #master;
  #buffers = new Map();
  #lastPlayed = new Map();
  #sampleGains = new Map();
  #groupGains = new Map();
  #sampleToGroup = new Map();
  #lastSampleByGroup;
  #themeSource = null;
  #themeGainNode = null;
  #themeBaseVolume = 0.35;
  #ready = false;
  #pendingThemeStart = false;
  #pendingThemeVolume = 0.35;
  #soundLockEndTime = 0;
  #volume;
  #muted;
  #onChange;

  constructor(onHudUpdate = null) {
    this.#onChange = onHudUpdate;
    const prefs = loadPrefs();
    this.#volume = prefs.volume;
    this.#muted = prefs.muted;
    this.#lastSampleByGroup = new Map(Object.entries(prefs.lastSamples || {}));

    this.#ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.#master = this.#ctx.createGain();
    this.#master.gain.value = this.#muted ? 0 : this.#volume;
    this.#master.connect(this.#ctx.destination);

    Object.entries(AUDIO_GROUPS).forEach(([group, names]) => {
      this.#groupGains.set(group, DEFAULT_GROUP_VOLUME);
      names.forEach((name) => this.#sampleToGroup.set(name, group));
    });
    Object.keys(SAMPLES).forEach((name) => this.#sampleGains.set(name, DEFAULT_SAMPLE_VOLUME));

    const resumeCtx = () => {
      if (this.#ctx.state === "suspended") this.#ctx.resume().catch(() => {});
    };
    window.addEventListener("click", resumeCtx, { passive: true });
    window.addEventListener("keydown", resumeCtx, { passive: true });

    Promise.all(Object.entries(SAMPLES).map(([k, v]) => this.#load(k, v)))
      .then(() => {
        this.#ready = true;
        if (this.#pendingThemeStart) {
          this.startTheme(this.#pendingThemeVolume);
        }
      });

    this.#emitChange();
  }

  async #load(name, url) {
    try {
      const res = await fetch(encodeURI(url));
      const arr = await res.arrayBuffer();
      this.#buffers.set(name, await this.#ctx.decodeAudioData(arr));
    } catch (err) {
      console.warn(`audio: impossible de charger ${name}`, err);
    }
  }

  #emitChange() {
    this.#onChange?.({
      volume: this.#volume,
      muted: this.#muted,
      groupVolumes: Object.fromEntries(this.#groupGains),
      sampleVolumes: Object.fromEntries(this.#sampleGains),
    });
  }

  #getGroupVolume(group) {
    return this.#groupGains.has(group) ? this.#groupGains.get(group) : DEFAULT_GROUP_VOLUME;
  }

  #getSampleVolume(name) {
    return this.#sampleGains.has(name) ? this.#sampleGains.get(name) : DEFAULT_SAMPLE_VOLUME;
  }

  #getEffectiveGain(name) {
    return this.#getSampleVolume(name) * this.#getGroupVolume(this.#sampleToGroup.get(name));
  }

  #updateThemeGain() {
    if (!this.#themeGainNode) return;
    this.#themeGainNode.gain.value = this.#themeBaseVolume * this.#getEffectiveGain("theme");
  }

  #applyGain() {
    this.#master.gain.cancelScheduledValues(this.#ctx.currentTime);
    this.#master.gain.setTargetAtTime(this.#muted ? 0 : this.#volume, this.#ctx.currentTime, 0.02);
  }

  play(key) {
    if (!this.#ready) return;
    const buf = this.#buffers.get(key);
    if (!buf) return;
    const now = performance.now();
    if (now - (this.#lastPlayed.get(key) || 0) < COOLDOWN_MS) return;

    const grp = this.#sampleToGroup.get(key);
    const isHeavySound = grp === "Game Over" || grp === "Highscore beat";
    if (isHeavySound && now < this.#soundLockEndTime) return;

    this.#lastPlayed.set(key, now);

    const gainValue = this.#getEffectiveGain(key);
    if (gainValue <= 0) return;

    const src = this.#ctx.createBufferSource();
    src.buffer = buf;
    const gainNode = this.#ctx.createGain();
    gainNode.gain.value = gainValue;
    src.connect(gainNode);
    gainNode.connect(this.#master);
    try { src.start(0); } catch { /* already started */ }

    if (isHeavySound) {
      this.#soundLockEndTime = now + (buf.duration || 0) * 1000;
    }

    if (grp) {
      this.#lastSampleByGroup.set(grp, key);
      if (grp === "Game Over" || grp === "Highscore beat") {
        savePrefs({ volume: this.#volume, muted: this.#muted, lastSamples: Object.fromEntries(this.#lastSampleByGroup) });
      }
    }
  }

  playRandom(keys) {
    if (!keys?.length) return;
    const group = this.#sampleToGroup.get(keys[0]) || null;
    let candidates = keys.slice();
    const last = group ? this.#lastSampleByGroup.get(group) : null;
    if (last && keys.length > 1) {
      candidates = keys.filter((n) => n !== last);
      if (candidates.length === 0) candidates = keys.slice();
    }
    const choice = candidates[Math.floor(Math.random() * candidates.length)];
    this.play(choice);
    if (group) {
      this.#lastSampleByGroup.set(group, choice);
      if (group === "Game Over" || group === "Highscore beat") {
        savePrefs({ volume: this.#volume, muted: this.#muted, lastSamples: Object.fromEntries(this.#lastSampleByGroup) });
      }
    }
  }

  startTheme(volume = 0.35) {
    this.#pendingThemeStart = false;
    this.#pendingThemeVolume = volume;
    if (!this.#ready) {
      this.#pendingThemeStart = true;
      return;
    }
    const buf = this.#buffers.get("theme");
    if (!buf) return;

    this.#themeBaseVolume = volume;
    if (this.#themeSource) {
      this.#updateThemeGain();
      return;
    }

    const src = this.#ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    const g = this.#ctx.createGain();
    this.#themeGainNode = g;
    g.gain.value = this.#themeBaseVolume * this.#getEffectiveGain("theme");
    src.connect(g);
    g.connect(this.#master);
    try { src.start(0); } catch { /* already started */ }
    this.#themeSource = src;
  }

  stopTheme() {
    if (!this.#themeSource) return;
    try { this.#themeSource.stop(); } catch { /* already stopped */ }
    this.#themeSource = null;
    this.#themeGainNode = null;
  }

  setMuted(muted, persist = true) {
    this.#muted = !!muted;
    this.#applyGain();
    if (persist) {
      savePrefs({ volume: this.#volume, muted: this.#muted, lastSamples: Object.fromEntries(this.#lastSampleByGroup) });
    }
    this.#emitChange();
  }

  setVolume(volume, persist = true) {
    this.#volume = Math.max(0, Math.min(1, volume));
    if (this.#volume > 0 && this.#muted) this.#muted = false;
    this.#applyGain();
    if (persist) {
      savePrefs({ volume: this.#volume, muted: this.#muted, lastSamples: Object.fromEntries(this.#lastSampleByGroup) });
    }
    this.#emitChange();
  }

  getSampleKeys() {
    return Object.keys(SAMPLES);
  }

  // Kept for audio-controls.js compatibility
  toggleMute() {
    this.setMuted(!this.#muted);
  }

  adjustVolume(delta) {
    this.setVolume(this.#volume + delta);
  }

  toggleDebugMute() {
    this.setMuted(!this.#muted, false);
  }

  getState() {
    return {
      volume: this.#volume,
      muted: this.#muted,
      groupVolumes: Object.fromEntries(this.#groupGains),
      sampleVolumes: Object.fromEntries(this.#sampleGains),
    };
  }

  getGroupVolume(group) {
    return this.#getGroupVolume(group);
  }

  getSampleVolume(name) {
    return this.#getSampleVolume(name);
  }

  setGroupVolume(group, value) {
    if (!this.#groupGains.has(group)) return;
    this.#groupGains.set(group, Math.max(0, Math.min(1, value)));
    this.#updateThemeGain();
    this.#emitChange();
  }

  setSampleVolume(name, value) {
    if (!this.#sampleGains.has(name)) return;
    this.#sampleGains.set(name, Math.max(0, Math.min(1, value)));
    if (name === "theme") this.#updateThemeGain();
    this.#emitChange();
  }

  resetGroupVolume(group) {
    if (!this.#groupGains.has(group)) return;
    this.#groupGains.set(group, DEFAULT_GROUP_VOLUME);
    this.#updateThemeGain();
    this.#emitChange();
  }

  resetSampleVolume(name) {
    if (!this.#sampleGains.has(name)) return;
    this.#sampleGains.set(name, DEFAULT_SAMPLE_VOLUME);
    if (name === "theme") this.#updateThemeGain();
    this.#emitChange();
  }

  resetAllVolumes() {
    this.#groupGains.forEach((_, group) => this.#groupGains.set(group, DEFAULT_GROUP_VOLUME));
    this.#sampleGains.forEach((_, name) => this.#sampleGains.set(name, DEFAULT_SAMPLE_VOLUME));
    this.#updateThemeGain();
    this.#emitChange();
  }

  isAudioLocked() {
    return performance.now() < this.#soundLockEndTime;
  }

  releaseSoundLock() {
    this.#soundLockEndTime = 0;
  }
}

export default AudioEngine;
