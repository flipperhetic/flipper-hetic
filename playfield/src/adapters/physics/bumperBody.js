/**
 * Playfield — Bodies Cannon-es des bumpers.
 */
import * as CANNON from "cannon-es";
import {
  BUMPER_RADIUS,
  BUMPER_HEIGHT,
  BUMPER_POSITIONS,
} from "../../domain/constants.js";
import { MATERIALS } from "./world.js";

const BALL_BUMPER_FRICTION = 0.1;
const BALL_BUMPER_RESTITUTION = 0.8;

export function createBumperBodies(world) {
  world.addContactMaterial(
    new CANNON.ContactMaterial(MATERIALS.ball, MATERIALS.bumper, {
      friction: BALL_BUMPER_FRICTION,
      restitution: BALL_BUMPER_RESTITUTION,
    }),
  );

  const bodies = [];

  for (const pos of BUMPER_POSITIONS) {
    const body = new CANNON.Body({
      mass: 0,
      shape: new CANNON.Cylinder(BUMPER_RADIUS, BUMPER_RADIUS, BUMPER_HEIGHT, 12),
      material: MATERIALS.bumper,
    });
    body.position.set(pos.x, BUMPER_HEIGHT / 2, pos.z);
    body.userData = { type: "bumper" };
    world.addBody(body);
    bodies.push(body);
  }

  return bodies;
}
