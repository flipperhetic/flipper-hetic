/**
 * Rapier — One-way gate au sommet du tunnel de lancement.
 *
 * Body kinematic qui bouge entre deux positions :
 *   - "open"   : sous la table (sortie + entree libres dans le tunnel)
 *   - "closed" : a l'embouchure du tunnel (bloque la rentree depuis le plateau)
 *
 * Etat porte par body.userData.state.
 */
import {
  TUNNEL_WIDTH,
  TUNNEL_LENGTH,
  TUNNEL_WALL_Z,
  TABLE_WIDTH,
  WALL_HEIGHT,
} from "../../../domain/constants.js";
import { getRapier } from "./init.js";
import { createBodyHandle } from "./bodyHandle.js";
import { MATERIALS } from "./world.js";

const GATE_X = TABLE_WIDTH / 2 - TUNNEL_WIDTH / 2;
const GATE_Z = TUNNEL_WALL_Z - TUNNEL_LENGTH / 2;
const GATE_THICKNESS_Z = 0.15;
const GATE_Y_CLOSED = WALL_HEIGHT / 2;
const GATE_Y_OPEN = -10;

// Seuil de fermeture : des que la bille passe au-dessus (Z plus petit), on ferme.
export const LAUNCH_GATE_TRIGGER_Z = GATE_Z - GATE_THICKNESS_Z / 2;

export function createLaunchGateBody(world) {
  const RAPIER = getRapier();

  const bodyDesc = RAPIER.RigidBodyDesc.kinematicPositionBased()
    .setTranslation(GATE_X, GATE_Y_OPEN, GATE_Z);
  const rb = world.createRigidBody(bodyDesc);

  const colliderDesc = RAPIER.ColliderDesc.cuboid(
    TUNNEL_WIDTH / 2,
    WALL_HEIGHT / 2,
    GATE_THICKNESS_Z / 2,
  )
    .setFriction(MATERIALS.static.friction)
    .setRestitution(MATERIALS.static.restitution);
  world.createCollider(colliderDesc, rb);

  return createBodyHandle(rb, world, {
    userData: { type: "launch_gate", state: "open" },
  });
}

export function openLaunchGate(gate) {
  gate.rb.setTranslation({ x: GATE_X, y: GATE_Y_OPEN, z: GATE_Z }, true);
  gate.userData.state = "open";
}

export function closeLaunchGate(gate) {
  gate.rb.setTranslation({ x: GATE_X, y: GATE_Y_CLOSED, z: GATE_Z }, true);
  gate.userData.state = "closed";
}

/**
 * Ferme la porte des que la bille a quitte le tunnel par le haut.
 * Idempotent : ne fait rien si deja fermee.
 */
export function updateLaunchGate(gate, ballZ) {
  if (gate.userData.state === "open" && ballZ < LAUNCH_GATE_TRIGGER_Z) {
    closeLaunchGate(gate);
  }
}
