import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createDebugUI } from "./ui.js";
import { createAudioDebugUI } from "./audioDebug.js";
import { createPlayfieldDebugUI } from "./playfieldDebug.js";
import { createPhysicsDebugUI } from "./physicsDebug.js";

export function wirePlayfieldDebug(deps) {
  const { viewRuntime, renderer, audio, onResetHighScore, onResetBall, level } = deps;

  if (level) level.setPhysicsDebugVisible(true);

  const onConfigChange = (config) => {
    Object.assign(viewRuntime.params, config);
    viewRuntime.apply();
    console.log("[debug] config applied", config);
  };

  const { container } = createDebugUI({ onConfigChange, onResetHighScore, onResetBall });

  const controls = new OrbitControls(viewRuntime.orthoCamera, renderer.domElement);
  controls.enabled = false;

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
      setPhysicsDebugVisible: level.setPhysicsDebugVisible,
    });
    createPhysicsDebugUI({
      onTriggerSpecialEvent: deps.onTriggerSpecialEvent,
    });
  }

  console.log("[debug] menu initialized — press ` to toggle");
}
