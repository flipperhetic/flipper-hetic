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
// Palette sunset chaude : degrade orange (haut du plateau, Z-) -> rouge (bas, Z+).
export const POINT_LIGHT_DEFAULTS = [
  { label: 'Bumpers',    color: '#ff5510', intensity: 5, distance: 10, x:  0.8, y: 3, z: -2   },
  { label: 'Flippers',  color: '#ff2207', intensity: 5, distance: 10, x: -0.5, y: 3, z:  4.5 },
  { label: 'Gauche',    color: '#ff3a12', intensity: 4, distance:  8, x: -3.5, y: 3, z:  1   },
  { label: 'Haut-Droit',color: '#ff7016', intensity: 4, distance:  8, x:  3.0, y: 3, z: -5   },
];

export function createScene() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x2a1206); // fond brun chaud (horizon coucher de soleil)

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
  renderer.toneMappingExposure = 1.7; // relevé pour faire ressortir le degrade jaune->rouge
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  document.body.style.margin = "0";
  document.body.style.overflow = "hidden";
  document.body.appendChild(renderer.domElement);

  // Lumieres de base — palette chaude "coucher de soleil" (theme Breaking Bad).
  // Ambient rouge chaude : remplit les ombres d'une lueur braise plutot que de
  // les laisser neutres/noires -> renforce l'ambiance desertique.
  const ambientLight = new THREE.AmbientLight(
    0xff3d1a,
    PLAYFIELD_VIEW_DEFAULTS.ambientIntensity,
  );
  scene.add(ambientLight);

  // Hemisphere : ciel ORANGE -> sol ROUGE = degrade vertical du sunset (orange en
  // haut, rouge en bas), qui donne aussi de la profondeur.
  const hemiLight = new THREE.HemisphereLight(0xff6e12, 0x4d0a00, 1.15);
  scene.add(hemiLight);

  // Directional = soleil couchant, orange-rouge profond + ombres.
  // Position/intensite pilotees par viewConfig (coin bas-droite, angle rasant).
  const dirLight = new THREE.DirectionalLight(
    0xff5318,
    PLAYFIELD_VIEW_DEFAULTS.dirLightIntensity,
  );
  dirLight.position.set(
    PLAYFIELD_VIEW_DEFAULTS.dirLightX,
    PLAYFIELD_VIEW_DEFAULTS.dirLightY,
    PLAYFIELD_VIEW_DEFAULTS.dirLightZ,
  );
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.set(2048, 2048);
  // Frustum ortho de l'ombre : couvre tout le plateau (~11 x 29) avec marge.
  const sc = dirLight.shadow.camera;
  sc.left = -20; sc.right = 20; sc.top = 20; sc.bottom = -20;
  sc.near = 0.5; sc.far = 60;
  dirLight.shadow.bias = -0.0004;
  dirLight.shadow.normalBias = 0.02;
  scene.add(dirLight);
  scene.add(dirLight.target); // cible a l'origine = centre du plateau

  // Point lights de décor (neon pinball)
  const pointLights = POINT_LIGHT_DEFAULTS.map((d) => {
    const light = new THREE.PointLight(new THREE.Color(d.color), d.intensity, d.distance);
    light.position.set(d.x, d.y, d.z);
    scene.add(light);
    return light;
  });

  return { scene, camera, renderer, ambientLight, hemiLight, dirLight, pointLights };
}
