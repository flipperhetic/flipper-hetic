# Flipper Hetic

Flipper virtuel multi-écran : **Playfield** (3D), **Backglass**, **DMD**, synchronisés en temps réel via WebSocket.

Documentation (index unique) : [`docs/README.md`](docs/README.md). Alignement sur le sujet officiel **HETIC Web3** (barème, IoT, livrables) : [`docs/hetic/referentiel-sujet-hetic-web3.md`](docs/hetic/referentiel-sujet-hetic-web3.md).

## Arborescence des packages

```
├── server/
│   ├── package.json
│   └── src/
│       └── index.js          # Node.js + WebSocket, état du jeu
│
├── playfield/
│   ├── package.json
│   └── src/
│       ├── main.js           # Composition (réseau, input, callbacks)
│       └── composition/      # buildLevel (plateau) + runGameLoop (animation)
│
├── backglass/
│   ├── package.json
│   └── src/
│       ├── main.js           # Composition
│       └── renderer/         # mount.js + view.js (DOM)
│
└── dmd/
    ├── package.json
    └── src/
        ├── main.js           # Composition
        ├── composition/      # wireDmdNetwork (Socket → vue)
        └── renderer/         # mount, dot-matrix, font
```

## Lancement du projet

L'ordre de lancement est important : commencez par le serveur.

1. **Serveur (Port 3000)** :
   `cd server && npm install && npm run dev`
2. **Playfield (Port 5173)** :
   `cd playfield && npm install && npm run dev`
3. **Backglass (Port 5174)** :
   `cd backglass && npm install && npm run dev`
4. **DMD (Port 5175)** :
   `cd dmd && npm install && npm run dev`

## 🐳 Docker

Lancement de l'ensemble du projet en une seule commande, sans rien installer localement (hors Docker). Chaque app a un `Dockerfile` dans son workspace : `npm ci` ciblé + copie minimale de `shared/`, plutôt que d’imager tout le monorepo.

### Prérequis

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installé et démarré

### Commandes

```bash
# Build et démarrage de tous les services
docker compose up --build

# Démarrage en arrière-plan
docker compose up --build -d

# Arrêt des services
docker compose down

# Logs en temps réel
docker compose logs -f

# Logs d'un service spécifique
docker compose logs -f server
```

Les frontends ne démarrent qu’après le serveur **healthy** (vérification HTTP sur le port 3000, sans dépendre de `wget` sur l’image Alpine).

### Accès aux interfaces

| Interface | URL |
| :--- | :--- |
| Serveur (WebSocket) | http://localhost:3000 |
| Playfield (3D) | http://localhost:5173 |
| Backglass (Score) | http://localhost:5174 |
| DMD (Dot Matrix) | http://localhost:5175 |

### Flux MVP à vérifier

Une fois les 4 services démarrés, ouvrir les 4 URLs dans des onglets séparés.  
Le flux complet `start_game → collision → ball_lost → game_over` doit fonctionner sans régression.

## Tests

```bash
# Tous les workspaces (server + playfield)
npm run test:all

# Un workspace specifique
npm test --workspace=server
npm test --workspace=playfield
```

## Moteur physique (Rapier)

Le moteur physique est **Rapier** (WASM, `@dimforge/rapier3d-compat`), isolé derrière le port `playfield/src/adapters/physics/ports/PhysicsPort.js` et le barrel `playfield/src/adapters/physics/index.js`. Historique et détails : `playfield/src/adapters/physics/rapier/MIGRATION.md`.

## Architecture logicielle

Voir [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) (vision globale du monorepo) et [`docs/hetic/clean-architecture.md`](docs/hetic/clean-architecture.md) (guide d’application des couches sur ce repo). Cartographie composants : [`docs/CARTOGRAPHIE.md`](docs/CARTOGRAPHIE.md).

Contrat Socket : `shared/src/eventNames.js` (source de vérité) et [`docs/EVENTS.md`](docs/EVENTS.md) (référence documentaire). Index de toute la doc : [`docs/README.md`](docs/README.md).