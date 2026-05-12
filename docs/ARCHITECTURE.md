# Architecture logicielle — Flipper Hetic

Ce document décrit **l’architecture adoptée par le projet** : une **Clean Architecture pragmatique** sur un **monorepo npm** (plusieurs applications + un serveur temps réel). Il sert de **carte de lecture** du dépôt pour toute personne qui parcourt le code (évaluation, reprise du projet, onboarding technique).

---

## Principes retenus

- La **logique métier** (règles de jeu, transitions d’état, scoring) est isolée des **frameworks** (Three.js, Rapier, Socket.IO, DOM, canvas).
- Les **cas d’usage** orchestrent les actions métier ; les **adaptateurs** relient le monde extérieur (réseau, entrées utilisateur, rendu, physique).
- La **composition** (assemblage des modules) vit dans les **`main.js`** / **`index.js`** et, pour le playfield, dans **`composition/`** (construction du niveau + boucle de jeu) ; le **câblage** réseau / input / callbacks reste dans `main.js`, la logique métier dans `domain/` et `usecases/`.
- Le **contrat temps réel** (noms d’événements) est **centralisé** dans le package `shared` et documenté dans [`EVENTS.md`](EVENTS.md).

---

## Monorepo et packages

Le dépôt regroupe les livrables sous forme de **workspaces npm** :

| Package | Rôle |
|--------|------|
| `shared` | Contrat d’événements partagé (`CLIENT_EVENTS`, `SERVER_EVENTS`). |
| `server` | Serveur Node.js + **Socket.IO** : état de partie, diffusion aux clients. |
| `playfield` | Vue **3D** (Three.js) + simulation physique (**Rapier**, WASM). |
| `backglass` | Affichage score / état (adapter réseau + rendu DOM). |
| `dmd` | Affichage type **dot matrix** (adapter réseau + rendu canvas). |

Les scripts globaux (démarrage des quatre services, tests) sont définis dans le `package.json` à la racine du monorepo.

---

## Nomenclature des dossiers `src/`

Convention commune là où la structure en couches est appliquée :

| Dossier | Contenu |
|---------|---------|
| `domain/` | Règles et données **pures** : aucune dépendance à Socket.IO, Three.js, Rapier, DOM. |
| `usecases/` | **Cas d’usage** : fonctions ou fabriques qui appliquent le domaine sans connaître le transport. |
| `adapters/` | **Bords du système** : Socket.IO, clavier / futur IoT, moteur physique, rendu graphique, sorties (actuateurs, etc.). |
| `composition/` | **Assemblage** transversal (playfield : niveau + boucle ; DMD : branchement réseau → vue). |
| `renderer/` | **Présentation** : Three.js (playfield) ; montage DOM, feuilles de style et vues (backglass / DMD). |

Les tests unitaires et d’intégration ciblant ces couches se trouvent sous `__tests__/` au plus près du code concerné.

---

## Serveur (`server/src/`)

- **`index.js`** — Point d’entrée : composition HTTP + Socket.IO.
- **`domain/`** — Modèle de partie et règles associées (`GameState`, scoring).
- **`usecases/`** — Actions métier exposées au transport (`startGame`, `loseBall`, `applyCollision`).
- **`adapters/socketHandlers.js`** — **Seule** couche Socket.IO : réception des événements clients, appel des use cases, émission des réponses et diffusions.

**Flux de dépendances :** `socketHandlers` → `usecases` → `domain`.

---

## Playfield (`playfield/src/`)

- **`main.js`** — Composition : enchaîne `buildLevel` (plateau 3D + corps Rapier), réseau, collisions, entrées, puis démarre la boucle via `composition/runGameLoop.js`.
- **`composition/buildLevel.js`** — Assemblage meshes + bodies (table, murs, bille, flippers, bumpers, slingshots) sans logique réseau.
- **`composition/runGameLoop.js`** — Boucle `requestAnimationFrame` : pas physique, synchronisation mesh/body, rendu.
- **`domain/`** — Constantes et paramètres de plateau (données de conception, seuils).
- **`usecases/collisionHandler.js`** — Décisions liées aux collisions et au drain **sans** importer le client réseau (injection des effets de bord au niveau composition).
- **`adapters/renderer/`** — Three.js : scène, caméra, meshes (bille, flippers, bumpers, etc.).
- **`adapters/physics/`** — Moteur physique **Rapier** (`@dimforge/rapier3d-compat`, WASM) : monde, corps, écoute des contacts ; **`ports/PhysicsPort.js`** définit le contrat attendu d’un backend physique ; **`index.js`** expose le backend actif.
- **`adapters/network.js`** — Client Socket.IO et état local synchronisé avec le serveur.
- **`adapters/input.js`** — Entrées clavier (extensible vers matériel type IoT).
- **`adapters/actuators.js`** — Sorties côté machine (ex. retours haptiques).

**Flux de dépendances :** les use cases et le domaine **ne** dépendent **pas** de Three.js ni de Rapier ; les adaptateurs les consomment depuis la composition.

---

## Backglass et DMD (`backglass/src/`, `dmd/src/`)

Structure parallèle et lisible :

- **`main.js`** — Composition.
- **`adapters/network.js`** — Client Socket.IO.
- **`renderer/mount.js`** — Insertion du markup dans le document.
- **`renderer/view.js`** (backglass) ou **`composition/wireDmdNetwork.js`** (DMD) — Liaison état / événements vers la vue.
- **`renderer/`** (DMD) — Police bitmap + canvas (`dotMatrix.js`, `font.js`).

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
main.js  →  composition/ (buildLevel, runGameLoop)
         →  adapters/ (renderer, physics, network, input, actuators)
         →  usecases/  →  domain/
```

### Backglass / DMD

```
main.js  →  renderer/mount.js
         →  renderer/view.js (backglass) ou composition/wireDmdNetwork.js (DMD)
         →  adapters/network.js
```

---

## Autres éléments à la racine du dépôt

- **`docs/`** — Documentation projet : voir [`README.md`](README.md) ; livrable pédagogique HETIC sous **`docs/hetic/`**.
- **`Flipper-Sounds/`** — Banque d’assets audio du thème (hors exécution Node).
- **Conteneurisation** — `docker-compose.yml` et `Dockerfile` par service pour un environnement de démonstration reproductible.

Ce document se limite à la **vision architecturale** ; les procédures de test et CI/CD sont dans [`TESTING.md`](TESTING.md), [`MANUAL-TESTS.md`](MANUAL-TESTS.md) et [`CI-CD.md`](CI-CD.md).

## Performances (cible matériel « flipper »)

- **Playfield** : `MAX_RENDERER_PIXEL_RATIO` et `RENDERER_ANTIALIAS` dans `playfield/src/domain/constants.js` ; `scene.js` applique `powerPreference: "high-performance"` et plafonne le DPR au resize.
- **Rapier (WASM)** : le bundle reste volumineux — budget réseau / CPU à anticiper sur machine faible ; ajuster pas de temps / qualité des meshes si besoin (LOD, géométries simples, pas d’ombres coûteuses).
- **Trois clients** : trois processus navigateur + WebSocket — fermer les onglets inutiles en démo sur machine limitée.
