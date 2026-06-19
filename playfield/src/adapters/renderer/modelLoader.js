import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export const GLB_SCALE_X = 1;
export const GLB_SCALE_Y = 1;
export const GLB_SCALE_Z = 1;
export const GLB_ROTATION_X = 0;
export const GLB_ROTATION_Y = 0;
export const GLB_ROTATION_Z = 0;
export const GLB_POSITION_X = 0;
export const GLB_POSITION_Y = 0;
export const GLB_POSITION_Z = 0;

const EXTRA_MODELS = [
  'Bumper-barril',
  'Bumper-losange1',
  'Bumper-losange2',
  'Bumper-triangle1',
  'Bumper-triangle2',
  'Obstacle-arch',
  'Obstacle-flipper1',
  'Obstacle-flipper2',
  'Obstacle-start-tunnel',
  'Obstacle-triangle',
  'Obstacle-tunnel1',
  'Obstacle-tunnel2',
];

const EXTRA_SCALE_X = 5.9;
const EXTRA_SCALE_Y = 2.85;
const EXTRA_SCALE_Z = 3.25;
const EXTRA_ROT_X   = 8;
const EXTRA_ROT_Y   = -90;
const EXTRA_ROT_Z   = 16;
const EXTRA_POS_X   = -0.25;
const EXTRA_POS_Y   = -6.5;
const EXTRA_POS_Z   = 1.35;
const DEG = Math.PI / 180;

class ModelLoader {
  async loadExtra() {
    const loader = new GLTFLoader();
    const scenes = await Promise.all(
      EXTRA_MODELS.map(name => new Promise((resolve, reject) =>
        loader.load(`/models/${name}.glb`, (gltf) => resolve(gltf.scene), undefined, reject),
      )),
    );
    for (const m of scenes) {
      m.scale.set(EXTRA_SCALE_X, EXTRA_SCALE_Y, EXTRA_SCALE_Z);
      m.rotation.set(EXTRA_ROT_X * DEG, EXTRA_ROT_Y * DEG, EXTRA_ROT_Z * DEG);
      m.position.set(EXTRA_POS_X, EXTRA_POS_Y, EXTRA_POS_Z);
    }
    return scenes;
  }
}

export default ModelLoader;
