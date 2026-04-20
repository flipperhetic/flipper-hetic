# Integration MVP — Scenario bout-en-bout

Valide qu'une partie complete (start → launch → jouer → 3 pertes → game_over → restart)
reste synchronisee sur les 4 apps (server, playfield, backglass, DMD).

## Procedure de lancement (copier-coller)

Depuis la racine du repo, installer une fois puis tout lancer :

```bash
# Install dependencies (une seule fois)
npm install --prefix server
npm install --prefix playfield
npm install --prefix backglass
npm install --prefix dmd

# Lancer les 4 apps en parallele
npm run dev:all
```

URLs des ecrans :

- Playfield : http://localhost:5173 (focus clavier obligatoire)
- Backglass : http://localhost:5174
- DMD : http://localhost:5175
- Serveur Socket.IO : http://localhost:3000

Astuce multi-ecran : 3 fenetres cote a cote (playfield focus clavier, backglass, DMD).

## Controles clavier (playfield)

| Touche | Action |
|--------|--------|
| `Enter` ou `S` | `start_game` |
| `Space` | `launch_ball` (plunger) |
| `ArrowLeft` | flipper gauche (down/up) |
| `ArrowRight` | flipper droit (down/up) |
| `R` | reset local de la bille (debug) |

## Scenario nominal

Checks attendus a chaque etape sur les 3 ecrans.

### 1. Boot (4 apps lancees, aucune action)

- Backglass : `score=0`, `billes=3`, `status=idle`
- DMD : `PRESS START`, `PTS 0`
- Playfield : bille visible au spawn plunger, etat idle (Space sans effet)

### 2. `Enter` (ou `S`) — `start_game`

- Server → `game_started` + `state_updated` + `dmd_message: "BALL 1"`
- Backglass : `status=playing`, `score=0`, `billes=3`
- DMD : `BALL 1`
- Playfield : bille repositionnee au spawn, Space a present actif

### 3. `Space` — `launch_ball`

- Server → `state_updated` (lastEvent=`launch_ball`)
- Playfield : bille propulsee vers le haut du plateau (Z-)
- Relancer `Space` immediatement : aucune nouvelle impulsion (flag anti double-launch)

### 4. Jeu — flippers + collisions + bumpers

- `ArrowLeft` / `ArrowRight` : flippers repondent immediatement
- Bumper touche (`collision { type: "bumper" }`) : +100 au score
- `wall` / `flipper` : relayes sans score
- Backglass et DMD refletent le score serveur en direct

### 5. Drain — `ball_lost`

- Bille passe par l'ouverture drain (Z+)
- Server : `ballsLeft-=1`, `currentBall+=1`, `dmd_message: "BALL 2"` (puis 3)
- Backglass : `billes` decrementee
- DMD : `BALL 2` puis `BALL 3`
- Playfield : bille respawn automatique au plunger, Space re-actif

### 6. 3e perte — `game_over`

- Server : `status=game_over`, `dmd_message: "GAME OVER"` puis `game_over`
- Backglass : `status=game_over`, `billes=0`, score final conserve
- DMD : `GAME OVER` (le score final reste affiche)
- Playfield : Space desactive (status != playing), flippers relayes mais sans scoring

### 7. Restart — `Enter` apres `game_over`

- Server : reinitialise (score=0, billes=3, currentBall=1), emet `game_started` + `dmd_message: "BALL 1"`
- Les 3 ecrans repartent dans l'etat du pas (2)

## Edge-cases a verifier

- `Enter` pendant `playing` : ignore par le serveur (pas de reset).
- `Space` hors partie : ignore cote client (guard `gameState.status === "playing"`).
- `collision` avec `type` invalide : ignore par le serveur.
- `ball_lost` hors partie : ignore par le serveur.
- Ouverture tardive d'un ecran (backglass/DMD apres `start_game`) : le `state_updated`
  envoye a la connexion le remet d'aplomb.

## Regressions a surveiller

- Double `launch_ball` (ne doit emettre qu'une fois par vie).
- Double `ball_lost` sur un meme drain (flag `ballLostEmitted`).
- Desynchro score backglass/DMD apres une rafale de bumpers.
- DMD qui repasse a `READY` apres `GAME OVER` (ne doit pas arriver : le message
  reste jusqu'au prochain `dmd_message`).

## Bugs bloquants MVP

_Aucun connu a date — si rencontres, ouvrir un ticket avec l'etape du scenario,
la touche tapee, et l'ecart observe ecran par ecran._
