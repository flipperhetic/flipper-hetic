# Stack technique

| Couche        | Technologie        | Rôle principal                                   | Justification |
|--------------|-------------------|--------------------------------------------------|---------------|
| Frontend 3D  | Three.js          | Affichage du flipper en 3D dans le navigateur    | Web-native, compatible navigateurs, large documentation |
| Physique     | Rapier (`@dimforge/rapier3d-compat`) | Collisions, gravité, rebonds | Le sujet HETIC cite **Cannon.js / Ammo.js** ; ce dépôt couvre le même objectif (« physique interactive ») avec **Rapier (WASM)**, derrière `adapters/physics/` et `PhysicsPort.js` (section *Alternatives écartées* ci-dessous). |
| Backend      | Node.js           | Gestion de l'état du jeu et synchronisation     | Même langage (JS), adapté au temps réel |
| Communication| WebSocket natif (`ws`) | Synchronisation temps réel multi-écran       | Connexion persistante ; reconnexion auto et multiplexage d'événements fournis par `shared` (`realtimeClient` + `protocol`), broadcast par `GameBroadcaster` |
| Hardware     | ESP32             | Lecture boutons physiques                        | WiFi intégré, simple à programmer |
| Outils       | GitHub + Vite + PlantUML | Versioning, dev rapide, UML               | Collaboration efficace et documentation claire |
| Tests        | Vitest                   | Framework de tests unitaires et d'intégration | Natif ESM, compatible Vite, API proche de Jest |

## Alternatives écartées

- **Cannon-es** (physique, backend initial) : utilisé jusqu'à la migration Rapier. Retiré une fois Rapier validé pour profiter d'un solver plus moderne, des `EventQueue` natifs et du support CCD potentiel. Le port `adapters/physics/ports/PhysicsPort.js` permet de revenir à Cannon-es si besoin.
- **Ammo.js** (physique) : plus lourd (~1,5 MB) ; Rapier retenu pour son API moderne et son ecosystème Rust/WASM.
- **Socket.IO** (communication, transport initial) : utilisé jusqu'à la migration vers **WebSocket natif (`ws`)**. Retiré pour supprimer une dépendance lourde ; la reconnexion automatique et le multiplexage d'événements nommés sont désormais assurés par `shared/src/realtimeClient.js` (façade `on`/`off`/`emit`) et `shared/src/protocol.js` (codec d'enveloppe `{ event, data }`), le broadcast par `server/src/adapters/transport/GameBroadcaster.js`.
