# CI/CD — Flipper Hetic

Deux pipelines GitHub Actions dans `.github/workflows/`.

## CI — `ci.yml`

**Déclencheur :** `pull_request` vers `main`.

Pour chaque package en parallèle (`server`, `playfield`, `backglass`, `dmd`) :
1. Checkout + Node.js 20 + cache npm
2. `npm ci` à la racine du monorepo
3. Commande spécifique au package :

| Package | Commande | Contenu |
|---------|----------|---------|
| `server` | `npm test` | 23 tests Vitest |
| `playfield` | `npm run build && npm test` | Build Vite + 54 tests |
| `backglass` | `npm run build && npm test` | Build Vite + 11 tests |
| `dmd` | `npm run build && npm test` | Build Vite + 9 tests |

Critère de succès : build sans erreur + 97 tests verts.

## CD — `cd.yml`

**Déclencheur :** `push` sur `main`.

**Job 1 — Validation :** syntaxe serveur (`node --check`) + builds Vite des trois frontends.

**Job 2 — Artefacts :** upload des dossiers `dist/` de `playfield`, `backglass`, `dmd` dans GitHub Actions (onglet Artifacts, disponibles 90 jours).
