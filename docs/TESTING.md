# Tests — Flipper Hetic

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
| playfield | `collisions.test.js` | 15 | Unitaire (use case) |
| playfield | `ball.test.js` | 9 | Unitaire (physics body) |
| playfield | `actuators.test.js` | 5 | Unitaire (adapter) |
| playfield | `input.test.js` | 18 | Unitaire (adapter input) |
| playfield | `webSerial.test.js` | 7 | Unitaire (adapter IoT) |
| backglass | `view.test.js` | 7 | Unitaire (renderer) |
| backglass | `network.test.js` | 4 | Unitaire (adapter réseau) |
| dmd | `font.test.js` | 4 | Unitaire (renderer) |
| dmd | `wireDmdNetwork.test.js` | 5 | Unitaire (composition) |
| **Total** | | **97** | |

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
| 5 | `bumper_100` | `score += 100` |
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

Tests d'intégration avec Socket.IO en mémoire (2 clients connectés).

| # | Test | Résultat attendu |
|---|------|-----------------|
| 1 | Partie complète (3 billes, scoring, game_over, restart) | score 300, game_over, restart à zéro, les deux clients synchronisés |
| 2 | Broadcast flipper | client B reçoit, client A non |
| 3 | Collision bumper multi-client | les deux clients reçoivent `score:100` |

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
| 1 | Position au spawn | `position.set(4.2, 0.26, 6.05)` |
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

## Playfield — `input.test.js` et `webSerial.test.js`

Tests unitaires sur les adapters d'entrée (clavier et Web Serial / IoT).

| Fichier | Tests | Couverture |
|---------|------:|------------|
| `input.test.js` | 18 | Controller actions, debounce start, blur release flippers |
| `webSerial.test.js` | 7 | Subscribe/unsubscribe, parsing trames série |

---

## Backglass — `view.test.js` et `network.test.js`

| Fichier | Tests | Couverture |
|---------|------:|------------|
| `view.test.js` | 7 | `renderState` (score, billes, highscore), popups highscore et vidéo |
| `network.test.js` | 4 | Listeners Socket enregistrés, callbacks `onStateUpdated`, `onHighScoreBeat`, `onSpecialEvent` |

---

## DMD — `font.test.js` et `wireDmdNetwork.test.js`

| Fichier | Tests | Couverture |
|---------|------:|------------|
| `font.test.js` | 4 | Pixels FONT_5X7, caractère inconnu, avance curseur, `drawCenteredBitmapText` |
| `wireDmdNetwork.test.js` | 5 | Connexion/déconnexion → `socketStatus`, score + status → renderer |
