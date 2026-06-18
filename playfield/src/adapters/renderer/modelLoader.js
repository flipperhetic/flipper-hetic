import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// Tune via PFD debug panel → GLB Visual section → Copy JSON to persist values here.
export const GLB_SCALE_X = 5.9;
export const GLB_SCALE_Y = 2.85;
export const GLB_SCALE_Z = 3.25;
export const GLB_ROTATION_X = 8;
export const GLB_ROTATION_Y = -90;
export const GLB_ROTATION_Z = 16;
export const GLB_POSITION_X = -0.25;
export const GLB_POSITION_Y = -6.5;
export const GLB_POSITION_Z = 1.35;

const DEG = Math.PI / 180;

export function loadPlayfieldModel() {
  return new Promise((resolve, reject) => {
    const loader = new GLTFLoader();
    loader.load(
      '/models/Pinballplayfield.glb',
      (gltf) => {
        const model = gltf.scene;
        model.scale.set(GLB_SCALE_X, GLB_SCALE_Y, GLB_SCALE_Z);
        model.rotation.set(
          GLB_ROTATION_X * DEG,
          GLB_ROTATION_Y * DEG,
          GLB_ROTATION_Z * DEG,
        );
        model.position.set(GLB_POSITION_X, GLB_POSITION_Y, GLB_POSITION_Z);
        resolve({ scaleGroup: model, innerModel: model });
      },
      undefined,
      reject,
    );
  });
}
