/**
 * Rapier — One-way gate au sommet du tunnel de lancement.
 *
 * Body kinematic qui bouge entre deux positions :
 *   - "open"   : sous la table (sortie + entree libres dans le tunnel)
 *   - "closed" : a l'embouchure du tunnel (bloque la rentree depuis le plateau)
 *
 * Etat et config de fermeture portes par body.userData pour permettre
 * le repositionnement + redimensionnement live via le debug panel.
 * userData.rotY est toujours en degres.
 */
import { WALL_HEIGHT } from "../../../domain/constants.js";
import { getRapier } from "./init.js";
import { createBodyHandle } from "./bodyHandle.js";
import { MATERIALS } from "./world.js";

const GATE_X        = 3.55;
const GATE_Z        = -4.3;
const GATE_W        = 3.55;
const GATE_H        = 1;
const GATE_D        = 0.15;
const GATE_ROTY_DEG = 90;
const GATE_Y_CLOSED = WALL_HEIGHT / 2;
const GATE_Y_OPEN   = -10;

export function createLaunchGateBody(world) {
  const RAPIER = getRapier();

  const rotRad = GATE_ROTY_DEG * Math.PI / 180;
  const h = rotRad / 2;
  const rb = world.createRigidBody(
    RAPIER.RigidBodyDesc.kinematicPositionBased()
      .setTranslation(GATE_X, GATE_Y_OPEN, GATE_Z)
      .setRotation({ x: 0, y: Math.sin(h), z: 0, w: Math.cos(h) }),
  );

  const collider = world.createCollider(
    RAPIER.ColliderDesc.cuboid(GATE_W / 2, GATE_H / 2, GATE_D / 2)
      .setFriction(MATERIALS.static.friction)
      .setRestitution(MATERIALS.static.restitution),
    rb,
  );

  return createBodyHandle(rb, world, {
    userData: {
      type: "launch_gate", state: "open",
      closedX: GATE_X, closedZ: GATE_Z,
      w: GATE_W, h: GATE_H, d: GATE_D, rotY: GATE_ROTY_DEG,
    },
    colliders: [collider],
  });
}

export function openLaunchGate(gate) {
  gate.userData.pendingCloseAt = undefined;
  gate.rb.setTranslation({ x: gate.userData.closedX, y: GATE_Y_OPEN, z: gate.userData.closedZ }, true);
  gate.userData.state = "open";
}

export function closeLaunchGate(gate) {
  gate.rb.setTranslation({ x: gate.userData.closedX, y: GATE_Y_CLOSED, z: gate.userData.closedZ }, true);
  gate.userData.state = "closed";
}

/**
 * Repositionne et redimensionne la gate (debug).
 * Recrée le collider pour appliquer la nouvelle taille/rotation.
 * Force l'affichage en position fermée pour visualiser en live.
 * rotY en radians (converti en degres pour userData).
 */
export function setGateConfig(gate, { x, z, w, h, d, rotY = 0 } = {}) {
  const RAPIER = getRapier();
  const world = gate.world;

  for (const col of gate.colliders) world.removeCollider(col, false);

  const halfRot = rotY / 2;
  gate.rb.setRotation({ x: 0, y: Math.sin(halfRot), z: 0, w: Math.cos(halfRot) }, true);

  const collider = world.createCollider(
    RAPIER.ColliderDesc.cuboid(w / 2, h / 2, d / 2)
      .setFriction(MATERIALS.static.friction)
      .setRestitution(MATERIALS.static.restitution),
    gate.rb,
  );
  gate.colliders = [collider];

  gate.userData.closedX = x;
  gate.userData.closedZ = z;
  gate.userData.w = w;
  gate.userData.h = h;
  gate.userData.d = d;
  gate.userData.rotY = rotY * 180 / Math.PI;

  gate.rb.setTranslation({ x, y: GATE_Y_CLOSED, z }, true);
  gate.userData.state = "closed";
}

/**
 * Ferme la porte dès que la bille a quitté le tunnel par le haut.
 * Idempotent : ne fait rien si déjà fermée.
 */
export function updateLaunchGate(gate, ballZ) {
  if (gate.userData.state !== "open") return;
  const triggerZ = gate.userData.closedZ - gate.userData.d / 2;
  if (ballZ < triggerZ && gate.userData.pendingCloseAt === undefined) {
    gate.userData.pendingCloseAt = performance.now() + 140;
  }
  if (gate.userData.pendingCloseAt !== undefined && performance.now() >= gate.userData.pendingCloseAt) {
    gate.userData.pendingCloseAt = undefined;
    closeLaunchGate(gate);
  }
}
