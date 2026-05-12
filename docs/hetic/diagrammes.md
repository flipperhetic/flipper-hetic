# Diagrammes UML

Au minimum 3 diagrammes sont attendus pour le CDC. **Placer dans le dossier** `docs/hetic/diagrammes/` les PNG exportés, avec les noms ci-dessous, pour que les aperçus s’affichent :

1. **Use case — Système Flipper** → `usecasediagram.png`  
2. **Séquence — Lancer une partie** → `sequencediagram.png`  
3. **États — Cycle de vie partie** → `statediagram.png`  

---

## 1. Use case (Système Flipper)

Acteurs : Joueur, Système, Arduino. Packages : Actions Joueur, Interactions IoT, Traitements Système. Use cases UC01–UC16 avec relations include/extend.

![Use case - Système Flipper](diagrammes/usecasediagram.png)

---

## 2. Séquence — Lancer une partie

Joueur → Playfield → Serveur (start_game) ; Serveur initialise score, ballsLeft, state ; broadcast game_started vers Playfield, Backglass, DMD ; création bille, affichage score et messages.

![Séquence - Lancer une partie](diagrammes/sequencediagram.png)

---

## 3. États — Cycle de vie partie

IDLE → READY (insert_coin) → PLAYING (start_game) → GAME_OVER (ball_lost, ballsLeft=0) ; retours READY/IDLE avec timeout ou start_game.

![États - Cycle de vie partie](diagrammes/statediagram.png)
