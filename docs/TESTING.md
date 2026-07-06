# Tests — Flipper Hetic Breaking Bad

Framework : **Vitest** (ESM natif).

## Lancer les tests

```bash
# Tous les packages
npm run test:all

# Un package spécifique
npm test --workspace=server
npm test --workspace=playfield
npm test --workspace=backglass
npm test --workspace=dmd
```

---

## Récapitulatif

| Package | Fichier | Tests | Type |
|---------|---------|------:|------|
| server | `events.test.js` | 20 | Unitaire / intégration Socket |
| server | `game-flow.test.js` | 3 | Intégration bout-en-bout |
| server | `scoring.test.js` | 25 | Unitaire (domaine pur) |
| playfield | `collisions.test.js` | 15 | Unitaire (use case) |
| playfield | `ball.test.js` | 9 | Unitaire (physics body) |
| playfield | `actuators.test.js` | 5 | Unitaire (adapter) |
| playfield | `input.test.js` | 17 | Unitaire (adapter input) |
| backglass | `view.test.js` | 6 | Unitaire (renderer) |
| backglass | `network.test.js` | 4 | Unitaire (adapter réseau) |
| backglass | `ScreenStateMachine.test.js` | 8 | Unitaire (machine d'état) |
| backglass | `scoreFormat.test.js` | 3 | Unitaire (formatage) |
| dmd | `font.test.js` | 3 | Unitaire (renderer) |
| dmd | `wireDmdNetwork.test.js` | 7 | Unitaire (composition) |
| dmd | `TextScroller.test.js` | 10 | Unitaire (défilement texte) |
| **Total** | | **135** | |

> Les inputs ESP32 ne passent plus par Web Serial (navigateur) mais par le service `bridge/` (lit `/dev/ttyUSB0`, relaie via WebSocket). Le mapping ID firmware → action vit dans `bridge/server.js` (service pont) ; `playfield/src/adapters/input/InputController.js` consomme l'événement `cabinet_button`.

---

## Serveur — `events.test.js`

Tests sur la machine d'état, le scoring, la gestion des billes, le relay flippers et la resynchronisation.

### Machine d'état

| # | Test | Résultat attendu |
|---|------|-----------------|
| 1 | État initial à la connexion | `status:"idle"`, `score:0`, `ballsLeft:3` |
| 2 | `start_game` | `status:"playing"`, reçoit `game_started` + `state_updated` + `dmd_message:"BALL 1"` |
| 3 | `start_game` pendant playing | ignoré, score inchangé |
| 4 | `start_game` après game_over | état réinitialisé à zéro |

### Scoring

| # | Test | Résultat attendu |
|---|------|-----------------|
| 5 | `bumper` | `score += 100` |
| 6 | `wall` | `score` inchangé |
| 7 | `flipper` | `score` inchangé |
| 8 | `drain` | `score` inchangé |
| 9 | Type invalide | ignoré |
| 10 | Payload vide | ignoré |
| 11 | Collision hors partie | ignoré |
| 12 | 5 bumpers consécutifs | `score === 500` |

### Gestion des billes

| # | Test | Résultat attendu |
|---|------|-----------------|
| 13 | 1re perte | `ballsLeft:2`, `currentBall:2`, DMD `BALL 2` |
| 14 | 2e perte | `ballsLeft:1`, `currentBall:3`, DMD `BALL 3` |
| 15 | 3e perte | `status:"game_over"`, `ballsLeft:0`, DMD `GAME OVER` |
| 16 | `ball_lost` en idle | ignoré |
| 17 | `ball_lost` après game_over | ignoré |

### Relay flippers

| # | Test | Résultat attendu |
|---|------|-----------------|
| 18 | Flipper broadcast | client B reçoit, client A non |
| 19 | 4 events flipper | `left_down`, `left_up`, `right_down`, `right_up` tous relayés |

### Anti double-émission

| # | Test | Résultat attendu |
|---|------|-----------------|
| 20 | Double `ball_lost` sans `launch_ball` entre | le second est ignoré |

---

## Serveur — `game-flow.test.js`

Tests d'intégration avec un serveur WebSocket en mémoire (2 clients connectés).

| # | Test | Résultat attendu |
|---|------|-----------------|
| 1 | Partie complète (3 billes, scoring, game_over, restart) | score 300, game_over, restart à zéro, les deux clients synchronisés |
| 2 | Broadcast flipper | client B reçoit, client A non |
| 3 | Collision bumper multi-client | les deux clients reçoivent `score:100` |

---

## Serveur — `scoring.test.js`

Tests unitaires sur la logique métier pure de `domain/scoring.js` (aucun I/O ni réseau).

### getPoints

| # | Test | Résultat attendu |
|---|------|-----------------|
| 1-9 | Barème par type (`bumper`, `bumper_50`, `bumper_10`, `tunnel`, `tunnel-rv`, `triangle`, `wall`, `flipper`, `drain`) | valeurs correctes (100, 50, 10, 1500, 500, 0, 0, 0, 0) |
| 10 | Type inconnu | retourne `null` |
| 11 | Type à 0 point valide vs type inconnu | `wall` → `0`, `autre` → `null` (pas de confusion avec `?? null`) |
| 12 | `undefined` ou `null` | retourne `null` |
| 13 | Casse différente (`BUMPER`) | retourne `null` |

### isValidCollisionType

| # | Test | Résultat attendu |
|---|------|-----------------|
| 14-22 | Les 9 types valides | retourne `true` |
| 23 | Type inconnu | retourne `false` |
| 24 | Valeurs non-string (`undefined`, `null`, nombre, objet) | retourne `false` |
| 25 | Chaîne vide | retourne `false` |

---

## Playfield — `collisions.test.js`

Tests unitaires sur la détection drain et le debounce collision (use case pur, sans mock physique).

### Drain

| # | Test | Résultat attendu |
|---|------|-----------------|
| 1 | Bille au-delà du seuil en playing | `emitBallLost` appelé, retourne `true` |
| 2 | Appels multiples sans reset | `emitBallLost` appelé une seule fois |
| 3 | Status != playing | ignoré |
| 4 | `resetDrainFlag` re-arme | un nouveau drain émet à nouveau |
| 5 | Bille en-deçà du seuil | retourne `false` |
| 6 | Bille revient sur le plateau | re-arme naturellement le flag |

### Debounce collision

| # | Test | Résultat attendu |
|---|------|-----------------|
| 7 | Deux bumpers < 300 ms | `emitCollision` appelé une seule fois |
| 8 | Deux bumpers > 300 ms | `emitCollision` appelé deux fois |
| 9 | Types `ball` et `table` | ignorés |
| 10 | Bodies sans `userData` | ignorés |

### Reset cooldowns

| # | Test | Résultat attendu |
|---|------|-----------------|
| 11 | `resetCollisionCooldowns` entre parties | cooldown effacé, collision immédiate autorisée |

---

## Playfield — `ball.test.js`

Tests unitaires sur le cycle de vie de la bille (Rapier mocké via `init.js`).

### resetBall

| # | Test | Résultat attendu |
|---|------|-----------------|
| 1 | Position au spawn | Position définie dans `domain/constants.js` (`PLUNGER_SPAWN_X/Y/Z`) |
| 2 | Vélocités à zéro | velocity, angularVelocity, force, torque remis à zéro |
| 3 | Body figé en KinematicPositionBased | `setBodyType(2, true)` |

### launchBall

| # | Test | Résultat attendu |
|---|------|-----------------|
| 4 | Débloque en DYNAMIC + impulsion Z- et X- | `applyImpulse` appelé, `impulse.z < 0`, `impulse.x < 0` |
| 5 | Double launch refusé | 2e appel retourne `false` |
| 6 | Reset puis launch re-autorisé | retourne `true` |

### clampBall

| # | Test | Résultat attendu |
|---|------|-----------------|
| 7 | Verrouille Y | `position.y === BALL_RADIUS + 0.01`, `velocity.y === 0` |
| 8 | Plafonne vitesse > 25 | vitesse ramenée à 25 |
| 9 | Vitesse sous le max | inchangée |

---

## Playfield — `actuators.test.js`

Tests unitaires sur l'adapter actuateurs (sons, callbacks).

| # | Test | Résultat attendu |
|---|------|-----------------|
| 1 | Méthodes attendues exposées | toutes présentes |
| 2 | Fonctionne sans audio | aucune erreur levée |
| 3 | `onBumperHit` joue un son aléatoire | `playRandom` appelé |
| 4 | `onGameStart` démarre le thème | `play` + `startTheme` appelés |
| 5 | Deux instances indépendantes | callbacks isolés |

---

## Playfield — `input.test.js`

Tests unitaires sur l'adapter d'entrée clavier (`InputController`). Testés sans jsdom via un faux EventTarget.

### Mapping annexe IoT HETIC

| # | Test | Résultat attendu |
|---|------|-----------------|
| 1 | `X` → flipper gauche down/up | `onLeftFlipperDown` + `onLeftFlipperUp` appelés |
| 2 | `C` → flipper droit down/up | `onRightFlipperDown` + `onRightFlipperUp` appelés |
| 3 | `D` → start | `onStart` appelé |
| 4 | `F` → start (MVP : pièce = start) | `onStart` appelé |

### Raccourcis dev / accessibilité

| # | Test | Résultat attendu |
|---|------|-----------------|
| 5 | `Enter` → start | `onStart` appelé |
| 6 | Flèches → flippers gauche et droit | down + up des deux côtés |
| 7 | `Space` → launch | `onLaunch` appelé |

### Anti-rebond et symétrie press/release

| # | Test | Résultat attendu |
|---|------|-----------------|
| 8 | `event.repeat` n'émet pas un second down | `onLeftFlipperDown` une seule fois |
| 9 | Deux keydown distincts pour le même flipper | un seul down émis |
| 10 | keyup sans keydown préalable | pas d'up parasite |

### Debounce start (anti-rebond switch physique)

| # | Test | Résultat attendu |
|---|------|-----------------|
| 11 | Deux starts dans la fenêtre debounce | un seul `onStart` ; hors fenêtre, un second autorisé |
| 12 | Rebond D→F dans la fenêtre | un seul `onStart` |

### Filet blur (perte de focus)

| # | Test | Résultat attendu |
|---|------|-----------------|
| 13 | Blur avec flipper gauche maintenu | `onLeftFlipperUp` appelé |
| 14 | Blur avec deux flippers maintenus | `onLeftFlipperUp` + `onRightFlipperUp` appelés |
| 15 | Blur sans flipper maintenu | aucun up émis |
| 16 | Blur puis keyup | pas de double émission |

### Cleanup

| # | Test | Résultat attendu |
|---|------|-----------------|
| 17 | `dispose()` désabonne tous les listeners | 0 listener sur keydown, keyup, blur |

---

## Backglass — `view.test.js` et `network.test.js`

| Fichier | Tests | Couverture |
|---------|------:|------------|
| `view.test.js` | 6 | `renderState` (score, billes, highscore), popups highscore et vidéo |
| `network.test.js` | 4 | Listeners Socket enregistrés, callbacks `onStateUpdated`, `onHighScoreBeat`, `onSpecialEvent` |

---

## Backglass — `ScreenStateMachine.test.js`

Tests unitaires sur la machine d'état d'affichage (attract / backglass / game_over + minuteur de maintien).

| # | Test | Résultat attendu |
|---|------|-----------------|
| 1 | `playing` → backglass, pas de game_over actif | `onBackglass` appelé, `gameOverActive === false` |
| 2 | `idle` hors maintien → accueil | `onAttract` appelé |
| 3 | Premier `game_over` → `onGameOver` avec score/highScore + maintien activé | `onGameOver(1500, 3000)`, `gameOverActive === true` |
| 4 | `game_over` répété → écran affiché une seule fois | `onGameOver` appelé une fois |
| 5 | `idle` pendant maintien → ignoré | `onAttract` non appelé, `gameOverActive === true` |
| 6 | Expiration du minuteur → accueil automatique | `onAttract` appelé, `gameOverActive === false` |
| 7 | `playing` pendant maintien → annule le minuteur | `onBackglass` appelé, le minuteur ne ramène pas l'accueil |
| 8 | Nouveau `game_over` après expiration → rouvre l'écran | `onGameOver` appelé deux fois au total |

---

## Backglass — `scoreFormat.test.js`

Tests unitaires sur la fonction `formatScore` (domaine pur, aucun I/O).

| # | Test | Résultat attendu |
|---|------|-----------------|
| 1 | Groupement des milliers par espaces | `12450` → `"12 450"`, `1000000` → `"1 000 000"` |
| 2 | Petits nombres intacts | `0` → `"0"`, `999` → `"999"` |
| 3 | `null` / `undefined` traités comme 0 | retourne `"0"` |

---

## DMD — `font.test.js` et `wireDmdNetwork.test.js`

| Fichier | Tests | Couverture |
|---------|------:|------------|
| `font.test.js` | 3 | Pixels FONT_5X7, caractère inconnu, avance curseur |
| `wireDmdNetwork.test.js` | 7 | Connexion/déconnexion → `socketStatus`, score + status → renderer, `flashBallMessage` pour messages `BALL`, ignoré pour `GAME OVER` / `PRESS START` |

---

## DMD — `TextScroller.test.js`

Tests unitaires sur le défilement de texte DMD (`TextScroller`). Horloge contrôlable injectée via `now()`.

| # | Test | Résultat attendu |
|---|------|-----------------|
| 1 | Texte court (`reset`) → statique centré, `isDriving === false` | `offsetX` = position centrée, pas de pilotage |
| 2 | Texte large (`reset`) → boucle active, `isDriving === true` | `offsetX === cols`, `isTransitioning === false` |
| 3 | `update` après le pas de temps → défilement d'un pixel | `offsetX === cols - 1` |
| 4 | `update` avant le pas de temps → aucun mouvement | `offsetX` inchangé |
| 5 | `update` sans défilement actif (texte court) → no-op | `offsetX` inchangé |
| 6 | Transition vers texte court → se fige centré après animation | `isDriving === false`, `isTransitioning === false`, texte mis à jour |
| 7 | `interrupt()` coupe le défilement en cours | `isDriving === false` |
| 8 | `setStatic` met à jour le texte centré hors défilement | texte et position mis à jour |
| 9 | `setStatic` ignoré pendant une transition | `isTransitioning` toujours `true`, texte inchangé |
| 10 | `scheduleTransition` vers le même texte → no-op | `isTransitioning === false`, texte inchangé |
