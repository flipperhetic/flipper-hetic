# Clean Architecture — Guide projet Flipper

Ce guide explique **comment appliquer une Clean Architecture pragmatique** sur ce projet, sans bloquer la livraison MVP.

Objectif :
- garder le code lisible et testable,
- éviter les régressions,
- permettre à l'équipe de contribuer sans casser le flux global.

## 1) Règle clé

La logique métier ne doit pas dépendre des détails techniques.

En pratique :
- le métier (score, statut, ball lost, game over...) ne dépend pas de Three.js, Rapier, WebSocket, DOM, clavier,
- les détails techniques appellent le métier, pas l'inverse.

## 2) Couches cibles (version adaptée au projet)

### Domaine (cœur)
Contient les règles de jeu pures :
- transitions d'état (`idle -> playing -> game_over`),
- calcul score,
- gestion des billes restantes,
- décisions métier (ignorer un event invalide, etc.).

Contraintes :
- pas d'import Three.js / Rapier / Socket,
- fonctions pures ou services métier facilement testables.

### Application (use-cases)
Orchestre les actions métier :
- start game,
- launch ball,
- collision,
- ball lost,
- restart.

Dépend de :
- domaine,
- interfaces (ports) abstraites.

### Adapters (entrée/sortie)
Connecte le monde extérieur au métier :
- clavier / input physique futur (ESP32),
- WebSocket serveur/client,
- render DOM/canvas,
- logs.

### Infrastructure / Framework
Librairies et détails techniques :
- Three.js,
- moteur physique **Rapier** (`adapters/physics/`, contrat `ports/PhysicsPort.js` pour une extension ou un autre backend),
- WebSocket (`ws`),
- Vite.

## 3) Mapping concret pour ce repo

### Playfield
- `playfield/src/main.js` : composition root — câblage réseau, collisions, input, puis démarrage de la boucle.
- `playfield/src/composition/Level.js` : niveau complet (Game Object Pattern) - murs, bumpers, acteurs, décors, triggers.
- `playfield/src/composition/GameLoop.js` : boucle animation / pas physique / rendu.
- `playfield/src/composition/ViewRuntime.js` : caméra, resize, shake d'écran.
- `playfield/src/composition/wireCollisions.js` : câblage événements Rapier vers CollisionHandler.
- `playfield/src/domain/` : constantes du plateau, règles pures
- `playfield/src/usecases/` : `CollisionHandler.js` (use case pur)
- `playfield/src/adapters/input/InputController.js` : adapter d'entrée (clavier + cabinet IoT)
- `playfield/src/adapters/network/NetworkAdapter.js` : adapter Socket
- `playfield/src/adapters/renderer/` : Three.js (rendu 3D)
- `playfield/src/adapters/physics/` : moteur physique (Rapier via port)
  - `ports/PhysicsPort.js` : contrat du moteur
  - `rapier/` : backend Rapier actif (`@dimforge/rapier3d-compat`, init WASM async)
  - `index.js` : barrel sélectionnant le backend actif
- `playfield/src/adapters/actuators.js` : effets sortants (haptique, sons)
- `playfield/src/domain/viewConfig.js` : config vue production (caméra, gravité, lumières)

### Backglass

App de présentation : pattern **Humble Object / MVVM** (découpage front
données / logique de présentation / vue), comme le DMD.

- `backglass/src/main.js` : composition root (câble net → presentation → view)
- `backglass/src/net/NetworkAdapter.js` : classe `NetworkAdapter`, source de données temps réel (WebSocket)
- `backglass/src/presentation/` : logique de présentation pure et testable (view-model)
  - `ScreenStateMachine.js` : machine d'états des écrans (accueil / jeu / game over)
  - `scoreFormat.js` : formatage du score
- `backglass/src/view/` : rendu « humble » (DOM)
  - `BackglassView.js` : mise à jour des champs (score, billes, statut), animations
  - `mount.js` : insertion du DOM statique

### DMD

App de présentation : pattern **Humble Object / MVVM** (et non Clean Architecture,
réservée au serveur qui porte la logique métier). Découpage par préoccupations
de front : source de données / logique de présentation / vue.

- `dmd/src/main.js` : composition root
- `dmd/src/composition/wireDmdNetwork.js` : câblage WebSocket → renderer
- `dmd/src/net/NetworkAdapter.js` : classe `NetworkAdapter`, source de données temps réel (WebSocket)
- `dmd/src/presentation/` : logique de présentation pure et testable (view-model)
  - `TextScroller.js` : machine d'états du défilement de texte
  - `textMetrics.js` : `measureTextWidth` (métrique police 5×7)
- `dmd/src/view/` : rendu « humble » (canvas + DOM)
  - `DotMatrixRenderer.js` : rendu dot-matrix sur canvas
  - `font.js` : table 5×7 + `drawBitmapText`
  - `mount.js` : insertion du DOM statique

### Server
- `server/src/index.js` : composition root HTTP + WebSocket (`ws`)
- `server/src/domain/GameState.js`, `scoring.js` : entités pures (zéro dépendance framework)
- `server/src/usecases/` : `startGame`, `loseBall`, `applyCollision`, `launchBall`, `resetHighScore`
- `server/src/adapters/socketHandlers.js` : transport WebSocket uniquement

### Contrat partagé
- `shared/src/eventNames.js` : source de vérité des noms d'événements
- `../EVENTS.md` : contrat documentaire (aligné sur eventNames.js)

## 4) Règles de dev pour l'équipe

1. **Une feature = un use-case clair**
   - nommer l'action métier avant de coder.

2. **Ne pas coder la logique métier dans les handlers UI/Socket**
   - le handler appelle une action applicative, point.

3. **Unifier les points d'entrée**
   - clavier et IoT doivent appeler la même API d'actions (`input controller`).

4. **Contrat d'événements centralisé**
   - tout changement d'event passe par `../EVENTS.md` + implémentation associée.

5. **Petits commits scopés**
   - un bug physique, un commit ;
   - une évolution input, un commit ;
   - doc, commit séparé.

6. **Tests manuels MVP obligatoires après changement sensible**
   - start -> launch -> score -> ball_lost -> game_over -> restart.

## 5) Workflow recommandé (rapide)

1. Définir le use-case (1 phrase).
2. Identifier couche impactée (domaine/app/adapter/infra).
3. Implémenter du cœur vers l'extérieur.
4. Mettre à jour `../EVENTS.md` si contrat modifié.
5. Vérifier build + scénario manuel d'intégration.

## 6) Checklist review avant merge

- [ ] Le code métier est isolé des frameworks autant que possible
- [ ] Les adapters ne contiennent pas de règles métier complexes
- [ ] Le mapping input reste unique (clavier + futur IoT)
- [ ] Le contrat d'événements est cohérent avec `../EVENTS.md`
- [ ] Le flux MVP complet fonctionne encore

## 7) Niveau d'ambition recommandé

Ne pas viser une pureté académique totale pendant le MVP.

Vise plutôt :
- architecture stable,
- modules lisibles,
- couplage réduit,
- régressions limitées.

C'est le meilleur compromis pour livrer dans les temps tout en gardant un code propre.
