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

**Prérequis** : [Docker Desktop](https://www.docker.com/products/docker-desktop/) (ou moteur Docker + Compose v2) installé et démarré.

Les `Dockerfile` utilisent le contexte **à la racine** du dépôt pour que les workspaces `npm` (dont `shared`) soient correctement installés : `npm ci` à la racine, puis le mode dev du workspace ciblé.

- **Build** : `docker compose build`
- **Démarrage** : `docker compose up` (les frontends `depends_on` le serveur pour l’ordre de lancement, pas un healthcheck)
- **Arrêt** : `docker compose down` (ou `Ctrl+C` puis `down` si besoin)
- **Logs (suivre)** : `docker compose logs -f` ; pour un service : `docker compose logs -f server` (ou `playfield`, `backglass`, `dmd`)

**Ports (hôte)** :

| Service   | Port |
| -------- | ---- |
| server    | 3000 |
| playfield | 5173 |
| backglass | 5174 |
| dmd       | 5175 |

Ouvrez les apps Vite sur `http://localhost:<port>`. L’ordre reste logique côté usage : le **serveur** doit répondre sur le port 3000 avant d’utiliser pleinement le WebSocket depuis les frontends (les vues se chargent quand le serveur est prêt).