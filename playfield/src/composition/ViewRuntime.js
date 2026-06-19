import * as THREE from 'three';
import {
  MAX_RENDERER_PIXEL_RATIO,
  TABLE_WIDTH,
  TABLE_DEPTH,
  WALL_THICKNESS,
  WALL_HEIGHT,
} from '../domain/constants.js';
import { PLAYFIELD_VIEW_DEFAULTS, applyViewConfigToPerspectiveCamera } from '../domain/viewConfig.js';

const DEG = Math.PI / 180;
const ORTHO_FRAME_MARGIN = 1.0;

// Coins 3D du plateau (murs inclus) projetés en vue caméra pour calibrer automatiquement les bornes de la caméra orthographique.
const TABLE_CORNERS = (() => {
  const hw = TABLE_WIDTH / 2 + WALL_THICKNESS;
  const hd = TABLE_DEPTH / 2 + WALL_THICKNESS;
  const corners = [];
  for (const sx of [-1, 1])
    for (const sy of [0, 1])
      for (const sz of [-1, 1])
        corners.push(new THREE.Vector3(sx * hw, sy * WALL_HEIGHT, sz * hd));
  return corners;
})();

export default class ViewRuntime {
  #camera;
  #renderer;
  #scene;
  #levelGroup;
  #world;
  #dirLight;
  #activeCamera;
  #orthoCamera;
  #v = new THREE.Vector3();
  #toView = new THREE.Matrix4();

  params;

  constructor({ camera, renderer, scene, levelGroup, world, dirLight }, params = PLAYFIELD_VIEW_DEFAULTS) {
    this.#camera = camera;
    this.#renderer = renderer;
    this.#scene = scene;
    this.#levelGroup = levelGroup;
    this.#world = world;
    this.#dirLight = dirLight;
    this.#activeCamera = camera;
    this.#orthoCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, params.near, params.far);
    this.params = params;
    this.apply();
  }

  getCamera = () => this.#activeCamera;

  onResize = () => {
    if (this.params.cameraMode === 'perspective') {
      this.#camera.aspect = window.innerWidth / window.innerHeight;
      this.#camera.updateProjectionMatrix();
    } else {
      this.#updateOrthoBounds();
    }
    this.#renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, MAX_RENDERER_PIXEL_RATIO));
    this.#renderer.setSize(window.innerWidth, window.innerHeight);
  };

  apply() {
    const p = this.params;

    if (this.#levelGroup) {
      this.#levelGroup.position.set(p.levelPosX, p.levelPosY, p.levelPosZ);
      this.#levelGroup.rotation.set(p.levelRotX * DEG, p.levelRotY * DEG, p.levelRotZ * DEG);
      this.#levelGroup.updateMatrixWorld(true);
    }

    if (p.cameraMode === 'orthographic') {
      this.#activeCamera = this.#orthoCamera;
      this.#applyCameraTransform(this.#orthoCamera);
      this.#updateOrthoBounds();
    } else {
      this.#activeCamera = this.#camera;
      applyViewConfigToPerspectiveCamera(this.#camera, p);
    }

    if (this.#world) this.#world.setGravity(p.gravityTiltDeg, p.gravityMagnitude);

    if (this.#dirLight) {
      this.#dirLight.position.set(p.dirLightX, p.dirLightY, p.dirLightZ);
      this.#dirLight.intensity = p.dirLightIntensity;
    }

    if (this.#scene) {
      const ambient = this.#scene.children.find(c => c.isAmbientLight);
      if (ambient) ambient.intensity = p.ambientIntensity;
    }
  }

  #applyCameraTransform(target) {
    const p = this.params;
    target.position.set(p.cameraPosX, p.cameraPosY, p.cameraPosZ);
    target.up.set(p.cameraUpX, p.cameraUpY, p.cameraUpZ).normalize();
    target.lookAt(p.lookAtX, p.lookAtY, p.lookAtZ);
    target.near = p.near;
    target.far = p.far;
  }

  #updateOrthoBounds() {
    const p = this.params;
    this.#orthoCamera.updateMatrixWorld(true);
    const camInv = new THREE.Matrix4().copy(this.#orthoCamera.matrixWorld).invert();
    const levelMatrix = this.#levelGroup
      ? (this.#levelGroup.updateMatrixWorld(true), this.#levelGroup.matrixWorld)
      : new THREE.Matrix4();
    this.#toView.multiplyMatrices(camInv, levelMatrix);

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const c of TABLE_CORNERS) {
      this.#v.copy(c).applyMatrix4(this.#toView);
      if (this.#v.x < minX) minX = this.#v.x;
      if (this.#v.x > maxX) maxX = this.#v.x;
      if (this.#v.y < minY) minY = this.#v.y;
      if (this.#v.y > maxY) maxY = this.#v.y;
    }

    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    const aspect = window.innerWidth / window.innerHeight;
    const halfH = ((maxY - minY) / 2) * ORTHO_FRAME_MARGIN / p.orthoZoomY;
    const halfW = halfH * aspect;

    this.#orthoCamera.left = cx - halfW;
    this.#orthoCamera.right = cx + halfW;
    this.#orthoCamera.top = cy + halfH;
    this.#orthoCamera.bottom = cy - halfH;
    this.#orthoCamera.near = p.near;
    this.#orthoCamera.far = p.far;
    this.#orthoCamera.updateProjectionMatrix();
  }
}
