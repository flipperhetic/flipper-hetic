/**
 * Playfield — Flippers / battes (etape 9 du plan MVP).
 *
 * Deux battes kinematiques (pivot + rotation Y) de part et d'autre du drain.
 * Controlees par setFlipperActive(), mises a jour chaque frame par updateFlippers()
 * AVANT world.step() pour que Cannon-es calcule les collisions correctement.
 */
import * as THREE from "three";
import * as CANNON from "cannon-es";
import {
  FLIPPER_LENGTH,
  FLIPPER_WIDTH,
  FLIPPER_HEIGHT,
  FLIPPER_REST_ANGLE,
  FLIPPER_PIVOT_X,
  FLIPPER_PIVOT_Z,
  FLIPPER_PIVOT_Y,
  FLIPPER_SPEED,
} from "./constants.js";
import { MATERIALS } from "./physics.js";

/**
 * Cree un flipper (mesh + body kinematique) pour un cote donne.
 * Le pivot est a une extremite de la boite ; la forme est decalee
 * pour que la rotation Y tourne autour du pivot.
 */
function createOneFlipper(scene, world, side) {
  const isLeft = side === "left";
  const pivotX = isLeft ? -FLIPPER_PIVOT_X : FLIPPER_PIVOT_X;
  // Decalage de la forme : le flipper s'etend vers le centre du plateau.
  const shapeOffsetX = isLeft ? FLIPPER_LENGTH / 2 : -FLIPPER_LENGTH / 2;

  // ── Mesh ──
  const geometry = new THREE.BoxGeometry(FLIPPER_LENGTH, FLIPPER_HEIGHT, FLIPPER_WIDTH);
  geometry.translate(shapeOffsetX, 0, 0);
  const mesh = new THREE.Mesh(
    geometry,
    new THREE.MeshStandardMaterial({ color: 0xff6600, metalness: 0.5, roughness: 0.5 }),
  );
  mesh.position.set(pivotX, FLIPPER_PIVOT_Y, FLIPPER_PIVOT_Z);
  scene.add(mesh);

  // ── Body kinematique ──
  const body = new CANNON.Body({
    mass: 0,
    type: CANNON.Body.KINEMATIC,
    material: MATERIALS.flipper,
  });
  const shape = new CANNON.Box(
    new CANNON.Vec3(FLIPPER_LENGTH / 2, FLIPPER_HEIGHT / 2, FLIPPER_WIDTH / 2),
  );
  body.addShape(shape, new CANNON.Vec3(shapeOffsetX, 0, 0));
  body.position.set(pivotX, FLIPPER_PIVOT_Y, FLIPPER_PIVOT_Z);
  body.userData = { type: "flipper" };
  world.addBody(body);

  // Angles : au repos la batte pointe vers le drain (+Z),
  // activee elle remonte vers le haut du plateau (-Z).
  const restAngle = isLeft ? -FLIPPER_REST_ANGLE : FLIPPER_REST_ANGLE;
  const activeAngle = isLeft ? FLIPPER_REST_ANGLE : -FLIPPER_REST_ANGLE;

  return { mesh, body, restAngle, activeAngle, currentAngle: restAngle, active: false };
}

/**
 * Pre-step : ne PAS teleporter le quaternion. On donne uniquement une
 * angularVelocity a Cannon-es pour qu'il balaye la rotation sur chaque
 * sous-step et detecte correctement les collisions avec la bille.
 */
function preStepFlipper(flipper) {
  const target = flipper.active ? flipper.activeAngle : flipper.restAngle;
  const diff = target - flipper.currentAngle;

  if (Math.abs(diff) < 0.001) {
    flipper.body.angularVelocity.set(0, 0, 0);
    return;
  }

  flipper.body.angularVelocity.set(0, Math.sign(diff) * FLIPPER_SPEED, 0);
}

/**
 * Post-step : lire le quaternion integre par Cannon-es, en extraire
 * l'angle Y et le clamper dans [restAngle, activeAngle] pour eviter
 * tout depassement.
 */
function postStepFlipper(flipper) {
  const q = flipper.body.quaternion;
  // Pour une rotation pure autour de Y : angle = 2 * atan2(q.y, q.w)
  let angle = 2 * Math.atan2(q.y, q.w);

  const minAngle = Math.min(flipper.restAngle, flipper.activeAngle);
  const maxAngle = Math.max(flipper.restAngle, flipper.activeAngle);
  const clamped = Math.max(minAngle, Math.min(maxAngle, angle));

  if (clamped !== angle) {
    const cq = new CANNON.Quaternion();
    cq.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), clamped);
    flipper.body.quaternion.copy(cq);
    flipper.body.angularVelocity.set(0, 0, 0);
  }

  flipper.currentAngle = clamped;
}

// ── API publique ──────────────────────────────────────

/**
 * Cree les deux flippers, ajoute le ContactMaterial flipper<->bille
 * et retourne l'objet { left, right } a passer aux autres fonctions.
 */
export function createFlippers(scene, world) {
  const left = createOneFlipper(scene, world, "left");
  const right = createOneFlipper(scene, world, "right");

  world.addContactMaterial(
    new CANNON.ContactMaterial(MATERIALS.flipper, MATERIALS.ball, {
      friction: 0.3,
      restitution: 0.8,
    }),
  );

  // Position initiale au repos (snap direct pour l'init, pas de sweep).
  for (const f of [left, right]) {
    const q = new CANNON.Quaternion();
    q.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), f.restAngle);
    f.body.quaternion.copy(q);
  }

  return { left, right };
}

/**
 * Active ou desactive un flipper (appele depuis le handler clavier).
 */
export function setFlipperActive(flippers, side, active) {
  flippers[side].active = active;
}

/**
 * Pre-step : definir les angularVelocity des flippers.
 * A appeler chaque frame AVANT world.step().
 */
export function updateFlippers(flippers) {
  preStepFlipper(flippers.left);
  preStepFlipper(flippers.right);
}

/**
 * Post-step : clamper les angles apres integration par Cannon-es.
 * A appeler chaque frame APRES world.step().
 */
export function postStepFlippers(flippers) {
  postStepFlipper(flippers.left);
  postStepFlipper(flippers.right);
}
