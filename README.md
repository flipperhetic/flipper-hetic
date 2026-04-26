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