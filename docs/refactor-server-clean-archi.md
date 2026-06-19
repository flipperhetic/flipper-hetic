# Refactor `server/` — Clean Architecture + POO + migration WebSocket

> Plan de refactor à valider **avant** d'écrire le code.
> Deux objectifs liés :
> 1. **Clean Archi / POO** : appliquer les remarques du prof sur
>    `server/src/adapters/socketHandlers.js` (fonction trop longue, code « en dur »
>    dans les `.on`, listes de fonctions à transformer en classes instanciées).
> 2. **Transport** : remplacer **Socket.IO** par **WebSocket natif** (lib `ws` côté
>    serveur, `WebSocket` natif côté navigateur) — cf. §8.
>
> Le point clé : isoler le transport dans des classes adaptateurs (Clean Archi) rend
> le passage Socket.IO → WebSocket **localisé** ; le domaine et les use cases n'y
> touchent pas. On vise un comportement fonctionnel **identique** (mêmes événements,
> mêmes payloads, même scoring) — les tests sont adaptés au nouveau transport mais
> valident les mêmes scénarios.

---

## 1. Problèmes actuels (rappel des remarques)

Fichier visé : `server/src/adapters/socketHandlers.js`.

| # | Remarque prof | Constat dans le code |
|---|---------------|----------------------|
| 1 | Les `.on` = callbacks, **pas de code en dur** → mettre dans une fonction | Le callback `connection` (l.91→177) contient **toute** la logique inline : start, launch, flippers, collision, ball_lost, reset highscore, cabinet button. |
| 2 | Fonctions **ciblées** qui font **1 seule chose** (SRP) | `registerSocketHandlers` fait : resync connexion + 7 handlers + scoring + persistance highscore + timers + broadcast. |
| 3 | Au-dessus du `.on`, **nommer la fonction** → créer le fichier correspondant | Plusieurs `.on` n'ont aucune fonction/use case dédié (`launch_ball`, flippers, `reset_highscore`, `cabinet_button`). |
| 4 | **USE CASE = BIEN** (cf. `usecases/applyCollision.js`) | Pattern déjà bon pour `startGame`, `loseBall`, `applyCollision` — mais incomplet et appelé depuis un gros bloc. |
| 5 | **Transformer les listes de fonctions en classes qu'on instancie** | `socketHandlers.js` = un sac de fonctions module + état global mutable (`state`, `lastDmdMessage`, `gameOverTimeoutId`, `highScoreBeatAnnounced`) + I/O fichier mélangée au transport. |

**Violations Clean Archi / SOLID identifiées :**
- **SRP** : le transport (Socket.IO) fait aussi de la persistance fichier (`fs`) et de l'orchestration métier.
- **DIP** : la persistance highscore est codée en dur (`fs`, chemin fichier) dans la couche transport au lieu d'être une dépendance injectée.
- État global mutable au niveau module → pas testable/instanciable proprement (POO).

---

## 2. Cible : couches et responsabilités

On garde la séparation Clean Archi déjà amorcée et on la complète **en POO** :

```
server/src/
├── domain/                      # Entités + règles métier pures (aucun framework)
│   ├── GameState.js             # (inchangé) entité, déjà une classe
│   └── scoring.js               # (inchangé) règles de points pures
│
├── usecases/                    # Cas d'usage applicatifs = 1 classe = 1 action
│   ├── StartGame.js             # classe, execute(state)
│   ├── LaunchBall.js            # NOUVEAU (extrait du .on launch_ball)
│   ├── ApplyCollision.js        # classe (depuis applyCollision.js)
│   ├── LoseBall.js              # classe (depuis loseBall.js)
│   └── ResetHighScore.js        # NOUVEAU (extrait du .on reset_highscore)
│
└── adapters/                    # Couche transport / infra (Socket.IO, fichiers)
    ├── persistence/
    │   └── HighScoreRepository.js   # NOUVEAU — classe I/O fichier (load/save)
    ├── socket/
    │   ├── GameBroadcaster.js       # NOUVEAU — classe : tous les io.emit / relay
    │   ├── GameSession.js           # NOUVEAU — classe : état partie + orchestration
    │   └── SocketController.js      # NOUVEAU — classe : câblage des .on
    └── socketHandlers.js            # composition locale : assemble les classes,
                                     #   garde registerSocketHandlers/resetState
                                     #   (contrat public utilisé par index.js + tests)
```

### Rôle de chaque classe

- **`HighScoreRepository`** (infra persistance) — *une seule chose : lire/écrire le highscore sur disque.*
  - `async load(): number`
  - `async save(highScore): void`
  - Isole `fs`, le chemin `highscore.json`, et le try/catch hors du transport (corrige SRP + DIP).

- **`GameBroadcaster`** (transport sortant) — *une seule chose : émettre vers les clients.*
  - `constructor(io)`
  - `emitState(state)`, `emitDmd(text)`, `emitGameStarted(state)`, `emitGameOver(state)`,
    `emitSpecialEvent(type)`, `emitHighScoreBeat(score, highScore)`
  - `relayToOthers(socket, event, payload)` (broadcast pur flippers / cabinet)
  - Centralise les `io.emit(...)` (et les `console.log` de debug existants).

- **`GameSession`** (orchestration applicative) — *tient l'état d'une partie et enchaîne use case → broadcast.*
  - `constructor({ broadcaster, highScoreRepository })`
  - État encapsulé (plus de variables module) : `#state (GameState)`, `#lastDmdMessage`,
    `#gameOverTimeoutId`, `#highScoreBeatAnnounced`.
  - `async init()` : charge le highscore via le repository.
  - 1 méthode courte par action client, chacune = appel use case + emit :
    `startGame()`, `launchBall()`, `applyCollision(type)`, `loseBall()`,
    `resetHighScore()`, `relayFlipper(socket, event, payload)`,
    `relayCabinetButton(socket, payload)`.
  - `sendSnapshotTo(socket)` : resync à la connexion (state courant + dernier DMD).
  - `reset()` : remet à zéro + annule le timer (pour l'isolation des tests).

- **`SocketController`** (transport entrant) — *une seule chose : brancher les `.on` sur les méthodes nommées.*
  - `constructor(io, session)`
  - `register()` : `io.on("connection", socket => this.#onConnection(socket))`
  - `#onConnection(socket)` : `session.sendSnapshotTo(socket)` puis **un `.on` par événement**,
    chaque callback ne fait qu'appeler **une méthode nommée** (déléguée à la session).
    Plus aucune logique métier dans les `.on`.

### Avant / après (illustration du style visé)

**Avant** (logique en dur dans le `.on`) :
```js
socket.on(CLIENT_EVENTS.COLLISION, (payload) => {
  const type = payload && typeof payload.type === "string" ? payload.type : null;
  if (!type) return;
  if (type === 'tunnel' || type === 'tunnel-rv') {
    io.emit(SERVER_EVENTS.SPECIAL_EVENT, { event: type });
  }
  const result = applyCollision(state, type);
  if (result.changed) {
    emitState(io);
    if (result.highScoreBeat && !highScoreBeatAnnounced) { /* ... */ }
  }
});
```

**Après** (le `.on` ne fait que déléguer à une méthode nommée) :
```js
// SocketController#onConnection
socket.on(CLIENT_EVENTS.COLLISION, (payload) => this.#session.applyCollision(payload));
```
```js
// GameSession.applyCollision — courte, fait 1 chose : orchestrer le use case
applyCollision(payload) {
  const type = readCollisionType(payload);
  if (!type) return;
  if (isSpecialEvent(type)) this.#broadcaster.emitSpecialEvent(type);
  const result = this.#collisionUseCase.execute(this.#state, type);
  if (!result.changed) return;
  this.#broadcaster.emitState(this.#state);
  this.#announceHighScoreBeatIfNeeded(result);
}
```

---

## 3. Use cases : fonctions → classes

Le prof valide le pattern use case (`applyCollision.js`) mais demande de **transformer les
listes de fonctions en classes instanciées**. Je propose donc d'uniformiser les use cases en
**classes avec une méthode `execute(...)`** (pattern « Interactor » standard en Clean Archi) :

| Avant (fonction)              | Après (classe)                         |
|-------------------------------|----------------------------------------|
| `startGame(state)`            | `new StartGame().execute(state)`       |
| `loseBall(state)`             | `new LoseBall().execute(state)`        |
| `applyCollision(state, type)` | `new ApplyCollision().execute(state, type)` |
| *(inline)* launch_ball        | `new LaunchBall().execute(state)`      |
| *(inline)* reset_highscore    | `new ResetHighScore().execute(state)`  |

- La **logique métier reste identique** (copiée telle quelle dans `execute`).
- Les use cases restent **purs** (pas d'I/O, pas de Socket.IO) — ils reçoivent `state` et
  renvoient un résultat ; c'est la `GameSession` qui émet et persiste.
- `ResetHighScore.execute(state)` met juste `state.highScore = 0` ; la **persistance**
  (`repository.save(0)`) est faite par la session, pas par le use case (respect des couches).

> ⚠️ Point sur lequel je veux ton accord : passer les use cases existants de fonction à classe
> renomme les fichiers (`startGame.js` → `StartGame.js`, etc.). Si tu préfères **garder les use
> cases en fonctions** (le prof les a cités en exemple positif) et ne mettre en classes **que**
> `socketHandlers.js`, je le fais aussi — dis-moi.

---

## 4. Flippers & cabinet button : relais purs

Ces `.on` ne portent **pas** de logique métier (juste un broadcast aux autres clients +
mise à jour de `lastEvent`). Ils deviennent des méthodes nommées `relayFlipper` /
`relayCabinetButton` sur `GameSession` (commentées « relais transport pur »). Pas de use case
dédié car il n'y a pas de règle métier à isoler — ça resterait du sur-découpage.

---

## 5. Contrat public préservé (zéro régression)

- `adapters/socketHandlers.js` continue d'exporter **`registerSocketHandlers(io)`** et
  **`resetState()`** — c'est ce qu'importent `index.js` **et les deux fichiers de tests**.
  Ces fonctions deviennent une fine **composition root** :
  ```js
  let session = null;
  export function registerSocketHandlers(io) {
    const broadcaster = new GameBroadcaster(io);
    const repository  = new HighScoreRepository();
    session = new GameSession({ broadcaster, highScoreRepository: repository });
    session.init();                       // charge le highscore (fire-and-forget)
    new SocketController(io, session).register();
  }
  export function resetState() { session?.reset(); }
  ```
- **Aucun changement** d'événements, de payloads, de scoring, de timing (`GAME_OVER_BLOCK_MS`),
  ni de messages DMD → les tests `events.test.js` et `game-flow.test.js` passent sans
  modification.

---

## 6. Étapes d'implémentation (ordre)

**Phase A — Clean Archi / POO (serveur, transport encore Socket.IO) :**
1. `adapters/persistence/HighScoreRepository.js` (extraction `fs`).
2. `usecases/` → classes : `StartGame`, `LaunchBall`, `ApplyCollision`, `LoseBall`, `ResetHighScore`.
3. `adapters/transport/GameBroadcaster.js`.
4. `adapters/transport/GameSession.js`.
5. `adapters/transport/SocketController.js`.
6. Réécrire `adapters/socketHandlers.js` en composition root (garde les 2 exports).
7. `npm test` (serveur) → **vert** avant de continuer.

**Phase B — Migration Socket.IO → WebSocket (cf. §8) :**
8. `shared/` : codec d'enveloppe (`encodeMessage` / `decodeMessage`).
9. Serveur : `GameBroadcaster` + `SocketController` réécrits sur `ws` ; `index.js` (`WebSocketServer`).
10. Clients : `playfield`, `backglass`, `dmd` → `network.js` sur `WebSocket` natif + reconnexion.
11. `bridge/server.js` → client `ws`.
12. Tests serveur + `backglass/network.test.js` adaptés au transport `ws`.
13. `npm test` partout → **vert**. Retrait des deps `socket.io` / `socket.io-client`.

---

## 7. Hors périmètre (pour cette passe)

- On ne touche **pas** à `domain/GameState.js` ni `domain/scoring.js` (déjà propres).
- On ne touche **pas** au `firmware/` (communication série, pas de Socket.IO).
- Les docs (`docs/EVENTS.md`, `ARCHITECTURE.md`, etc.) seront mis à jour en fin de course
  (mention « Socket.IO » → « WebSocket »), pas pendant le code.

---

## 8. Migration Socket.IO → WebSocket natif (`ws`)

### 8.1 Pourquoi ce n'est pas qu'un changement « serveur »
Socket.IO **n'est pas** du WebSocket standard : il ajoute son propre protocole (Engine.IO :
handshake HTTP, heartbeats, upgrade), le **multiplexage d'événements nommés** (`emit("x", data)`),
le **broadcast** / `broadcast.emit` (à tous sauf l'émetteur), et la **reconnexion automatique**.
Un serveur `ws` natif ne parle pas ce protocole → **tous** les pairs doivent migrer en même temps :
serveur, `playfield`, `backglass`, `dmd`, et `bridge/`.

### 8.2 Inventaire des points à migrer
| Fichier | Usage Socket.IO actuel | Devient |
|---------|------------------------|---------|
| `server/src/index.js` | `new Server(httpServer, { cors })` | `new WebSocketServer({ server })` |
| `server/src/adapters/...` | `io.on("connection")`, `io.emit`, `socket.on`, `socket.broadcast.emit` | API `ws` (cf. 8.4) |
| `playfield/src/adapters/network.js` | `io(URL)`, `socket.on`, `socket.emit(...)` | `WebSocket` natif + envoi d'enveloppes |
| `backglass/src/adapters/network.js` | `io(URL)`, `socket.on` | idem |
| `dmd/src/adapters/network.js` | `io(URL)`, `socket.on` | idem |
| `bridge/server.js` | `io(URL)`, `socket.emit("cabinet_button")` | client `ws` (node) |
| tests serveur (`*.test.js`) | `socket.io-client` + `new Server` | client/serveur `ws` |
| `backglass/.../network.test.js` | `vi.mock("socket.io-client")` | mock du `WebSocket` |

### 8.3 Protocole d'enveloppe (le gros du travail)
Le WebSocket natif transporte des **trames** (texte/binaire), pas des « événements nommés ».
On définit donc un format JSON unique, partagé via `shared/` (les noms d'événements existants
dans `shared/src/eventNames.js` restent inchangés) :

```jsonc
// Trame texte échangée dans les deux sens
{ "event": "state_updated", "data": { /* payload */ } }
```

Ajout dans `shared/` d'un petit codec testable :
```js
export function encodeMessage(event, data)  { return JSON.stringify({ event, data }); }
export function decodeMessage(raw) { /* JSON.parse + garde-fous (event string, data objet) */ }
```

### 8.4 Côté serveur — le transport reste isolé dans 2 classes
Grâce à la Phase A, **seules** `GameBroadcaster` et `SocketController` connaissent `ws` :
- **`GameBroadcaster`** : garde un `Set<WebSocket>` de clients.
  - `emitState(state)` → `broadcast(encodeMessage(STATE_UPDATED, state.toJSON()))` à **tous**.
  - `relayToOthers(sender, event, payload)` → envoie à tous **sauf** `sender` (remplace
    `socket.broadcast.emit`).
  - `sendTo(client, event, data)` → resync à la connexion.
  - Gère l'ajout/retrait des clients (`open` / `close`).
- **`SocketController`** :
  - `wss.on("connection", ws => …)` ; sur chaque `ws.on("message", raw => …)` : `decodeMessage`
    puis **dispatch** vers la méthode `GameSession` correspondante (table `event → handler`,
    pas de `if` géant — toujours « 1 handler nommé par événement »).
- **Reconnexion** : Socket.IO la faisait tout seul ; en natif, c'est **le client** qui doit
  reconnecter (cf. 8.5). Le serveur n'a rien de spécial à faire.
- **CORS** : non applicable au WebSocket natif (pas de pré-vol) ; on peut valider `Origin` si on
  veut, mais ce n'est pas requis pour le local.

### 8.5 Côté client — `network.js` (×3)
Chaque `network.js` garde **exactement la même signature** `initNetwork(callbacks)` (donc `main.js`
et les helpers d'émission ne changent quasiment pas) mais en interne :
- ouvre `new WebSocket("ws://localhost:3000")` ;
- `ws.onmessage` → `decodeMessage` → `switch (event)` → appelle le bon callback ;
- expose un objet compatible avec l'usage actuel `socket.emit(EVENT, payload)` via un petit
  wrapper `{ emit(event, data) { ws.send(encodeMessage(event, data)); } }` → **zéro changement**
  dans les `emitStartGame`, `emitCollision`, etc. du playfield ;
- **reconnexion auto** : sur `onclose`/`onerror`, retry avec backoff (préserve le comportement
  de l'overlay « Serveur hors ligne » qui repose sur `onConnect`/`onConnectionError`).

### 8.6 Bridge
`bridge/server.js` : remplacer `io(SERVER_URL)` par un client `ws` (`new WebSocket("ws://server:3000")`)
+ reconnexion (le bridge a déjà sa propre logique de retry série, on ajoute le retry WS), et
`socket.emit("cabinet_button", …)` → `ws.send(encodeMessage(CABINET_BUTTON, …))`.

### 8.7 Tests
- Tests serveur : remplacer `socket.io-client` par un client `ws` natif et `new Server` (socket.io)
  par `WebSocketServer`. Helpers `waitFor` adaptés (écoute `message` + filtrage sur `event`).
  Les **assertions métier ne changent pas** (mêmes scénarios start/scoring/game_over/relay).
- `backglass/network.test.js` : remplacer le mock `socket.io-client` par un faux `WebSocket`.

### 8.8 Dépendances
- **Retirer** : `socket.io` (server), `socket.io-client` (playfield, backglass, dmd, bridge).
- **Ajouter** : `ws` (server + bridge ; node). Les navigateurs utilisent le `WebSocket` natif → pas de dep front.

---

### Décisions qui attendent ton OK
1. **Use cases en classes** (`execute`) — recommandé pour la cohérence POO — *ou* les garder en fonctions ?
2. Découpage en sous-dossiers `adapters/persistence/` et `adapters/transport/` — OK ou tout à plat dans `adapters/` ?
3. **Périmètre / ordre** : on fait **Phase A puis Phase B** dans la foulée (recommandé), ou tu veux **valider la Phase A** (clean archi, tests verts) **avant** d'attaquer la migration WebSocket ?
4. **Lib WebSocket serveur** : `ws` (standard de fait, léger) — OK ?
```
