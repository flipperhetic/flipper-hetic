import { Mesh, BoxGeometry, MeshBasicMaterial, Group, DoubleSide } from 'three';
import { buildEnvironment } from './buildEnvironment.js';
import { buildGLBCollisions } from './buildGLBCollisions.js';
import ModelLoader from '../adapters/renderer/modelLoader.js';
import { BallActor }        from '../actors/BallActor.js';
import { FlipperActor }     from '../actors/FlipperActor.js';
import { LaunchGateActor }  from '../actors/LaunchGateActor.js';
import { SlingshotActor }   from '../actors/SlingshotActor.js';
import {
  DRAIN_Z_THRESHOLD,
  DRAIN_OPENING_WIDTH,
  PLAYABLE_CENTER_X,
  TABLE_WIDTH,
  TABLE_DEPTH,
  WALL_HEIGHT,
} from '../domain/constants.js';

const DEG = Math.PI / 180;

export default class Level {
  #scene;
  #physicsWorld;
  #onDrainZChange;
  #drainMesh = null;
  #gateTriggerMesh = null;
  #tunnelGasMaskMesh = null;
  #tunnelRvMesh = null;

  // Actors — the core game objects
  ballActor        = null;
  flipperActor     = null;
  launchGateActor  = null;
  slingshotActor   = null;

  /** Ordered list of all actors iterated by GameLoop. */
  actors = [];

  // Scene graph
  extrasGroup  = null;
  slingshotGroup = null;
  archMesh     = null;
  group        = null;

  // Debug data
  bumpers       = [];
  triggers      = [];
  decorElements = [];

  constructor({ scene, physicsWorld, onDrainZChange = () => {} }) {
    this.#scene = scene;
    this.#physicsWorld = physicsWorld;
    this.#onDrainZChange = onDrainZChange;
  }

  async build() {
    const { group: envGroup } = buildEnvironment(this.#physicsWorld);

    // --- GLB extra models (bumpers + obstacles) ---
    const extraScenes = await new ModelLoader().loadExtra();
    const extrasGroup = new Group();
    extrasGroup.name = 'playfield-extras';
    envGroup.add(extrasGroup);
    const slingshotNames = new Set(['Obstacle-flipper1', 'Obstacle-flipper2']);
    const slingshotGroup = new Group();
    slingshotGroup.name = 'slingshot-group';
    slingshotGroup.position.set(0.25, 0, 0);
    extrasGroup.add(slingshotGroup);

    for (const m of extraScenes) {
      if (slingshotNames.has(m.name)) {
        slingshotGroup.add(m);
      } else {
        extrasGroup.add(m);
      }
      m.updateMatrixWorld(true);
      if (!m.name.startsWith('Decor-')) {
        buildGLBCollisions(this.#physicsWorld, m);
      }
    }

    this.#physicsWorld.createStaticBox({
      width: TABLE_WIDTH + 2,
      height: 0.1,
      depth: TABLE_DEPTH + 2,
      position: { x: 0, y: 0.95, z: 0 },
      type: 'table',
    });

    // --- Actors ---
    const ballActor       = new BallActor(this.#physicsWorld, this.#scene);
    const flipperActor    = await FlipperActor.create(this.#physicsWorld, this.#scene);
    const launchGateActor = LaunchGateActor.create(this.#physicsWorld, this.#scene, ballActor);
    const slingshotActor  = new SlingshotActor(this.#physicsWorld);

    // --- Debug meshes ---
    const drainMesh = new Mesh(
      new BoxGeometry(DRAIN_OPENING_WIDTH, 0.6, 0.5),
      new MeshBasicMaterial({ color: 0xff2200, transparent: true, opacity: 0.5, side: DoubleSide, depthWrite: false }),
    );
    drainMesh.position.set(PLAYABLE_CENTER_X, 0.3, DRAIN_Z_THRESHOLD);
    drainMesh.visible = false;
    envGroup.add(drainMesh);
    this.#drainMesh = drainMesh;

    const gateUD = launchGateActor.body.userData;
    const gateTriggerMesh = new Mesh(
      new BoxGeometry(TABLE_WIDTH, 0.05, 0.05),
      new MeshBasicMaterial({ color: 0x00aaff, transparent: true, opacity: 0.7, side: DoubleSide, depthWrite: false }),
    );
    gateTriggerMesh.position.set(2.45, WALL_HEIGHT / 2, gateUD.triggerZ);
    gateTriggerMesh.rotation.y = -85 * DEG;
    gateTriggerMesh.visible = false;
    envGroup.add(gateTriggerMesh);
    this.#gateTriggerMesh = gateTriggerMesh;

    const gasMaskPos  = { x: -1.9,   y: 0.5, z: -11.25 };
    const gasMaskSize = { w: 1.1,    h: 1.5, d: 0.2 };
    const rvPos       = { x: -5.05,  y: 0.5, z: -5.95  };
    const rvSize      = { w: 0.6,    h: 1.5, d: 0.2 };

    const tunnelGasMaskBody = this.#physicsWorld.createSensor({
      width: gasMaskSize.w, height: gasMaskSize.h, depth: gasMaskSize.d,
      position: gasMaskPos,
      type: 'tunnel',
    });
    const tunnelRvBody = this.#physicsWorld.createSensor({
      width: rvSize.w, height: rvSize.h, depth: rvSize.d,
      position: rvPos,
      type: 'tunnel-rv',
    });

    const tunnelGreenMat = new MeshBasicMaterial({ color: 0x00ff44, transparent: true, opacity: 0.75, side: DoubleSide, depthWrite: false });

    const tunnelGasMaskMesh = new Mesh(new BoxGeometry(gasMaskSize.w, gasMaskSize.h, gasMaskSize.d), tunnelGreenMat);
    tunnelGasMaskMesh.position.set(gasMaskPos.x, gasMaskPos.y, gasMaskPos.z);
    tunnelGasMaskMesh.visible = false;
    envGroup.add(tunnelGasMaskMesh);
    this.#tunnelGasMaskMesh = tunnelGasMaskMesh;

    const tunnelRvMesh = new Mesh(new BoxGeometry(rvSize.w, rvSize.h, rvSize.d), tunnelGreenMat.clone());
    tunnelRvMesh.position.set(rvPos.x, rvPos.y, rvPos.z);
    tunnelRvMesh.visible = false;
    envGroup.add(tunnelRvMesh);
    this.#tunnelRvMesh = tunnelRvMesh;

    // --- Level group: collect all actor meshes + environment ---
    const levelGroup = new Group();
    levelGroup.name = 'playfield-level';
    this.#scene.add(levelGroup);

    const actors = [ballActor, flipperActor, launchGateActor, slingshotActor];
    for (const actor of actors) {
      for (const mesh of actor.meshes) {
        if (mesh.parent) mesh.parent.remove(mesh);
        levelGroup.add(mesh);
      }
    }
    levelGroup.add(envGroup);

    // --- Assign public properties ---
    this.ballActor       = ballActor;
    this.flipperActor    = flipperActor;
    this.launchGateActor = launchGateActor;
    this.slingshotActor  = slingshotActor;
    this.actors          = actors;
    this.extrasGroup     = extrasGroup;
    this.slingshotGroup  = slingshotGroup;
    this.group           = levelGroup;

    // --- Debug bumpers (visual controls only) ---
    this.bumpers = extraScenes
      .filter(s => s.name.startsWith('Bumper-'))
      .map(s => {
        const baseScale = { x: s.scale.x, y: s.scale.y, z: s.scale.z };
        return {
          name: s.name,
          body: {
            rb: {
              setTranslation: ({ x, y, z }) => s.position.set(x, y, z),
              setRotation:    (q)           => s.quaternion.set(q.x, q.y, q.z, q.w),
            },
            colliders: [],
          },
          ix: s.position.x, iy: s.position.y, iz: s.position.z,
          irx: s.rotation.x / DEG, iry: s.rotation.y / DEG, irz: s.rotation.z / DEG,
          shapeControls: [
            { key: 'scale', label: 'Scale', min: 0.001, max: 5, step: 0.001, default: 1.0 },
          ],
          onShapeChange: (key, value) => {
            if (key === 'scale') s.scale.set(baseScale.x * value, baseScale.y * value, baseScale.z * value);
          },
        };
      });

    // --- Debug decor elements (visual-only, no physics) ---
    this.decorElements = extraScenes
      .filter(s => s.name.startsWith('Decor-'))
      .map(s => {
        const baseScale = { x: s.scale.x, y: s.scale.y, z: s.scale.z };
        return {
          name: s.name,
          body: {
            rb: {
              setTranslation: ({ x, y, z }) => s.position.set(x, y, z),
              setRotation:    (q)           => s.quaternion.set(q.x, q.y, q.z, q.w),
            },
            colliders: [],
          },
          ix: s.position.x, iy: s.position.y, iz: s.position.z,
          irx: s.rotation.x / DEG, iry: s.rotation.y / DEG, irz: s.rotation.z / DEG,
          shapeControls: [
            { key: 'scale', label: 'Scale', min: 0.001, max: 5, step: 0.001, default: 1.0 },
          ],
          onShapeChange: (key, value) => {
            if (key === 'scale') s.scale.set(baseScale.x * value, baseScale.y * value, baseScale.z * value);
          },
        };
      });

    // --- Debug triggers ---
    const gateBody = launchGateActor.body;
    const gateMesh = launchGateActor.mesh;
    this.triggers = [
      {
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
      },
      {
        name: 'Launch Gate',
        body: {
          rb: {
            setTranslation: ({ x, y, z }) => {
              gateBody.rb.setTranslation({ x, y, z }, true);
              gateBody.userData.closedX = x;
              gateBody.userData.closedZ = z;
              gateUD.triggerZ = z - gateUD.d / 2;
              gateTriggerMesh.position.z = gateUD.triggerZ;
            },
            setRotation: (q) => gateBody.rb.setRotation(q, true),
          },
          colliders: [{
            setHalfExtents: ({ x, y, z }) => {
              gateBody.colliders[0].setHalfExtents({ x, y, z });
              gateUD.w = x * 2; gateUD.h = y * 2; gateUD.d = z * 2;
              gateUD.triggerZ = gateUD.closedZ - gateUD.d / 2;
              gateTriggerMesh.position.z = gateUD.triggerZ;
              if (gateMesh) {
                gateMesh.geometry.dispose();
                gateMesh.geometry = new BoxGeometry(x * 2, y * 2, z * 2);
              }
            },
          }],
        },
        mesh: gateMesh,
        ix: gateUD.closedX, iy: WALL_HEIGHT / 2, iz: gateUD.closedZ,
        irx: 0, iry: gateUD.rotY, irz: 0,
        w: gateUD.w, h: gateUD.h, d: gateUD.d,
      },
      {
        name: 'Gate Trigger Zone',
        body: {
          rb: {
            setTranslation: ({ x, y, z }) => {
              gateTriggerMesh.position.set(x, y, z);
              gateUD.triggerZ = z;
            },
            setRotation: (q) => gateTriggerMesh.quaternion.set(q.x, q.y, q.z, q.w),
          },
          colliders: [],
        },
        mesh: gateTriggerMesh,
        ix: 2.45, iy: WALL_HEIGHT / 2, iz: gateUD.triggerZ,
        irx: 0, iry: -85, irz: 0,
      },
      {
        name: 'Trigger-gas-mask',
        body: {
          rb: {
            setTranslation: ({ x, y, z }) => {
              tunnelGasMaskBody.rb.setTranslation({ x, y, z }, true);
              tunnelGasMaskMesh.position.set(x, y, z);
            },
            setRotation: (q) => {
              tunnelGasMaskBody.rb.setRotation(q, true);
              tunnelGasMaskMesh.quaternion.set(q.x, q.y, q.z, q.w);
            },
          },
          colliders: [{
            setHalfExtents: ({ x, y, z }) => {
              tunnelGasMaskBody.colliders[0].setHalfExtents({ x, y, z });
              tunnelGasMaskMesh.geometry.dispose();
              tunnelGasMaskMesh.geometry = new BoxGeometry(x * 2, y * 2, z * 2);
            },
          }],
        },
        mesh: tunnelGasMaskMesh,
        ix: gasMaskPos.x, iy: gasMaskPos.y, iz: gasMaskPos.z,
        irx: 0, iry: 0, irz: 0,
        w: gasMaskSize.w, h: gasMaskSize.h, d: gasMaskSize.d,
      },
      {
        name: 'Trigger-rv',
        body: {
          rb: {
            setTranslation: ({ x, y, z }) => {
              tunnelRvBody.rb.setTranslation({ x, y, z }, true);
              tunnelRvMesh.position.set(x, y, z);
            },
            setRotation: (q) => {
              tunnelRvBody.rb.setRotation(q, true);
              tunnelRvMesh.quaternion.set(q.x, q.y, q.z, q.w);
            },
          },
          colliders: [{
            setHalfExtents: ({ x, y, z }) => {
              tunnelRvBody.colliders[0].setHalfExtents({ x, y, z });
              tunnelRvMesh.geometry.dispose();
              tunnelRvMesh.geometry = new BoxGeometry(x * 2, y * 2, z * 2);
            },
          }],
        },
        mesh: tunnelRvMesh,
        ix: rvPos.x, iy: rvPos.y, iz: rvPos.z,
        irx: 0, iry: 0, irz: 0,
        w: rvSize.w, h: rvSize.h, d: rvSize.d,
      },
    ];

    return this;
  }

  physicsRotateY = (angleDeg) => {
    this.flipperActor.setWorldRotY(angleDeg * DEG);
  };
}
