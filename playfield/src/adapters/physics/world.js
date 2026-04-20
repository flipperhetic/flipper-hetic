/**
 * Playfield — Monde Cannon-es (etape 5 du plan MVP).
 *
 * Cree le monde physique, des helpers pour les corps statiques,
 * et expose la synchronisation mesh/body pour la boucle de rendu.
 *
 * Convention d'axes (cf. constants.js) :
 *   X = gauche / droite, Y = hauteur (gravite), Z = longueur du plateau.
 *
 * Le plateau reste a plat dans Three.js. L'inclinaison (~12°) est simulee
 * en ajoutant une composante Z a la gravite (vers Z+ = vers le drain).
 */
import * as CANNON from "cannon-es";

const TILT_DEG = 16;
const GRAVITY = 9.82;

export const FIXED_TIME_STEP = 1 / 120;
export const MAX_SUB_STEPS = 10;

/**
 * Materiaux physiques partages. Les `ContactMaterial` entre paires
 * (ball <-> static, ball <-> flipper...) sont ajoutes par chaque module
 * concerne (ball.js, flippers.js...).
 */
export const MATERIALS = {
  ball: new CANNON.Material("ball"),
  static: new CANNON.Material("static"),
  table: new CANNON.Material("table"),
  flipper: new CANNON.Material("flipper"),
  bumper: new CANNON.Material("bumper"),
};

/**
 * Cree le monde physique avec la gravite inclinee.
 */
export function createPhysicsWorld() {
  const world = new CANNON.World();
  const tilt = (TILT_DEG * Math.PI) / 180;
  world.gravity.set(
    0,
    -GRAVITY * Math.cos(tilt),
    GRAVITY * Math.sin(tilt),
  );
  world.broadphase = new CANNON.NaiveBroadphase();
  world.solver.iterations = 20;
  return world;
}

/**
 * Cree un corps statique (masse 0) de forme Box et l'ajoute au monde.
 * `width`, `height`, `depth` sont les dimensions completes de la boite
 * (pas les half-extents). `position` est un objet { x, y, z } (compatible
 * avec THREE.Vector3).
 */
export function createStaticBoxBody(world, { width, height, depth, position, material, type = "wall", rotationY = 0 }) {
  const halfExtents = new CANNON.Vec3(width / 2, height / 2, depth / 2);
  const shape = new CANNON.Box(halfExtents);
  const body = new CANNON.Body({
    mass: 0,
    shape,
    material: MATERIALS[material] || MATERIALS.static,
  });
  body.position.set(position.x, position.y, position.z);
  if (rotationY !== 0) {
    body.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), rotationY);
  }
  body.userData = { type };
  world.addBody(body);
  return body;
}

/**
 * Synchronise chaque mesh Three.js avec son body Cannon-es.
 * Inutile pour les bodies statiques, mais appele pour tous afin de
 * supporter les bodies dynamiques ajoutes dans les etapes suivantes
 * (bille, battes...).
 */
export function syncMeshesWithBodies(pairs) {
  for (const { mesh, body } of pairs) {
    mesh.position.copy(body.position);
    mesh.quaternion.copy(body.quaternion);
  }
}
