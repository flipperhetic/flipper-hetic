import {
  GLB_SCALE_X, GLB_SCALE_Y, GLB_SCALE_Z, GLB_ROTATION_X, GLB_ROTATION_Y, GLB_ROTATION_Z,
  GLB_POSITION_X, GLB_POSITION_Y, GLB_POSITION_Z,
} from '../renderer/modelLoader.js';
import { BoxGeometry, CylinderGeometry } from 'three';
import {
  FLIPPER_PIVOT_X, FLIPPER_PIVOT_Z, FLIPPER_PIVOT_Y, FLIPPER_REST_ANGLE,
  FLIPPER_ROT_X, FLIPPER_ROT_Z, FLIPPER_OFFSET_X,
  PLUNGER_SPAWN_X, PLUNGER_SPAWN_Y, PLUNGER_SPAWN_Z,
} from '../../domain/constants.js';
import { PLAYFIELD_VIEW_DEFAULTS } from '../../domain/viewConfig.js';

const DEG = Math.PI / 180;
const RESET_BTN_CSS = 'padding:1px 5px;background:transparent;color:#0ff;border:1px solid #0ff;border-radius:3px;cursor:pointer;font-size:11px;flex-shrink:0;line-height:1.4';

export function createPlayfieldDebugUI({ gltfModel, gltfInner, flipperBodies, ballBody, world, onConfigChange, physicsRotateY, setPhysicsDebugVisible, triggers }) {
  const defaults = {
    glbScaleY: GLB_SCALE_Y,
    glbScaleZ: GLB_SCALE_Z,
    glbScaleX: GLB_SCALE_X,
    glbRotX:   GLB_ROTATION_X,
    glbRotY:   GLB_ROTATION_Y,
    glbRotZ:   GLB_ROTATION_Z,
    glbPosX:   GLB_POSITION_X,
    glbPosY:   GLB_POSITION_Y,
    glbPosZ:   GLB_POSITION_Z,
    pivotX:       FLIPPER_PIVOT_X,
    pivotY:       FLIPPER_PIVOT_Y,
    pivotZ:       FLIPPER_PIVOT_Z,
    offsetX:      FLIPPER_OFFSET_X,
    restAngle:    FLIPPER_REST_ANGLE,
    flipperRotX:  FLIPPER_ROT_X / DEG,
    flipperRotZ:  FLIPPER_ROT_Z / DEG,
    spawnX:    PLUNGER_SPAWN_X,
    spawnY:    PLUNGER_SPAWN_Y,
    spawnZ:    PLUNGER_SPAWN_Z,
    gravityTiltDeg:   PLAYFIELD_VIEW_DEFAULTS.gravityTiltDeg,
    gravityMagnitude: PLAYFIELD_VIEW_DEFAULTS.gravityMagnitude,
    worldRotX: 0,
    worldRotY: 0,
    worldRotZ: 0,
  };

  const state = { ...defaults };

  function applyGLB() {
    if (!gltfModel) return;
    // Scale and position on outer group — changing scale stays in world axes, no rotation interaction.
    gltfModel.scale.set(state.glbScaleX, state.glbScaleY, state.glbScaleZ);
    gltfModel.position.set(state.glbPosX, state.glbPosY, state.glbPosZ);
    // Rotation on inner model — isolated from scale so non-uniform scale doesn't shear.
    const rotTarget = gltfInner ?? gltfModel;
    rotTarget.rotation.set(
      (state.glbRotX + state.worldRotX) * DEG,
      (state.glbRotY + state.worldRotY) * DEG,
      (state.glbRotZ + state.worldRotZ) * DEG,
    );
  }

  function quatFromYaw(a) { const h = a / 2; return { x: 0, y: Math.sin(h), z: 0, w: Math.cos(h) }; }
  function quatFromAxis(ax, ay, az, a) { const h = a / 2, s = Math.sin(h); return { x: ax*s, y: ay*s, z: az*s, w: Math.cos(h) }; }
  function mulQuat(a, b) {
    return {
      x: a.w*b.x + a.x*b.w + a.y*b.z - a.z*b.y,
      y: a.w*b.y - a.x*b.z + a.y*b.w + a.z*b.x,
      z: a.w*b.z + a.x*b.y - a.y*b.x + a.z*b.w,
      w: a.w*b.w - a.x*b.x - a.y*b.y - a.z*b.z,
    };
  }
  function composeRot(yaw, rx, rz) {
    return mulQuat(mulQuat(quatFromYaw(yaw), quatFromAxis(1, 0, 0, rx)), quatFromAxis(0, 0, 1, rz));
  }
  function qTiltFrom(rx, rz) {
    return mulQuat(quatFromAxis(1, 0, 0, rx), quatFromAxis(0, 0, 1, rz));
  }

  function applyGravity() {
    if (!world) return;
    world.setGravity(state.gravityTiltDeg, state.gravityMagnitude);
  }

  function applyWorldRot() {
    applyGLB();
    if (physicsRotateY) physicsRotateY(state.worldRotY);
  }


  function applyBall() {
    if (!ballBody?.rb) return;
    if (ballBody?.setFixedY) ballBody.setFixedY(state.spawnY);
    ballBody.rb.setBodyType(2, true);
    ballBody.rb.setNextKinematicTranslation({ x: state.spawnX, y: state.spawnY, z: state.spawnZ });
    ballBody.rb.setLinvel({ x: 0, y: 0, z: 0 }, true);
    ballBody.rb.setAngvel({ x: 0, y: 0, z: 0 }, true);
    ballBody.userData.launched = false;
  }

  function applyFlippers() {
    if (!flipperBodies) return;
    const { left, right } = flipperBodies;
    const px = state.pivotX;
    const ox = state.offsetX;
    const rx = state.flipperRotX * DEG;
    const rz = state.flipperRotZ * DEG;
    const qTilt = qTiltFrom(rx, rz);
    left.body.rb.setTranslation({ x: -px + ox, y: state.pivotY, z: state.pivotZ }, true);
    right.body.rb.setTranslation({ x:  px + ox, y: state.pivotY, z: state.pivotZ }, true);
    left.restAngle   = -state.restAngle; left.activeAngle   = state.restAngle;  left.currentAngle   = left.restAngle;
    right.restAngle  =  state.restAngle; right.activeAngle  = -state.restAngle; right.currentAngle  = right.restAngle;
    left.rotX  = rx; left.rotZ  = rz; left.qTilt  = qTilt;
    right.rotX = rx; right.rotZ = rz; right.qTilt = qTilt;
    left.body.rb.setRotation(composeRot(left.restAngle, rx, rz), true);
    right.body.rb.setRotation(composeRot(right.restAngle, rx, rz), true);
  }

  const SECTIONS = [
    {
      title: '▸ GLB Visual',
      rows: [
        { key: 'glbScaleY', label: 'Scale Y',     min: 0.1,  max: 20,   step: 0.05, apply: applyGLB },
        { key: 'glbScaleZ', label: 'Scale Z',     min: 0.1,  max: 20,   step: 0.05, apply: applyGLB },
        { key: 'glbScaleX', label: 'Scale X',     min: 0.1,  max: 20,   step: 0.05, apply: applyGLB },
        { key: 'glbRotX',  label: 'Rotation X°', min: -180, max: 180,  step: 1,    apply: applyGLB },
        { key: 'glbRotY',  label: 'Rotation Y°', min: -180, max: 180,  step: 1,    apply: applyGLB },
        { key: 'glbRotZ',  label: 'Rotation Z°', min: -180, max: 180,  step: 1,    apply: applyGLB },
        { key: 'glbPosX',  label: 'Position X',  min: -20,  max: 20,   step: 0.05, apply: applyGLB },
        { key: 'glbPosY',  label: 'Position Y',  min: -20,  max: 20,   step: 0.05, apply: applyGLB },
        { key: 'glbPosZ',  label: 'Position Z',  min: -20,  max: 20,   step: 0.05, apply: applyGLB },
      ],
    },
    {
      title: '▸ Flippers',
      rows: [
        { key: 'pivotZ',      label: 'Pivot Z',       min: 0,    max: 18,   step: 0.05, apply: applyFlippers },
        { key: 'pivotY',      label: 'Pivot Y',       min: -2,   max: 2,    step: 0.05, apply: applyFlippers },
        { key: 'offsetX',     label: 'Center X',      min: -6,   max: 6,    step: 0.05, apply: applyFlippers },
        { key: 'pivotX',      label: 'Half Gap',      min: 0,    max: 8,    step: 0.05, apply: applyFlippers },
        { key: 'restAngle',   label: 'Rest Angle',    min: 0,    max: 3.14, step: 0.01, apply: applyFlippers },
        { key: 'flipperRotX', label: 'Rotation X°',   min: -90,  max: 90,   step: 1,    apply: applyFlippers },
        { key: 'flipperRotZ', label: 'Rotation Z°',   min: -90,  max: 90,   step: 1,    apply: applyFlippers },
      ],
    },
    {
      title: '▸ Ball Spawn',
      rows: [
        { key: 'spawnX', label: 'Spawn X', min: -6,  max: 6,  step: 0.05, apply: applyBall },
        { key: 'spawnY', label: 'Spawn Y', min: -2,  max: 5,  step: 0.05, apply: applyBall },
        { key: 'spawnZ', label: 'Spawn Z', min: 0,   max: 12, step: 0.05, apply: applyBall },
      ],
    },
    {
      title: '▸ Gravity',
      rows: [
        { key: 'gravityTiltDeg',   label: 'Tilt (°)',    min: -45, max: 45, step: 0.5, apply: applyGravity },
        { key: 'gravityMagnitude', label: 'Magnitude',   min: 0,   max: 60, step: 0.5, apply: applyGravity },
      ],
    },
    {
      title: '▸ World Rotation',
      rows: [
        { key: 'worldRotX', label: 'Rotate X (°)', min: -180, max: 180, step: 1, apply: applyWorldRot },
        { key: 'worldRotY', label: 'Rotate Y (°)', min: -180, max: 180, step: 1, apply: applyWorldRot },
        { key: 'worldRotZ', label: 'Rotate Z (°)', min: -180, max: 180, step: 1, apply: applyWorldRot },
      ],
    },
  ];

  const panel = document.createElement('div');
  panel.style.cssText = [
    'position:fixed;top:50px;left:10px;width:420px',
    'max-height:calc(100vh - 70px);overflow-y:auto',
    'background:rgba(10,10,20,.96);border:1px solid #0ff;border-radius:4px',
    'padding:10px;color:#0ff;font:11px \'Courier New\',monospace',
    'z-index:10000;box-shadow:0 0 16px rgba(0,255,255,.25);display:none',
  ].join(';');

  const hdr = document.createElement('div');
  hdr.style.cssText = 'font-weight:bold;margin-bottom:8px;font-size:12px';
  hdr.textContent = '[PFD] Playfield Debug';
  panel.appendChild(hdr);

  const allOnChange = [];

  function makeRow(row) {
    const wrap = document.createElement('div');
    wrap.style.cssText = 'display:flex;align-items:center;gap:5px;margin-bottom:5px';

    const lbl = document.createElement('span');
    lbl.style.cssText = 'flex:0 0 95px';
    lbl.textContent = row.label;
    wrap.appendChild(lbl);

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = row.min; slider.max = row.max; slider.step = row.step; slider.value = state[row.key];
    slider.style.cssText = 'flex:1;cursor:pointer;accent-color:#0ff';
    wrap.appendChild(slider);

    const num = document.createElement('input');
    num.type = 'number'; num.value = state[row.key]; num.step = row.step;
    num.style.cssText = 'width:55px;background:#0a0a14;color:#0ff;border:1px solid #0ff;padding:2px';
    wrap.appendChild(num);

    const onChange = (v) => {
      const val = parseFloat(v);
      if (isNaN(val)) return;
      state[row.key] = val; slider.value = val; num.value = val;
      row.apply?.();
    };

    slider.addEventListener('input', () => onChange(slider.value));
    num.addEventListener('change', () => onChange(num.value));

    const resetBtn = document.createElement('button');
    resetBtn.textContent = '↺';
    resetBtn.title = `Reset to ${defaults[row.key]}`;
    resetBtn.style.cssText = RESET_BTN_CSS;
    resetBtn.addEventListener('click', () => onChange(defaults[row.key]));
    wrap.appendChild(resetBtn);

    allOnChange.push({ key: row.key, onChange });
    return wrap;
  }

  SECTIONS.forEach(({ title, rows }) => {
    const sec = document.createElement('div');
    sec.style.cssText = 'margin-top:10px;border-top:1px solid rgba(0,255,255,.3);padding-top:8px';

    const secHeader = document.createElement('div');
    secHeader.style.cssText = 'display:flex;align-items:center;justify-content:space-between;margin-bottom:6px';

    const h = document.createElement('div');
    h.style.cssText = 'font-weight:bold';
    h.textContent = title;
    secHeader.appendChild(h);

    const secReset = document.createElement('button');
    secReset.textContent = '↺ Reset section';
    secReset.style.cssText = RESET_BTN_CSS;
    secReset.addEventListener('click', () => {
      rows.forEach((r) => { state[r.key] = defaults[r.key]; });
      allOnChange
        .filter(({ key }) => rows.some((r) => r.key === key))
        .forEach(({ key, onChange }) => onChange(defaults[key]));
    });
    secHeader.appendChild(secReset);
    sec.appendChild(secHeader);

    rows.forEach((r) => sec.appendChild(makeRow(r)));
    panel.appendChild(sec);
  });

  // ── Component sections (Obstacles / Bumpers / Triggers) ──────────────────

  function makeCompUI(comp) {
    const cs = { x: comp.ix, y: comp.iy, z: comp.iz, rx: comp.irx ?? 0, ry: comp.iry, rz: comp.irz ?? 0 };
    if (comp.w != null) { cs.w = comp.w; cs.h = comp.h; cs.d = comp.d; }
    if (comp.radius != null) { cs.radius = comp.radius; cs.height = comp.height; }
    if (comp.shapeControls) { for (const sc of comp.shapeControls) cs[sc.key] = sc.default; }
    const cd = { ...cs };
    const changeFns = {};

    function applyPos() {
      comp.body?.rb?.setTranslation({ x: cs.x, y: cs.y, z: cs.z }, true);
    }
    function applyRot() {
      if (!comp.body?.rb) return;
      const hx = cs.rx * DEG / 2, hy = cs.ry * DEG / 2, hz = cs.rz * DEG / 2;
      const qx = { x: Math.sin(hx), y: 0, z: 0, w: Math.cos(hx) };
      const qy = { x: 0, y: Math.sin(hy), z: 0, w: Math.cos(hy) };
      const qz = { x: 0, y: 0, z: Math.sin(hz), w: Math.cos(hz) };
      comp.body.rb.setRotation(mulQuat(mulQuat(qy, qx), qz), true);
    }
    function applySize() {
      const col = comp.body?.colliders?.[0];
      if (!col) return;
      if (cs.w != null) {
        col.setHalfExtents({ x: cs.w / 2, y: cs.h / 2, z: cs.d / 2 });
        if (comp.mesh) {
          comp.mesh.geometry.dispose();
          comp.mesh.geometry = new BoxGeometry(cs.w, cs.h, cs.d);
        }
      } else if (cs.radius != null) {
        col.setRadius(cs.radius);
        col.setHalfHeight(cs.height / 2);
        if (comp.mesh) {
          comp.mesh.geometry.dispose();
          comp.mesh.geometry = new CylinderGeometry(cs.radius, cs.radius, cs.height, 24);
        }
      }
    }

    function makeCompRow(key, label, min, max, step, onApply) {
      const wrap = document.createElement('div');
      wrap.style.cssText = 'display:flex;align-items:center;gap:4px;margin-bottom:4px';
      const lbl = document.createElement('span');
      lbl.style.cssText = 'flex:0 0 72px;font-size:10px';
      lbl.textContent = label;
      wrap.appendChild(lbl);
      const slider = document.createElement('input');
      slider.type = 'range'; slider.min = min; slider.max = max; slider.step = step; slider.value = cs[key];
      slider.style.cssText = 'flex:1;cursor:pointer;accent-color:#0ff';
      wrap.appendChild(slider);
      const num = document.createElement('input');
      num.type = 'number'; num.value = cs[key]; num.step = step;
      num.style.cssText = 'width:50px;background:#0a0a14;color:#0ff;border:1px solid #0ff;padding:2px;font-size:10px';
      wrap.appendChild(num);
      function onChange(v) {
        const val = parseFloat(v);
        if (isNaN(val)) return;
        cs[key] = val;
        num.value = val;
        if (val >= parseFloat(slider.min) && val <= parseFloat(slider.max)) slider.value = val;
        onApply();
      }
      slider.addEventListener('input', () => onChange(slider.value));
      num.addEventListener('change', () => onChange(num.value));
      const rstBtn = document.createElement('button');
      rstBtn.textContent = '↺';
      rstBtn.style.cssText = 'padding:0 4px;background:transparent;color:#0ff;border:1px solid #0ff;border-radius:3px;cursor:pointer;font-size:10px;line-height:1.4';
      rstBtn.addEventListener('click', () => onChange(cd[key]));
      wrap.appendChild(rstBtn);
      changeFns[key] = onChange;
      return wrap;
    }

    const container = document.createElement('div');
    container.style.cssText = 'margin-top:4px;border-left:2px solid rgba(0,255,255,.15)';

    const compHdr = document.createElement('div');
    compHdr.style.cssText = 'display:flex;align-items:center;gap:4px;padding:2px 4px;cursor:pointer;font-size:10px;color:#8ff';
    const arrow = document.createElement('span');
    arrow.textContent = '▸';
    compHdr.appendChild(arrow);
    const nameLbl = document.createElement('span');
    nameLbl.style.flex = '1';
    nameLbl.textContent = comp.name;
    compHdr.appendChild(nameLbl);
    const rstBtn = document.createElement('button');
    rstBtn.textContent = '↺';
    rstBtn.style.cssText = 'padding:0 4px;background:transparent;color:#0ff;border:1px solid #0ff;border-radius:3px;cursor:pointer;font-size:10px;line-height:1.4';
    rstBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      for (const [k, fn] of Object.entries(changeFns)) fn(cd[k]);
    });
    compHdr.appendChild(rstBtn);

    const rows = document.createElement('div');
    rows.style.cssText = 'display:none;padding:4px 4px 0 8px';

    rows.appendChild(makeCompRow('x',  'Pos X',    -15,  15,  0.05, applyPos));
    rows.appendChild(makeCompRow('y',  'Pos Y',     -5,   5,  0.05, applyPos));
    rows.appendChild(makeCompRow('z',  'Pos Z',    -15,  15,  0.05, applyPos));
    rows.appendChild(makeCompRow('rx', 'Rot X°',  -180, 180,  1,    applyRot));
    rows.appendChild(makeCompRow('ry', 'Rot Y°',  -180, 180,  1,    applyRot));
    rows.appendChild(makeCompRow('rz', 'Rot Z°',  -180, 180,  1,    applyRot));
    if (cd.w != null) {
      rows.appendChild(makeCompRow('w', 'Taille W', 0.05, 20, 0.05, applySize));
      rows.appendChild(makeCompRow('h', 'Taille H', 0.05, 10, 0.05, applySize));
      rows.appendChild(makeCompRow('d', 'Taille D', 0.05, 20, 0.05, applySize));
    } else if (cd.radius != null) {
      rows.appendChild(makeCompRow('radius', 'Rayon',   0.05, 3, 0.05, applySize));
      rows.appendChild(makeCompRow('height', 'Hauteur', 0.05, 5, 0.05, applySize));
    }
    if (comp.shapeControls) {
      for (const sc of comp.shapeControls) {
        rows.appendChild(makeCompRow(sc.key, sc.label, sc.min, sc.max, sc.step,
          () => comp.onShapeChange(sc.key, cs[sc.key])));
      }
    }

    let expanded = false;
    compHdr.addEventListener('click', () => {
      expanded = !expanded;
      rows.style.display = expanded ? 'block' : 'none';
      arrow.textContent = expanded ? '▾' : '▸';
    });

    container.appendChild(compHdr);
    container.appendChild(rows);
    return { element: container, getCS: () => ({ ...cs }) };
  }

  const compStates = [];

  function makeComponentSection(title, components, category) {
    if (!components?.length) return;
    const sec = document.createElement('div');
    sec.style.cssText = 'margin-top:10px;border-top:1px solid rgba(0,255,255,.3);padding-top:8px';
    const h = document.createElement('div');
    h.style.cssText = 'font-weight:bold;margin-bottom:4px;font-size:11px';
    h.textContent = title;
    sec.appendChild(h);
    for (const comp of components) {
      const { element, getCS } = makeCompUI(comp);
      compStates.push({ category, name: comp.name, getCS });
      sec.appendChild(element);
    }
    panel.appendChild(sec);
  }

  makeComponentSection('▸ Triggers', triggers, 'triggers');

  // ── Controls ─────────────────────────────────────────────────────────────

  if (setPhysicsDebugVisible) {
    let debugOn = true;
    const toggleDebugBtn = document.createElement('button');
    toggleDebugBtn.textContent = 'Hide Colliders + Floor';
    toggleDebugBtn.style.cssText = 'margin-top:8px;width:100%;padding:5px;background:#ff2222;color:#fff;border:none;border-radius:3px;cursor:pointer;font:bold 11px \'Courier New\'';
    toggleDebugBtn.addEventListener('click', () => {
      debugOn = !debugOn;
      setPhysicsDebugVisible(debugOn);
      toggleDebugBtn.textContent = debugOn ? 'Hide Colliders + Floor' : 'Show Colliders + Floor';
      toggleDebugBtn.style.background = debugOn ? '#ff2222' : '#444';
    });
    panel.appendChild(toggleDebugBtn);
  }

  const teleportBtn = document.createElement('button');
  teleportBtn.textContent = 'Teleport Ball to Spawn';
  teleportBtn.style.cssText = 'margin-top:8px;width:100%;padding:5px;background:#0ff;color:#000;border:none;border-radius:3px;cursor:pointer;font:bold 11px \'Courier New\'';
  teleportBtn.addEventListener('click', () => {
    if (!ballBody?.rb) return;
    ballBody.rb.setBodyType(2, true);
    ballBody.rb.setTranslation({ x: state.spawnX, y: state.spawnY, z: state.spawnZ }, true);
    ballBody.rb.setLinvel({ x: 0, y: 0, z: 0 }, true);
    ballBody.rb.setAngvel({ x: 0, y: 0, z: 0 }, true);
    ballBody.userData.launched = false;
    teleportBtn.textContent = '✓ Done';
    setTimeout(() => { teleportBtn.textContent = 'Teleport Ball to Spawn'; }, 1500);
  });
  panel.appendChild(teleportBtn);

  const sep = document.createElement('div');
  sep.style.cssText = 'margin-top:10px;border-top:1px solid rgba(0,255,255,.3);padding-top:8px;display:flex;gap:8px';

  const resetAllBtn = document.createElement('button');
  resetAllBtn.textContent = '↺ Reset All';
  resetAllBtn.style.cssText = 'flex:1;padding:6px;background:transparent;color:#0ff;border:1px solid #0ff;border-radius:3px;cursor:pointer;font:bold 11px \'Courier New\'';
  resetAllBtn.addEventListener('click', () => {
    allOnChange.forEach(({ key, onChange }) => onChange(defaults[key]));
    resetAllBtn.textContent = '✓ Reset!';
    setTimeout(() => { resetAllBtn.textContent = '↺ Reset All'; }, 1500);
  });
  sep.appendChild(resetAllBtn);

  const copyBtn = document.createElement('button');
  copyBtn.textContent = 'Copy JSON';
  copyBtn.style.cssText = 'flex:1;padding:6px;background:#0ff;color:#000;border:none;border-radius:3px;cursor:pointer;font:bold 12px \'Courier New\'';
  copyBtn.addEventListener('click', () => {
    const components = {};
    for (const { category, name, getCS } of compStates) {
      if (!components[category]) components[category] = [];
      components[category].push({ name, ...getCS() });
    }
    navigator.clipboard.writeText(JSON.stringify({ ...state, components }, null, 2));
    copyBtn.textContent = '✓ Copied!';
    setTimeout(() => { copyBtn.textContent = 'Copy JSON'; }, 2000);
  });
  sep.appendChild(copyBtn);
  panel.appendChild(sep);
  document.body.appendChild(panel);

  const toggleBtn = document.createElement('button');
  toggleBtn.textContent = 'PFD';
  toggleBtn.title = 'Playfield Debug';
  toggleBtn.style.cssText = 'position:fixed;top:10px;right:172px;padding:4px 8px;background:#0ff;color:#000;border:none;border-radius:3px;font:bold 11px \'Courier New\';cursor:pointer;z-index:10001';
  let visible = false;
  toggleBtn.addEventListener('click', () => {
    visible = !visible;
    panel.style.display = visible ? 'block' : 'none';
    toggleBtn.textContent = visible ? '✕' : 'PFD';
  });
  document.body.appendChild(toggleBtn);
  return { getState: () => state };
}
