/**
 * Runtime vue playfield — caméra, resize, application de viewConfig.
 */
import * as THREE from "three";
import { MAX_RENDERER_PIXEL_RATIO } from "../domain/constants.js";
import {
  PLAYFIELD_VIEW_DEFAULTS,
  applyViewConfigToPerspectiveCamera,
} from "../domain/viewConfig.js";
import { applyPhysicsGravity } from "../adapters/physics/rapier/world.js";

const DEG = Math.PI / 180;

/**
 * @param {object} deps
 * @param {import("three").PerspectiveCamera} deps.camera
 * @param {import("three").WebGLRenderer} deps.renderer
 * @param {import("three").Scene} [deps.scene]
 * @param {import("three").Group} [deps.levelGroup]
 * @param {object} [deps.world]
 * @param {import("three").DirectionalLight} [deps.dirLight]
 * @param {typeof PLAYFIELD_VIEW_DEFAULTS} [params]
 */
export function createPlayfieldViewRuntime(deps, params = PLAYFIELD_VIEW_DEFAULTS) {
  const { camera, renderer, scene, levelGroup, world, dirLight } = deps;

  let activeCamera = camera;
  const orthoCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, params.near, params.far);

  function updateOrthoBounds() {
    const aspect = window.innerWidth / window.innerHeight;
    const h = 10 / params.orthoZoom;
    const w = h * aspect;
    orthoCamera.left = -w;
    orthoCamera.right = w;
    orthoCamera.top = h;
    orthoCamera.bottom = -h;
    orthoCamera.near = params.near;
    orthoCamera.far = params.far;
    orthoCamera.updateProjectionMatrix();
  }

  function applyCameraTransform(target) {
    target.position.set(params.cameraPosX, params.cameraPosY, params.cameraPosZ);
    target.up.set(params.cameraUpX, params.cameraUpY, params.cameraUpZ).normalize();
    target.lookAt(params.lookAtX, params.lookAtY, params.lookAtZ);
    target.near = params.near;
    target.far = params.far;
  }

  function apply() {
    if (params.cameraMode === "orthographic") {
      activeCamera = orthoCamera;
      updateOrthoBounds();
      applyCameraTransform(orthoCamera);
    } else {
      activeCamera = camera;
      applyViewConfigToPerspectiveCamera(camera, params);
    }

    if (levelGroup) {
      levelGroup.position.set(params.levelPosX, params.levelPosY, params.levelPosZ);
      levelGroup.rotation.set(
        params.levelRotX * DEG,
        params.levelRotY * DEG,
        params.levelRotZ * DEG,
      );
    }

    if (world) applyPhysicsGravity(world, params.gravityTiltDeg, params.gravityMagnitude);

    if (dirLight) {
      dirLight.position.set(params.dirLightX, params.dirLightY, params.dirLightZ);
      dirLight.intensity = params.dirLightIntensity;
    }

    if (scene) {
      const ambient = scene.children.find((c) => c.isAmbientLight);
      if (ambient) ambient.intensity = params.ambientIntensity;
    }
  }

  function onResize() {
    if (params.cameraMode === "perspective") {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
    } else {
      updateOrthoBounds();
    }
    renderer.setPixelRatio(
      Math.min(window.devicePixelRatio || 1, MAX_RENDERER_PIXEL_RATIO),
    );
    renderer.setSize(window.innerWidth, window.innerHeight);
  }

  apply();

  return {
    params,
    getCamera: () => activeCamera,
    orthoCamera,
    apply,
    onResize,
  };
}
