# Architecture logicielle — Flipper Hetic Breaking Bad

Ce document décrit **l’architecture adoptée par le projet** : une **Clean Architecture pragmatique** sur un **monorepo npm** (plusieurs applications + un serveur temps réel). Il sert de **carte de lecture** du dépôt pour toute personne qui parcourt le code (évaluation, reprise du projet, onboarding technique).

---

## Principes retenus

- La **logique métier** (règles de jeu, transitions d’état, scoring) est isolée des **frameworks** (Three.js, Rapier, WebSocket, DOM, canvas).
- Les **cas d’usage** orchestrent les actions métier ; les **adaptateurs** relient le monde extérieur (réseau, entrées utilisateur, rendu, physique).
- La **composition** (assemblage des modules) vit dans les **`main.js`** / **`index.js`** et, pour le playfield, dans **`composition/`** (construction du niveau + boucle de jeu) ; le **câblage** réseau / input / callbacks reste dans `main.js`, la logique métier dans `domain/` et `usecases/`.
- Le **contrat temps réel** (noms d’événements) est **centralisé** dans le package `shared` et documenté dans [`EVENTS.md`](EVENTS.md).

---

## Monorepo et packages

Le dépôt regroupe les livrables sous forme de **workspaces npm** :

| Package | Rôle |
|--------|------|
| `shared` | Contrat d’événements (`CLIENT_EVENTS`, `SERVER_EVENTS`) + transport temps réel : `RealtimeClient` (client WebSocket, `on`/`off`/`emit` + reconnexion) et `MessageProtocol` (codec d’enveloppe `{ event, data }`). |
| `server` | Serveur Node.js + **WebSocket** (`ws`) : état de partie, diffusion aux clients. |
| `playfield` | Vue **3D** (Three.js) + simulation physique (**Rapier**, WASM). |
| `backglass` | Affichage score / état (adapter réseau + rendu DOM). |
| `dmd` | Affichage type **dot matrix** (adapter réseau + rendu canvas). |

Les scripts globaux (démarrage des quatre services, tests) sont définis dans le `package.json` à la racine du monorepo.

---

## Nomenclature des dossiers `src/`

Convention commune là où la structure en couches est appliquée :

| Dossier | Contenu |
|---------|---------|
| `domain/` | Règles et données **pures** : aucune dépendance à WebSocket, Three.js, Rapier, DOM. |
| `usecases/` | **Cas d’usage** : fonctions ou fabriques qui appliquent le domaine sans connaître le transport. |
| `adapters/` | **Bords du système** : WebSocket, clavier / futur IoT, moteur physique, rendu graphique, sorties (actuateurs, etc.). |
| `composition/` | **Assemblage** transversal (playfield : niveau + boucle ; DMD : branchement réseau → vue). |
| `adapters/renderer/` | **Rendu graphique Three.js** — playfield uniquement. |
| `view/` | **Présentation DOM** : montage, feuilles de style et vues — backglass et DMD uniquement. |

Les tests unitaires et d’intégration ciblant ces couches se trouvent sous `__tests__/` au plus près du code concerné.

---

## Serveur (`server/src/`)

- **`index.js`** — Point d’entrée : composition HTTP + WebSocket (`ws`).
- **`domain/`** — Modèle de partie et règles associées (`GameState`, scoring).
- **`usecases/`** — Actions métier exposées au transport (`startGame`, `loseBall`, `applyCollision`, `launchBall`, `resetHighScore`).
- **`adapters/socketHandlers.js`** — Composition root du transport WebSocket : réception des événements clients, appel des use cases, émission des réponses et diffusions (le transport est réparti entre `GameBroadcaster.js`, `GameSession.js` et `SocketController.js`).

**Flux de dépendances :** `socketHandlers` → `usecases` → `domain`.

---

## Playfield (`playfield/src/`)

- **`main.js`** — Composition : instancie `Level` (plateau 3D + corps Rapier), câble réseau/collisions/entrées, puis démarre la boucle via `composition/GameLoop.js`.
- **`composition/Level.js`** — Niveau complet (Game Object Pattern) : construit murs, bumpers, acteurs (bille, flippers, gate), éléments décoratifs et triggers de tunnels ; expose les acteurs à `main.js`.
- **`composition/GameLoop.js`** — Boucle `requestAnimationFrame` : pas physique, synchronisation mesh/body, rendu.
- **`composition/ViewRuntime.js`** — Caméra, resize, shake d’écran, rendu final.
- **`composition/wireCollisions.js`** — Câble les événements physiques Rapier vers `CollisionHandler`.
- **`domain/`** — Constantes et paramètres de plateau (données de conception, seuils).
- **`usecases/CollisionHandler.js`** — Décisions liées aux collisions et au drain **sans** importer le client réseau (injection des effets de bord au niveau composition).
- **`adapters/renderer/`** — Three.js : scène, caméra, meshes (bille, flippers, bumpers, etc.).
- **`adapters/physics/`** — Moteur physique **Rapier** (`@dimforge/rapier3d-compat`, WASM) : monde, corps, écoute des contacts ; **`ports/PhysicsPort.js`** définit le contrat attendu d’un backend physique ; **`index.js`** expose le backend actif.
- **`adapters/network/NetworkAdapter.js`** — Client WebSocket (via `shared`) et état local synchronisé avec le serveur.
- **`adapters/input/InputController.js`** — Entrées clavier et cabinet IoT (via `bridge/`).
- **`adapters/actuators.js`** — Sorties côté machine (sons, retours haptiques).

**Flux de dépendances :** les use cases et le domaine **ne** dépendent **pas** de Three.js ni de Rapier ; les adaptateurs les consomment depuis la composition.

---

## Backglass et DMD (`backglass/src/`, `dmd/src/`)

Ce sont des **applications de présentation** (aucune logique métier — la source de
vérité est le serveur). On n'y applique donc PAS la Clean Architecture du serveur,
mais le pattern **Humble Object / MVVM**, découpé selon des préoccupations de front :

- **`net/`** — Source de données temps réel (client WebSocket, classe `NetworkAdapter`).
- **`presentation/`** — Logique de présentation **pure et testable** (le *view-model*) :
  décide *quoi* afficher, sans toucher au DOM/canvas.
  - DMD : `TextScroller` (défilement), `textMetrics` (mesure police 5×7).
  - Backglass : `ScreenStateMachine` (écrans accueil/jeu/game over), `scoreFormat`.
- **`view/`** — Rendu « humble » : canvas/DOM, le plus passif possible.
  - DMD : `DotMatrixRenderer`, `font` (table 5×7 + tracé), `mount`.
  - Backglass : `BackglassView`, `mount`.
- **`composition/` + `main.js`** — Composition root qui câble `net` → `presentation` → `view`
  (DMD : `composition/wireDmdNetwork.js` ; backglass : câblage inline dans `main.js`).

> Règle de dépendance : `view` dépend de `presentation`, jamais l'inverse
> (`presentation/` ne contient aucun accès DOM/canvas).

---

## Contrat temps réel

- **Code** : `shared/src/eventNames.js` — source unique des chaînes d’événements.
- **Documentation** : [`EVENTS.md`](EVENTS.md) — contrat lisible par l’équipe et aligné sur le code.

---

## Schéma synthétique des flux

### Serveur

```
index.js  →  adapters/socketHandlers.js  →  usecases/  →  domain/
```

### Playfield

```
main.js  →  composition/ (Level, GameLoop, ViewRuntime, wireCollisions)
         →  adapters/ (renderer, physics, network, input, actuators)
         →  usecases/  →  domain/
```

### Backglass / DMD (Humble Object / MVVM)

```
main.js (composition root)
   →  net/NetworkAdapter.js        (données entrantes : WebSocket)
   →  presentation/                (view-model pur : TextScroller / ScreenStateMachine…)
   →  view/                        (rendu humble : canvas / DOM + mount)
```

---

## Autres éléments à la racine du dépôt

- **`docs/`** — Documentation projet : voir [`README.md`](README.md) ; livrable pédagogique HETIC sous **`docs/hetic/`**.
- **`Flipper-Sounds/`** — Banque d’assets audio du thème (hors exécution Node).
- **Conteneurisation** — `docker-compose.yml` et `Dockerfile` par service pour un environnement de démonstration reproductible.

Ce document se limite à la **vision architecturale** ; les procédures de test et CI/CD sont dans [`TESTING.md`](TESTING.md), [`MANUAL-TESTS.md`](MANUAL-TESTS.md) et [`CI-CD.md`](CI-CD.md).

---

## Persistance du meilleur score

`server/highscore.json` est écrit sur le disque local du processus serveur.

- **En développement et production directe** : le fichier persiste entre les redémarrages du processus Node.js.
- **En Docker sans volume** : le fichier est perdu si le conteneur est supprimé. Pour conserver le highscore, ajouter un volume dans `docker-compose.yml` :

```yaml
services:
  server:
    volumes:
      - ./server/highscore.json:/app/server/highscore.json
```

Pour ce projet flipper, un fichier JSON local est suffisant. Aucune base de données n'est nécessaire.

## Performances (cible matériel « flipper »)

- **Playfield** : `MAX_RENDERER_PIXEL_RATIO` et `RENDERER_ANTIALIAS` dans `playfield/src/domain/constants.js` ; `scene.js` applique `powerPreference: "high-performance"` et plafonne le DPR au resize.
- **Rapier (WASM)** : le bundle reste volumineux — budget réseau / CPU à anticiper sur machine faible ; ajuster pas de temps / qualité des meshes si besoin (LOD, géométries simples, pas d’ombres coûteuses).
- **Trois clients** : trois processus navigateur + WebSocket — fermer les onglets inutiles en démo sur machine limitée.
