# Stack technique

| Couche        | Technologie        | Rôle principal                                   | Justification |
|--------------|-------------------|--------------------------------------------------|---------------|
| Frontend 3D  | Three.js          | Affichage du flipper en 3D dans le navigateur    | Web-native, compatible navigateurs, large documentation |
| Physique     | Cannon-es         | Gestion des collisions, gravité, rebonds         | Compatible Three.js, simple |
| Backend      | Node.js           | Gestion de l'état du jeu et synchronisation     | Même langage (JS), adapté au temps réel |
| Communication| WebSocket (Socket.io) | Synchronisation temps réel multi-écran       | Connexion persistante, reconnexion auto, broadcast natif |
| Hardware     | ESP32             | Lecture boutons physiques                        | WiFi intégré, simple à programmer |
| Outils       | GitHub + Vite + PlantUML | Versioning, dev rapide, UML               | Collaboration efficace et documentation claire |

## Alternatives écartées

- **Ammo.js** (physique) : plus lourd (~1,5 MB) ; Cannon.js / Cannon-es retenu pour un bundle plus léger (~200 KB) et une intégration Three.js simple.
- **WebSocket natif (ws)** : Socket.io retenu pour la reconnexion automatique et le broadcast côté serveur sans logique supplémentaire.
