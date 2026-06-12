export function createPhysicsDebugUI({ onTriggerSpecialEvent } = {}) {
  if (!onTriggerSpecialEvent) return;

  const panel = document.createElement('div');
  panel.style.cssText = [
    'position:fixed;top:50px;right:450px;width:220px',
    'background:rgba(10,10,20,.96);border:1px solid #a040ff;border-radius:4px',
    'padding:10px;color:#a040ff;font:11px \'Courier New\',monospace',
    'z-index:10000;box-shadow:0 0 16px rgba(160,64,255,.25);display:none',
  ].join(';');

  const hdr = document.createElement('div');
  hdr.style.cssText = 'font-weight:bold;margin-bottom:8px;font-size:12px';
  hdr.textContent = '[EVT] Special Events';
  panel.appendChild(hdr);

  const row = document.createElement('div');
  row.style.cssText = 'display:flex;gap:8px';
  for (const [label, type] of [['▶ Tuco', 'tunnel'], ['▶ RV', 'tunnel-rv']]) {
    const btn = document.createElement('button');
    btn.textContent = label;
    btn.style.cssText = 'flex:1;padding:6px;background:#a040ff;color:#fff;border:none;border-radius:3px;cursor:pointer;font:bold 11px \'Courier New\'';
    btn.addEventListener('click', () => onTriggerSpecialEvent(type));
    row.appendChild(btn);
  }
  panel.appendChild(row);
  document.body.appendChild(panel);

  const toggleBtn = document.createElement('button');
  toggleBtn.textContent = 'EVT';
  toggleBtn.title = 'Special Events Debug';
  toggleBtn.style.cssText = 'position:fixed;top:10px;right:220px;padding:4px 8px;background:#a040ff;color:#fff;border:none;border-radius:3px;font:bold 11px \'Courier New\';cursor:pointer;z-index:10001';
  let visible = false;
  toggleBtn.addEventListener('click', () => {
    visible = !visible;
    panel.style.display = visible ? 'block' : 'none';
    toggleBtn.textContent = visible ? '✕' : 'EVT';
  });
  document.body.appendChild(toggleBtn);
}
