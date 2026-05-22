# Firmware ESP32 — deux boutons / deux flippers

Lit deux boutons physiques et envoie les événements de flipper en série vers le
**playfield** (Web Serial). Chaque bouton pilote un flipper :

| Bouton  | GPIO (par défaut) | Appui | Relâché |
| :------ | :---------------- | :---- | :------ |
| Gauche  | `32`              | `PL`  | `RL`    |
| Droit   | `33`              | `PR`  | `RR`    |

> Compat : un firmware 1-bouton historique envoie `P`/`R` ; le playfield les
> traite comme le bouton **gauche**.

## Câblage

Chaque bouton se branche entre sa broche GPIO et **GND**. Le firmware active la
résistance de tirage interne (`INPUT_PULLUP`), donc **aucune résistance externe**
n'est nécessaire : la broche lit `HIGH` au repos et `LOW` quand on appuie.

```
GPIO 32 ──[ bouton gauche ]── GND
GPIO 33 ──[ bouton droit  ]── GND
```

Pour utiliser d'autres broches, modifier `PIN_FLIPPER_LEFT` / `PIN_FLIPPER_RIGHT`
en tête de `esp32-flippers.ino`.

## Téléversement

1. Ouvrir `esp32-flippers.ino` dans l'IDE Arduino (carte « ESP32 Dev Module »).
2. Vitesse série : **115200 bauds** (doit matcher `DEFAULT_BAUD_RATE` côté web).
3. Téléverser, puis fermer le moniteur série (il occupe le port).

## Connexion au jeu

Le playfield se connecte **automatiquement** à l'ESP32 :

- **Au démarrage**, il rouvre tout port déjà autorisé (`navigator.serial.getPorts()`).
- **À chaud**, il se rattache si l'ESP32 est branché après le chargement (événement `connect`).
- En cas de **débranchement**, il se reconnecte seul au rebranchement.

Les codes sont décodés par
[`playfield/src/adapters/webSerial.js`](../../playfield/src/adapters/webSerial.js)
(`SERIAL_PROTOCOL`).

### Première autorisation (une seule fois par PC + origine)

L'API Web Serial **impose un geste utilisateur** pour autoriser un port la
toute première fois. Sur le PC du flipper, lancer le playfield (Chrome/Edge, en
`localhost` ou HTTPS), cliquer une fois sur **« Connecter ESP32 »** et choisir le
port. Ensuite, à chaque ouverture du jeu, la connexion est automatique — plus
aucun clic.

### Vrai zéro-clic (mode kiosque, optionnel)

Pour éviter même ce premier clic sur une borne dédiée, pré-autoriser l'origine
via une **politique Chrome/Edge** (`SerialAllowAllPortsForUrls`). `getPorts()`
renvoie alors le port sans aucune invite et l'auto-connexion est totale.

Windows — `HKLM\SOFTWARE\Policies\Google\Chrome` (ou `\Microsoft\Edge`), valeur
JSON `SerialAllowAllPortsForUrls` :

```json
["http://localhost:5173", "https://flipper.local"]
```

> Remplacer par l'origine réelle servant le playfield (port Vite ou domaine).
> La permission est mémorisée **par origine** : garder une URL stable évite de
> ré-autoriser.
