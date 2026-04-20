/**
 * Use case : appliquer une collision typee.
 */
export function applyCollision(state, type) {
  const changed = state.applyCollision(type);
  return { changed };
}
