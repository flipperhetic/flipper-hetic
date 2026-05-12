# Migration Cannon-es -> Rapier

Statut : **migration finalisée — Rapier est le backend par défaut, Cannon-es retiré.**

## Ce qui est fait

- Port `physics/ports/PhysicsPort.js` documente le contrat partagé.
- Barrel `physics/index.js` exporte directement le backend Rapier (`PHYSICS_ENGINE = "rapier"`).
- Adapter Rapier complet (primitives MVP) :
  - `init.js` : init WASM async (`await initRapier()` exposé via le barrel).
  - `world.js` : world incliné (TILT_DEG = 16°, GRAVITY = 9.82), `createStaticBoxBody`, `syncMeshesWithBodies`. Wrapper `world.step()` Cannon-like qui draine l'`EventQueue`.
  - `ballBody.js` : sphère bille, `reset/launch/clamp`, anti-double-launch.
  - `flipperBody.js` : flippers `KinematicVelocityBased`, clamp d'angle post-step.
  - `bumperBody.js` : cylindres + restitution 0.8 + impulsion radiale via le listener.
  - `slingshotBody.js` : délégation à `createStaticBoxBody`.
  - `collisionListener.js` : drain `EventQueue` après chaque step, applique impulsion bumper.
  - `bodyHandle.js` : wrapper Cannon-like (Proxy `.position`, `.velocity`, etc.) pour rester compatible avec `main.js`.
- `playfield/src/main.js` : import `initRapier` + top-level `await initRapier()` avant la composition root.
- `playfield/vite.config.js` : `build.target = 'esnext'` + `optimizeDeps.esbuildOptions.target = 'esnext'` (pour le top-level await).
- `playfield/package.json` : `cannon-es` retiré, `@dimforge/rapier3d-compat` ajouté.
- Fichiers Cannon-es supprimés (`physics/world.js`, `ballBody.js`, `bumperBody.js`, `slingshotBody.js`, `flipperBody.js`, `collisionListener.js`, `cannon/index.js`).
- Tests `playfield/src/__tests__/ball.test.js` ré-écrits pour mocker `init.js` Rapier au lieu de `cannon-es`.
- Build de production validé (`npm run build -w playfield`) — Rapier WASM bundlé en ~2.2 MB (~830 KB gzip).

## Validation à faire en conditions réelles

1. Lancer `npm run dev:all` et vérifier le scénario MVP complet :
   - `D`, `F` ou `Enter` → `start_game` reçu serveur, DMD affiche "BALL 1".
   - Espace → bille lancée vers Z- (haut du plateau).
   - `X` / `C` (ou flèches) → flippers répondent, rebond crédible sur la bille.
   - Bumpers → +100 score, impulsion radiale visible.
   - Bille au drain → `ball_lost`, BALL 2/3, GAME OVER après 3 pertes.
2. Comparer le ressenti gameplay avec la version Cannon-es (cf. git tag pré-migration). Tuner si nécessaire dans `world.js` (gravity), `ballBody.js` (impulse, friction, restitution), `bumperBody.js` (restitution, repulse force), `flipperBody.js` (FLIPPER_SPEED).

## Rollback (si bloqué)

1. `git checkout <commit pré-migration> -- playfield/`
2. `npm install -w playfield cannon-es`
3. Dans `physics/index.js`, swap `from "./rapier/index.js"` → `from "./cannon/index.js"`.
4. Retirer `await initRapier()` et l'import dans `main.js`.

## Points d'attention

- **Async init** : `await initRapier()` est un top-level await. Vite supporte le top-level await dès lors que `build.target` inclut `es2022`+ ou `esnext` (configuré).
- **Body handle** : `bodyHandle.js` n'expose plus que ce que les consommateurs externes utilisent (`rb`, `world`, `userData`, `colliders`, `position` lecture, `applyImpulse`). Les Proxy Cannon-compat (force/torque/wakeUp/...) ont été retirés post-migration.
- **Bus collision** : `world.step()` draine l'`EventQueue` et notifie les listeners enregistrés via `world.addCollisionListener(cb)`. Pas de monkey-patch en cascade — `collisionListener.js` se contente de s'abonner.
- **MATERIALS** : seul point de vérité pour friction/restitution par type de body. Chaque body factory lit `MATERIALS.<name>.friction/restitution` (plus de magic numbers dupliqués).
- **Substeps** : Rapier ne supporte pas le `maxSubSteps` Cannon. La constante `MAX_SUB_STEPS` est conservée pour le port mais ignorée par le wrapper `world.step()`.
- **ContactMaterial** : Rapier combine friction/restitution via `combineRule` (Average par défaut).
- **Tunneling** : si une bille très rapide traverse un mur, activer le CCD via `RigidBodyDesc.setCcdEnabled(true)` sur la bille.
