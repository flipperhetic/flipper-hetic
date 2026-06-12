# Socket Contract MVP — Events & Payloads

Source de vérité: `shared/src/eventNames.js` (importé par le serveur et tous les clients).

Ce document centralise les noms d'événements Socket.IO et les payloads attendus pour brancher un client (playfield, backglass, dmd) sans lire le code serveur.

## CLIENT_EVENTS (client -> serveur)

| Evenement | Payload | Description |
|---|---|---|
| `start_game` | — | Demarre ou redemarre une partie |
| `launch_ball` | — | Lance la bille depuis le tunnel |
| `flipper_left_down` | optionnel | Relay aux autres clients |
| `flipper_left_up` | optionnel | Relay aux autres clients |
| `flipper_right_down` | optionnel | Relay aux autres clients |
| `flipper_right_up` | optionnel | Relay aux autres clients |
| `ball_lost` | — | Bille passee dans le drain |
| `collision` | `{ "type": string }` | Collision detectee (voir types ci-dessous) |
| `reset_highscore` | — | Remet le meilleur score a zero (debug) |

### Types de collision et scoring

| `type` | Points | Description |
|---|---|---|
| `bumper_100` | +100 | Bumper principal (cylindre rouge) |
| `bumper_50` | +50 | Bumper secondaire |
| `bumper_25` | +25 | Bumper périphérique |
| `bumper_10` | +10 | Bumper faible (diamant, triangle) |
| `tunnel` | +1000 | Zone spéciale Tuco (déclenche `special_event`) |
| `tunnel-rv` | +5000 | Zone spéciale RV (déclenche `special_event`) |
| `wall` | +0 | Mur (valide, sans points) |
| `flipper` | +0 | Flipper (valide, sans points) |
| `drain` | +0 | Drain (valide, sans points) |

## SERVER_EVENTS (serveur -> clients)

| Evenement | Description |
|---|---|
| `state_updated` | Etat complet de la partie |
| `game_started` | Partie demarree (contient l'etat initial) |
| `game_over` | Fin de partie (contient l'etat final) |
| `dmd_message` | Message a afficher sur le DMD |
| `special_event` | Evenement special declenche (tunnel Tuco ou RV) |
| `highscore_beat` | Nouveau meilleur score atteint pendant la partie |

## Objet d'etat (`state_updated`)

Le serveur diffuse `state_updated`:
- a la connexion d'un client,
- apres les mises a jour d'etat (start game, launch ball, collision valide, ball lost).

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
{ "type": "bumper_100" }
```

### `dmd_message` (serveur -> clients)

```json
{ "text": "BALL 1" }
```

Valeurs possibles: `"BALL 1"`, `"BALL 2"`, `"BALL 3"`, `"GAME OVER"`, `"PRESS START"`.

### `special_event` (serveur -> clients)

Emis par le serveur quand `collision` recoit `type: "tunnel"` ou `type: "tunnel-rv"`.

```json
{ "event": "tunnel" }
```

```json
{ "event": "tunnel-rv" }
```

### `highscore_beat` (serveur -> clients)

Emis une seule fois par partie quand le score depasse le meilleur score.

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

- Si `start_game` est envoye alors que `status === "playing"`, le serveur ignore.
- Si `collision` a un `type` invalide ou inconnu, le serveur ignore.
- Si `ball_lost` est envoye hors partie (`status !== "playing"`), le serveur ignore.
- Les events flippers (`flipper_*`) sont relays en broadcast aux autres clients (pas d'emetteur).
- `highscore_beat` n'est emis qu'une seule fois par partie, meme si le score continue de monter.
- Apres `game_over`, le serveur repasse automatiquement en `idle` apres ~6 secondes (si le joueur ne relance pas de partie).

## Couche d'input Playfield (clavier / futur IoT)

Le playfield utilise une couche d'abstraction d'inputs dans `playfield/src/adapters/input.js`.

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

### Mapping clavier (playfield)

Aligné sur l’**annexe IoT** du sujet HETIC Web3 (simulation clavier matériel) :

- Flipper gauche : **`X`**
- Flipper droit : **`C`**
- Start : **`D`**
- Pièce entrée : **`F`** (MVP : équivalent **Start** côté client)

Raccourcis supplémentaires : **Start** aussi `Enter` / `NumpadEnter` ; flippers aussi **`ArrowLeft`** / **`ArrowRight`** (dev / accessibilité).

- Launch : **`Space`**
- Reset debug : **`R`**

### Integration future ESP32 / Arduino

Quand les inputs physiques seront disponibles, ils ne devront pas appeler
directement la logique du playfield ou les emits Socket.

Ils devront uniquement appeler les actions de la couche input, soit :
- directement via `controller.<action>()`,
- ou via `bindExternalInputSource(subscribe, controller)` dans `playfield/src/adapters/input.js`.

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
- le clavier et l'IoT partagent exactement le meme chemin logique,
- les regles de jeu restent centralisees,
- le branchement materiel futur se fait sans dupliquer la logique.

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
