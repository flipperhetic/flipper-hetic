# Tests

Framework : **Vitest** (ESM natif, compatible Vite et Node.js pur).

## Lancer les tests

```bash
# Tous les tests serveur
cd server && npm test

# Tous les tests playfield
cd playfield && npm test

# Mode watch (relance automatique a chaque modification)
cd server && npm run test:watch
cd playfield && npm run test:watch
```

---

## Tests serveur — `server/src/__tests__/events.test.js`

Tests unitaires sur la logique metier de `events.js` (machine d'etat, scoring, billes, relay).

### Machine d'etat

| # | Test | Resultat attendu |
|---|------|------------------|
| 1 | Etat initial a la connexion | `status:"idle"`, `score:0`, `ballsLeft:3` |
| 2 | `start_game` | `status:"playing"`, recoit `game_started` + `state_updated` + `dmd_message:"BALL 1"` |
| 3 | `start_game` pendant playing | ignore, score inchange |
| 4 | `start_game` apres game_over | etat reinitialise a zero |

### Scoring

| # | Test | Resultat attendu |
|---|------|------------------|
| 5 | Bumper | `score += 100` |
| 6 | Wall | `score` inchange |
| 7 | Flipper | `score` inchange |
| 8 | Drain | `score` inchange |
| 9 | Type invalide | ignore |
| 10 | Payload vide | ignore |
| 11 | Collision hors partie | ignore |
| 12 | 5 bumpers consecutifs | `score === 500` |

### Gestion des billes

| # | Test | Resultat attendu |
|---|------|------------------|
| 13 | 1re perte | `ballsLeft:2`, `currentBall:2`, DMD `BALL 2` |
| 14 | 2e perte | `ballsLeft:1`, `currentBall:3`, DMD `BALL 3` |
| 15 | 3e perte | `status:"game_over"`, `ballsLeft:0`, DMD `GAME OVER` |
| 16 | `ball_lost` en idle | ignore |
| 17 | `ball_lost` apres game_over | ignore |

### Relay flippers

| # | Test | Resultat attendu |
|---|------|------------------|
| 18 | Flipper broadcast | client B recoit, client A non |
| 19 | 4 events flipper | `left_down`, `left_up`, `right_down`, `right_up` tous relayes |

### Anti double-emission

| # | Test | Resultat attendu |
|---|------|------------------|
| 20 | Double `ball_lost` sans `launch_ball` entre | le second est ignore |

### Resync connexion

| # | Test | Resultat attendu |
|---|------|------------------|
| 21 | Nouveau client mid-game | recoit `state_updated` courant + dernier `dmd_message` |

---

## Tests serveur — `server/src/__tests__/game-flow.test.js`

Tests d'integration avec Socket.IO en memoire (2 clients connectes).

| # | Test | Resultat attendu |
|---|------|------------------|
| 1 | Partie complete (3 billes, scoring, game_over, restart) | score 300, game_over, restart a zero, les deux clients synchronises |
| 2 | Broadcast flipper | client B recoit, client A non |
| 3 | Collision bumper multi-client | les deux clients recoivent `score:100` |

---

## Tests playfield — `playfield/src/__tests__/collisions.test.js`

Tests unitaires sur la detection drain et le debounce collision (`network.js` et `cannon-es` mockes).

### Drain

| # | Test | Resultat attendu |
|---|------|------------------|
| 1 | Bille au-dela du seuil en playing | `emitBallLost` appele, retourne `true` |
| 2 | Appels multiples sans reset | `emitBallLost` appele une seule fois |
| 3 | Status != playing | ignore |
| 4 | `resetDrainFlag` re-arme | un nouveau drain emet a nouveau |
| 5 | Bille en-deca du seuil | retourne `false` |
| 6 | Bille revient sur le plateau | re-arme naturellement le flag |

### Debounce collision

| # | Test | Resultat attendu |
|---|------|------------------|
| 7 | Deux bumpers < 300ms | `emitCollision` appele une seule fois |
| 8 | Deux bumpers > 300ms | `emitCollision` appele deux fois |
| 9 | Types `ball` et `table` | ignores |
| 10 | Bodies sans `userData` | ignores |

### Reset cooldowns

| # | Test | Resultat attendu |
|---|------|------------------|
| 11 | `resetCollisionCooldowns` entre parties | cooldown efface, collision immediate autorisee |

---

## Tests playfield — `playfield/src/__tests__/ball.test.js`

Tests unitaires sur le cycle de vie de la bille (`Three.js`, `cannon-es` et `physics.js` mockes).

### resetBall

| # | Test | Resultat attendu |
|---|------|------------------|
| 1 | Position au spawn | `position.set(0, 0.26, 8.5)` |
| 2 | Velocites a zero | velocity, angularVelocity, force, torque remis a zero |
| 3 | Body fige en STATIC | `body.type === STATIC` |

### launchBall

| # | Test | Resultat attendu |
|---|------|------------------|
| 4 | Debloque en DYNAMIC + impulsion Z- | `applyImpulse` appele, `impulse.z < 0` |
| 5 | Double launch refuse | 2e appel retourne `false` |
| 6 | Reset puis launch re-autorise | retourne `true` |

### clampBall

| # | Test | Resultat attendu |
|---|------|------------------|
| 7 | Verrouille Y | `position.y === BALL_RADIUS + 0.01`, `velocity.y === 0` |
| 8 | Plafonne vitesse > 25 | vitesse ramenee a 25 |
| 9 | Vitesse sous le max | inchangee |

---

## Recapitulatif

| Package | Fichier | Tests | Type |
|---------|---------|-------|------|
| server | `events.test.js` | 21 | Unitaire |
| server | `game-flow.test.js` | 3 | Integration |
| playfield | `collisions.test.js` | 11 | Unitaire |
| playfield | `ball.test.js` | 9 | Unitaire |
| **Total** | | **44** | |
