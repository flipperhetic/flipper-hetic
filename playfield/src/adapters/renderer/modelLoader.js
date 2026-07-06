import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshStandardMaterial, DoubleSide, TextureLoader, SRGBColorSpace, Matrix4 } from 'three';

const EXTRA_MODELS = [
  'Bumper-barril-1',
  'Bumper-barril-2',
  'Decor-hazmat',
  'Decor-rv',
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

const MODEL_FILES = {
  'Bumper-barril-1':  'Bumper-barril',
  'Bumper-barril-2':  'Bumper-barril',
  'Bumper-losange2':  'Bumper-barril',
  'Decor-hazmat':     'Scenery-hazmat_mask-special-event1',
  'Decor-rv':         'Scenery-breaking_bad_rv',
  'Bumper-triangle2': 'Bumper-triangle1',
};

const EXTRA_SCALE_X = 6.372;
const EXTRA_SCALE_Y = 3.078;
const EXTRA_SCALE_Z = 3.51;
const EXTRA_ROT_X   = 8;
const EXTRA_ROT_Y   = -90;
const EXTRA_ROT_Z   = 16;
const EXTRA_POS_X   = -0.37;
const EXTRA_POS_Y   = -7.02;
const EXTRA_POS_Z   = 0.758;
const DEG = Math.PI / 180;

const BUMPER_POS = {
  'Bumper-losange2':  { x: 0.775,  y: 0.6,       z: -8.24 },
  'Bumper-barril-1':  { x: 1.425,  y: 0.6,       z: -5    },
  'Bumper-barril-2':  { x: -2.975, y: 0.6,       z: -5    },
  'Decor-hazmat':     { x: -1.9,   y: 2.75,      z: -10.3 },
  'Decor-rv':         { x: -5.25,  y: 1.55,      z: -5.1  },
  'Bumper-triangle1': { x: 0.034,  y: EXTRA_POS_Y, z: 0.751 },
};

const BUMPER_SCALE = {
  'Bumper-losange2':  { x: 0.0033, y: 0.0033, z: 0.0033 },
  'Bumper-barril-1':  { x: 0.0033, y: 0.0033, z: 0.0033 },
  'Bumper-barril-2':  { x: 0.0033, y: 0.0033, z: 0.0033 },
  'Decor-hazmat':     { x: 17,     y: 17,     z: 17     },
  'Decor-rv':         { x: 37,     y: 37,     z: 37     },
};

const BUMPER_ROT = {
  'Bumper-losange2':  { x: 0, y: -90, z: 0 },
  'Bumper-barril-1':  { x: 0, y: -90, z: 0 },
  'Bumper-barril-2':  { x: 0, y: -90, z: 0 },
  'Decor-hazmat':     { x: -42, y: 0, z: 0 },
  'Decor-rv':         { x:   0, y: 31, z: 0 },
};

class ModelLoader {
  async loadExtra() {
    const tl = new TextureLoader();

    const colorMap = tl.load('/textures/bumper_transparency.png');
    colorMap.colorSpace = SRGBColorSpace;
    const barrilMat = new MeshStandardMaterial({
      color: 0x111111,
      emissive: 0xffffff,
      emissiveMap: colorMap,
      emissiveIntensity: 1.5,
      normalMap:    tl.load('/textures/bumper_normal.png'),
      roughnessMap: tl.load('/textures/bumper_smoothness.png'),
      metalness: 0.3,
      roughness: 0.8,
      side: DoubleSide,
    });

    const hazmatBodyMat = new MeshStandardMaterial({
      color: 0x334433,
      metalness: 0.6,
      roughness: 0.4,
      side: DoubleSide,
    });
    const hazmatVisorMat = new MeshStandardMaterial({
      color: 0x88bbcc,
      transparent: true,
      opacity: 0.6,
      metalness: 0.1,
      roughness: 0.1,
      side: DoubleSide,
    });

    const rustAlbedo = tl.load('/textures/rust_color.jpg');
    rustAlbedo.colorSpace = SRGBColorSpace;
    const losangeBaseMat = new MeshStandardMaterial({
      color: 0xf2f2f2,
      metalness: 0.60,
      roughness: 0.9,
      map: rustAlbedo,
      metalnessMap: tl.load('/textures/rust_JPG_Metalness.jpg'),
      normalMap:    tl.load('/textures/rust_normalGL.jpg'),
      roughnessMap: tl.load('/textures/rust_roughness.jpg'),
    });
    const losangeTopMat = new MeshStandardMaterial({ color: 0xffd633, metalness: 0.3, roughness: 0.6 });

    const triBaseMat = new MeshStandardMaterial({ color: 0x33383d, metalness: 0.75, roughness: 0.4, side: DoubleSide });
    const triBlueMat = new MeshStandardMaterial({
      color: 0x0e7fa8, emissive: 0x22c4ff, emissiveIntensity: 1.2, metalness: 0.25, roughness: 0.3, side: DoubleSide,
    });

    const loader = new GLTFLoader();
    const scenes = await Promise.all(
      EXTRA_MODELS.map(name => new Promise((resolve, reject) =>
        loader.load(`/models/${MODEL_FILES[name] ?? name}.glb`, (gltf) => { gltf.scene.name = name; resolve(gltf.scene); }, undefined, reject),
      )),
    );

    for (const m of scenes) {
      const pos = BUMPER_POS[m.name];
      const sc  = BUMPER_SCALE[m.name];
      const rot = BUMPER_ROT[m.name];
      m.scale.set(sc?.x ?? EXTRA_SCALE_X, sc?.y ?? EXTRA_SCALE_Y, sc?.z ?? EXTRA_SCALE_Z);
      m.rotation.set((rot?.x ?? EXTRA_ROT_X) * DEG, (rot?.y ?? EXTRA_ROT_Y) * DEG, (rot?.z ?? EXTRA_ROT_Z) * DEG);
      m.position.set(pos?.x ?? EXTRA_POS_X, pos?.y ?? EXTRA_POS_Y, pos?.z ?? EXTRA_POS_Z);

      if (m.name === 'Bumper-triangle2') {
        const pr = BUMPER_POS['Bumper-triangle1'];
        m.position.set(pr.x, pr.y, pr.z);
        m.updateMatrix();
        const C = -0.775;
        m.applyMatrix4(new Matrix4().makeTranslation(2 * C, 0, 0).multiply(new Matrix4().makeScale(-1, 1, 1)));
      }

      if (/barril/i.test(MODEL_FILES[m.name] ?? '')) {
        m.traverse(o => { if (o.isMesh) { o.material = barrilMat; o.frustumCulled = false; } });
      }

      if (m.name === 'Decor-hazmat') {
        m.traverse(o => {
          if (!o.isMesh) return;
          o.material = o.material?.name === 'lambert5' ? hazmatVisorMat : hazmatBodyMat;
          o.frustumCulled = false;
        });
      }

      if (m.name === 'Decor-rv') {
        m.traverse(o => { if (o.isMesh) o.frustumCulled = false; });
      }

      if (m.name === 'Bumper-losange1') {
        m.traverse(o => {
          if (!o.isMesh) return;
          if (o.material?.name === 'Mat.1')  o.material = losangeBaseMat;
          if (o.material?.name === 'Mat.16') o.material = losangeTopMat;
        });
      }

      if (m.name === 'Bumper-triangle1' || m.name === 'Bumper-triangle2') {
        m.traverse(o => {
          if (!o.isMesh) return;
          const mn = o.material?.name;
          o.material = (mn === 'Mat.5' || mn === 'Mat.16') ? triBlueMat : triBaseMat;
        });
      }
    }
    return scenes;
  }
}

export default ModelLoader;
