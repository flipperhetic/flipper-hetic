/**
 * Playfield — Scene Three.js (etape 4 du plan MVP)
 * Plateau, murs, drain. Pas de physique ni de Socket.io.
 */
import * as THREE from "three";
import {
  TABLE_WIDTH,
  TABLE_DEPTH,
  TABLE_THICKNESS,
  WALL_HEIGHT,
  WALL_THICKNESS,
  DRAIN_OPENING_WIDTH,
} from "./constants.js";

// ── Scene ──────────────────────────────────────────────
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1a2e);

// ── Camera (vue top-down pour ecran vertical 9:16) ────
const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  100,
);
// Camera directement au-dessus du plateau, regard vers le bas
camera.position.set(0, 20, 0);
camera.lookAt(0, 0, 0);
// Rotation pour que Z+ (bas du plateau / joueur) = bas de l'ecran
camera.up.set(0, 0, -1);

// ── Renderer ───────────────────────────────────────────
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.style.margin = "0";
document.body.style.overflow = "hidden";
document.body.appendChild(renderer.domElement);

// ── Lumieres ───────────────────────────────────────────
scene.add(new THREE.AmbientLight(0xffffff, 0.6));

const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
dirLight.position.set(5, 15, 5);
scene.add(dirLight);

// ── Materiaux ──────────────────────────────────────────
const tableMat = new THREE.MeshStandardMaterial({ color: 0x2d5a27 });
const wallMat = new THREE.MeshStandardMaterial({ color: 0x8b4513 });

// ── Plateau ────────────────────────────────────────────
const table = new THREE.Mesh(
  new THREE.BoxGeometry(TABLE_WIDTH, TABLE_THICKNESS, TABLE_DEPTH),
  tableMat,
);
table.position.y = -TABLE_THICKNESS / 2;
scene.add(table);

// ── Murs ───────────────────────────────────────────────
function createWall(w, h, d, x, y, z) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat);
  mesh.position.set(x, y, z);
  scene.add(mesh);
  return mesh;
}

// Mur gauche
createWall(
  WALL_THICKNESS, WALL_HEIGHT, TABLE_DEPTH,
  -TABLE_WIDTH / 2 - WALL_THICKNESS / 2,
  WALL_HEIGHT / 2,
  0,
);

// Mur droit
createWall(
  WALL_THICKNESS, WALL_HEIGHT, TABLE_DEPTH,
  TABLE_WIDTH / 2 + WALL_THICKNESS / 2,
  WALL_HEIGHT / 2,
  0,
);

// Mur haut (fond du plateau)
createWall(
  TABLE_WIDTH + WALL_THICKNESS * 2, WALL_HEIGHT, WALL_THICKNESS,
  0,
  WALL_HEIGHT / 2,
  -TABLE_DEPTH / 2 - WALL_THICKNESS / 2,
);

// Mur bas — deux segments avec ouverture drain au centre
const bottomWallWidth = (TABLE_WIDTH - DRAIN_OPENING_WIDTH) / 2;
const bottomZ = TABLE_DEPTH / 2 + WALL_THICKNESS / 2;

// Segment bas-gauche
createWall(
  bottomWallWidth, WALL_HEIGHT, WALL_THICKNESS,
  -(DRAIN_OPENING_WIDTH / 2 + bottomWallWidth / 2),
  WALL_HEIGHT / 2,
  bottomZ,
);

// Segment bas-droit
createWall(
  bottomWallWidth, WALL_HEIGHT, WALL_THICKNESS,
  (DRAIN_OPENING_WIDTH / 2 + bottomWallWidth / 2),
  WALL_HEIGHT / 2,
  bottomZ,
);

// ── Resize ─────────────────────────────────────────────
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ── Boucle de rendu ────────────────────────────────────
function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}

animate();
