/**
 * Playfield — Bille (etape 6 du plan MVP).
 *
 * Mesh Three.js (sphere metallique) + body Cannon-es (Sphere, masse 1),
 * proprietes de contact (restitution 0.5, friction 0.3) et resetBall()
 * qui place la bille au spawn plunger defini dans constants.js.
 */
import * as THREE from "three";
import * as CANNON from "cannon-es";
import {
  PLUNGER_SPAWN_X,
  PLUNGER_SPAWN_Y,
  PLUNGER_SPAWN_Z,
  PLUNGER_IMPULSE_FORCE,
} from "./constants.js";
import { MATERIALS } from "./physics.js";

export const BALL_RADIUS = 0.25;
export const BALL_MASS = 1;
export const BALL_RESTITUTION = 0.5;
export const BALL_FRICTION = 0.3;
// Hauteur fixe : centre de la bille juste au-dessus du plateau (y=0).
const BALL_FIXED_Y = BALL_RADIUS + 0.01;

/**
 * Cree le mesh + body de la bille, ajoute le ContactMaterial ball<->static
 * au monde, et positionne la bille au spawn plunger.
 * Retourne le couple { mesh, body } a pousser dans syncPairs.
 */
export function createBall(scene, world) {
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(BALL_RADIUS, 32, 32),
    new THREE.MeshStandardMaterial({
      color: 0xcccccc,
      metalness: 0.9,
      roughness: 0.2,
    }),
  );
  scene.add(mesh);

  const body = new CANNON.Body({
    mass: BALL_MASS,
    shape: new CANNON.Sphere(BALL_RADIUS),
    material: MATERIALS.ball,
  });
  body.userData = { type: "ball" };
  world.addBody(body);

  // Contact bille <-> surfaces statiques (plateau, murs).
  world.addContactMaterial(
    new CANNON.ContactMaterial(MATERIALS.ball, MATERIALS.static, {
      friction: BALL_FRICTION,
      restitution: BALL_RESTITUTION,
    }),
  );

  const ball = { mesh, body };
  resetBall(ball);
  return ball;
}

/**
 * Verrouille la bille sur le plan du plateau (Y fixe).
 * Appeler chaque frame APRES world.step().
 */
export function clampBall({ body }) {
  // Verrouiller la bille sur le plan du plateau — pas de physique Y.
  body.position.y = BALL_FIXED_Y;
  body.velocity.y = 0;
}

// Flag anti double-lancement : true apres un lancement, false apres resetBall.
let launched = false;

/**
 * Replace la bille au spawn plunger et remet ses vitesses a zero.
 * Reutilisable par l'etape 7 (plunger) et l'etape 10 (perte de bille).
 */
export function resetBall({ body }) {
  body.position.set(PLUNGER_SPAWN_X, PLUNGER_SPAWN_Y, PLUNGER_SPAWN_Z);
  body.velocity.set(0, 0, 0);
  body.angularVelocity.set(0, 0, 0);
  body.quaternion.set(0, 0, 0, 1);
  body.wakeUp();
  launched = false;
}

/**
 * Lance la bille depuis le spawn plunger.
 * Applique une impulsion en Z negatif (vers le haut du plateau).
 * Refuse le lancement si la bille a deja ete lancee (anti double-lancement).
 * Retourne true si le lancement a eu lieu, false sinon.
 */
export function launchBall({ body }) {
  if (launched) return false;
  body.applyImpulse(new CANNON.Vec3(0, 0, -PLUNGER_IMPULSE_FORCE));
  launched = true;
  return true;
}
