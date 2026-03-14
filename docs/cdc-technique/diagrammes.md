# Diagrammes UML

Au minimum 3 diagrammes sont attendus pour le CDC. **Placer dans ce dossier** (`docs/cdc-technique/`) les 3 PNG exportés, avec les noms exacts ci-dessous, pour que les aperçus s’affichent :

1. **Use case — Système Flipper** → `use-case-diagram.png`  
2. **Séquence — Lancer une partie** → `sequence-lancer-partie.png`  
3. **États — Cycle de vie partie** → `state-cycle-vie-partie.png`  

---

## 1. Use case (Système Flipper)

Acteurs : Joueur, Système, Arduino. Packages : Actions Joueur, Interactions IoT, Traitements Système. Use cases UC01–UC16 avec relations include/extend.

![Use case - Système Flipper](use-case-diagram.png)

---

## 2. Séquence — Lancer une partie

Joueur → Playfield → Serveur (start_game) ; Serveur initialise score, ballsLeft, state ; broadcast game_started vers Playfield, Backglass, DMD ; création bille, affichage score et messages.

![Séquence - Lancer une partie](sequence-lancer-partie.png)

---

## 3. États — Cycle de vie partie

IDLE → READY (insert_coin) → PLAYING (start_game) → GAME_OVER (ball_lost, ballsLeft=0) ; retours READY/IDLE avec timeout ou start_game.

![États - Cycle de vie partie](state-cycle-vie-partie.png)
