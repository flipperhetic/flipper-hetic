// Replaced by lightsDebug.js
export {};

const RESET_BTN_CSS = 'padding:1px 5px;background:transparent;color:#0ff;border:1px solid #0ff;border-radius:3px;cursor:pointer;font-size:11px;flex-shrink:0;line-height:1.4';

export function createLightingDebugUI({ pointLights, bloomPass, renderer }) {
  if (!pointLights || !bloomPass) return;

  const lightState = POINT_LIGHT_DEFAULTS.map((d) => ({
    label: d.label, enabled: true,
    color: d.color, intensity: d.intensity, distance: d.distance,
    x: d.x, y: d.y, z: d.z,
  }));
  const bloomState = { ...BLOOM_DEFAULTS };

  const panel = document.createElement('div');
  panel.style.cssText = [
    'position:fixed;top:50px;left:10px;width:360px',
    'max-height:calc(100vh - 70px);overflow-y:auto',
    'background:rgba(10,10,20,.96);border:1px solid #0ff;border-radius:4px',
    'padding:10px;color:#0ff;font:11px \'Courier New\',monospace',
    'z-index:10000;box-shadow:0 0 16px rgba(0,255,255,.25);display:none',
  ].join(';');

  const hdr = document.createElement('div');
  hdr.style.cssText = 'font-weight:bold;margin-bottom:8px;font-size:12px';
  hdr.textContent = '[LGT] Lighting Debug';
  panel.appendChild(hdr);

  function makeSliderRow(label, value, min, max, step, onChange) {
    const wrap = document.createElement('div');
    wrap.style.cssText = 'display:flex;align-items:center;gap:5px;margin-bottom:4px';
    const lbl = document.createElement('span');
    lbl.style.cssText = 'flex:0 0 80px;font-size:10px';
    lbl.textContent = label;
    wrap.appendChild(lbl);
    const slider = document.createElement('input');
    slider.type = 'range'; slider.min = min; slider.max = max; slider.step = step; slider.value = value;
    slider.style.cssText = 'flex:1;cursor:pointer;accent-color:#0ff';
    wrap.appendChild(slider);
    const num = document.createElement('input');
    num.type = 'number'; num.value = value; num.step = step;
    num.style.cssText = 'width:52px;background:#0a0a14;color:#0ff;border:1px solid #0ff;padding:2px;font-size:10px';
    wrap.appendChild(num);
    function set(v) {
      const val = parseFloat(v);
      if (isNaN(val)) return;
      slider.value = val; num.value = val;
      onChange(val);
    }
    slider.addEventListener('input', () => set(slider.value));
    num.addEventListener('change', () => set(num.value));
    return { wrap, set };
  }

  function makeColorRow(label, value, onChange) {
    const wrap = document.createElement('div');
    wrap.style.cssText = 'display:flex;align-items:center;gap:5px;margin-bottom:4px';
    const lbl = document.createElement('span');
    lbl.style.cssText = 'flex:0 0 80px;font-size:10px';
    lbl.textContent = label;
    wrap.appendChild(lbl);
    const picker = document.createElement('input');
    picker.type = 'color'; picker.value = value;
    picker.style.cssText = 'width:40px;height:22px;border:1px solid #0ff;background:none;cursor:pointer;padding:0';
    picker.addEventListener('input', () => { hex.value = picker.value; onChange(picker.value); });
    wrap.appendChild(picker);
    const hex = document.createElement('input');
    hex.type = 'text'; hex.value = value; hex.maxLength = 7;
    hex.style.cssText = 'width:70px;background:#0a0a14;color:#0ff;border:1px solid #0ff;padding:2px;font-size:10px';
    hex.addEventListener('change', () => {
      const v = hex.value.startsWith('#') ? hex.value : '#' + hex.value;
      picker.value = v; onChange(v);
    });
    wrap.appendChild(hex);
    return { wrap, setColor: (v) => { picker.value = v; hex.value = v; onChange(v); } };
  }

  // ── Point lights ─────────────────────────────────────────────────────────
  pointLights.forEach((light, i) => {
    const s = lightState[i];
    const d = POINT_LIGHT_DEFAULTS[i];

    const sec = document.createElement('div');
    sec.style.cssText = 'margin-top:10px;border-top:1px solid rgba(0,255,255,.3);padding-top:8px';

    const secHdr = document.createElement('div');
    secHdr.style.cssText = 'display:flex;align-items:center;justify-content:space-between;margin-bottom:6px';
    const title = document.createElement('div');
    title.style.cssText = 'font-weight:bold;font-size:11px';
    title.textContent = `▸ Point ${i + 1} — ${s.label}`;
    secHdr.appendChild(title);
    sec.appendChild(secHdr);

    // On/Off
    const toggleRow = document.createElement('div');
    toggleRow.style.cssText = 'display:flex;align-items:center;gap:6px;margin-bottom:6px';
    const onOffBtn = document.createElement('button');
    onOffBtn.textContent = 'ON';
    onOffBtn.style.cssText = 'padding:2px 10px;background:#0ff;color:#000;border:none;border-radius:3px;cursor:pointer;font:bold 10px \'Courier New\'';
    onOffBtn.addEventListener('click', () => {
      s.enabled = !s.enabled;
      light.intensity = s.enabled ? s.intensity : 0;
      onOffBtn.textContent = s.enabled ? 'ON' : 'OFF';
      onOffBtn.style.background = s.enabled ? '#0ff' : '#333';
      onOffBtn.style.color = s.enabled ? '#000' : '#0ff';
    });
    toggleRow.appendChild(onOffBtn);
    sec.appendChild(toggleRow);

    const { setColor } = makeColorRow('Couleur', s.color, (v) => {
      s.color = v; light.color.set(v);
    });
    sec.appendChild(makeColorRow('Couleur', s.color, (v) => { s.color = v; light.color.set(v); }).wrap);

    const sliders = {};
    function addRow(label, key, min, max, step, apply) {
      const { wrap, set } = makeSliderRow(label, s[key], min, max, step, (v) => { s[key] = v; apply(v); });
      sliders[key] = set;
      sec.appendChild(wrap);
    }

    addRow('Intensité', 'intensity', 0, 20,  0.1, (v) => { if (s.enabled) light.intensity = v; });
    addRow('Distance',  'distance',  0, 30,  0.5, (v) => { light.distance = v; });
    addRow('Pos X',     'x',       -10, 10,  0.1, (v) => { light.position.x = v; });
    addRow('Pos Y',     'y',          0, 10,  0.1, (v) => { light.position.y = v; });
    addRow('Pos Z',     'z',        -15, 15,  0.1, (v) => { light.position.z = v; });

    const rstBtn = document.createElement('button');
    rstBtn.textContent = '↺ Reset';
    rstBtn.style.cssText = RESET_BTN_CSS + ';margin-top:2px';
    rstBtn.addEventListener('click', () => {
      s.enabled = true;
      onOffBtn.textContent = 'ON'; onOffBtn.style.background = '#0ff'; onOffBtn.style.color = '#000';
      s.color = d.color; light.color.set(d.color); setColor(d.color);
      ['intensity', 'distance', 'x', 'y', 'z'].forEach((k) => {
        s[k] = d[k];
        sliders[k]?.(d[k]);
      });
      light.intensity = d.intensity;
      light.distance  = d.distance;
      light.position.set(d.x, d.y, d.z);
    });
    sec.appendChild(rstBtn);
    panel.appendChild(sec);
  });

  // ── Bloom ─────────────────────────────────────────────────────────────────
  const bloomSec = document.createElement('div');
  bloomSec.style.cssText = 'margin-top:10px;border-top:1px solid rgba(0,255,255,.3);padding-top:8px';
  const bloomTitle = document.createElement('div');
  bloomTitle.style.cssText = 'font-weight:bold;margin-bottom:6px;font-size:11px';
  bloomTitle.textContent = '▸ Bloom (UnrealBloom)';
  bloomSec.appendChild(bloomTitle);

  const bloomToggleRow = document.createElement('div');
  bloomToggleRow.style.cssText = 'display:flex;align-items:center;gap:6px;margin-bottom:6px';
  const bloomOnOff = document.createElement('button');
  bloomOnOff.textContent = 'ON';
  bloomOnOff.style.cssText = 'padding:2px 10px;background:#0ff;color:#000;border:none;border-radius:3px;cursor:pointer;font:bold 10px \'Courier New\'';
  bloomOnOff.addEventListener('click', () => {
    bloomState.enabled = !bloomState.enabled;
    bloomPass.enabled = bloomState.enabled;
    bloomOnOff.textContent = bloomState.enabled ? 'ON' : 'OFF';
    bloomOnOff.style.background = bloomState.enabled ? '#0ff' : '#333';
    bloomOnOff.style.color = bloomState.enabled ? '#000' : '#0ff';
  });
  bloomToggleRow.appendChild(bloomOnOff);
  bloomSec.appendChild(bloomToggleRow);

  function addBloomRow(label, key, min, max, step, apply) {
    const { wrap } = makeSliderRow(label, bloomState[key], min, max, step, (v) => {
      bloomState[key] = v; apply(v);
    });
    bloomSec.appendChild(wrap);
  }

  addBloomRow('Strength',  'strength',  0, 3,  0.05, (v) => { bloomPass.strength  = v; });
  addBloomRow('Threshold', 'threshold', 0, 1,  0.05, (v) => { bloomPass.threshold = v; });
  addBloomRow('Radius',    'radius',    0, 1,  0.05, (v) => { bloomPass.radius    = v; });
  addBloomRow('Exposure',  'exposure',  0, 3,  0.05, (v) => { renderer.toneMappingExposure = v; });

  panel.appendChild(bloomSec);

  // ── Copy JSON ─────────────────────────────────────────────────────────────
  const sep = document.createElement('div');
  sep.style.cssText = 'margin-top:10px;border-top:1px solid rgba(0,255,255,.3);padding-top:8px';
  const copyBtn = document.createElement('button');
  copyBtn.textContent = 'Copy JSON';
  copyBtn.style.cssText = 'width:100%;padding:6px;background:#0ff;color:#000;border:none;border-radius:3px;cursor:pointer;font:bold 12px \'Courier New\'';
  copyBtn.addEventListener('click', () => {
    const out = {
      pointLights: lightState.map((s) => ({ ...s })),
      bloom: { ...bloomState },
    };
    navigator.clipboard.writeText(JSON.stringify(out, null, 2));
    copyBtn.textContent = '✓ Copied!';
    setTimeout(() => { copyBtn.textContent = 'Copy JSON'; }, 2000);
  });
  sep.appendChild(copyBtn);
  panel.appendChild(sep);
  document.body.appendChild(panel);

  // ── Toggle button ─────────────────────────────────────────────────────────
  const toggleBtn = document.createElement('button');
  toggleBtn.textContent = 'LGT';
  toggleBtn.title = 'Lighting Debug';
  toggleBtn.style.cssText = 'position:fixed;top:10px;right:130px;padding:4px 8px;background:#ff8800;color:#000;border:none;border-radius:3px;font:bold 11px \'Courier New\';cursor:pointer;z-index:10001';
  let visible = false;
  toggleBtn.addEventListener('click', () => {
    visible = !visible;
    panel.style.display = visible ? 'block' : 'none';
    toggleBtn.textContent = visible ? '✕' : 'LGT';
  });
  document.body.appendChild(toggleBtn);
}
