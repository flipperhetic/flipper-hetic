export function createPhysicsDebugUI() {
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
