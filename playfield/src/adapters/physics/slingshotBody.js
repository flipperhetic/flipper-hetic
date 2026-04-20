/**
 * Playfield — Bodies Cannon-es des slingshots.
 */
import {
  TABLE_WIDTH,
  WALL_HEIGHT,
  FLIPPER_PIVOT_X,
  FLIPPER_PIVOT_Z,
  SLINGSHOT_DEPTH,
  SLINGSHOT_TOP_OFFSET,
} from "../../domain/constants.js";
import { createStaticBoxBody } from "./world.js";

function createOneSlingshotBody(world, side) {
  const isLeft = side === "left";

  const lowX = isLeft ? -FLIPPER_PIVOT_X : FLIPPER_PIVOT_X;
  const lowZ = FLIPPER_PIVOT_Z;
  const highX = isLeft
    ? -TABLE_WIDTH / 2 + SLINGSHOT_DEPTH / 2
    : TABLE_WIDTH / 2 - SLINGSHOT_DEPTH / 2;
  const highZ = FLIPPER_PIVOT_Z - SLINGSHOT_TOP_OFFSET;

  const centerX = (lowX + highX) / 2;
  const centerZ = (lowZ + highZ) / 2;
  const length = Math.hypot(lowX - highX, lowZ - highZ);
  const angle = Math.atan2(-(lowZ - highZ), lowX - highX);

  return createStaticBoxBody(world, {
    width: length,
    height: WALL_HEIGHT,
    depth: SLINGSHOT_DEPTH,
    position: { x: centerX, y: WALL_HEIGHT / 2, z: centerZ },
    rotationY: angle,
  });
}

export function createSlingshotBodies(world) {
  return [
    createOneSlingshotBody(world, "left"),
    createOneSlingshotBody(world, "right"),
  ];
}
