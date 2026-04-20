# Socket Contract MVP — Events & Payloads

Source de vérité: `server/src/events.js`.

Ce document centralise les noms d'événements Socket.IO et les payloads attendus pour brancher un client (playfield, backglass, dmd) sans lire le code serveur.

## CLIENT_EVENTS (client -> serveur)

- `start_game`
- `launch_ball`
- `flipper_left_down`
- `flipper_left_up`
- `flipper_right_down`
- `flipper_right_up`
- `ball_lost`
- `collision`

### Payloads client

- `start_game`: pas de payload
- `launch_ball`: pas de payload
- `flipper_left_down`: payload optionnel (relay tel quel aux autres clients)
- `flipper_left_up`: payload optionnel (relay tel quel aux autres clients)
- `flipper_right_down`: payload optionnel (relay tel quel aux autres clients)
- `flipper_right_up`: payload optionnel (relay tel quel aux autres clients)
- `ball_lost`: pas de payload
- `collision`: payload obligatoire `{ "type": "bumper" | "wall" | "flipper" | "drain" }`

## SERVER_EVENTS (serveur -> clients)

- `state_updated`
- `game_started`
- `game_over`
- `dmd_message`

## Objet d'etat (`state_updated`)

Le serveur diffuse `state_updated`:
- a la connexion d'un client,
- apres les mises a jour d'etat (start game, launch ball, collision valide, ball lost).

Forme de l'objet:

```json
{
  "status": "idle | playing | game_over",
  "score": 0,
  "ballsLeft": 3,
  "currentBall": 1,
  "lastEvent": "string | null"
}
```

Notes:
- `lastEvent` peut valoir par exemple: `start_game`, `launch_ball`, `ball_lost`, `collision:bumper`.
- En cas de collision, seul `type: "bumper"` ajoute des points (`+100` en MVP).

## Exemples JSON demandes

### `collision` (client -> serveur)

```json
{
  "type": "bumper"
}
```

### `dmd_message` (serveur -> clients)

```json
{
  "text": "BALL 1"
}
```

Autres valeurs observees en MVP: `"BALL 2"`, `"BALL 3"`, `"GAME OVER"`.

### `game_started` (serveur -> clients)

```json
{
  "status": "playing",
  "score": 0,
  "ballsLeft": 3,
  "currentBall": 1
}
```

### `game_over` (serveur -> clients)

```json
{
  "status": "game_over",
  "score": 200,
  "ballsLeft": 0,
  "currentBall": 4
}
```

## Comportement important (MVP)

- Si `start_game` est envoye alors que `status === "playing"`, le serveur ignore.
- Si `collision` a un `type` invalide, le serveur ignore.
- Si `ball_lost` est envoye hors partie (`status !== "playing"`), le serveur ignore.
- Les events flippers (`flipper_*`) sont relays en broadcast aux autres clients.

## Couche d'input Playfield (clavier / futur IoT)

Le playfield utilise une couche d'abstraction d'inputs dans `playfield/src/input.js`.

But :
- decoupler la logique de jeu des peripheriques concrets,
- garder le clavier comme source actuelle,
- permettre plus tard de brancher un ESP32/Arduino sans refactor majeur.

### Actions exposees par la couche input

- `start()`
- `launch()`
- `leftFlipperDown()`
- `leftFlipperUp()`
- `rightFlipperDown()`
- `rightFlipperUp()`
- `debugResetBall()`

### Mapping clavier actuel

- Start : `S`, `D`, `Enter`, `NumpadEnter`
- Launch : `Space`
- Flipper gauche : `ArrowLeft`
- Flipper droit : `ArrowRight`
- Reset debug : `R`

### Integration future ESP32 / Arduino

Quand les inputs physiques seront disponibles, ils ne devront pas appeler
directement la logique du playfield ou les emits Socket.

Ils devront uniquement appeler les actions de la couche input, par exemple :

```js
controller.start();
controller.leftFlipperDown();
controller.leftFlipperUp();
controller.rightFlipperDown();
controller.rightFlipperUp();
controller.launch();
```

Ainsi :
- le clavier et l'IoT partagent exactement le meme chemin logique,
- les regles de jeu restent centralisees,
- le branchement materiel futur se fait sans dupliquer la logique.
