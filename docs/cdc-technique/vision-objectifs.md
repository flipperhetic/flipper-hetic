# Vision, objectifs et périmètre

## Vision

Flipper est un flipper virtuel qui combine simulation physique (Three.js / Cannon.js) et contrôle clavier ou ESP32, jouable sur 3 écrans synchronisés en temps réel, pour une expérience arcade moderne.

## Objectifs

1. Simulation physique réaliste : table 3D interactive (Three.js, Cannon.js) avec collisions, flippers et gravité cohérentes.
2. Synchronisation temps réel (< 50 ms) de 3 applis (playfield, backglass, DMD) via Socket.io.
3. Commande de la bille au clavier et via contrôleurs physiques (ESP32 / Arduino) pour piloter les solénoïdes en soutenance.
4. Expérience immersive : retours visuels dynamiques sur DMD et backglass à chaque score.

## Non-objectifs

1. Mode multijoueur en ligne.
2. Modification de la disposition de la table par l’utilisateur (murs, jumpers…).
3. Utilisation sur interface mobile.

## Personas

- **Léa, 22 ans** — Étudiante dev web à HETIC. Veut un projet qui combine front 3D (Three.js) et logique serveur (WebSockets). Objectif : architecture propre et scalable.
- **Marc, 45 ans** — Nostalgique de l’arcade, organisateur d’événements. Cherche les sensations du flipper physique (réactivité, bruit, Tilt). Objectif : tester une version moderne connectée en salon.
