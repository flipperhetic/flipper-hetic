import * as THREE from "three";
import {
  TABLE_WIDTH,
  TABLE_DEPTH,
  TABLE_THICKNESS,
  WALL_HEIGHT,
  WALL_THICKNESS,
  DRAIN_OPENING_WIDTH,
  PLAYABLE_CENTER_X,
  LAUNCH_WALL_LEFT_X,
  LAUNCH_WALL_RIGHT_X,
  LAUNCH_WALL_LENGTH,
  LAUNCH_WALL_THICKNESS,
  LAUNCH_WALL_Z,
  LAUNCH_BEND_ANGLE_DEG,
  LAUNCH_BEND_RADIUS,
  LAUNCH_BEND_SEGMENTS,
  OUTLANE_GUIDE_THICKNESS,
  OUTLANE_GUIDE_LEFT,
  OUTLANE_GUIDE_RIGHT,
} from "../domain/constants.js";

export function buildEnvironment(world) {
  const group = new THREE.Group();
  group.name = "playfield-environment";

  const floorMat = new THREE.MeshStandardMaterial({
    color: 0x14213d,
    roughness: 0.55,
    metalness: 0.25,
    emissive: 0x05070f,
    emissiveIntensity: 0.4,
  });
  // RUST_TILE : grandes tuiles pour éviter l'effet de répétition visible à distance.
  const RUST_TILE = 5;
  const texLoader = new THREE.TextureLoader();
  function loadRust(path, repeatX, repeatY, offsetX, offsetY, srgb = false) {
    const t = texLoader.load(path);
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repeatX, repeatY);
    t.offset.set(offsetX, offsetY); // decale la phase pour casser l'alignement entre murs
    t.anisotropy = 8;
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }

  function makeRustMetalMaterial(boxWidth, boxDepth) {
    const rx = Math.max(1, Math.round(boxWidth / RUST_TILE));
    const ry = Math.max(1, Math.round(boxDepth / RUST_TILE));
    const ox = Math.random();
    const oy = Math.random();
    return new THREE.MeshStandardMaterial({
      color: 0xffffff,
      metalness: 1,
      roughness: 1,
      map: loadRust("/textures/rust_color.jpg", rx, ry, ox, oy, true),
      metalnessMap: loadRust("/textures/rust_JPG_Metalness.jpg", rx, ry, ox, oy),
      normalMap: loadRust("/textures/rust_normalGL.jpg", rx, ry, ox, oy),
      roughnessMap: loadRust("/textures/rust_roughness.jpg", rx, ry, ox, oy),
    });
  }

  const floor = new THREE.Mesh(
    new THREE.BoxGeometry(TABLE_WIDTH, TABLE_THICKNESS, TABLE_DEPTH),
    floorMat,
  );
  floor.position.set(0, -TABLE_THICKNESS / 2, 0);
  floor.receiveShadow = true;
  group.add(floor);

  const tex = new THREE.TextureLoader().load("/models/texture_fond.png");
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  const topPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(TABLE_WIDTH, TABLE_DEPTH),
    new THREE.MeshStandardMaterial({
      map: tex,
      emissive: 0xffd9b3,
      emissiveMap: tex,
      emissiveIntensity: 0.85,
      roughness: 0.7,
      metalness: 0.0,
    }),
  );
  topPlane.rotation.x = -Math.PI / 2;
  topPlane.position.set(0, 0.01, 0);
  topPlane.receiveShadow = true;
  group.add(topPlane);

  world.createStaticBox({
    width: TABLE_WIDTH,
    height: TABLE_THICKNESS,
    depth: TABLE_DEPTH,
    position: { x: 0, y: -TABLE_THICKNESS / 2, z: 0 },
    material: "table",
    type: "table",
  });

  const hw = TABLE_WIDTH / 2;
  const hd = TABLE_DEPTH / 2;
  const wt = WALL_THICKNESS;
  const y = WALL_HEIGHT / 2;

  function addWall(w, h, d, x, wy, z, ry = 0, mat) {
    const geo = new THREE.BoxGeometry(w, h, d);
    // uv2 requis par Three.js pour que aoMap soit pris en compte.
    geo.setAttribute("uv2", geo.getAttribute("uv"));
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, wy, z);
    mesh.rotation.y = ry;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    let rotation;
    if (ry) {
      const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ry, 0));
      rotation = { x: q.x, y: q.y, z: q.z, w: q.w };
    }
    world.createStaticBox({
      width: w,
      height: h,
      depth: d,
      position: { x, y: wy, z },
      ...(rotation ? { rotation } : {}),
      type: "wall",
    });
    return mesh;
  }

  const lateralLen = TABLE_DEPTH + wt * 2;
  addWall(wt, WALL_HEIGHT, lateralLen, -hw - wt / 2, y, 0, 0, makeRustMetalMaterial(wt, lateralLen));
  addWall(wt, WALL_HEIGHT, lateralLen, hw + wt / 2, y, 0, 0, makeRustMetalMaterial(wt, lateralLen));

  const topLen = TABLE_WIDTH + wt * 2;
  addWall(topLen, WALL_HEIGHT, wt, 0, y, -hd - wt / 2, 0, makeRustMetalMaterial(topLen, wt));

  const bz = hd + wt / 2;
  const drainLeft = PLAYABLE_CENTER_X - DRAIN_OPENING_WIDTH / 2;
  const drainRight = PLAYABLE_CENTER_X + DRAIN_OPENING_WIDTH / 2;
  const leftSeg = drainLeft - (-hw);
  const rightSeg = hw - drainRight;
  addWall(leftSeg, WALL_HEIGHT, wt, (-hw + drainLeft) / 2, y, bz, 0, makeRustMetalMaterial(leftSeg, wt));
  addWall(rightSeg, WALL_HEIGHT, wt, (drainRight + hw) / 2, y, bz, 0, makeRustMetalMaterial(rightSeg, wt));

  const lwt = LAUNCH_WALL_THICKNESS;
  addWall(lwt, WALL_HEIGHT, LAUNCH_WALL_LENGTH, LAUNCH_WALL_LEFT_X, y, LAUNCH_WALL_Z, 0, makeRustMetalMaterial(lwt, LAUNCH_WALL_LENGTH));
  addWall(lwt, WALL_HEIGHT, LAUNCH_WALL_LENGTH, LAUNCH_WALL_RIGHT_X, y, LAUNCH_WALL_Z, 0, makeRustMetalMaterial(lwt, LAUNCH_WALL_LENGTH));

  const zTop = LAUNCH_WALL_Z - LAUNCH_WALL_LENGTH / 2;
  const centerX = (LAUNCH_WALL_LEFT_X + LAUNCH_WALL_RIGHT_X) / 2;
  const halfWidth = (LAUNCH_WALL_RIGHT_X - LAUNCH_WALL_LEFT_X) / 2;
  const arcCx = centerX - LAUNCH_BEND_RADIUS;
  const arcCz = zTop;
  const bendRad = LAUNCH_BEND_ANGLE_DEG * (Math.PI / 180);
  const step = bendRad / LAUNCH_BEND_SEGMENTS;
  for (const r of [LAUNCH_BEND_RADIUS - halfWidth, LAUNCH_BEND_RADIUS + halfWidth]) {
    for (let i = 0; i < LAUNCH_BEND_SEGMENTS; i++) {
      const x0 = arcCx + r * Math.cos(i * step);
      const z0 = arcCz - r * Math.sin(i * step);
      const x1 = arcCx + r * Math.cos((i + 1) * step);
      const z1 = arcCz - r * Math.sin((i + 1) * step);
      const dx = x1 - x0;
      const dz = z1 - z0;
      const len = Math.hypot(dx, dz);
      // 1.05 : légère surlongueur pour combler les gaps entre cordes adjacentes.
      const segLen = len * 1.05;
      addWall(lwt, WALL_HEIGHT, segLen, (x0 + x1) / 2, y, (z0 + z1) / 2, Math.atan2(dx, dz), makeRustMetalMaterial(lwt, segLen));
    }
  }

  // --- Deflecteurs d'outlane : murs a 45° entre chaque flipper et le mur lateral ---
  const gt = OUTLANE_GUIDE_THICKNESS;
  for (const g of [OUTLANE_GUIDE_LEFT, OUTLANE_GUIDE_RIGHT]) {
    const dx = g.inner.x - g.outer.x;
    const dz = g.inner.z - g.outer.z;
    const len = Math.hypot(dx, dz);
    addWall(
      gt, WALL_HEIGHT, len,
      (g.outer.x + g.inner.x) / 2, y, (g.outer.z + g.inner.z) / 2,
      Math.atan2(dx, dz),
      makeRustMetalMaterial(gt, len),
    );
  }

  return { group };
}
