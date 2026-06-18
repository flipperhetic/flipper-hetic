import * as THREE from "three";

export function groupLevelMeshes(scene, syncPairs) {
  const levelGroup = new THREE.Group();
  levelGroup.name = "playfield-level";
  scene.add(levelGroup);

  const seen = new Set();
  for (const { mesh } of syncPairs) {
    if (seen.has(mesh)) continue;
    seen.add(mesh);
    if (mesh.parent) mesh.parent.remove(mesh);
    levelGroup.add(mesh);
  }

  return levelGroup;
}
