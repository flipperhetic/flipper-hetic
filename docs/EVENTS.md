# Realtime Contract MVP — Events & Payloads

Source de vérité: `shared/src/eventNames.js` (importé par le serveur et tous les clients).

Transport: **WebSocket natif** (`ws` côté serveur, `WebSocket` du navigateur côté clients). Le module `shared/src/realtimeClient.js` expose une API façon Socket.IO (`on` / `off` / `emit`) au-dessus du WebSocket natif — les noms d'événements ci-dessous transitent dans des trames encodées par `shared/src/protocol.js`.

Ce document centralise les noms d'événements et les payloads attendus pour brancher un client (playfield, backglass, dmd) sans lire le code serveur.

## CLIENT_EVENTS (client -> serveur)

| Événement | Payload | Description |
|---|---|---|
| `start_game` | — | Démarre ou redémarre une partie |
| `launch_ball` | — | Lance la bille depuis le tunnel |
| `flipper_left_down` | optionnel | Relayé aux autres clients |
| `flipper_left_up` | optionnel | Relayé aux autres clients |
| `flipper_right_down` | optionnel | Relayé aux autres clients |
| `flipper_right_up` | optionnel | Relayé aux autres clients |
| `ball_lost` | — | Bille passée dans le drain |
| `collision` | `{ "type": string }` | Collision détectée (voir types ci-dessous) |
| `reset_highscore` | — | Remet le meilleur score à zéro (debug) |
| `cabinet_button` | `{ "id": string, "action": "DOWN"\|"UP" }` | Bouton physique cabine (bridge / ESP32) ; relayé en broadcast aux autres clients |

### Types de collision et scoring

| `type` | Points | Description |
|---|---|---|
| `bumper_50` | +50 | Bumper barril (utilisé dans le niveau actuel) |
| `bumper_10` | +10 | Bumper losange / triangle (utilisé dans le niveau actuel) |
| `bumper` | +100 | Bumper générique (type valide côté serveur, non utilisé dans le niveau actuel) |
| `tunnel` | +1500 | Zone Gas-Mask (déclenche `special_event`) |
| `tunnel-rv` | +500 | Zone RV (déclenche `special_event`) |
| `wall` | +0 | Mur (valide, sans points) |
| `flipper` | +0 | Flipper (valide, sans points) |
| `drain` | +0 | Drain (valide, sans points) |
| `triangle` | +0 | Obstacle triangle/arche (valide, sans points) |

> Note : `slingshot` est géré localement par le playfield (actionneurs + son) mais n'est **pas** un type valide côté serveur (`isValidCollisionType` retourne `false`). Le serveur rejette silencieusement les collisions de ce type.

## SERVER_EVENTS (serveur -> clients)

| Événement | Description |
|---|---|
| `state_updated` | État complet de la partie |
| `game_started` | Partie démarrée (contient l'état initial) |
| `game_over` | Fin de partie (contient l'état final) |
| `dmd_message` | Message à afficher sur le DMD |
| `special_event` | Événement spécial déclenché (tunnel Gas-Mask ou RV) |
| `highscore_beat` | Nouveau meilleur score atteint pendant la partie |

## Objet d'état (`state_updated`)

Le serveur diffuse `state_updated`:
- à la connexion d'un client,
- après les mises à jour d'état (start game, launch ball, collision valide, ball lost).

Forme de l'objet:

```json
{
  "status": "idle | playing | game_over",
  "score": 0,
  "highScore": 0,
  "ballsLeft": 3,
  "currentBall": 1,
  "lastEvent": "string | null"
}
```

Notes:
- `lastEvent` peut valoir par exemple: `start_game`, `launch_ball`, `ball_lost`, `collision:bumper`.
- `highScore` est persistant sur disque entre les parties.

## Exemples JSON

### `collision` (client -> serveur)

```json
{ "type": "bumper_50" }
```

### `dmd_message` (serveur -> clients)

```json
{ "text": "BALL 1" }
```

Valeurs possibles: `"BALL 1"`, `"BALL 2"`, `"BALL 3"`, `"GAME OVER"`, `"PRESS START"`.

### `special_event` (serveur -> clients)

Émis par le serveur quand `collision` reçoit `type: "tunnel"` ou `type: "tunnel-rv"`.

```json
{ "event": "tunnel" }
```

```json
{ "event": "tunnel-rv" }
```

### `highscore_beat` (serveur -> clients)

Émis une seule fois par partie quand le score dépasse le meilleur score.

```json
{ "score": 5100, "highScore": 5100 }
```

### `game_started` (serveur -> clients)

```json
{
  "status": "playing",
  "score": 0,
  "highScore": 0,
  "ballsLeft": 3,
  "currentBall": 1
}
```

### `game_over` (serveur -> clients)

```json
{
  "status": "game_over",
  "score": 200,
  "highScore": 200,
  "ballsLeft": 0,
  "currentBall": 4
}
```

## Comportement important

- Si `start_game` est envoyé alors que `status === "playing"`, le serveur ignore.
- Si `collision` a un `type` invalide ou inconnu, le serveur ignore.
- Si `ball_lost` est envoyé hors partie (`status !== "playing"`), le serveur ignore.
- Les events flippers (`flipper_*`) sont relayés en broadcast aux autres clients (pas d'émetteur).
- `highscore_beat` n'est émis qu'une seule fois par partie, même si le score continue de monter.
- Après `game_over`, le serveur repasse automatiquement en `idle` après ~6 secondes (si le joueur ne relance pas de partie).

## Couche d'input Playfield (clavier / futur IoT)

Le playfield utilise une couche d'abstraction d'inputs dans `playfield/src/adapters/input/InputController.js`.

But :
- découpler la logique de jeu des périphériques concrets,
- garder le clavier comme source actuelle,
- permettre plus tard de brancher un ESP32/Arduino sans refactor majeur.

### Actions exposées par la couche input

- `start()`
- `launch()`
- `leftFlipperDown()`
- `leftFlipperUp()`
- `rightFlipperDown()`
- `rightFlipperUp()`

### Mapping clavier (playfield)

Aligné sur l'**annexe IoT** du sujet HETIC Web3 (simulation clavier matériel) :

- Flipper gauche : **`X`**
- Flipper droit : **`C`**
- Start : **`D`**
- Pièce entrée : **`F`** (MVP : équivalent **Start** côté client)

Raccourcis supplémentaires : **Start** aussi `Enter` / `NumpadEnter` ; flippers aussi **`ArrowLeft`** / **`ArrowRight`** (dev / accessibilité).

- Launch : **`Space`**

### Intégration future ESP32 / Arduino

Quand les inputs physiques seront disponibles, ils ne devront pas appeler
directement la logique du playfield ou les emits WebSocket.

Ils devront uniquement appeler les actions de la couche input directement via
`controller.<action>()`.

Exemple :

```js
controller.start();
controller.leftFlipperDown();
controller.leftFlipperUp();
controller.rightFlipperDown();
controller.rightFlipperUp();
controller.launch();
```

Ainsi :
- le clavier et l'IoT partagent exactement le même chemin logique,
- les règles de jeu restent centralisées,
- le branchement matériel futur se fait sans dupliquer la logique.

### Contrat firmware contrôleurs (USB HID clavier)

Mode recommandé pour l'annexe IoT du sujet HETIC : l'ESP32 / Arduino se déclare
**clavier USB HID** et envoie les keycodes ci-dessous. Aucun code playfield à
modifier — `bindKeyboardInput` consomme déjà ces touches.

| Action | Touche à envoyer | Comportement attendu côté firmware |
| --- | --- | --- |
| Flipper gauche | `X` | press tant que la batte est tenue ; release au relâchement |
| Flipper droit | `C` | press tant que la batte est tenue ; release au relâchement |
| Start | `D` | impulsion (press / release) |
| Pièce | `F` | impulsion (press / release) — équivalent Start en MVP |

Exigences :
- **Debounce matériel/firmware** : filtrer les rebonds physiques avant émission
  (typique : 5–10 ms). Reste de la responsabilité firmware pour les flippers
  (pas de garde logicielle côté release afin de préserver la réactivité).
- **Debounce logiciel sur `start`** : le playfield applique en plus un debounce
  de 200 ms sur les impulsions `start` (touches `D` / `F` / `Enter`) pour
  absorber un éventuel bounce côté firmware sans déclencher deux `start_game`
  d'affilée. Pas de pénalité UX : on n'a jamais besoin de relancer une partie
  deux fois dans 200 ms.
- **Press / release symétriques** pour les flippers : un `keydown` sans `keyup`
  correspondant laisserait la batte enfoncée. Le playfield met en place un
  filet `blur` qui relâche les flippers si la fenêtre perd le focus, mais le
  firmware reste responsable de l'envoi du release.
- **Focus** : la fenêtre du playfield doit avoir le focus pour recevoir les
  touches HID (cas standard d'un PC en cabine).
