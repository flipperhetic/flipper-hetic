export const PLAYFIELD_VIEW_DEFAULTS = {
  cameraMode: "orthographic",
  cameraPosX: 0,
  cameraPosY: 24.1,
  cameraPosZ: 22.632,
  lookAtX: 0,
  lookAtY: 2.2,
  lookAtZ: 0,
  cameraUpX: 0,
  cameraUpY: 0,
  cameraUpZ: -1,
  fov: 60,
  orthoZoomX: 1,
  orthoZoomY: 1,
  near: 0.1,
  far: 100,
  levelPosX: 0,
  levelPosY: 0,
  levelPosZ: 0,
  levelRotX: 0,
  levelRotY: 0,
  levelRotZ: 0,
  // La bille a son Y verrouille (cf. clampBallBody) : seule la composante Z de
  // la gravite (g * sin(tilt)) la fait avancer. Sur un plateau profond de 29
  // unites il faut donc une accel "pente" consequente, d'ou tilt + magnitude
  // eleves -> g*sin(30) = 40*0.5 = 20 u/s^2 (vs ~2.5 auparavant).
  gravityTiltDeg: 30,
  gravityMagnitude: 40,
  ambientIntensity: 0.6,
  dirLightX: 5,
  dirLightY: 15,
  dirLightZ: 5,
  dirLightIntensity: 0.8,
};

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
