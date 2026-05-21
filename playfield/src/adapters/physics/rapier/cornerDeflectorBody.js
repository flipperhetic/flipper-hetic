/**
 * Rapier — Bodies statiques des deflecteurs d'angle (coins superieurs).
 */
import {
  TABLE_WIDTH,
  TABLE_DEPTH,
  WALL_HEIGHT,
  CORNER_DEFLECTOR_SIZE,
  CORNER_DEFLECTOR_DEPTH,
} from "../../../domain/constants.js";
import { createStaticBoxBody } from "./world.js";

function createOneCornerDeflectorBody(world, side) {
  const isLeft = side === "left";

  const wallX = isLeft ? -TABLE_WIDTH / 2 : TABLE_WIDTH / 2;
  const topZ = -TABLE_DEPTH / 2;
  const lowX = wallX;
  const lowZ = topZ + CORNER_DEFLECTOR_SIZE;
  const highX = isLeft
    ? wallX + CORNER_DEFLECTOR_SIZE
    : wallX - CORNER_DEFLECTOR_SIZE;
  const highZ = topZ;

  const centerX = (lowX + highX) / 2;
  const centerZ = (lowZ + highZ) / 2;
  const length = Math.hypot(lowX - highX, lowZ - highZ);
  const angle = Math.atan2(-(lowZ - highZ), lowX - highX);

  return createStaticBoxBody(world, {
    width: length,
    height: WALL_HEIGHT,
    depth: CORNER_DEFLECTOR_DEPTH,
    position: { x: centerX, y: WALL_HEIGHT / 2, z: centerZ },
    rotationY: angle,
  });
}

export function createCornerDeflectorBodies(world) {
  return [
    createOneCornerDeflectorBody(world, "left"),
    createOneCornerDeflectorBody(world, "right"),
  ];
}
