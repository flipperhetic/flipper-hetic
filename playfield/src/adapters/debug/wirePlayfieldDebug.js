/**
 * Wire playfield debug — entry point for debug menu.
 * Import this in main.js, remove when debug is no longer needed.
 */
import { DEBUG_ENABLED } from "./config.js";
import { createDebugUI } from "./ui.js";
import { createAudioDebugUI } from "./audioDebug.js";
import {
  PLAYFIELD_VIEW_DEFAULTS,
  applyViewConfigToPerspectiveCamera,
  applyViewConfigToLevelGroup,
} from "../../domain/viewConfig.js";

const DEG = Math.PI / 180;

/**
 * Initialize debug menu and apply config changes in real-time.
 * @param {Object} deps - { viewRuntime, camera, renderer, scene, levelGroup, world, dirLight }
 */
export function wirePlayfieldDebug(deps) {
  if (!DEBUG_ENABLED) {
    console.log("[debug] disabled via config");
    return;
  }

  const { viewRuntime, audio } = deps;

  const onConfigChange = (config) => {
    // Update viewRuntime.params and apply all changes at once
    Object.assign(viewRuntime.params, config);
    viewRuntime.apply();
    console.log("[debug] config applied", config);
  };

  // Create UI with config change handler
  createDebugUI(onConfigChange);
  if (audio) {
    createAudioDebugUI(audio);
  }

  console.log("[debug] menu initialized — press ` to toggle");
}
