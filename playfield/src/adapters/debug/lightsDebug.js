import { BLOOM_DEFAULTS } from '../renderer/BloomRenderer.js';
import { POINT_LIGHT_DEFAULTS } from '../renderer/PlayfieldScene.js';

const RESET_BTN_CSS = 'padding:1px 5px;background:transparent;color:#ff0;border:1px solid #ff0;border-radius:3px;cursor:pointer;font-size:11px;flex-shrink:0;line-height:1.4';

function intToHex(n) { return '#' + n.toString(16).padStart(6, '0'); }

export function createLightsDebugUI({ renderer, ambientLight, dirLight, pointLights, bloomPass }) {
  const panel = document.createElement('div');
  panel.style.cssText = [
    'position:fixed;top:50px;right:10px;width:300px',
    'max-height:calc(100vh - 70px);overflow-y:auto',
    'background:rgba(10,10,20,.96);border:1px solid #ff0;border-radius:4px',
    'padding:10px;color:#ff0;font:11px \'Courier New\',monospace',
    'z-index:10000;box-shadow:0 0 16px rgba(255,255,0,.2);display:none',
  ].join(';');

  const hdr = document.createElement('div');
  hdr.style.cssText = 'font-weight:bold;margin-bottom:8px;font-size:12px';
  hdr.textContent = '[LGT] Lights & Bloom';
  panel.appendChild(hdr);

  const state = {
    ambientColor: intToHex(ambientLight.color.getHex()),
    ambientIntensity: ambientLight.intensity,
    dirColor: intToHex(dirLight.color.getHex()),
    dirIntensity: dirLight.intensity,
    dirX: dirLight.position.x,
    dirY: dirLight.position.y,
    dirZ: dirLight.position.z,
    bloomEnabled: BLOOM_DEFAULTS.enabled,
    bloomThreshold: BLOOM_DEFAULTS.threshold,
    bloomStrength: BLOOM_DEFAULTS.strength,
    bloomRadius: BLOOM_DEFAULTS.radius,
    bloomExposure: BLOOM_DEFAULTS.exposure,
    points: POINT_LIGHT_DEFAULTS.map(d => ({ ...d })),
  };

  // ── helpers ────────────────────────────────────────────────────────────────

  function makeSection(title) {
    const sec = document.createElement('div');
    sec.style.cssText = 'margin-top:10px;border-top:1px solid rgba(255,255,0,.3);padding-top:8px';
    const h = document.createElement('div');
    h.style.cssText = 'font-weight:bold;margin-bottom:6px';
    h.textContent = title;
    sec.appendChild(h);
    panel.appendChild(sec);
    return sec;
  }

  function makeRow(sec, label, value, min, max, step, onChange, defVal) {
    const wrap = document.createElement('div');
    wrap.style.cssText = 'display:flex;align-items:center;gap:4px;margin-bottom:4px';
    const lbl = document.createElement('span');
    lbl.style.cssText = 'flex:0 0 80px;font-size:10px';
    lbl.textContent = label;
    wrap.appendChild(lbl);
    const slider = document.createElement('input');
    slider.type = 'range'; slider.min = min; slider.max = max; slider.step = step; slider.value = value;
    slider.style.cssText = 'flex:1;cursor:pointer;accent-color:#ff0';
    wrap.appendChild(slider);
    const num = document.createElement('input');
    num.type = 'number'; num.value = value; num.step = step;
    num.style.cssText = 'width:48px;background:#0a0a14;color:#ff0;border:1px solid #ff0;padding:2px;font-size:10px';
    wrap.appendChild(num);
    const apply = (v) => {
      const val = parseFloat(v);
      if (isNaN(val)) return;
      num.value = val;
      if (val >= parseFloat(min) && val <= parseFloat(max)) slider.value = val;
      onChange(val);
    };
    slider.addEventListener('input', () => apply(slider.value));
    num.addEventListener('change', () => apply(num.value));
    if (defVal !== undefined) {
      const rst = document.createElement('button');
      rst.textContent = '↺'; rst.title = `Reset to ${defVal}`;
      rst.style.cssText = RESET_BTN_CSS;
      rst.addEventListener('click', () => apply(defVal));
      wrap.appendChild(rst);
    }
    sec.appendChild(wrap);
  }

  function makeColorRow(sec, label, value, onChange) {
    const wrap = document.createElement('div');
    wrap.style.cssText = 'display:flex;align-items:center;gap:5px;margin-bottom:5px';
    const lbl = document.createElement('span');
    lbl.style.cssText = 'flex:0 0 80px;font-size:10px';
    lbl.textContent = label;
    wrap.appendChild(lbl);
    const picker = document.createElement('input');
    picker.type = 'color'; picker.value = value;
    picker.style.cssText = 'flex:1;height:22px;cursor:pointer;border:none;background:none';
    picker.addEventListener('input', () => onChange(picker.value));
    wrap.appendChild(picker);
    sec.appendChild(wrap);
  }

  // ── Ambient ────────────────────────────────────────────────────────────────

  const ambSec = makeSection('▸ Ambient Light');
  makeColorRow(ambSec, 'Color', state.ambientColor, (v) => {
    state.ambientColor = v;
    ambientLight.color.set(v);
  });
  makeRow(ambSec, 'Intensity', state.ambientIntensity, 0, 5, 0.05, (v) => {
    state.ambientIntensity = v;
    ambientLight.intensity = v;
  }, 0.6);

  // ── Directional ────────────────────────────────────────────────────────────

  const dirSec = makeSection('▸ Directional Light');
  makeColorRow(dirSec, 'Color', state.dirColor, (v) => {
    state.dirColor = v;
    dirLight.color.set(v);
  });
  makeRow(dirSec, 'Intensity', state.dirIntensity, 0, 5, 0.05, (v) => {
    state.dirIntensity = v; dirLight.intensity = v;
  }, 0.8);
  makeRow(dirSec, 'Pos X', state.dirX, -20, 20, 0.5, (v) => { state.dirX = v; dirLight.position.x = v; });
  makeRow(dirSec, 'Pos Y', state.dirY, 0, 30, 0.5,  (v) => { state.dirY = v; dirLight.position.y = v; });
  makeRow(dirSec, 'Pos Z', state.dirZ, -20, 20, 0.5, (v) => { state.dirZ = v; dirLight.position.z = v; });

  // ── Point Lights ───────────────────────────────────────────────────────────

  pointLights.forEach((pl, i) => {
    const d = POINT_LIGHT_DEFAULTS[i];
    const ps = state.points[i];
    const ptSec = makeSection(`▸ ${d.label}`);

    // Toggle
    const toggleWrap = document.createElement('div');
    toggleWrap.style.cssText = 'display:flex;align-items:center;gap:8px;margin-bottom:6px';
    const cb = document.createElement('input');
    cb.type = 'checkbox'; cb.checked = true;
    cb.addEventListener('change', () => { pl.visible = cb.checked; ps.enabled = cb.checked; });
    toggleWrap.appendChild(cb);
    const lbl = document.createElement('span'); lbl.style.fontSize = '10px'; lbl.textContent = 'Enabled';
    toggleWrap.appendChild(lbl);
    ptSec.appendChild(toggleWrap);

    makeColorRow(ptSec, 'Color', ps.color, (v) => { ps.color = v; pl.color.set(v); });
    makeRow(ptSec, 'Intensity', ps.intensity, 0, 20, 0.1,  (v) => { ps.intensity = v; pl.intensity = v; },  d.intensity);
    makeRow(ptSec, 'Distance',  ps.distance,  0, 30, 0.5,  (v) => { ps.distance  = v; pl.distance  = v; },  d.distance);
    makeRow(ptSec, 'Pos X',     ps.x,        -10, 10, 0.1, (v) => { ps.x = v; pl.position.x = v; }, d.x);
    makeRow(ptSec, 'Pos Y',     ps.y,          0, 10, 0.1, (v) => { ps.y = v; pl.position.y = v; }, d.y);
    makeRow(ptSec, 'Pos Z',     ps.z,        -15, 15, 0.1, (v) => { ps.z = v; pl.position.z = v; }, d.z);
  });

  // ── Bloom ──────────────────────────────────────────────────────────────────

  if (bloomPass) {
    const bloomSec = makeSection('▸ Bloom');

    const toggleWrap = document.createElement('div');
    toggleWrap.style.cssText = 'display:flex;align-items:center;gap:8px;margin-bottom:6px';
    const cb = document.createElement('input');
    cb.type = 'checkbox'; cb.checked = state.bloomEnabled;
    cb.addEventListener('change', () => {
      state.bloomEnabled = cb.checked;
      bloomPass.strength = cb.checked ? state.bloomStrength : 0;
    });
    toggleWrap.appendChild(cb);
    const lbl = document.createElement('span'); lbl.style.fontSize = '10px'; lbl.textContent = 'Enabled';
    toggleWrap.appendChild(lbl);
    bloomSec.appendChild(toggleWrap);

    makeRow(bloomSec, 'Threshold', state.bloomThreshold, 0,   1, 0.01, (v) => { state.bloomThreshold = v; bloomPass.threshold = v; }, BLOOM_DEFAULTS.threshold);
    makeRow(bloomSec, 'Strength',  state.bloomStrength,  0,   3, 0.05, (v) => { state.bloomStrength = v; if (state.bloomEnabled) bloomPass.strength = v; }, BLOOM_DEFAULTS.strength);
    makeRow(bloomSec, 'Radius',    state.bloomRadius,    0,   1, 0.01, (v) => { state.bloomRadius = v; bloomPass.radius = v; }, BLOOM_DEFAULTS.radius);
    makeRow(bloomSec, 'Exposure',  state.bloomExposure,  0.1, 3, 0.05, (v) => { state.bloomExposure = v; if (renderer) renderer.toneMappingExposure = v; }, BLOOM_DEFAULTS.exposure);
  }

  // ── Copy JSON ──────────────────────────────────────────────────────────────

  const footer = document.createElement('div');
  footer.style.cssText = 'margin-top:10px;border-top:1px solid rgba(255,255,0,.3);padding-top:8px';
  const copyBtn = document.createElement('button');
  copyBtn.textContent = 'Copy JSON';
  copyBtn.style.cssText = 'width:100%;padding:6px;background:#ff0;color:#000;border:none;border-radius:3px;cursor:pointer;font:bold 12px \'Courier New\'';
  copyBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(JSON.stringify(state, null, 2));
    copyBtn.textContent = '✓ Copied!';
    setTimeout(() => { copyBtn.textContent = 'Copy JSON'; }, 2000);
  });
  footer.appendChild(copyBtn);
  panel.appendChild(footer);
  document.body.appendChild(panel);

  // ── Toggle button ──────────────────────────────────────────────────────────

  const toggleBtn = document.createElement('button');
  toggleBtn.textContent = 'LGT';
  toggleBtn.title = 'Lights & Bloom';
  toggleBtn.style.cssText = 'position:fixed;top:10px;right:318px;padding:4px 8px;background:#ff0;color:#000;border:none;border-radius:3px;font:bold 11px \'Courier New\';cursor:pointer;z-index:10001';
  let visible = false;
  toggleBtn.addEventListener('click', () => {
    visible = !visible;
    panel.style.display = visible ? 'block' : 'none';
    toggleBtn.textContent = visible ? '✕' : 'LGT';
  });
  document.body.appendChild(toggleBtn);
}
