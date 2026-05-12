# Référentiel — sujet officiel « Flipper » (HETIC Web3)

Ce fichier **aligne le dépôt** sur les exigences du sujet pédagogique **Projet Flipper — HETIC Web3** (sommaire, livrables, barème, annexe IoT). La version canonique du texte complet et les consignes de rendu restent celles **fournies par l’école** (PDF / drive du groupe).

---

## 1. Sommaire du sujet (structure officielle)

| § | Thème |
|---|--------|
| 1 | Introduction (contexte flipper, présentation du projet) |
| 2 | Compétences techniques et lien avec le monde pro |
| 3 | Description (architecture globale, composants, flux de données) |
| 4 | Fonctionnalités attendues (base + bonus) |
| 5 | Grille de notation |
| 6 | Livrables |
| 7 | Annexe IoT (solénoïdes, contrôleurs) |

Les sections **CDC technique** de ce dossier (`vision-objectifs.md`, `architecture-technique.md`, `stack.md`, etc.) détaillent l’implémentation ; ce référentiel sert de **grille de conformité**.

---

## 2. Technologies officielles vs dépôt

| Domaine | Sujet HETIC | Implémentation ici |
|---------|-------------|---------------------|
| Frontend 3D | Three.js | **Three.js** (`playfield`) |
| Physique | Cannon.js ou Ammo.js | **Rapier** (WASM), même objectif « collisions, gravité, rebonds », derrière `PhysicsPort.js` — voir `stack.md` |
| Temps réel | WebSockets (Socket.io), Node.js | **Socket.IO + Node** (`server`) |
| Backglass / DMD | Canvas, CSS | **DOM + canvas** (`backglass`, `dmd`) |
| IoT | Arduino / ESP32 | Prévu : `bindExternalInputSource` + **mapping clavier annexe** (ci-dessous) ; pilotage solénoïdes : `actuators.md` |
| IA | TensorFlow.js ou Python (scikit-learn) | **Hors MVP** ; pistes dans `BACKLOG.md` (bonus sujet) |

---

## 3. Fonctionnalités de base (§ 4.1) — suivi

| Fonctionnalité (sujet) | Statut dans ce dépôt |
|------------------------|----------------------|
| Playfield 3D (bille, flippers, bumpers, trous) | **OK** — table MVP + drain |
| Physique réaliste | **OK** — Rapier + collisions score côté serveur |
| Contrôleurs (flippers + start, clavier ou IoT) | **OK** — clavier **X / C / D / F** (annexe) + `Enter` / flèches ; API pour ESP32 |
| Backglass (score, animations basiques) | **OK** — score, vies, statut |
| DMD (messages type dot matrix) | **OK** — messages arcade |
| Communication temps réel (3 apps) | **OK** — monorepo 3 clients + serveur |
| Gestion des événements (collisions, score) | **OK** — voir `EVENTS.md` |
| Documentation (README, schémas, choix techniques) | **OK** — `README.md`, `docs/README.md`, `docs/hetic/`, diagrammes |

---

## 4. Bonus (§ 4.2)

Non exhaustivement couverts par le MVP : thème sonore poussé, multijoueur alterné, éditeur de table, IA adversaire / conseils, persistance high scores, effets visuels avancés. Pistes : `BACKLOG.md`.

---

## 5. Grille de notation (§ 5) — rappel

Le sujet fixe notamment : fonctionnalités de base (80 pts), code & architecture (10), créativité (5), IoT (5), bonus (jusqu’à +20), documentation (10), soutenance (10). **Total sur 100 + bonus**, avec barème qualitatif (≥ 90 excellent, etc.).

---

## 6. Livrables (§ 6) — checklist dépôt

| Livrable | Dépôt |
|----------|--------|
| Code source (mono-repo ou 3 repos) | **Mono-repo** npm workspaces (`server`, `playfield`, `backglass`, `dmd`, `shared`) |
| README (installation, lancement, dépendances) | **`README.md`** racine |
| Schéma d’architecture / flux | **`docs/CARTOGRAPHIE.md`**, **`docs/hetic/diagrammes.md`**, `docs/ARCHITECTURE.md` |
| Choix techniques expliqués | **`docs/hetic/stack.md`**, `clean-architecture.md` |
| Vidéo démo 2–3 min | **Hors repo** (à produire par le groupe) |
| Présentation orale | **Hors repo** |

---

## 7. Annexe IoT — reprise fidèle du sujet

### 7.1 Solénoïdes — IoT 1

Les solénoïdes « claquent » pour reproduire le comportement réel (zones, battes). Le matériel de soutenance prévoit **10 solénoïdes** pilotés par **2 dispositifs IoT** commandant des relais. Le schéma de câblage détaillé est un **document complémentaire** fourni avec le flipper physique.

**Lien code :** comptage / hooks dans `playfield/src/adapters/actuators.js` et `docs/actuators.md` (simulation ; branchement matériel futur documenté).

### 7.2 Contrôleurs — IoT 2 (simulation clavier)

Un dispositif IoT connecté au PC du playfield simule des **entrées clavier** :

| Action | Touche |
|--------|--------|
| Flipper gauche | **X** |
| Flipper droit | **C** |
| Start | **D** |
| Pièce entrée | **F** |

**Implémentation :** `playfield/src/adapters/input.js` (`bindKeyboardInput`) — `X` / `C` / `D` / `F` + **MVP** : `F` déclenche le même flux que **Start** (`start_game`). Raccourcis supplémentaires documentés dans `docs/EVENTS.md` (`Enter`, flèches) pour développement et accessibilité.

Pour l’ESP32, appeler les mêmes actions que le clavier via `createGameInputController` / `bindExternalInputSource` (ne pas dupliquer la logique réseau côté firmware).

---

## 8. Exemple de flux (§ 3.3) — correspondance

1. Joueur actionne flipper gauche (**X** ou IoT) → playfield anime le flipper + force sur la bille.  
2. Collision bumper → événement vers serveur → score + relais **Backglass** / **DMD**.  
3. (Optionnel sujet) IA : non implémentée dans le MVP ; extension possible sur les événements déjà centralisés.

---

*Document généré pour cadrage équipe ; en cas d’écart avec une version plus récente du sujet HETIC, **la consigne officielle de l’école prime**.*
