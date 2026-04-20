## Conventions équipe

### Organisation GitHub (repo central + forks)
- Un repo central (upstream) sert de référence du projet.
- Chaque membre travaille sur son fork personnel du repo central.
- Les contributions se font via Pull Request (PR) depuis le fork → repo central.
- Le repo central est protégé : interdiction de push direct sur `main`.

### Branches
- Branche par défaut : `main` (stable, toujours déployable).
- Convention de nommage :
  - `feature/<nom>` (ex. : `feature/uc07-collisions`)
  - `fix/<nom>` (ex. : `fix/socket-reconnect`)
  - `docs/<nom>` (ex. : `docs/cdc-usecases`)
- Une branche = une tâche (pas de "méga-branches" multi-sujets).

### Pull Requests (obligatoires)
- Toute modification passe par une PR (même petite).
- 1 review minimum obligatoire avant merge.
- Le merge se fait uniquement si le projet build/lance, pas d’erreurs bloquantes, structure du code cohérente.

### Règles de commit
- Conventional Commits : `feat:`, `fix:`, `docs:`, `refactor:`, `chore:`.
- Messages courts et explicites.

### Gestion des conflits
- Avant d’ouvrir une PR : mettre à jour sa branche avec `main`. Conflits résolus à deux si impact important.

### Convention de dossier (monorepo)
- `server/` : serveur Node.js (Socket/WebSocket)
- `playfield/` : Three.js + physique
- `backglass/` : UI score/vies
- `dmd/` : affichage dot matrix
- `docs/` : CDC + diagrammes + ressources
