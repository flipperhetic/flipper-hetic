/**
 * Playfield — Scene Three.js, camera, lumieres, renderer.
 */
import * as THREE from "three";
import {
  MAX_RENDERER_PIXEL_RATIO,
  RENDERER_ANTIALIAS,
} from "../../domain/constants.js";
import {
  PLAYFIELD_VIEW_DEFAULTS,
  applyViewConfigToPerspectiveCamera,
} from "../../domain/viewConfig.js";

function effectivePixelRatio() {
  return Math.min(window.devicePixelRatio || 1, MAX_RENDERER_PIXEL_RATIO);
}

// Tune via LGT debug panel → Copy JSON to persist values here.
export const POINT_LIGHT_DEFAULTS = [
  { label: 'Bumpers',    color: '#ff6600', intensity: 5, distance: 10, x:  0.8, y: 3, z: -2   },
  { label: 'Flippers',  color: '#00ccff', intensity: 5, distance: 10, x: -0.5, y: 3, z:  4.5 },
  { label: 'Gauche',    color: '#cc00ff', intensity: 4, distance:  8, x: -3.5, y: 3, z:  1   },
  { label: 'Haut-Droit',color: '#ff0088', intensity: 4, distance:  8, x:  3.0, y: 3, z: -5   },
];

export function createScene() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1a1a2e);

  // Camera (config figée dans domain/viewConfig.js)
  const camera = new THREE.PerspectiveCamera(
    PLAYFIELD_VIEW_DEFAULTS.fov,
    window.innerWidth / window.innerHeight,
    PLAYFIELD_VIEW_DEFAULTS.near,
    PLAYFIELD_VIEW_DEFAULTS.far,
  );
  applyViewConfigToPerspectiveCamera(camera);

  // Renderer
  const renderer = new THREE.WebGLRenderer({
    antialias: RENDERER_ANTIALIAS,
    powerPreference: "high-performance",
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(effectivePixelRatio());
  renderer.toneMapping = THREE.ReinhardToneMapping;
  renderer.toneMappingExposure = 1.0;
  document.body.style.margin = "0";
  document.body.style.overflow = "hidden";
  document.body.appendChild(renderer.domElement);

  // Lumieres de base
  const ambientLight = new THREE.AmbientLight(
    0xffffff,
    PLAYFIELD_VIEW_DEFAULTS.ambientIntensity,
  );
  scene.add(ambientLight);
  const dirLight = new THREE.DirectionalLight(
    0xffffff,
    PLAYFIELD_VIEW_DEFAULTS.dirLightIntensity,
  );
  dirLight.position.set(
    PLAYFIELD_VIEW_DEFAULTS.dirLightX,
    PLAYFIELD_VIEW_DEFAULTS.dirLightY,
    PLAYFIELD_VIEW_DEFAULTS.dirLightZ,
  );
  scene.add(dirLight);

  // Point lights de décor (neon pinball)
  const pointLights = POINT_LIGHT_DEFAULTS.map((d) => {
    const light = new THREE.PointLight(new THREE.Color(d.color), d.intensity, d.distance);
    light.position.set(d.x, d.y, d.z);
    scene.add(light);
    return light;
  });

  return { scene, camera, renderer, ambientLight, dirLight, pointLights };
}
