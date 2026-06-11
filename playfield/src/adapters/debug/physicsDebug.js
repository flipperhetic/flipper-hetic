const BTN = 'padding:1px 5px;background:transparent;color:#0ff;border:1px solid #0ff;border-radius:3px;cursor:pointer;font-size:11px;flex-shrink:0;line-height:1.4';

function makeRow(sec, label, min, max, step, initial, onChange) {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'display:flex;align-items:center;gap:4px;margin-bottom:4px';

  const lbl = document.createElement('span');
  lbl.style.cssText = 'flex:0 0 40px;font-size:10px;color:#fa0';
  lbl.textContent = label;
  wrap.appendChild(lbl);

  const slider = document.createElement('input');
  slider.type = 'range'; slider.min = min; slider.max = max; slider.step = step;
  slider.value = initial;
  slider.style.cssText = 'flex:1;cursor:pointer;accent-color:#f80';
  wrap.appendChild(slider);

  const num = document.createElement('input');
  num.type = 'number'; num.value = initial; num.step = step;
  num.style.cssText = 'width:55px;background:#0a0a14;color:#f80;border:1px solid #f80;padding:2px';
  wrap.appendChild(num);

  const resetBtn = document.createElement('button');
  resetBtn.textContent = '↺';
  resetBtn.style.cssText = BTN.replace(/#0ff/g, '#f80');
  resetBtn.addEventListener('click', () => fire(initial));
  wrap.appendChild(resetBtn);

  function fire(v) {
    const val = parseFloat(v);
    if (isNaN(val)) return;
    slider.value = val; num.value = val;
    onChange(val);
  }
  slider.addEventListener('input', () => fire(slider.value));
  num.addEventListener('change', () => fire(num.value));
  sec.appendChild(wrap);
  return { set: v => { slider.value = v; num.value = v; } };
}

export function createPhysicsDebugUI({ wallDefs, updateWall, setCylinder, cylinderDebugConfigs, setGateConfig, gateDefaults, setTucoSensor, tucoSensorDebugConfig, setRvSensor, rvSensorDebugConfig } = {}) {
  const panel = document.createElement('div');
  panel.style.cssText = [
    'position:fixed;top:50px;right:450px;width:400px',
    'max-height:calc(100vh - 70px);overflow-y:auto',
    'background:rgba(10,10,20,.96);border:1px solid #f80;border-radius:4px',
    'padding:10px;color:#f80;font:11px \'Courier New\',monospace',
    'z-index:10000;box-shadow:0 0 16px rgba(255,136,0,.25);display:none',
  ].join(';');

  const hdr = document.createElement('div');
  hdr.style.cssText = 'font-weight:bold;margin-bottom:8px;font-size:12px';
  hdr.textContent = '[COL] Physics Colliders';
  panel.appendChild(hdr);

  const copyState = {};

  // — Section Launch Gate —
  if (setGateConfig && gateDefaults) {
    const s = { ...gateDefaults };
    const apply = () => setGateConfig({ ...s, rotY: s.rotY * Math.PI / 180 });

    const sec = document.createElement('div');
    sec.style.cssText = 'margin-top:10px;border-top:1px solid rgba(255,136,0,.3);padding-top:8px';

    const secHdr = document.createElement('div');
    secHdr.style.cssText = 'display:flex;align-items:center;justify-content:space-between;margin-bottom:6px';
    const secTitle = document.createElement('div');
    secTitle.style.cssText = 'font-weight:bold';
    secTitle.textContent = '▸ Launch Gate';
    secHdr.appendChild(secTitle);

    const resetBtn = document.createElement('button');
    resetBtn.textContent = '↺ Reset';
    resetBtn.style.cssText = BTN.replace(/#0ff/g, '#f80');
    resetBtn.addEventListener('click', () => {
      Object.assign(s, gateDefaults);
      gateRows.forEach(r => r.ctrl.set(gateDefaults[r.key]));
      apply();
    });
    secHdr.appendChild(resetBtn);
    sec.appendChild(secHdr);

    const gateRows = [
      { key: 'x',    label: 'X',   min: -10,  max: 10,  step: 0.05 },
      { key: 'z',    label: 'Z',   min: -10,  max: 10,  step: 0.05 },
      { key: 'rotY', label: 'RY°', min: -180, max: 180, step: 1    },
      { key: 'w',    label: 'W',   min: 0.05, max: 8,   step: 0.05 },
      { key: 'h',    label: 'H',   min: 0.05, max: 5,   step: 0.05 },
      { key: 'd',    label: 'D',   min: 0.05, max: 5,   step: 0.05 },
    ].map(({ key, label: lbl, min, max, step }) => {
      const ctrl = makeRow(sec, lbl, min, max, step, s[key], val => { s[key] = val; apply(); });
      return { key, ctrl };
    });

    copyState['Launch Gate'] = s;
    panel.appendChild(sec);
  }

  // — Sections bumpers cylindriques —
  if (setCylinder && cylinderDebugConfigs) {
    for (const { idx, label, defaults } of cylinderDebugConfigs) {
      const s = { ...defaults };
      const apply = () => setCylinder(idx, { ...s, rotY: s.rotY * Math.PI / 180 });

      const sec = document.createElement('div');
      sec.style.cssText = 'margin-top:10px;border-top:1px solid rgba(255,136,0,.3);padding-top:8px';

      const secHdr = document.createElement('div');
      secHdr.style.cssText = 'display:flex;align-items:center;justify-content:space-between;margin-bottom:6px';
      const secTitle = document.createElement('div');
      secTitle.style.cssText = 'font-weight:bold';
      secTitle.textContent = `▸ ${label}`;
      secHdr.appendChild(secTitle);

      const resetBtn = document.createElement('button');
      resetBtn.textContent = '↺ Reset';
      resetBtn.style.cssText = BTN.replace(/#0ff/g, '#f80');
      resetBtn.addEventListener('click', () => {
        Object.assign(s, defaults);
        rows.forEach(r => r.ctrl.set(defaults[r.key]));
        apply();
      });
      secHdr.appendChild(resetBtn);
      sec.appendChild(secHdr);

      const rows = [
        { key: 'x',      label: 'X',    min: -10,  max: 10,  step: 0.05 },
        { key: 'y',      label: 'Y',    min: -5,   max: 10,  step: 0.05 },
        { key: 'z',      label: 'Z',    min: -15,  max: 15,  step: 0.05 },
        { key: 'rotY',   label: 'RY°',  min: -180, max: 180, step: 1    },
        { key: 'radius', label: 'R',    min: 0.05, max: 5,   step: 0.05 },
        { key: 'height', label: 'H',    min: 0.05, max: 10,  step: 0.05 },
      ].map(({ key, label: lbl, min, max, step }) => {
        const ctrl = makeRow(sec, lbl, min, max, step, s[key], val => { s[key] = val; apply(); });
        return { key, ctrl };
      });

      copyState[label] = s;
      panel.appendChild(sec);
    }
  }

  // — Sections Sensors (Tuco / RV) —
  for (const [setFn, cfg] of [[setTucoSensor, tucoSensorDebugConfig], [setRvSensor, rvSensorDebugConfig]]) {
    if (!setFn || !cfg) continue;
    const { label, defaults } = cfg;
    const s = { ...defaults };
    const apply = () => setFn({ ...s, rotY: s.rotY * Math.PI / 180 });

    const sec = document.createElement('div');
    sec.style.cssText = 'margin-top:10px;border-top:1px solid rgba(0,255,0,.3);padding-top:8px';

    const secHdr = document.createElement('div');
    secHdr.style.cssText = 'display:flex;align-items:center;justify-content:space-between;margin-bottom:6px';
    const secTitle = document.createElement('div');
    secTitle.style.cssText = 'font-weight:bold;color:#0f0';
    secTitle.textContent = `▸ ${label}`;
    secHdr.appendChild(secTitle);

    const resetBtn = document.createElement('button');
    resetBtn.textContent = '↺ Reset';
    resetBtn.style.cssText = BTN.replace(/#0ff/g, '#0f0');
    const rows = [
      { key: 'x',    label: 'X',   min: -10,  max: 10,  step: 0.05 },
      { key: 'y',    label: 'Y',   min: -5,   max: 10,  step: 0.05 },
      { key: 'z',    label: 'Z',   min: -15,  max: 15,  step: 0.05 },
      { key: 'rotY', label: 'RY°', min: -180, max: 180, step: 1    },
      { key: 'w',    label: 'W',   min: 0.05, max: 8,   step: 0.05 },
      { key: 'h',    label: 'H',   min: 0.05, max: 5,   step: 0.05 },
      { key: 'd',    label: 'D',   min: 0.05, max: 5,   step: 0.05 },
    ].map(({ key, label: lbl, min, max, step }) => {
      const ctrl = makeRow(sec, lbl, min, max, step, s[key], val => { s[key] = val; apply(); });
      return { key, ctrl };
    });
    resetBtn.addEventListener('click', () => {
      Object.assign(s, defaults);
      rows.forEach(r => r.ctrl.set(defaults[r.key]));
      apply();
    });
    secHdr.appendChild(resetBtn);
    sec.insertBefore(secHdr, sec.firstChild);
    panel.appendChild(sec);
    copyState[label] = s;
  }

  // — Copy JSON —
  const foot = document.createElement('div');
  foot.style.cssText = 'margin-top:10px;border-top:1px solid rgba(255,136,0,.3);padding-top:8px';
  const copyBtn = document.createElement('button');
  copyBtn.textContent = 'Copy JSON';
  copyBtn.style.cssText = 'width:100%;padding:6px;background:#f80;color:#000;border:none;border-radius:3px;cursor:pointer;font:bold 12px \'Courier New\'';
  copyBtn.addEventListener('click', () => {
    const out = {};
    for (const [k, s] of Object.entries(copyState)) out[k] = { ...s };
    navigator.clipboard.writeText(JSON.stringify(out, null, 2));
    copyBtn.textContent = '✓ Copied!';
    setTimeout(() => { copyBtn.textContent = 'Copy JSON'; }, 2000);
  });
  foot.appendChild(copyBtn);
  panel.appendChild(foot);

  document.body.appendChild(panel);

  const btn = document.createElement('button');
  btn.textContent = 'COL';
  btn.title = 'Physics Colliders Debug';
  btn.style.cssText = 'position:fixed;top:10px;right:220px;padding:4px 8px;background:#f80;color:#000;border:none;border-radius:3px;font:bold 11px \'Courier New\';cursor:pointer;z-index:10001';
  let visible = false;
  btn.addEventListener('click', () => {
    visible = !visible;
    panel.style.display = visible ? 'block' : 'none';
    btn.textContent = visible ? '✕' : 'COL';
  });
  document.body.appendChild(btn);
}
