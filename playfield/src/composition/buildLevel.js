/**
 * Playfield — Composition du niveau.
 *
 * Le fond (plateau 9:16) et les murs d'extremite sont des meshes Three.js
 * (buildEnvironment). La bille, les flippers et la porte de lancement restent
 * des acteurs code (buildActors).
 */
import { Mesh, BoxGeometry, MeshBasicMaterial, DoubleSide } from "three";
import { setFlippersWorldRotY, createStaticBoxBody } from "../adapters/physics/index.js";
import { buildActors } from "./buildActors.js";
import { buildEnvironment } from "./buildEnvironment.js";
import {
  DRAIN_Z_THRESHOLD,
  DRAIN_OPENING_WIDTH,
  PLAYABLE_CENTER_X,
  TABLE_WIDTH,
  TABLE_DEPTH,
} from "../domain/constants.js";
import { setDrainThreshold } from "../usecases/collisionHandler.js";

const DEG = Math.PI / 180;

export async function buildLevel({ scene, world }) {
  // -- Fond + murs (Three.js + colliders statiques) ------------------------
  const { group: envGroup } = buildEnvironment(world);

  // Plafond de verre (physique seule) : bloque les rebonds verticaux.
  createStaticBoxBody(world, {
    width: TABLE_WIDTH + 2,
    height: 0.1,
    depth: TABLE_DEPTH + 2,
    position: { x: 0, y: 0.95, z: 0 },
    type: "table",
  });

  // -- Acteurs (bille, flippers, porte de lancement) -----------------------
  const { ballBody, flipperBodies, launchGateBody, syncPairs: actorPairs } =
    buildActors(world, scene);

  // -- Marqueur de drain (visuel debug ; drain reel par seuil Z) -----------
  const drainMesh = new Mesh(
    new BoxGeometry(DRAIN_OPENING_WIDTH, 0.6, 0.5),
    new MeshBasicMaterial({
      color: 0xff2200,
      transparent: true,
      opacity: 0.5,
      side: DoubleSide,
      depthWrite: false,
    }),
  );
  drainMesh.position.set(PLAYABLE_CENTER_X, 0.3, DRAIN_Z_THRESHOLD);
  drainMesh.visible = false;
  envGroup.add(drainMesh);

  // Body factice : permet de regler le seuil de drain via le panneau debug.
  const drainFakeBody = {
    rb: {
      setTranslation({ x, y, z }) {
        drainMesh.position.set(x, y, z);
        setDrainThreshold(z);
      },
      setRotation() {},
    },
    colliders: [
      {
        setHalfExtents({ x, y, z }) {
          drainMesh.geometry.dispose();
          drainMesh.geometry = new BoxGeometry(x * 2, y * 2, z * 2);
        },
      },
    ],
  };

  const triggers = [
    {
      name: "Drain Zone",
      body: drainFakeBody,
      mesh: drainMesh,
      ix: PLAYABLE_CENTER_X,
      iy: 0.3,
      iz: DRAIN_Z_THRESHOLD,
      iry: 0,
      w: DRAIN_OPENING_WIDTH,
      h: 0.6,
      d: 0.5,
    },
  ];

  const syncPairs = [...actorPairs];

  function physicsRotateY(angleDeg) {
    setFlippersWorldRotY(flipperBodies, angleDeg * DEG);
  }

  function setPhysicsDebugVisible(v) {
    drainMesh.visible = v;
  }

  return {
    syncPairs,
    archMesh: null,
    ballBody,
    flipperBodies,
    launchGateBody,
    gltfModel: envGroup,
    gltfInner: envGroup,
    physicsRotateY,
    setPhysicsDebugVisible,
    triggers,
  };
}
