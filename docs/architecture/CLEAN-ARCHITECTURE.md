# Plan de refactorisation vers la Clean Architecture

## Architecture actuelle

```
flipper-hetic/
├── server/
│   ├── package.json
│   └── src/
│       ├── config.js
│       ├── events.js          # God file : constantes + état + logique + handlers Socket.IO
│       ├── index.js
│       └── __tests__/
│           ├── events.test.js
│           └── game-flow.test.js
│
├── playfield/
│   ├── package.json
│   └── src/
│       ├── main.js            # Point d'entrée monolithique (~250 lignes)
│       ├── ball.js            # Mesh Three.js + Body Cannon-es couplés
│       ├── bumpers.js         # Idem
│       ├── flippers.js        # Idem
│       ├── slingshots.js      # Idem
│       ├── collisions.js      # Physique couplée au réseau (import network.js)
│       ├── constants.js       # OK — données pures
│       ├── input.js           # OK — bonne abstraction
│       ├── network.js         # Transport + état local mélangés
│       ├── physics.js         # OK — setup Cannon-es isolé
│       └── __tests__/
│           ├── ball.test.js
│           └── collisions.test.js
│
├── backglass/
│   └── src/
│       └── main.js            # Socket.IO + rendu DOM dans le même fichier
│
├── dmd/
│   └── src/
│       └── main.js            # Socket.IO + police bitmap + rendu canvas dans le même fichier
│
├── docs/                      # Plat, tout mélangé (specs, guides, notes d'étape)
├── package.json               # Pas de workspaces, juste concurrently
└── .gitignore                 # S'ignore lui-même (ligne inutile)
```

### Problemes identifies

| # | Probleme | Fichier(s) concerne(s) | Principe viole |
|---|----------|------------------------|----------------|
| 1 | Pas de couche domaine — l'etat du jeu est un objet literal mutable sans methodes metier | `server/src/events.js` | Entities |
| 2 | Logique metier (scoring, game over, ball tracking) directement dans les handlers Socket.IO | `server/src/events.js` | Separation Use Cases / Adapters |
| 3 | `events.js` concentre 4 responsabilites (constantes, etat, logique, transport) | `server/src/events.js` | Single Responsibility |
| 4 | `collisions.js` importe directement `network.js` — la physique connait le reseau | `playfield/src/collisions.js` | Dependency Rule |
| 5 | Chaque objet de jeu (ball, flipper, bumper) cree mesh + body dans la meme fonction | `playfield/src/ball.js`, `flippers.js`, `bumpers.js` | Separation Frameworks |
| 6 | `main.js` du playfield orchestre scene, physique, camera, murs, reseau, input et boucle de rendu | `playfield/src/main.js` | Single Responsibility |
| 7 | Event names dupliques entre server et playfield (copier-coller) | `server/src/events.js` + `playfield/src/network.js` | DRY / Source unique |
| 8 | Backglass et DMD connectent Socket.IO et rendent l'UI dans le meme fichier | `backglass/src/main.js`, `dmd/src/main.js` | Separation Adapters / Renderers |
| 9 | Pas de scripts `test:all` ni `build:all` a la racine | `package.json` racine | Maintenabilite |
| 10 | `docs/` melange specs, guides, notes d'etape a plat | `docs/` | Organisation |

---

## Architecture cible

```
flipper-hetic/
│
├── .github/
│   ├── CODEOWNERS
│   └── workflows/
│       ├── ci.yml
│       └── cd.yml
│
├── docs/
│   ├── architecture/                    # Decisions d'archi, schemas, ce fichier
│   ├── specs/                           # Contrat evenements, cahier des charges
│   │   └── EVENTS.md
│   └── guides/                          # Guides contributeur
│       ├── TESTING.md
│       ├── MANUAL-TESTS.md
│       └── KNOWN-ISSUES.md
│
├── shared/                              # Contrat partage entre packages
│   ├── package.json
│   └── src/
│       └── eventNames.js                # Source unique CLIENT_EVENTS / SERVER_EVENTS
│
├── server/
│   ├── package.json
│   └── src/
│       ├── domain/
│       │   ├── GameState.js             # Entite pure : etat + methodes metier
│       │   └── scoring.js               # Regles de scoring par type de collision
│       ├── usecases/
│       │   ├── startGame.js             # (state) -> nouvel etat + events a emettre
│       │   ├── loseBall.js              # (state) -> etat mis a jour, detecte game over
│       │   └── applyCollision.js        # (state, type) -> etat avec score mis a jour
│       ├── adapters/
│       │   └── socketHandlers.js        # Handlers Socket.IO -> appellent les use cases
│       ├── __tests__/
│       │   ├── domain/
│       │   │   ├── GameState.test.js
│       │   │   └── scoring.test.js
│       │   ├── usecases/
│       │   │   ├── startGame.test.js
│       │   │   ├── loseBall.test.js
│       │   │   └── applyCollision.test.js
│       │   └── adapters/
│       │       └── socketHandlers.test.js
│       ├── config.js
│       └── index.js                     # Composition root
│
├── playfield/
│   ├── package.json
│   └── src/
│       ├── domain/
│       │   └── constants.js             # Dimensions, tuning, seuils (donnees pures)
│       ├── adapters/
│       │   ├── physics/
│       │   │   ├── world.js             # Monde Cannon-es, gravite, materiaux
│       │   │   ├── ballBody.js          # Body bille + launch/reset/clamp
│       │   │   ├── flipperBody.js       # Bodies flippers + contraintes angulaires
│       │   │   ├── bumperBody.js        # Bodies bumpers (cylindres statiques)
│       │   │   └── slingshotBody.js     # Bodies slingshots
│       │   ├── renderer/
│       │   │   ├── scene.js             # Scene Three.js, camera, lumieres, resize
│       │   │   ├── ballMesh.js          # Mesh sphere metallique
│       │   │   ├── flipperMesh.js       # Meshes flippers
│       │   │   ├── bumperMesh.js        # Meshes bumpers
│       │   │   ├── slingshotMesh.js     # Meshes slingshots
│       │   │   └── tableMesh.js         # Plateau + murs
│       │   ├── network.js               # Socket.IO client : emit/listen, etat local
│       │   └── input.js                 # Abstraction clavier / IoT (inchange)
│       ├── usecases/
│       │   ├── gameLoop.js              # Boucle : step physique -> sync -> drain check
│       │   ├── launchBall.js            # Logique lancement (anti double-launch)
│       │   └── collisionHandler.js      # Reaction collision -> retourne {type}, pas de reseau
│       ├── __tests__/
│       │   ├── domain/
│       │   │   └── constants.test.js
│       │   ├── usecases/
│       │   │   ├── launchBall.test.js
│       │   │   └── collisionHandler.test.js
│       │   └── adapters/
│       │       ├── input.test.js
│       │       └── network.test.js
│       └── main.js                      # Composition root
│
├── backglass/
│   ├── package.json
│   └── src/
│       ├── adapters/
│       │   └── network.js               # Socket.IO client
│       ├── renderer/
│       │   └── dom.js                   # Mise a jour du DOM
│       ├── __tests__/
│       │   └── renderer/
│       │       └── dom.test.js
│       └── main.js                      # Composition root
│
├── dmd/
│   ├── package.json
│   └── src/
│       ├── adapters/
│       │   └── network.js               # Socket.IO client
│       ├── renderer/
│       │   ├── font.js                  # Police bitmap FONT_5X7
│       │   └── dotMatrix.js             # Rasterisation canvas dot-matrix
│       ├── __tests__/
│       │   └── renderer/
│       │       ├── font.test.js
│       │       └── dotMatrix.test.js
│       └── main.js                      # Composition root
│
├── package.json                         # npm workspaces + scripts globaux
├── .gitignore
├── CLAUDE.md
└── README.md
```

### Sens des dependances

```
main.js (composition root / wiring)
   |
   v
adapters/  -------->  usecases/  -------->  domain/
(Socket.IO,            (logique app,         (GameState,
 Three.js,              gameLoop,             constants,
 Cannon-es,             launchBall)           scoring)
 clavier)                                       |
                                                v
                                          ZERO import
                                          de framework
```

Chaque couche ne depend que de la couche a sa droite. Jamais l'inverse.

---

## Changements a appliquer

### Changement 1 — Creer le package `shared/`

**But** : eliminer la duplication des noms d'evenements entre server et playfield.

**Fichier a creer** : `shared/src/eventNames.js`

```js
export const CLIENT_EVENTS = {
  START_GAME: "start_game",
  LAUNCH_BALL: "launch_ball",
  FLIPPER_LEFT_DOWN: "flipper_left_down",
  FLIPPER_LEFT_UP: "flipper_left_up",
  FLIPPER_RIGHT_DOWN: "flipper_right_down",
  FLIPPER_RIGHT_UP: "flipper_right_up",
  BALL_LOST: "ball_lost",
  COLLISION: "collision",
};

export const SERVER_EVENTS = {
  STATE_UPDATED: "state_updated",
  GAME_STARTED: "game_started",
  GAME_OVER: "game_over",
  DMD_MESSAGE: "dmd_message",
};
```

**Fichier a creer** : `shared/package.json`

```json
{
  "name": "shared",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "exports": {
    ".": "./src/eventNames.js"
  }
}
```

**Fichiers a modifier** :
- `server/src/events.js` : supprimer les constantes CLIENT_EVENTS et SERVER_EVENTS, importer depuis `shared`
- `playfield/src/network.js` : supprimer les constantes locales, importer depuis `shared`

---

### Changement 2 — Activer npm workspaces

**Fichier a modifier** : `package.json` (racine)

```json
{
  "name": "flipper-hetic",
  "version": "0.0.1",
  "private": true,
  "workspaces": ["shared", "server", "playfield", "backglass", "dmd"],
  "scripts": {
    "dev:all": "concurrently \"npm run dev -w server\" \"npm run dev -w playfield\" \"npm run dev -w backglass\" \"npm run dev -w dmd\"",
    "test:all": "npm test --workspaces --if-present",
    "build:all": "npm run build --workspaces --if-present"
  },
  "devDependencies": {
    "concurrently": "^8.2.2"
  }
}
```

Un seul `npm install` a la racine installe tout. Un seul `npm run test:all` lance tous les tests.

---

### Changement 3 — Extraire la couche domaine du server

**But** : `events.js` fait tout. Extraire l'entite pure et les regles metier.

**Fichier a creer** : `server/src/domain/GameState.js`

```js
// Aucun import de framework — c'est le coeur metier.

const INITIAL = {
  status: "idle",
  score: 0,
  ballsLeft: 3,
  currentBall: 1,
  lastEvent: null,
};

export class GameState {
  constructor() {
    Object.assign(this, structuredClone(INITIAL));
  }

  get isPlaying() {
    return this.status === "playing";
  }

  get isGameOver() {
    return this.ballsLeft === 0;
  }

  start() {
    Object.assign(this, structuredClone(INITIAL));
    this.status = "playing";
    this.lastEvent = "start_game";
  }

  applyCollision(type) {
    if (!this.isPlaying) return false;
    const points = POINTS_BY_TYPE[type];
    if (points === undefined) return false;
    this.score += points;
    this.lastEvent = `collision:${type}`;
    return true;
  }

  loseBall() {
    if (!this.isPlaying) return null;
    if (this.lastEvent === "ball_lost") return null;

    this.ballsLeft -= 1;
    this.currentBall += 1;
    this.lastEvent = "ball_lost";

    if (this.isGameOver) {
      this.status = "game_over";
      return "game_over";
    }
    return "ball_lost";
  }

  toJSON() {
    return {
      status: this.status,
      score: this.score,
      ballsLeft: this.ballsLeft,
      currentBall: this.currentBall,
      lastEvent: this.lastEvent,
    };
  }
}

const POINTS_BY_TYPE = {
  bumper: 100,
  wall: 0,
  flipper: 0,
  drain: 0,
};
```

**Fichier a creer** : `server/src/domain/scoring.js`

```js
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
```

---

### Changement 4 — Extraire les use cases du server

**But** : chaque operation du jeu devient une fonction pure qui prend un etat et retourne un resultat.

**Fichier a creer** : `server/src/usecases/startGame.js`

```js
export function startGame(state) {
  if (state.isPlaying) return { changed: false };
  state.start();
  return {
    changed: true,
    dmdMessage: `BALL ${state.currentBall}`,
  };
}
```

**Fichier a creer** : `server/src/usecases/loseBall.js`

```js
export function loseBall(state) {
  const result = state.loseBall();
  if (!result) return { changed: false };

  if (result === "game_over") {
    return { changed: true, gameOver: true, dmdMessage: "GAME OVER" };
  }
  return { changed: true, gameOver: false, dmdMessage: `BALL ${state.currentBall}` };
}
```

**Fichier a creer** : `server/src/usecases/applyCollision.js`

```js
export function applyCollision(state, type) {
  const changed = state.applyCollision(type);
  return { changed };
}
```

---

### Changement 5 — Reduire `events.js` a un adaptateur Socket.IO

**But** : `events.js` ne fait plus que du transport. Il appelle les use cases et emet les resultats.

**Fichier a renommer** : `server/src/events.js` -> `server/src/adapters/socketHandlers.js`

```js
import { CLIENT_EVENTS, SERVER_EVENTS } from "shared";
import { GameState } from "../domain/GameState.js";
import { startGame } from "../usecases/startGame.js";
import { loseBall } from "../usecases/loseBall.js";
import { applyCollision } from "../usecases/applyCollision.js";

let state = new GameState();
let lastDmdMessage = null;

export function resetState() {
  state = new GameState();
  lastDmdMessage = null;
}

function emitState(io) {
  io.emit(SERVER_EVENTS.STATE_UPDATED, state.toJSON());
}

function emitDmd(io, text) {
  lastDmdMessage = text;
  io.emit(SERVER_EVENTS.DMD_MESSAGE, { text });
}

export function registerSocketHandlers(io) {
  io.on("connection", (socket) => {
    socket.emit(SERVER_EVENTS.STATE_UPDATED, state.toJSON());
    if (lastDmdMessage) socket.emit(SERVER_EVENTS.DMD_MESSAGE, { text: lastDmdMessage });

    socket.on(CLIENT_EVENTS.START_GAME, () => {
      const result = startGame(state);
      if (!result.changed) return;
      io.emit(SERVER_EVENTS.GAME_STARTED, state.toJSON());
      emitState(io);
      emitDmd(io, result.dmdMessage);
    });

    socket.on(CLIENT_EVENTS.COLLISION, (payload) => {
      const type = payload?.type;
      const result = applyCollision(state, type);
      if (result.changed) emitState(io);
    });

    socket.on(CLIENT_EVENTS.BALL_LOST, () => {
      const result = loseBall(state);
      if (!result.changed) return;
      emitState(io);
      emitDmd(io, result.dmdMessage);
      if (result.gameOver) io.emit(SERVER_EVENTS.GAME_OVER, state.toJSON());
    });

    // Flippers : relay pur, pas de logique metier.
    const flipperEvents = [
      CLIENT_EVENTS.FLIPPER_LEFT_DOWN, CLIENT_EVENTS.FLIPPER_LEFT_UP,
      CLIENT_EVENTS.FLIPPER_RIGHT_DOWN, CLIENT_EVENTS.FLIPPER_RIGHT_UP,
    ];
    for (const ev of flipperEvents) {
      socket.on(ev, (payload) => {
        state.lastEvent = ev;
        socket.broadcast.emit(ev, payload ?? {});
      });
    }

    socket.on(CLIENT_EVENTS.LAUNCH_BALL, () => {
      if (!state.isPlaying) return;
      state.lastEvent = CLIENT_EVENTS.LAUNCH_BALL;
      emitState(io);
    });
  });
}
```

---

### Changement 6 — Separer physics et renderer dans le playfield

**But** : `ball.js` cree aujourd'hui le mesh Three.js ET le body Cannon-es. Separer en deux fichiers.

**Decoupage pour chaque objet de jeu** :

| Fichier actuel | Devient | Responsabilite |
|---|---|---|
| `ball.js` | `adapters/physics/ballBody.js` | Body Cannon-es, launch, reset, clamp |
| `ball.js` | `adapters/renderer/ballMesh.js` | Mesh Three.js (sphere metallique) |
| `flippers.js` | `adapters/physics/flipperBody.js` | Bodies + contraintes angulaires |
| `flippers.js` | `adapters/renderer/flipperMesh.js` | Meshes flippers |
| `bumpers.js` | `adapters/physics/bumperBody.js` | Bodies cylindres statiques |
| `bumpers.js` | `adapters/renderer/bumperMesh.js` | Meshes bumpers |
| `slingshots.js` | `adapters/physics/slingshotBody.js` | Bodies slingshots |
| `slingshots.js` | `adapters/renderer/slingshotMesh.js` | Meshes slingshots |

`main.js` connecte les deux via le pattern `syncPairs` existant :

```js
const ballBody = createBallBody(world);
const ballMesh = createBallMesh(scene);
syncPairs.push({ mesh: ballMesh, body: ballBody });
```

---

### Changement 7 — Decoupler `collisions.js` du reseau

**But** : `collisions.js` importe `emitBallLost` et `emitCollision` depuis `network.js`. La physique ne doit pas connaitre le reseau.

**Avant** (couplage direct) :

```js
// collisions.js
import { emitBallLost, emitCollision } from "./network.js";
// ...
emitCollision(socket, type);
```

**Apres** (inversion de dependance via callbacks) :

```js
// usecases/collisionHandler.js — ne connait pas le reseau
export function createCollisionHandler({ onCollision, onBallLost }) {
  return {
    handleCollision(type) {
      if (canEmit(type)) onCollision(type);
    },
    checkDrain(ballPosition, gameStatus) {
      if (gameStatus === "playing" && ballPosition.z > DRAIN_Z_THRESHOLD) {
        onBallLost();
        return true;
      }
      return false;
    },
  };
}
```

C'est `main.js` qui branche les callbacks sur le reseau :

```js
const collisionHandler = createCollisionHandler({
  onCollision: (type) => emitCollision(socket, type),
  onBallLost: () => emitBallLost(socket),
});
```

---

### Changement 8 — Separer transport et rendu dans backglass et DMD

**Backglass** — separer en deux fichiers :

- `adapters/network.js` : connexion Socket.IO, ecoute `state_updated`, appelle un callback
- `renderer/dom.js` : fonction `renderState({ score, ballsLeft, status })` pure DOM

**DMD** — separer en trois fichiers :

- `adapters/network.js` : connexion Socket.IO, ecoute `dmd_message` + `state_updated`
- `renderer/font.js` : police bitmap `FONT_5X7` + fonction `drawBitmapText()`
- `renderer/dotMatrix.js` : rasterisation canvas, `renderDotMatrix(message, score)`

---

### Changement 9 — Reorganiser `docs/`

| Contenu | Destination |
|---|---|
| Schemas, decisions d'archi, ce fichier | `docs/architecture/` |
| Contrat evenements (`EVENTS.md`), cahier des charges | `docs/specs/` |
| Guides testing, QA, problemes connus | `docs/guides/` |
| Notes d'etape ponctuelles (`etape10-*.md`, `actual-issue.md`) | Supprimer ou archiver — ce sont des notes de travail, pas de la doc |

---

### Changement 10 — Nettoyer `.gitignore`

Supprimer la ligne `/.gitignore` (un fichier tracke ne devrait pas s'ignorer lui-meme).

---

## Ordre d'execution recommande

Les changements sont classes par impact et difficulte croissante. Les premiers peuvent etre faits independamment.

| Priorite | Changement | Risque | Effort |
|---|---|---|---|
| 1 | Changement 10 — Nettoyer `.gitignore` | Aucun | 1 min |
| 2 | Changement 9 — Reorganiser `docs/` | Aucun | 10 min |
| 3 | Changement 1 + 2 — `shared/` + npm workspaces | Faible (chemins d'import) | 30 min |
| 4 | Changement 3 — Extraire `GameState` (domaine server) | Moyen (tests a adapter) | 1h |
| 5 | Changement 4 + 5 — Use cases + adaptateur server | Moyen (refacto `events.js`) | 1h |
| 6 | Changement 7 — Decoupler collisions du reseau | Moyen | 45 min |
| 7 | Changement 8 — Separer backglass et DMD | Faible | 30 min |
| 8 | Changement 6 — Separer physics/renderer playfield | Eleve (beaucoup de fichiers) | 2h |

Les changements 1 a 5 (server) peuvent etre faits dans une PR. Les changements 6 a 8 (clients) dans une seconde.

---

## Tests : ce que la Clean Architecture change

| Couche | Ce qu'on teste | Mocks necessaires |
|---|---|---|
| `domain/` | Regles metier pures (scoring, transitions d'etat) | Aucun |
| `usecases/` | Orchestration (startGame, loseBall) | Etat injecte |
| `adapters/` | Integration framework (Socket.IO, Three.js, Cannon-es) | Framework mocke |

Le gain principal : les tests `domain/` et `usecases/` sont instantanes, sans mock, et ne cassent jamais quand on change de framework.
