# Firmware ESP32 — boutons cabinet

Firmware PlatformIO pour la carte ESP32 du cabinet flipper-hetic. Lit les
boutons physiques cables entre une GPIO et GND, et emet les fronts sur le
port serie USB sous la forme :

```
BTN:<ID>:DOWN
BTN:<ID>:UP
```

Le `bridge/` (conteneur Docker dans le cabinet) lit ces lignes et les
relaie au server socket.io. Le playfield ecoute les events `cabinet_button`
et appelle l'`inputController` (meme chemin que le clavier).

## Pinout

| ID firmware            | GPIO | Bouton physique     | Mapping playfield   |
| :--------------------- | :--: | :------------------ | :------------------ |
| `BLACK_LEFT`           |  16  | bouton noir gauche  | flipper gauche      |
| `WHITE_LEFT`           |   4  | bouton blanc gauche | —                   |
| `FRONT_LEFT_GREEN`     |  17  | front green         | **start** (impulsion) |
| `FRONT_LEFT_YELLOW`    |  18  | front yellow        | —                   |
| `FRONT_LEFT_RED`       |  19  | front red           | —                   |
| `BLACK_RIGHT`          |  13  | bouton noir droit   | flipper droit       |
| `WHITE_RIGHT`          |  25  | bouton blanc droit  | —                   |
| `FRONT_WHITE`          |  33  | front white         | —                   |
| `PLUNGER`              |  32  | plunger / tirette   | **launch** (au relachement) |

> Le mapping ID -> action vit dans `playfield/src/adapters/cabinetInput.js`.
> Pour activer un bouton inutilise, ajouter une branche dans le `switch`.

Tous les boutons cables entre la GPIO et GND. Le firmware active la
resistance de tirage interne (`INPUT_PULLUP`) — pas de resistance externe
necessaire. Anti-rebond logiciel 8 ms.

## Build et deploiement

**Le firmware n'est pas televerse manuellement.** Le cabinet flashe au Load.

1. Modifier `firmware/src/main.cpp` localement.
2. Push sur `main` -> le workflow `.github/workflows/firmware.yml` build le
   firmware (PlatformIO), merge avec esptool, et commit `firmware/build/firmware.bin`.
3. Dashboard cabinet (`http://100.125.185.88:8080`) -> badge update sur ton
   app -> Load. Le cabinet flashe l'ESP32 puis redemarre les services Docker.

La declaration cabinet vit dans `fliphetic.toml` :

```toml
[esp32.esp32]
firmware   = "firmware/build/firmware.bin"
chip       = "esp32"
flash_addr = "0x0"
baud       = 115200
required   = false
```

## Build local (optionnel)

Pour iterer rapidement sans pousser :

```sh
cd firmware
pio run                                                       # compile
pio run --target upload --upload-port COM3                    # flash via USB
pio device monitor --baud 115200                              # lit le serial
```

Au boot, rien ne s'affiche tant qu'aucun bouton n'est presse — chaque appui
produit `BTN:<ID>:DOWN`, chaque relache `BTN:<ID>:UP`.
