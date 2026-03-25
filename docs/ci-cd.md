# CI/CD - Flipper Hetic

## 1. Objectif
Mettre en place une pipeline CI/CD (automatisée) pour garantir la qualité du dépôt à chaque PR et pour produire un build “déployable” lors des merges sur `main`.

## 2. Périmètre (ce qui est inclus)
Projet multi-app (monorepo) :
- `server/` : backend Node + Socket.io
- `playfield/` : frontend Three.js + physique
- `backglass/` : frontend UI score/vies
- `dmd/` : frontend messages dot-matrix

## 3. Outils
- GitHub Actions (`.github/workflows/*`)
- Node.js version figée (ex: Node 20.x)
- Cache npm pour accélérer les builds

## 4. Déclencheurs
- CI : sur `pull_request` et sur `push` (branches sauf éventuellement main)
- CD : sur merge sur `main`

## 5. Pipeline CI (à implémenter)
Étapes CI, pour chaque app :
1. Checkout du code
2. Mise en place Node (version fixée)
3. Installation des dépendances :
   - `server/`
   - `playfield/`
   - `backglass/`
   - `dmd/`
4. Vérifications :
   - `lint` si disponible
   - `npm run build` si disponible (au moins pour les apps Vite)
5. Génération d’artefacts :
   - déposer les dossiers `dist/` (Vite) pour test/inspection

Critères de succès :
- aucune erreur build
- (optionnel) tests / lint OK

## 6. Pipeline CD (choix selon votre infra)
Option A (recommandée si pas d’hébergement public) :
- à chaque merge `main`, faire la même étape que CI
- puis “déployer” au sens packaging / artefacts :
  - upload dist/artefacts
  - ou publier un zip de build
  - ou lancer une exécution sur un environnement de démo si une VM est disponible

Option B (déploiement réel via SSH, si une VM existe) :
- à chaque merge `main` :
  - build
  - copie des builds sur une machine (scp/rsync)
  - redémarrage du serveur Node
  - vérification que le serveur tourne (health check)

## 7. Commandes attendues (à normaliser dans package.json)
Exemples de scripts à rendre disponibles :
- `server`: `npm run start` / `npm run dev`
- `playfield`, `backglass`, `dmd` : `npm run build`

## 8. Notes spécifiques au projet
- Ce repo est multi-dossiers : les workflows doivent cibler chaque `package.json` séparément.
- Vérifier que `socket.io` côté `server` démarre bien après build.

## 9. Checklist de mise en place
- [ ] Créer `.github/workflows/ci.yml`
- [ ] Créer `.github/workflows/cd.yml` (ou une variante “CD = upload artefacts”)
- [ ] Fixer la version de Node (ex: via action + `.nvmrc` optionnel)
- [ ] S’assurer que les scripts `build` existent partout où nécessaire