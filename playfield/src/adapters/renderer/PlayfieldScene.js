import * as THREE from "three";
import {
  MAX_RENDERER_PIXEL_RATIO,
  RENDERER_ANTIALIAS,
} from "../../domain/constants.js";
import {
  PLAYFIELD_VIEW_DEFAULTS,
  applyViewConfigToPerspectiveCamera,
} from "../../domain/viewConfig.js";

export const POINT_LIGHT_DEFAULTS = [
  { label: 'Bumpers',     color: '#ff5510', intensity: 5, distance: 10, x:  0.8, y: 3, z: -2   },
  { label: 'Flippers',   color: '#ff2207', intensity: 5, distance: 10, x: -0.5, y: 3, z:  4.5 },
  { label: 'Gauche',     color: '#ff3a12', intensity: 4, distance:  8, x: -3.5, y: 3, z:  1   },
  { label: 'Haut-Droit', color: '#ff7016', intensity: 4, distance:  8, x:  3.0, y: 3, z: -5   },
];

class PlayfieldScene {
  #scene;
  #camera;
  #renderer;
  #ambientLight;
  #hemiLight;
  #dirLight;
  #pointLights;

  constructor() {
    this.#scene = new THREE.Scene();
    this.#scene.background = new THREE.Color(0x2a1206);

    this.#camera = new THREE.PerspectiveCamera(
      PLAYFIELD_VIEW_DEFAULTS.fov,
      window.innerWidth / window.innerHeight,
      PLAYFIELD_VIEW_DEFAULTS.near,
      PLAYFIELD_VIEW_DEFAULTS.far,
    );
    applyViewConfigToPerspectiveCamera(this.#camera);

    this.#renderer = new THREE.WebGLRenderer({
      antialias: RENDERER_ANTIALIAS,
      powerPreference: "high-performance",
    });
    this.#renderer.setSize(window.innerWidth, window.innerHeight);
    this.#renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, MAX_RENDERER_PIXEL_RATIO));
    this.#renderer.toneMapping = THREE.ReinhardToneMapping;
    this.#renderer.toneMappingExposure = 1.7;
    this.#renderer.shadowMap.enabled = true;
    this.#renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.body.style.margin = "0";
    document.body.style.overflow = "hidden";
    document.body.appendChild(this.#renderer.domElement);

    this.#ambientLight = new THREE.AmbientLight(0xff3d1a, PLAYFIELD_VIEW_DEFAULTS.ambientIntensity);
    this.#scene.add(this.#ambientLight);

    this.#hemiLight = new THREE.HemisphereLight(0xff6e12, 0x4d0a00, 1.15);
    this.#scene.add(this.#hemiLight);

    this.#dirLight = new THREE.DirectionalLight(0xff5318, PLAYFIELD_VIEW_DEFAULTS.dirLightIntensity);
    this.#dirLight.position.set(
      PLAYFIELD_VIEW_DEFAULTS.dirLightX,
      PLAYFIELD_VIEW_DEFAULTS.dirLightY,
      PLAYFIELD_VIEW_DEFAULTS.dirLightZ,
    );
    this.#dirLight.castShadow = true;
    this.#dirLight.shadow.mapSize.set(2048, 2048);
    const sc = this.#dirLight.shadow.camera;
    sc.left = -20; sc.right = 20; sc.top = 20; sc.bottom = -20;
    sc.near = 0.5; sc.far = 60;
    this.#dirLight.shadow.bias = -0.0004;
    this.#dirLight.shadow.normalBias = 0.02;
    this.#scene.add(this.#dirLight);
    this.#scene.add(this.#dirLight.target);

    this.#pointLights = POINT_LIGHT_DEFAULTS.map((d) => {
      const light = new THREE.PointLight(new THREE.Color(d.color), d.intensity, d.distance);
      light.position.set(d.x, d.y, d.z);
      this.#scene.add(light);
      return light;
    });
  }

  get scene()       { return this.#scene; }
  get camera()      { return this.#camera; }
  get renderer()    { return this.#renderer; }
  get ambientLight(){ return this.#ambientLight; }
  get dirLight()    { return this.#dirLight; }
  get hemiLight()   { return this.#hemiLight; }
  get pointLights() { return this.#pointLights; }
}

export default PlayfieldScene;
