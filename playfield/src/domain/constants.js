/**
 * Convention d'axes (playfield 3D + Rapier) :
 *   X = gauche / droite
 *   Y = hauteur (perpendiculaire au plateau)
 *   Z = longueur du plateau (Z negatif = haut, Z positif = bas / joueur)
 *
 * La gravite inclinee est appliquee cote moteur physique (Rapier), pas en inclinant les meshes.
 */

// Plateau
export const TABLE_WIDTH = 9.4;
export const TABLE_DEPTH = 13;
export const TABLE_THICKNESS = 0.5;

// Murs
export const WALL_HEIGHT = 1;
export const WALL_THICKNESS = 0.3;

// Drain (ouverture entre les futurs flippers)
export const DRAIN_OPENING_WIDTH = 2.5;

// Bille
export const BALL_RADIUS = 0.25;

// Tunnel de lancement (couloir vertical le long du mur droit, bas du plateau)
export const TUNNEL_WIDTH = 1.0;
export const TUNNEL_LENGTH = 3;
export const TUNNEL_WALL_X = TABLE_WIDTH / 2 - TUNNEL_WIDTH - WALL_THICKNESS / 2;
export const TUNNEL_WALL_Z = TABLE_DEPTH / 2 - TUNNEL_LENGTH / 2;

// Spawn bille (au centre du tunnel, juste devant le mur du bas)
export const PLUNGER_SPAWN_X = 4.2;
export const PLUNGER_SPAWN_Y = 0.26;
export const PLUNGER_SPAWN_Z = 6.05;

// Plunger — force d'impulsion (Z negatif = vers le haut du plateau)
export const PLUNGER_IMPULSE_FORCE = 38;

// Flippers (battes)
export const FLIPPER_LENGTH = 2.0;
export const FLIPPER_WIDTH = 0.4;
export const FLIPPER_HEIGHT = 0.3;
export const FLIPPER_REST_ANGLE = 0.5;   // radians (~28°), battes au repos vers le drain
export const FLIPPER_PIVOT_X = 2.3;
export const FLIPPER_OFFSET_X = -0.55;
export const FLIPPER_PIVOT_Z = 4.75;
export const FLIPPER_PIVOT_Y = 0.35;
export const FLIPPER_ROT_X = 0.05235987755982989;  // radians (~3°), inclinaison des battes sur l'axe X
export const FLIPPER_ROT_Z = 0.017453292519943295;  // radians (~1°), inclinaison des battes sur l'axe Z

// Slingshots — murs inclines qui ferment le corridor lateral au-dessus des flippers
export const SLINGSHOT_DEPTH = 0.25;
export const SLINGSHOT_TOP_OFFSET = 2.4; // distance Z entre l'extremite haute et le pivot flipper

// Deflecteurs d'angle haut — diagonales dans les deux coins superieurs du plateau
export const CORNER_DEFLECTOR_SIZE = 2;     // longueur d'arete coupee sur X et sur Z
export const CORNER_DEFLECTOR_DEPTH = 0.25;

// Arche — arrondi en haut du playfield (remplace les deux coins carres)
// ARCH_RADIUS  : rayon de l'arche (TABLE_WIDTH / 2 = demi-largeur)
// ARCH_CENTER_Z: centre de l'arc en Z (bas de l'arche, rejoint les murs lateraux)
// ARCH_SEGMENTS: nombre de points pour approcher la courbe (10 = suffisant)
export const ARCH_RADIUS     = TABLE_WIDTH / 2;
export const ARCH_CENTER_Z   = -8.5;
export const ARCH_HALF_WIDTH = 5.3;
export const ARCH_HALF_DEPTH = 3.1;
export const ARCH_HEIGHT     = 7.2;
export const ARCH_SEGMENTS   = 10;
export const ARCH_OFFSET_X   = 0;
export const ARCH_OFFSET_Z   = 5;
export const ARCH_ROT_Y      = 0;

// Bumpers
export const BUMPER_REPULSE_FORCE = 4;

// Drain — seuil Z au-dela duquel la bille est consideree perdue.
// Doit être en dessous des flippers (FLIPPER_PIVOT_Z = 9.75) avec marge suffisante.
export const DRAIN_Z_THRESHOLD = TABLE_DEPTH / 2 + 2.5;  // = 11.5

// Flippers — vitesse de rotation (rad/s)
export const FLIPPER_SPEED = 15;

// Collisions — cooldown entre deux emissions du meme type (ms)
export const COLLISION_COOLDOWN_MS = 300;

// Rendu WebGL — cibles machines integrees / ecrans haute densite
/** Plafonne devicePixelRatio (souvent la cause n°1 des lags sur PC integre). */
export const MAX_RENDERER_PIXEL_RATIO = 1.5;
/** false = meilleures perfs ; true = contours plus lisses (PC demo). */
export const RENDERER_ANTIALIAS = false;
