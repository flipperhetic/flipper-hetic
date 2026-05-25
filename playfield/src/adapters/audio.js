/**
 * Moteur audio (Web Audio API).
 * Charge les samples, gere le volume/mute global et garde les prefs en localStorage.
 */

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
    // merge with existing prefs to avoid overwriting unknown keys
    const raw = localStorage.getItem(STORAGE_KEY);
    const current = raw ? JSON.parse(raw) : {};
    const merged = Object.assign({}, current, prefs);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
  } catch {
    // pas de localStorage (navigation privee), tant pis
  }
}

export function createAudioEngine(onChange = null) {
  const prefs = loadPrefs();
  let volume = prefs.volume;
  let muted = prefs.muted;
  let themeBaseVolume = 0.35;

  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const master = ctx.createGain();
  master.gain.value = muted ? 0 : volume;
  master.connect(ctx.destination);

  const buffers = new Map();
  const lastPlayed = new Map();
  const sampleGains = new Map();
  const groupGains = new Map();
  const sampleToGroup = new Map();
  // Remember last played sample per group to avoid immediate repeats.
  const lastSampleByGroup = new Map(Object.entries(prefs.lastSamples || {}));
  let themeSource = null;
  let themeGainNode = null;
  let ready = false;
  let pendingThemeStart = false;
  let pendingThemeVolume = 0.35;
  // Sound locking: prevent concurrent sound playback
  let soundLockEndTime = 0;

  Object.entries(AUDIO_GROUPS).forEach(([group, names]) => {
    groupGains.set(group, DEFAULT_GROUP_VOLUME);
    names.forEach((name) => sampleToGroup.set(name, group));
  });
  Object.keys(SAMPLES).forEach((name) => sampleGains.set(name, DEFAULT_SAMPLE_VOLUME));

  function emitChange() {
    if (onChange) onChange({
      volume,
      muted,
      groupVolumes: Object.fromEntries(groupGains),
      sampleVolumes: Object.fromEntries(sampleGains),
    });
  }

  async function load(name, url) {
    try {
      const res = await fetch(encodeURI(url));
      const arr = await res.arrayBuffer();
      buffers.set(name, await ctx.decodeAudioData(arr));
    } catch (err) {
      console.warn(`audio: impossible de charger ${name}`, err);
    }
  }

  // Les navigateurs bloquent l'audio tant que l'utilisateur n'a pas interagi.
  const resumeCtx = () => {
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
  };
  window.addEventListener("click", resumeCtx, { passive: true });
  window.addEventListener("keydown", resumeCtx, { passive: true });

  function getGroupVolume(group) {
    return groupGains.has(group) ? groupGains.get(group) : DEFAULT_GROUP_VOLUME;
  }

  function getSampleVolume(name) {
    return sampleGains.has(name) ? sampleGains.get(name) : DEFAULT_SAMPLE_VOLUME;
  }

  function getEffectiveGain(name) {
    const sampleGain = getSampleVolume(name);
    const groupGain = getGroupVolume(sampleToGroup.get(name));
    return sampleGain * groupGain;
  }

  function updateThemeGain() {
    if (!themeGainNode) return;
    themeGainNode.gain.value = themeBaseVolume * getEffectiveGain("theme");
  }

  function play(name) {
    if (!ready) return;
    const buf = buffers.get(name);
    if (!buf) return;
    const now = performance.now();
    if (now - (lastPlayed.get(name) || 0) < COOLDOWN_MS) return;
    
    // Check sound lock only for "heavy" sounds (Game Over, Highscore beat)
    // Bumper and flipper sounds play freely
    const grp = sampleToGroup.get(name);
    const isHeavySound = grp === "Game Over" || grp === "Highscore beat";
    if (isHeavySound && now < soundLockEndTime) return;
    
    lastPlayed.set(name, now);

    const gainValue = getEffectiveGain(name);
    if (gainValue <= 0) return;

    const src = ctx.createBufferSource();
    src.buffer = buf;
    const gainNode = ctx.createGain();
    gainNode.gain.value = gainValue;
    src.connect(gainNode);
    gainNode.connect(master);

    try { src.start(0); } catch { /* deja demarre */ }
    
    // Set sound lock based on buffer duration (in milliseconds) only for heavy sounds
    if (isHeavySound) {
      const durationMs = (buf.duration || 0) * 1000;
      soundLockEndTime = now + durationMs;
    }
    
    // remember last sample for this group (avoid immediate repeat)
    if (grp) {
      lastSampleByGroup.set(grp, name);
      // persist Game Over and Highscore choices across sessions/games
      if (grp === "Game Over" || grp === "Highscore beat") {
        savePrefs({ volume, muted, lastSamples: Object.fromEntries(lastSampleByGroup) });
      }
    }
  }

  function playRandom(names) {
    if (!names?.length) return;
    // try to avoid repeating last sample from the same group
    const group = sampleToGroup.get(names[0]) || null;
    let candidates = names.slice();
    const last = group ? lastSampleByGroup.get(group) : null;
    if (last && names.length > 1) {
      candidates = names.filter((n) => n !== last);
      if (candidates.length === 0) candidates = names.slice();
    }
    const choice = candidates[Math.floor(Math.random() * candidates.length)];
    play(choice);
    if (group) {
      lastSampleByGroup.set(group, choice);
      if (group === "Game Over" || group === "Highscore beat") {
        savePrefs({ volume, muted, lastSamples: Object.fromEntries(lastSampleByGroup) });
      }
    }
  }

  function startTheme(loopVolume = 0.35) {
    pendingThemeStart = false;
    pendingThemeVolume = loopVolume;
    if (!ready) {
      pendingThemeStart = true;
      return;
    }
    const buf = buffers.get("theme");
    if (!buf) return;

    themeBaseVolume = loopVolume;
    if (themeSource) {
      // Le thème tourne déjà : ajuster le volume sans interrompre la lecture.
      updateThemeGain();
      return;
    }

    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    const g = ctx.createGain();
    themeGainNode = g;
    g.gain.value = themeBaseVolume * getEffectiveGain("theme");
    src.connect(g);
    g.connect(master);
    try { src.start(0); } catch { /* deja demarre */ }
    themeSource = src;
  }

  function stopTheme() {
    if (!themeSource) return;
    try { themeSource.stop(); } catch { /* deja arrete */ }
    themeSource = null;
    themeGainNode = null;
  }

  function applyGain() {
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setTargetAtTime(muted ? 0 : volume, ctx.currentTime, 0.02);
  }

  function setVolume(v) {
    volume = Math.max(0, Math.min(1, v));
    if (volume > 0 && muted) muted = false;
    applyGain();
    savePrefs({ volume, muted, lastSamples: Object.fromEntries(lastSampleByGroup) });
    emitChange();
  }

  function setMuted(m, persist = true) {
    muted = !!m;
    applyGain();
    if (persist) {
      savePrefs({ volume, muted, lastSamples: Object.fromEntries(lastSampleByGroup) });
    }
    emitChange();
  }

  function toggleDebugMute() {
    setMuted(!muted, false);
  }

  function setGroupVolume(group, value) {
    if (!groupGains.has(group)) return;
    groupGains.set(group, Math.max(0, Math.min(1, value)));
    updateThemeGain();
    emitChange();
  }

  function setSampleVolume(name, value) {
    if (!sampleGains.has(name)) return;
    sampleGains.set(name, Math.max(0, Math.min(1, value)));
    if (name === "theme") updateThemeGain();
    emitChange();
  }

  function resetGroupVolume(group) {
    if (!groupGains.has(group)) return;
    groupGains.set(group, DEFAULT_GROUP_VOLUME);
    updateThemeGain();
    emitChange();
  }

  function resetSampleVolume(name) {
    if (!sampleGains.has(name)) return;
    sampleGains.set(name, DEFAULT_SAMPLE_VOLUME);
    if (name === "theme") updateThemeGain();
    emitChange();
  }

  function resetAllVolumes() {
    groupGains.forEach((_, group) => groupGains.set(group, DEFAULT_GROUP_VOLUME));
    sampleGains.forEach((_, name) => sampleGains.set(name, DEFAULT_SAMPLE_VOLUME));
    updateThemeGain();
    emitChange();
  }

  Promise.all(Object.entries(SAMPLES).map(([k, v]) => load(k, v)))
    .then(() => {
      ready = true;
      if (pendingThemeStart) {
        startTheme(pendingThemeVolume);
      }
    });

  emitChange();

  return {
    play,
    playRandom,
    startTheme,
    stopTheme,
    setVolume,
    adjustVolume: (d) => setVolume(volume + d),
    setMuted,
    toggleMute: () => setMuted(!muted),
    toggleDebugMute,
    getState: () => ({
      volume,
      muted,
      groupVolumes: Object.fromEntries(groupGains),
      sampleVolumes: Object.fromEntries(sampleGains),
    }),
    getGroupVolume,
    getSampleVolume,
    setGroupVolume,
    setSampleVolume,
    resetGroupVolume,
    resetSampleVolume,
    resetAllVolumes,
    isAudioLocked: () => performance.now() < soundLockEndTime,
    releaseSoundLock: () => { soundLockEndTime = 0; },
  };
}
