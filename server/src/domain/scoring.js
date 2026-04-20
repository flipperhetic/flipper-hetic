/**
 * Regles de scoring par type de collision.
 * Aucun import de framework — logique metier pure.
 */

const POINTS_BY_TYPE = {
  bumper: 100,
  wall: 0,
  flipper: 0,
  drain: 0,
};

export function getPoints(type) {
  return POINTS_BY_TYPE[type] ?? null;
}

export function isValidCollisionType(type) {
  return typeof type === "string" && type in POINTS_BY_TYPE;
}
