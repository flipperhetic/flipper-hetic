/**
 * Convention d'axes (coherente avec Cannon-es etape 5) :
 *   X = gauche / droite
 *   Y = hauteur (perpendiculaire au plateau) — axe de gravite Cannon-es (0, -9.82, 0)
 *   Z = longueur du plateau (Z negatif = haut du plateau, Z positif = bas / joueur)
 *
 * L'inclinaison (~12°) est simulee dans Cannon-es via une composante Z
 * dans le vecteur de gravite, sans incliner les meshes Three.js.
 */

// Plateau
export const TABLE_WIDTH = 10;
export const TABLE_DEPTH = 18;
export const TABLE_THICKNESS = 0.5;

// Murs
export const WALL_HEIGHT = 1;
export const WALL_THICKNESS = 0.3;

// Drain (ouverture entre les futurs flippers)
export const DRAIN_OPENING_WIDTH = 2.5;

// Spawn bille (centre, juste au-dessus du drain)
export const PLUNGER_SPAWN_X = 0;
export const PLUNGER_SPAWN_Y = 0.26;
export const PLUNGER_SPAWN_Z = TABLE_DEPTH / 2 - 0.5;

// Plunger — force d'impulsion (Z negatif = vers le haut du plateau)
export const PLUNGER_IMPULSE_FORCE = 22;

// Flippers (battes)
export const FLIPPER_LENGTH = 2.0;
export const FLIPPER_WIDTH = 0.4;
export const FLIPPER_HEIGHT = 0.3;
export const FLIPPER_REST_ANGLE = 0.5;   // radians (~28°), battes au repos vers le drain
export const FLIPPER_PIVOT_X = DRAIN_OPENING_WIDTH / 2 + 1.25; // distance du centre (±), laisse un acces au drain au repos
export const FLIPPER_PIVOT_Z = TABLE_DEPTH / 2 - 1.5;
export const FLIPPER_PIVOT_Y = FLIPPER_HEIGHT / 2 + 0.05;

// Slingshots — murs inclines qui ferment le corridor lateral au-dessus des flippers
export const SLINGSHOT_DEPTH = 0.25;
export const SLINGSHOT_TOP_OFFSET = 2.4; // distance Z entre l'extremite haute et le pivot flipper

// Bumpers
export const BUMPER_RADIUS = 0.5;
export const BUMPER_HEIGHT = 0.6;
export const BUMPER_REPULSE_FORCE = 4;
export const BUMPER_POSITIONS = [
  { x: -3.1, z: -3.4 },
  { x: 2.6, z: -6.8 },
  { x: -0.4, z: -1.1 },
];

// Drain — seuil Z au-dela duquel la bille est consideree perdue
// Juste apres le mur du bas (epaisseur WALL_THICKNESS) + marge pour le rayon bille.
export const DRAIN_Z_THRESHOLD = TABLE_DEPTH / 2 + WALL_THICKNESS + 0.3;

// Flippers — vitesse de rotation (rad/s)
export const FLIPPER_SPEED = 15;

// Collisions — cooldown entre deux emissions du meme type (ms)
export const COLLISION_COOLDOWN_MS = 300;
