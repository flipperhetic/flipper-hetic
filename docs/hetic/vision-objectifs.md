# Vision, objectifs et périmètre

## Vision

Flipper Hetic Breaking Bad est un flipper virtuel qui combine simulation physique (Three.js / Rapier) et contrôle clavier ou ESP32, jouable sur 3 écrans synchronisés en temps réel, pour une expérience arcade moderne.

## Objectifs

1. Simulation physique réaliste : table 3D interactive (Three.js, Rapier) avec collisions, flippers et gravité cohérentes.
2. Synchronisation temps réel (< 50 ms) de 3 applis (playfield, backglass, DMD) via WebSocket.
3. Commande au clavier conforme à l’**annexe IoT** du sujet (`X` / `C` / `D` / `F`) et via ESP32 / Arduino en soutenance.
4. Expérience immersive : retours visuels dynamiques sur DMD et backglass à chaque score.

## Non-objectifs

1. Mode multijoueur en ligne.
2. Modification de la disposition de la table par l’utilisateur (murs, bumpers…).
3. Utilisation sur interface mobile.
4. Tilt : détection des secousses de la machine et pénalité associée (gravityTiltDeg désigne uniquement l’inclinaison fixe du plateau).

## Personas

- **Léa, 22 ans** — Étudiante dev web à HETIC. Veut un projet qui combine front 3D (Three.js) et logique serveur (WebSockets). Objectif : architecture propre et scalable.
- **Marc, 45 ans** — Nostalgique de l’arcade, organisateur d’événements. Cherche les sensations du flipper physique (réactivité, sons, retours physiques). Objectif : tester une version moderne connectée en salon.
