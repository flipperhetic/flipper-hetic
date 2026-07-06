# Système d'actionneurs (haptique / solénoïdes)

## Vue d'ensemble

Le module `playfield/src/adapters/actuators.js` expose une API d'actionneurs appelée par `main.js` à chaque événement de jeu pertinent. En l'absence de matériel, la version simulation logue chaque déclenchement en console et joue les sons associés.

## Mapping événement → actionneur

| Événement de jeu           | Méthode actuateur    | Solénoïde cible (futur) |
|:---------------------------|:---------------------|:------------------------|
| Collision `"bumper"`       | `onBumperHit()`      | Bumper pop              |
| Collision `"slingshot"`    | `onSlingshotHit()`   | Slingshot               |
| Flipper gauche ou droit enfoncé | `onFlipperFire()` | Flipper gauche / droit |
| Bille perdue (drain)       | `onBallLost()`       | Drain / kickback        |
| Fin de partie              | `onGameOver()`       | —                       |
| Partie démarrée (futur)    | `onGameStart()`      | Éjecteur bille          |

## API

```js
import { createActuators } from "./adapters/actuators.js";

const actuators = createActuators(audio); // audio : instance AudioEngine, optionnel

actuators.onBumperHit();      // collision bumper
actuators.onSlingshotHit();   // collision slingshot
actuators.onFlipperFire();    // flipper gauche ou droit
actuators.onBallLost();       // bille dans le drain
actuators.onGameOver();       // fin de partie
actuators.onGameStart();      // début de partie (futur)
actuators.onMilestone();      // collision tunnel / milestone (futur)
```

## Version actuelle

La version actuelle (`adapters/actuators.js`) :
- délègue entièrement à `AudioEngine` (passé en injection à `createActuators(audio)`)
- n'a aucune dépendance externe propre — pas d'impact si `audio` est absent (`null`)
- `onBallLost()` est un no-op intentionnel (géré côté audio dans `main.js`)
- `onGameStart()` et `onMilestone()` sont présents pour usage futur, non appelés par `main.js` aujourd'hui

## Intégration future (ESP32 / WebSerial)

Pour brancher le matériel réel, créer `adapters/actuatorsHardware.js` avec la même interface et l'injecter dans `main.js` à la place de `createActuators()`. Le reste du code (`main.js`, use cases) ne change pas.

```js
// Exemple futur
import { createHardwareActuators } from "./adapters/actuatorsHardware.js";
const actuators = createHardwareActuators({ port: serialPort });
```

## Cible matériel HETIC (annexe sujet)

En soutenance, un flipper physique équipé prévoit notamment :

- **10 solénoïdes** (feedback « claquement ») pilotés par **2 IoT** via relais ;
- **Contrôleurs IoT** simulant le clavier du playfield : **X** (flipper gauche), **C** (flipper droit), **D** (start), **F** (pièce entrée).

Le mapping logiciel du playfield est aligné sur ces touches ; le câblage détaillé est un **document complémentaire** fourni avec le matériel.

## Architecture

Le module respecte la Clean Architecture :
- `adapters/actuators.js` est un **output adapter** (comme `adapters/network/NetworkAdapter.js`)
- `main.js` est la **composition root** qui branche les événements sur l'adapter
- Aucun use case ni domaine ne connaît les actionneurs directement
