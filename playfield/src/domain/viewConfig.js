/**
 * Configuration vue playfield (production).
 */
export const PLAYFIELD_VIEW_DEFAULTS = {
  cameraMode: "orthographic",
  cameraPosX: 0,
  cameraPosY: 20,
  cameraPosZ: 6,
  lookAtX: 0,
  lookAtY: 0,
  lookAtZ: 0,
  cameraUpX: 0,
  cameraUpY: 0,
  cameraUpZ: -1,
  fov: 60,
  orthoZoom: 1.1,
  near: 0.1,
  far: 100,
  levelPosX: 0,
  levelPosY: 0,
  levelPosZ: 0,
  levelRotX: 0,
  levelRotY: 0,
  levelRotZ: 0,
  gravityTiltDeg: 24,
  gravityMagnitude: 18,
  ambientIntensity: 0.6,
  dirLightX: 5,
  dirLightY: 15,
  dirLightZ: 5,
  dirLightIntensity: 0.8,
};

const DEG = Math.PI / 180;

/**
 * @param {import("three").PerspectiveCamera} camera
 * @param {typeof PLAYFIELD_VIEW_DEFAULTS} [config]
 */
export function applyViewConfigToPerspectiveCamera(
  camera,
  config = PLAYFIELD_VIEW_DEFAULTS,
) {
  camera.fov = config.fov;
  camera.near = config.near;
  camera.far = config.far;
  camera.position.set(config.cameraPosX, config.cameraPosY, config.cameraPosZ);
  camera.up.set(config.cameraUpX, config.cameraUpY, config.cameraUpZ).normalize();
  camera.lookAt(config.lookAtX, config.lookAtY, config.lookAtZ);
  camera.updateProjectionMatrix();
}

/**
 * @param {import("three").Group} group
 * @param {typeof PLAYFIELD_VIEW_DEFAULTS} [config]
 */
export function applyViewConfigToLevelGroup(
  group,
  config = PLAYFIELD_VIEW_DEFAULTS,
) {
  group.position.set(config.levelPosX, config.levelPosY, config.levelPosZ);
  group.rotation.set(
    config.levelRotX * DEG,
    config.levelRotY * DEG,
    config.levelRotZ * DEG,
  );
}
