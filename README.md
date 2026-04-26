# Flipper Hetic

Flipper virtuel multi-écran : **Playfield** (3D), **Backglass**, **DMD**, synchronisés en temps réel via WebSocket.

## Architecture

```
├── server/
│   ├── package.json
│   └── src/
│       └── index.js          # Node.js + WebSocket, état du jeu
│
├── playfield/
│   ├── package.json
│   └── src/
│       └── main.js           # Three.js + Cannon-es (écran 3D)
│
├── backglass/
│   ├── package.json
│   └── src/
│       └── main.js           # Écran arrière (score, infos)
│
└── dmd/
    ├── package.json
    └── src/
        └── main.js           # Affichage type dot-matrix
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

## Docker

Lancement de l’ensemble du projet sans installer Node globalement sur la machine (hors moteur Docker). Chaque service a un `Dockerfile` à la racine du workspace (`server/`, `playfield/`, etc.) : `npm ci` ciblé sur ce workspace + copie minimale de `shared/`, pour des images plus légères que la copie complète du dépôt.

### Prérequis

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (ou moteur Docker + Compose v2) installé et démarré

### Commandes

```bash
# Build des images
docker compose build

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

Les frontends ne passent `healthy` qu’une fois le serveur prêt (healthcheck HTTP sur le port 3000).

### Accès aux interfaces

| Interface | URL |
| :--- | :--- |
| Serveur (WebSocket) | http://localhost:3000 |
| Playfield (3D) | http://localhost:5173 |
| Backglass (Score) | http://localhost:5174 |
| DMD (Dot Matrix) | http://localhost:5175 |

### Flux MVP à vérifier

Une fois les 4 services démarrés, ouvrir les URLs des trois Vite + vérifier la connexion au serveur. Le flux complet `start_game → collision → ball_lost → game_over` doit fonctionner sans régression en conteneurs (même comportement qu’en local hors Docker).
