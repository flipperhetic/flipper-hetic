import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createDebugUI } from "./ui.js";
import { createAudioDebugUI } from "./audioDebug.js";
import { createPlayfieldDebugUI } from "./playfieldDebug.js";
import { createPhysicsDebugUI } from "./physicsDebug.js";

export function wirePlayfieldDebug(deps) {
  const { viewRuntime, renderer, audio, onResetHighScore, onResetBall, level } = deps;

  if (level) level.setPhysicsDebugVisible(true);

  // `controls` is declared here so onConfigChange can reference it after assignment.
  let controls;

  const onConfigChange = (config) => {
    Object.assign(viewRuntime.params, config);
    viewRuntime.apply();
    // Re-sync OrbitControls so it doesn't fight the new camera position on the
    // next drag. update() re-derives spherical coords from the camera's current
    // position, making sliders and OrbitControls share the same source of truth.
    if (controls) {
      const p = viewRuntime.params;
      controls.target.set(p.lookAtX, p.lookAtY, p.lookAtZ);
      controls.update();
    }
  };

  const { container, syncInputs } = createDebugUI({ onConfigChange, onResetHighScore, onResetBall });

  controls = new OrbitControls(viewRuntime.orthoCamera, renderer.domElement);
  controls.enabled = false;

  // When OrbitControls moves the camera, push the new position back into params
  // and into the slider DOM so the JSON output and sliders stay in sync.
  controls.addEventListener('change', () => {
    const cam = controls.object;
    const partial = {
      cameraPosX: +cam.position.x.toFixed(3),
      cameraPosY: +cam.position.y.toFixed(3),
      cameraPosZ: +cam.position.z.toFixed(3),
      lookAtX: +controls.target.x.toFixed(3),
      lookAtY: +controls.target.y.toFixed(3),
      lookAtZ: +controls.target.z.toFixed(3),
    };
    Object.assign(viewRuntime.params, partial);
    syncInputs(partial);
  });

  new MutationObserver(() => {
    controls.enabled = container.style.display !== 'none';
    if (!controls.enabled) viewRuntime.apply();
  }).observe(container, { attributes: true, attributeFilter: ['style'] });

  if (audio) {
    createAudioDebugUI(audio);
  }
  if (level) {
    createPlayfieldDebugUI({
      gltfModel:              level.gltfModel,
      flipperBodies:          level.flipperBodies,
      ballBody:               level.ballBody,
      world:                  deps.world,
      onConfigChange,
      physicsRotateY:         level.physicsRotateY,
      physicsTranslate:       level.physicsTranslate,
      setPhysicsDebugVisible: level.setPhysicsDebugVisible,
    });
    createPhysicsDebugUI({
      onTriggerSpecialEvent: deps.onTriggerSpecialEvent,
    });
  }

  console.log("[debug] menu initialized — press ` to toggle");
}
