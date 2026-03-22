/**
 * Convention d'axes (coherente avec Cannon-es etape 5) :
 *   X = gauche / droite
 *   Y = hauteur (perpendiculaire au plateau) — axe de gravite Cannon-es (0, -9.82, 0)
 *   Z = longueur du plateau (Z negatif = haut du plateau, Z positif = bas / joueur)
 *
 * L'inclinaison (~6-7°) sera simulee dans Cannon-es via une composante Z
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

// Spawn bille (zone plunger, en bas a droite du plateau)
export const PLUNGER_SPAWN_X = TABLE_WIDTH / 2 - 0.8;
export const PLUNGER_SPAWN_Y = 0.5;
export const PLUNGER_SPAWN_Z = TABLE_DEPTH / 2 - 1;
