# Flipper Hetic Breaking Bad

Flipper virtuel multi-écran : **Playfield** (3D), **Backglass**, **DMD**, synchronisés en temps réel via WebSocket.

## Demo

[Vidéo de démonstration](https://drive.google.com/file/d/13VkodJtVlOaUTLCyD5YJKLMhbRPIjARD/view?usp=sharing)

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
│       └── composition/      # Level (plateau) + GameLoop (boucle)
│
├── backglass/
│   ├── package.json
│   └── src/
│       ├── main.js           # Composition
│       ├── view/             # DOM views
│       ├── net/              # WebSocket connection
│       └── presentation/     # Score presenters
│
└── dmd/
    ├── package.json
    └── src/
        ├── main.js           # Composition
        ├── composition/      # wireDmdNetwork (WebSocket → vue)
        ├── net/              # WebSocket connection
        ├── presentation/     # Text presenters
        └── view/             # mount, dot-matrix, font
```

## Lancement du projet

```bash
npm install
npm run dev:all
```

| Interface | URL |
| :--- | :--- |
| Serveur (WebSocket) | http://localhost:3000 |
| Playfield (3D) | http://localhost:5173 |
| Backglass (Score) | http://localhost:5174 |
| DMD (Dot Matrix) | http://localhost:5175 |

## Docker

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
# Tous les workspaces (server, playfield, backglass, dmd)
npm run test:all

# Un workspace spécifique
npm test --workspace=server
npm test --workspace=playfield
npm test --workspace=backglass
npm test --workspace=dmd
```

## Moteur physique (Rapier)

Le moteur physique est **Rapier** (WASM, `@dimforge/rapier3d-compat`), isolé derrière le port `playfield/src/adapters/physics/ports/PhysicsPort.js` et le barrel `playfield/src/adapters/physics/index.js`.

## Architecture logicielle

Voir [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) (vision globale du monorepo) et [`docs/hetic/clean-architecture.md`](docs/hetic/clean-architecture.md) (guide d’application des couches sur ce repo).

Contrat Socket : `shared/src/eventNames.js` (source de vérité) et [`docs/EVENTS.md`](docs/EVENTS.md) (référence documentaire).