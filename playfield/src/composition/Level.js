import { Mesh, BoxGeometry, MeshBasicMaterial, Group, DoubleSide } from 'three';
import { buildEnvironment } from './buildEnvironment.js';
import { buildGLBCollisions } from './buildGLBCollisions.js';
import { buildActors } from './buildActors.js';
import ModelLoader from '../adapters/renderer/modelLoader.js';
import {
  DRAIN_Z_THRESHOLD,
  DRAIN_OPENING_WIDTH,
  PLAYABLE_CENTER_X,
  TABLE_WIDTH,
  TABLE_DEPTH,
} from '../domain/constants.js';

const DEG = Math.PI / 180;

export default class Level {
  #scene;
  #physicsWorld;
  #onDrainZChange;
  #drainMesh = null;

  ballBody = null;
  flipperBodies = null;
  launchGateBody = null;
  syncPairs = [];
  gltfModel = null;
  gltfInner = null;
  gltfExtras = [];
  archMesh = null;
  triggers = [];
  group = null;

  constructor({ scene, physicsWorld, onDrainZChange = () => {} }) {
    this.#scene = scene;
    this.#physicsWorld = physicsWorld;
    this.#onDrainZChange = onDrainZChange;
  }

  async build() {
    const { group: envGroup } = buildEnvironment(this.#physicsWorld);

    const extraScenes = await new ModelLoader().loadExtra();
    for (const m of extraScenes) {
      envGroup.add(m);
      m.updateMatrixWorld(true);
      buildGLBCollisions(this.#physicsWorld, m);
    }

    this.#physicsWorld.createStaticBox({
      width: TABLE_WIDTH + 2,
      height: 0.1,
      depth: TABLE_DEPTH + 2,
      position: { x: 0, y: 0.95, z: 0 },
      type: 'table',
    });

    const { ballBody, flipperBodies, launchGateBody, syncPairs: actorPairs } =
      buildActors(this.#physicsWorld, this.#scene);

    const drainMesh = new Mesh(
      new BoxGeometry(DRAIN_OPENING_WIDTH, 0.6, 0.5),
      new MeshBasicMaterial({ color: 0xff2200, transparent: true, opacity: 0.5, side: DoubleSide, depthWrite: false }),
    );
    drainMesh.position.set(PLAYABLE_CENTER_X, 0.3, DRAIN_Z_THRESHOLD);
    drainMesh.visible = false;
    envGroup.add(drainMesh);
    this.#drainMesh = drainMesh;

    const levelGroup = new Group();
    levelGroup.name = 'playfield-level';
    this.#scene.add(levelGroup);
    const seen = new Set();
    for (const { mesh } of actorPairs) {
      if (seen.has(mesh)) continue;
      seen.add(mesh);
      if (mesh.parent) mesh.parent.remove(mesh);
      levelGroup.add(mesh);
    }
    levelGroup.add(envGroup);

    this.ballBody = ballBody;
    this.flipperBodies = flipperBodies;
    this.launchGateBody = launchGateBody;
    this.syncPairs = [...actorPairs];
    this.gltfModel = envGroup;
    this.gltfInner = envGroup;
    this.gltfExtras = extraScenes;
    this.group = levelGroup;
    this.triggers = [{
      name: 'Drain Zone',
      body: {
        rb: {
          setTranslation: ({ x, y, z }) => { drainMesh.position.set(x, y, z); this.#onDrainZChange(z); },
          setRotation() {},
        },
        colliders: [{
          setHalfExtents({ x, y, z }) {
            drainMesh.geometry.dispose();
            drainMesh.geometry = new BoxGeometry(x * 2, y * 2, z * 2);
          },
        }],
      },
      mesh: drainMesh,
      ix: PLAYABLE_CENTER_X, iy: 0.3, iz: DRAIN_Z_THRESHOLD, iry: 0,
      w: DRAIN_OPENING_WIDTH, h: 0.6, d: 0.5,
    }];

    return this;
  }

  physicsRotateY = (angleDeg) => {
    this.flipperBodies.setWorldRotY(angleDeg * DEG);
  };

  setPhysicsDebugVisible = (v) => {
    this.#drainMesh.visible = v;
  };
}
