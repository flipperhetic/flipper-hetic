# Clean Architecture — Guide projet Flipper

Ce guide explique **comment appliquer une Clean Architecture pragmatique** sur ce projet, sans bloquer la livraison MVP.

Objectif :
- garder le code lisible et testable,
- eviter les regressions,
- permettre a l'equipe (et a l'IA) de contribuer sans casser le flux global.

## 1) Regle cle

La logique metier ne doit pas dependre des details techniques.

En pratique :
- le metier (score, statut, ball lost, game over...) ne depend pas de Three.js, Cannon-es, Socket.io, DOM, clavier,
- les details techniques appellent le metier, pas l'inverse.

## 2) Couches cibles (version adaptee au projet)

### Domaine (coeur)
Contient les regles de jeu pures :
- transitions d'etat (`idle -> playing -> game_over`),
- calcul score,
- gestion des billes restantes,
- decisions metier (ignorer un event invalide, etc.).

Contraintes :
- pas d'import Three.js / Cannon / Socket,
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
- Cannon-es,
- Socket.io,
- Vite.

## 3) Mapping concret pour ce repo

- `playfield/src/main.js` : composition + orchestration (le plus mince possible)
- `playfield/src/input.js` : adapter d'entree (clavier aujourd'hui, IoT plus tard)
- `playfield/src/network.js` : adapter Socket
- `playfield/src/physics.js`, `ball.js`, `flippers.js`, `bumpers.js` : infrastructure/technique de simulation
- `server/src/events.js` : logique serveur et contrat d'evenements (a garder coherent avec la doc)
- `docs/EVENTS.md` : contrat partage (source de reference equipe)

## 4) Regles de dev pour l'equipe

1. **Une feature = un use-case clair**
   - nommer l'action metier avant de coder.

2. **Ne pas coder la logique metier dans les handlers UI/Socket**
   - le handler appelle une action applicative, point.

3. **Unifier les points d'entree**
   - clavier et IoT doivent appeler la meme API d'actions (`input controller`).

4. **Contrat d'evenements centralise**
   - tout changement d'event passe par `docs/EVENTS.md` + implementation associee.

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
4. Mettre a jour `docs/EVENTS.md` si contrat modifie.
5. Verifier build + scenario manuel d'integration.

## 6) Checklist review avant merge

- [ ] Le code metier est isole des frameworks autant que possible
- [ ] Les adapters ne contiennent pas de regles metier complexes
- [ ] Le mapping input reste unique (clavier + futur IoT)
- [ ] Le contrat d'evenements est coherent avec `docs/EVENTS.md`
- [ ] Le flux MVP complet fonctionne encore

## 7) Niveau d'ambition recommande

Ne pas viser une purete academique totale pendant le MVP.

Vise plutot :
- architecture stable,
- modules lisibles,
- couplage reduit,
- regressions limitees.

C'est le meilleur compromis pour livrer dans les temps tout en gardant un code propre.
