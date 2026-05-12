# Stack technique

| Couche        | Technologie        | Rôle principal                                   | Justification |
|--------------|-------------------|--------------------------------------------------|---------------|
| Frontend 3D  | Three.js          | Affichage du flipper en 3D dans le navigateur    | Web-native, compatible navigateurs, large documentation |
| Physique     | Rapier (`@dimforge/rapier3d-compat`) | Collisions, gravité, rebonds | Le sujet HETIC cite **Cannon.js / Ammo.js** ; ce dépôt couvre le même objectif (« physique interactive ») avec **Rapier (WASM)**, derrière `adapters/physics/` et `PhysicsPort.js` (section *Alternatives écartées* ci-dessous). |
| Backend      | Node.js           | Gestion de l'état du jeu et synchronisation     | Même langage (JS), adapté au temps réel |
| Communication| WebSocket (Socket.io) | Synchronisation temps réel multi-écran       | Connexion persistante, reconnexion auto, broadcast natif |
| Hardware     | ESP32             | Lecture boutons physiques                        | WiFi intégré, simple à programmer |
| Outils       | GitHub + Vite + PlantUML | Versioning, dev rapide, UML               | Collaboration efficace et documentation claire |

## Alternatives écartées

- **Cannon-es** (physique, backend initial) : utilisé jusqu'à la migration Rapier. Retiré une fois Rapier validé pour profiter d'un solver plus moderne, des `EventQueue` natifs et du support CCD potentiel. Le port `adapters/physics/ports/PhysicsPort.js` permet de revenir à Cannon-es si besoin.
- **Ammo.js** (physique) : plus lourd (~1,5 MB) ; Rapier retenu pour son API moderne et son ecosystème Rust/WASM.
- **WebSocket natif (ws)** : Socket.io retenu pour la reconnexion automatique et le broadcast côté serveur sans logique supplémentaire.
