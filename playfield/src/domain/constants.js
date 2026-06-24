/**
 * Convention d'axes (playfield 3D + Rapier) :
 *   X = gauche / droite
 *   Y = hauteur (perpendiculaire au plateau)
 *   Z = longueur du plateau (Z negatif = haut, Z positif = bas / joueur)
 *
 * La gravite inclinee est appliquee cote moteur physique (Rapier), pas en inclinant les meshes.
 */

// Plateau — proportions 9:16 (portrait) A L'ECRAN.
// La camera regarde le plateau de biais (~46°), ce qui ecrase la profondeur a
// la projection (facteur ~0.7). On allonge donc le plateau en unites monde
// (largeur 11.25 x profondeur 29) pour qu'il SE LISE 9:16 sur l'ecran portrait.
export const TABLE_WIDTH = 11.25;
export const TABLE_DEPTH = 29;
export const TABLE_THICKNESS = 0.5;

// Murs
export const WALL_HEIGHT = 1;
export const WALL_THICKNESS = 0.3;

// Drain (ouverture centrale du mur bas, entre les flippers)
export const DRAIN_OPENING_WIDTH = 3.0;

// Bille
export const BALL_RADIUS = 0.25;

// Tunnel de lancement (couloir vertical le long du mur droit, bas du plateau)
export const TUNNEL_WIDTH = 1.0;
export const TUNNEL_LENGTH = 3;
export const TUNNEL_WALL_X = TABLE_WIDTH / 2 - TUNNEL_WIDTH - WALL_THICKNESS / 2;
export const TUNNEL_WALL_Z = TABLE_DEPTH / 2 - TUNNEL_LENGTH / 2;

// Spawn bille (couloir de lancement, le long du mur droit en bas du plateau)
export const PLUNGER_SPAWN_X = 4.65;
export const PLUNGER_SPAWN_Y = 0.65;
export const PLUNGER_SPAWN_Z = 7.2;

// Murs du couloir de lancement — encadrent la bille a 0.5 unite de part et d'autre
export const LAUNCH_WALL_OFFSET_X = 0.5;
export const LAUNCH_WALL_THICKNESS = 0.15; // plus fins que les murs de contour
export const LAUNCH_WALL_LENGTH = 16.2;
export const LAUNCH_WALL_Z = PLUNGER_SPAWN_Z - LAUNCH_WALL_LENGTH / 2;
export const LAUNCH_WALL_LEFT_X = PLUNGER_SPAWN_X - LAUNCH_WALL_OFFSET_X;
export const LAUNCH_WALL_RIGHT_X = PLUNGER_SPAWN_X + LAUNCH_WALL_OFFSET_X;

// Largeur jouable : de la face interne du mur gauche jusqu'a la face gauche du
// mur gauche du couloir de lancement. Flippers et drain sont centres dessus.
export const PLAYABLE_LEFT_X = -TABLE_WIDTH / 2;
export const PLAYABLE_RIGHT_X = LAUNCH_WALL_LEFT_X - LAUNCH_WALL_THICKNESS / 2;
export const PLAYABLE_CENTER_X = (PLAYABLE_LEFT_X + PLAYABLE_RIGHT_X) / 2;
// Virage arrondi vers la gauche en haut du couloir (arc approxime par segments)
export const LAUNCH_BEND_ANGLE_DEG = 90;
export const LAUNCH_BEND_RADIUS = 2; // rayon de l'axe central du couloir dans le virage
export const LAUNCH_BEND_SEGMENTS = 6; // segments par mur pour lisser l'arc

// Plunger — force d'impulsion (Z negatif = vers le haut du plateau)
export const PLUNGER_IMPULSE_FORCE = 38;

// Flippers (battes)
export const FLIPPER_LENGTH = 2.0;
export const FLIPPER_WIDTH = 0.4;
export const FLIPPER_HEIGHT = 0.3;
export const FLIPPER_REST_ANGLE = 0.5;   // radians (~28°), battes au repos vers le drain
export const FLIPPER_PIVOT_X = 2.4;
export const FLIPPER_OFFSET_X = -0.8;
export const FLIPPER_PIVOT_Z = 11.25;
export const FLIPPER_PIVOT_Y = 0.55;
export const FLIPPER_ROT_X = 0.05235987755982989;  // radians (~3°), inclinaison des battes sur l'axe X
export const FLIPPER_ROT_Z = 0.017453292519943295;  // radians (~1°), inclinaison des battes sur l'axe Z

// Slingshots — murs inclines qui ferment le corridor lateral au-dessus des flippers
export const SLINGSHOT_DEPTH = 0.25;
export const SLINGSHOT_TOP_OFFSET = 2.4; // distance Z entre l'extremite haute et le pivot flipper

// Deflecteurs d'angle haut — diagonales dans les deux coins superieurs du plateau
export const CORNER_DEFLECTOR_SIZE = 2;     // longueur d'arete coupee sur X et sur Z
export const CORNER_DEFLECTOR_DEPTH = 0.25;

// Arche — arrondi en haut du playfield (positionne via debug sur le GLB Obstacle-arch)
export const ARCH_RADIUS     = TABLE_WIDTH / 2;
export const ARCH_CENTER_Z   = -8.5;
export const ARCH_HALF_WIDTH = 6.05;
export const ARCH_HALF_DEPTH = 6.75;
export const ARCH_HEIGHT     = 7.2;
export const ARCH_SEGMENTS   = 10;
export const ARCH_OFFSET_X   = 0;
export const ARCH_OFFSET_Y   = -3.25;
export const ARCH_OFFSET_Z   = 2;
export const ARCH_ROT_Y      = 0;

// Bumpers
export const BUMPER_REPULSE_FORCE = 7;

// Drain — seuil Z au-dela duquel la bille est consideree perdue.
// Juste apres la ligne des flippers (z~12.9), avant le mur bas (z~14.65).
export const DRAIN_Z_THRESHOLD = 13.4;

// Flippers — vitesse de rotation (rad/s)
export const FLIPPER_SPEED = 15;

// Collisions — cooldown entre deux emissions du meme type (ms)
export const COLLISION_COOLDOWN_MS = 300;

// Rendu WebGL — cibles machines integrees / ecrans haute densite
/** Plafonne devicePixelRatio (souvent la cause n°1 des lags sur PC integre). */
export const MAX_RENDERER_PIXEL_RATIO = 1.5;
/** false = meilleures perfs ; true = contours plus lisses (PC demo). */
export const RENDERER_ANTIALIAS = false;
