# Clean Architecture — Guide projet Flipper

Ce guide explique **comment appliquer une Clean Architecture pragmatique** sur ce projet, sans bloquer la livraison MVP.

Objectif :
- garder le code lisible et testable,
- eviter les regressions,
- permettre a l'equipe (et a l'IA) de contribuer sans casser le flux global.

## 1) Regle cle

La logique metier ne doit pas dependre des details techniques.

En pratique :
- le metier (score, statut, ball lost, game over...) ne depend pas de Three.js, Rapier, Socket.io, DOM, clavier,
- les details techniques appellent le metier, pas l'inverse.

## 2) Couches cibles (version adaptee au projet)

### Domaine (coeur)
Contient les regles de jeu pures :
- transitions d'etat (`idle -> playing -> game_over`),
- calcul score,
- gestion des billes restantes,
- decisions metier (ignorer un event invalide, etc.).

Contraintes :
- pas d'import Three.js / Rapier / Socket,
- fonctions pures ou services metier facilement testables.

### Application (use-cases)
Orchestre les actions metier :
- start game,
- launch ball,
- collision,
- ball lost,
- restart.

Depend de :
- domaine,
- interfaces (ports) abstraites.

### Adapters (entree/sortie)
Connecte le monde exterieur au metier :
- clavier / input physique futur (ESP32),
- WebSocket serveur/client,
- render DOM/canvas,
- logs.

### Infrastructure / Framework
Librairies et details techniques :
- Three.js,
- moteur physique **Rapier** (`adapters/physics/`, contrat `ports/PhysicsPort.js` pour une extension ou un autre backend),
- Socket.io,
- Vite.

## 3) Mapping concret pour ce repo

### Playfield
- `playfield/src/main.js` : composition root — câblage réseau, collisions, input, puis démarrage de la boucle.
- `playfield/src/composition/buildLevel.js` : construction du plateau (meshes Three.js + bodies Rapier).
- `playfield/src/composition/runGameLoop.js` : boucle animation / pas physique / rendu.
- `playfield/src/domain/` : constantes du plateau, regles pures
- `playfield/src/usecases/` : `collisionHandler.js` (use case pur)
- `playfield/src/adapters/input.js` : adapter d'entree (clavier aujourd'hui, IoT plus tard)
- `playfield/src/adapters/network.js` : adapter Socket
- `playfield/src/adapters/renderer/` : Three.js (rendu 3D)
- `playfield/src/adapters/physics/` : moteur physique (Rapier via port)
  - `ports/PhysicsPort.js` : contrat du moteur
  - `rapier/` : backend Rapier actif (`@dimforge/rapier3d-compat`, init WASM async)
  - `index.js` : barrel selectionnant le backend actif
- `playfield/src/adapters/actuators.js` : effets sortants (haptique, sons)

### Backglass
- `backglass/src/main.js` : composition root
- `backglass/src/renderer/mount.js` : insertion du DOM statique
- `backglass/src/renderer/view.js` : mise a jour des champs (score, billes, statut)
- `backglass/src/adapters/network.js` : client Socket.IO

### DMD
- `dmd/src/main.js` : composition root
- `dmd/src/renderer/mount.js` : insertion du DOM statique
- `dmd/src/composition/wireDmdNetwork.js` : enregistrement des listeners Socket.IO vers le renderer
- `dmd/src/adapters/network.js` : client Socket.IO
- `dmd/src/renderer/dotMatrix.js`, `font.js` : rendu canvas

### Server
- `server/src/index.js` : composition root HTTP + Socket.IO
- `server/src/domain/GameState.js`, `scoring.js` : entites pures (zero dependance framework)
- `server/src/usecases/` : `startGame`, `loseBall`, `applyCollision`
- `server/src/adapters/socketHandlers.js` : transport Socket.IO uniquement

### Contrat partage
- `shared/src/eventNames.js` : source de verite des noms d'evenements
- `../EVENTS.md` : contrat documentaire (alignee sur eventNames.js)

## 4) Regles de dev pour l'equipe

1. **Une feature = un use-case clair**
   - nommer l'action metier avant de coder.

2. **Ne pas coder la logique metier dans les handlers UI/Socket**
   - le handler appelle une action applicative, point.

3. **Unifier les points d'entree**
   - clavier et IoT doivent appeler la meme API d'actions (`input controller`).

4. **Contrat d'evenements centralise**
   - tout changement d'event passe par `../EVENTS.md` + implementation associee.

5. **Petits commits scopes**
   - un bug physique, un commit ;
   - une evolution input, un commit ;
   - doc, commit separe.

6. **Tests manuels MVP obligatoires apres changement sensible**
   - start -> launch -> score -> ball_lost -> game_over -> restart.

## 5) Workflow recommande (rapide)

1. Definir le use-case (1 phrase).
2. Identifier couche impactee (domaine/app/adapter/infra).
3. Implementer du coeur vers l'exterieur.
4. Mettre a jour `../EVENTS.md` si contrat modifie.
5. Verifier build + scenario manuel d'integration.

## 6) Checklist review avant merge

- [ ] Le code metier est isole des frameworks autant que possible
- [ ] Les adapters ne contiennent pas de regles metier complexes
- [ ] Le mapping input reste unique (clavier + futur IoT)
- [ ] Le contrat d'evenements est coherent avec `../EVENTS.md`
- [ ] Le flux MVP complet fonctionne encore

## 7) Niveau d'ambition recommande

Ne pas viser une purete academique totale pendant le MVP.

Vise plutot :
- architecture stable,
- modules lisibles,
- couplage reduit,
- regressions limitees.

C'est le meilleur compromis pour livrer dans les temps tout en gardant un code propre.
