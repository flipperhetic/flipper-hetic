/**
 * Playfield — Bumpers (etape 10 du plan MVP).
 *
 * 2-3 bumpers cylindriques statiques sur le plateau.
 * Le ContactMaterial ball<->bumper est ajoute ici
 * (meme pattern que ball.js et flippers.js).
 */
import * as THREE from "three";
import * as CANNON from "cannon-es";
import {
  BUMPER_RADIUS,
  BUMPER_HEIGHT,
  BUMPER_POSITIONS,
} from "./constants.js";
import { MATERIALS } from "./physics.js";

const BUMPER_COLOR = 0xff2266;
const BALL_BUMPER_FRICTION = 0.1;
const BALL_BUMPER_RESTITUTION = 0.8;

/**
 * Cree tous les bumpers (mesh + body statique) et ajoute le
 * ContactMaterial ball<->bumper au monde.
 * Retourne un tableau de { mesh, body } a pousser dans syncPairs.
 */
export function createBumpers(scene, world) {
  const material = new THREE.MeshStandardMaterial({
    color: BUMPER_COLOR,
    metalness: 0.6,
    roughness: 0.3,
  });

  world.addContactMaterial(
    new CANNON.ContactMaterial(MATERIALS.ball, MATERIALS.bumper, {
      friction: BALL_BUMPER_FRICTION,
      restitution: BALL_BUMPER_RESTITUTION,
    }),
  );

  const pairs = [];

  for (const pos of BUMPER_POSITIONS) {
    const mesh = new THREE.Mesh(
      new THREE.CylinderGeometry(BUMPER_RADIUS, BUMPER_RADIUS, BUMPER_HEIGHT, 24),
      material,
    );
    mesh.position.set(pos.x, BUMPER_HEIGHT / 2, pos.z);
    scene.add(mesh);

    const body = new CANNON.Body({
      mass: 0,
      shape: new CANNON.Cylinder(BUMPER_RADIUS, BUMPER_RADIUS, BUMPER_HEIGHT, 12),
      material: MATERIALS.bumper,
    });
    body.position.set(pos.x, BUMPER_HEIGHT / 2, pos.z);
    body.userData = { type: "bumper" };
    world.addBody(body);

    pairs.push({ mesh, body });
  }

  return pairs;
}
