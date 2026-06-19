/**
 * Playfield — Environnement statique en Three.js : le fond (plateau 9:16), les
 * murs d'extremite et le couloir de lancement (deux murs droits + virage
 * arrondi). Chaque mesh visible a un collider box statique Rapier aligne.
 *
 * Convention d'axes (cf. domain/constants.js) :
 *   X = gauche/droite, Y = hauteur, Z = profondeur (Z+ = bas/joueur).
 *   Le plateau est centre sur l'origine, sa surface superieure a y = 0.
 */
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
} from "../domain/constants.js";
import { createStaticBoxBody } from "../adapters/physics/index.js";

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
  // Murs de contour : jaune chantier/toxic, mais use/sale. On ne peut pas teinter
  // la map Color (brune) en jaune vif (le multiply donne un jaune-brun boueux).
  // Pour que la salissure se VOIE tout en gardant un jaune toxic franc, on garde
  // une couleur jaune unie et on superpose la rouille en SOMBRE via une aoMap
  // (occlusion : noircit les zones tachees) + un relief marque (normalMap).
  // Une tuile = une hauteur de mur (RUST_TILE) ; chaque mur charge ses textures
  // avec le bon `repeat` (le cache HTTP dedoublonne les fetches).
  const RUST_TILE = 5; // unites monde par tuile (gros motif = repetition peu visible)
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

  // Murs du couloir de lancement : metal gris rouille. Set PBR complet -> map
  // Color (sRGB) pour la rouille, metalnessMap (zones metal/non-metal), relief
  // et rugosite. Couleur de base neutre : la teinte vient de la texture.
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
  // boxWidth/boxDepth = empreinte horizontale du mur. On tile selon ces deux
  // axes (et non largeur+hauteur) : la face vue du dessus est correctement
  // repetee que le mur soit long en X (haut/bas) ou en Z (lateraux).
  function makeWornWallMaterial(boxWidth, boxDepth) {
    const rx = Math.max(1, Math.round(boxWidth / RUST_TILE));
    const ry = Math.max(1, Math.round(boxDepth / RUST_TILE));
    // Decalage aleatoire commun aux 3 maps de CE mur (sinon relief/salissure
    // seraient desynchronises) : deux murs n'ont pas la meme portion de texture.
    const ox = Math.random();
    const oy = Math.random();
    const mat = new THREE.MeshStandardMaterial({
      color: 0xffe600, // jaune chantier / toxic
      metalness: 0.2,
      roughness: 1,
      // Emissif ambre chaud (et non olive) : dans la penombre les murs lisent
      // jaune-orange au lieu de virer au vert, et restent visibles de tranche.
      emissive: 0x3d1c00,
      emissiveIntensity: 0.5,
      normalMap: loadRust("/textures/rust_normalGL.jpg", rx, ry, ox, oy),
      roughnessMap: loadRust("/textures/rust_roughness.jpg", rx, ry, ox, oy),
      aoMap: loadRust("/textures/rust_color.jpg", rx, ry, ox, oy), // taches sombres sur le jaune
      aoMapIntensity: 1.5,
    });
    mat.normalScale.set(1.8, 1.8); // relief plus marque pour qu'il se voie
    return mat;
  }

  // -- Fond 9:16 ------------------------------------------------------------
  const floor = new THREE.Mesh(
    new THREE.BoxGeometry(TABLE_WIDTH, TABLE_THICKNESS, TABLE_DEPTH),
    floorMat,
  );
  floor.position.set(0, -TABLE_THICKNESS / 2, 0);
  floor.receiveShadow = true;
  group.add(floor);

  // Surface texturee posee sur le plateau. Plan tourne de -90° sur X : il est
  // a plat, face vers le haut, et le haut de l'image (UV V=1) pointe vers
  // l'avant du plateau (Z negatif = fond/horizon), le bas vers le joueur.
  const tex = new THREE.TextureLoader().load("/models/texture_fond.png");
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  const topPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(TABLE_WIDTH, TABLE_DEPTH),
    new THREE.MeshStandardMaterial({
      map: tex,
      emissive: 0xffd9b3,
      emissiveMap: tex,
      emissiveIntensity: 0.85, // auto-illumination relevee : le plateau reste lisible sous l'eclairage sombre
      roughness: 0.7,
      metalness: 0.0,
    }),
  );
  topPlane.rotation.x = -Math.PI / 2;
  topPlane.position.set(0, 0.01, 0);
  topPlane.receiveShadow = true; // surface visible : recoit les ombres des murs/bille
  group.add(topPlane);

  createStaticBoxBody(world, {
    width: TABLE_WIDTH,
    height: TABLE_THICKNESS,
    depth: TABLE_DEPTH,
    position: { x: 0, y: -TABLE_THICKNESS / 2, z: 0 },
    material: "table",
    type: "table",
  });

  // -- Murs d'extremite -----------------------------------------------------
  const hw = TABLE_WIDTH / 2;
  const hd = TABLE_DEPTH / 2;
  const wt = WALL_THICKNESS;
  const y = WALL_HEIGHT / 2;

  function addWall(w, h, d, x, wy, z, ry = 0, mat) {
    const geo = new THREE.BoxGeometry(w, h, d);
    // aoMap lit le 2e jeu d'UV (uv2) : on le copie depuis uv (sinon l'occlusion
    // est ignoree sur les versions de three qui l'exigent).
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
    createStaticBoxBody(world, {
      width: w,
      height: h,
      depth: d,
      position: { x, y: wy, z },
      ...(rotation ? { rotation } : {}),
      type: "wall",
    });
    return mesh;
  }

  // Lateraux (couvrent toute la profondeur + epaisseur des murs haut/bas)
  const lateralLen = TABLE_DEPTH + wt * 2;
  addWall(wt, WALL_HEIGHT, lateralLen, -hw - wt / 2, y, 0, 0, makeWornWallMaterial(wt, lateralLen));
  addWall(wt, WALL_HEIGHT, lateralLen, hw + wt / 2, y, 0, 0, makeWornWallMaterial(wt, lateralLen));

  // Haut
  const topLen = TABLE_WIDTH + wt * 2;
  addWall(topLen, WALL_HEIGHT, wt, 0, y, -hd - wt / 2, 0, makeWornWallMaterial(topLen, wt));

  // Bas — deux segments avec l'ouverture du drain centree sur la largeur jouable.
  // L'ouverture est decalee a gauche (PLAYABLE_CENTER_X), donc les deux segments
  // ont des largeurs differentes pour couvrir tout le mur bas.
  const bz = hd + wt / 2;
  const drainLeft = PLAYABLE_CENTER_X - DRAIN_OPENING_WIDTH / 2;
  const drainRight = PLAYABLE_CENTER_X + DRAIN_OPENING_WIDTH / 2;
  const leftSeg = drainLeft - (-hw);
  const rightSeg = hw - drainRight;
  addWall(leftSeg, WALL_HEIGHT, wt, (-hw + drainLeft) / 2, y, bz, 0, makeWornWallMaterial(leftSeg, wt));
  addWall(rightSeg, WALL_HEIGHT, wt, (drainRight + hw) / 2, y, bz, 0, makeWornWallMaterial(rightSeg, wt));

  // Couloir de lancement — deux murs fins (metal gris rouille) encadrant la bille
  const lwt = LAUNCH_WALL_THICKNESS;
  addWall(lwt, WALL_HEIGHT, LAUNCH_WALL_LENGTH, LAUNCH_WALL_LEFT_X, y, LAUNCH_WALL_Z, 0, makeRustMetalMaterial(lwt, LAUNCH_WALL_LENGTH));
  addWall(lwt, WALL_HEIGHT, LAUNCH_WALL_LENGTH, LAUNCH_WALL_RIGHT_X, y, LAUNCH_WALL_Z, 0, makeRustMetalMaterial(lwt, LAUNCH_WALL_LENGTH));

  // Virage arrondi (90°) vers la gauche au bout du couloir (haut = Z-) : chaque
  // mur est prolonge par un arc de cercle approxime en segments. Le centre de
  // l'arc est a gauche de l'axe du couloir ; la bille ressort vers le plateau (-X).
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
      // *1.05 : leger chevauchement pour eviter les trous entre cordes.
      const segLen = len * 1.05;
      addWall(lwt, WALL_HEIGHT, segLen, (x0 + x1) / 2, y, (z0 + z1) / 2, Math.atan2(dx, dz), makeRustMetalMaterial(lwt, segLen));
    }
  }

  return { group };
}
