## P0 — MVP (obligatoire)

> **État du code :** le MVP est implémenté avec un moteur physique **Rapier** côté playfield (remplacement de Cannon-es). Les lignes ci-dessous restent la grille de référence initiale.

| Tâche | Priorité | Owner | DoD | Dépendances | Estimation |
|-------|----------|-------|-----|-------------|------------|
| Serveur WebSocket : connexion, broadcast état (score, balles, gameOver) | P0 | À assigner | Le serveur écoute sur un port, accepte des clients, envoie l’état à tous les clients connectés. Test manuel avec 2 clients. | Aucune | M |
| Playfield : scène Three.js (caméra, lumières, sol/grille) | P0 | À assigner | Une page affiche une scène 3D avec sol visible, caméra et lumières. Pas de crash. | Aucune | S |
| Playfield : monde physique Rapier (gravité, sol, step) | P0 | À assigner | Un monde physique avec gravité et un sol est créé ; step() appelé en boucle. | Playfield scène 3D | S |
| Playfield : bille avec physique (corps Rapier + mesh Three.js) | P0 | À assigner | Une bille apparaît sur le playfield, tombe et rebondit sur le sol. Position mesh = position body. | Playfield 3D + physique | M |
| Backglass : affichage score et nombre de balles depuis le serveur | P0 | À assigner | Le backglass se connecte en WebSocket et affiche score et balles mis à jour en temps réel. | Serveur WebSocket | S |
| DMD : affichage état / messages depuis le serveur | P0 | À assigner | Le DMD se connecte en WebSocket et affiche un message ou état (ex. READY, score) mis à jour en temps réel. | Serveur WebSocket | S |
| Synchronisation des 3 écrans : même état reçu par playfield, backglass, DMD | P0 | À assigner | Un changement d’état côté serveur est visible sur les 3 apps dans un délai raisonnable (< 1 s). | Serveur + Playfield + Backglass + DMD | M |
| État de jeu côté serveur : score, balles, gameOver modifiables et broadcast | P0 | À assigner | Le serveur maintient score, balles, gameOver ; les met à jour (ex. via messages) et les envoie à tous les clients. | Serveur WebSocket | M |
| Lancer la bille (plunger) : input envoyé et bille propulsée sur le playfield | P0 | À assigner | Une action “lancer la bille” (clic ou touche) envoie un event au serveur / playfield et la bille est propulsée (ou apparaît et roule). | Bille physique, sync écrans | M |
| Batteurs gauche et droit : inputs + réaction dans le jeu | P0 | À assigner | Les inputs “batteur gauche” et “batteur droit” (clavier ou bouton) sont envoyés et la bille réagit (rebond ou logique métier). | Bille physique, sync écrans | M |

---

## P1

| Tâche | Priorité | Owner | DoD | Dépendances | Estimation |
|-------|----------|-------|-----|-------------|------------|
| Démarrer une partie : nouveau game, reset score/balles | P1 | À assigner | Une action “démarrer partie” remet score et balles à l’état initial et permet de jouer. | État serveur, sync | S |
| Game Over et fin de partie quand plus de balles | P1 | À assigner | Quand balles = 0 (ou condition définie), gameOver = true, affiché sur les 3 écrans, plus d’actions de jeu. | État serveur, sync | S |
| Détection perte de bille (hors playfield) et décrément balles | P1 | À assigner | Quand la bille sort du playfield (zone ou trou), balles est décrémenté et état broadcast. | Bille physique, état serveur | M |
| Détection collisions (mur, bumper, batteur, trou) et typage | P1 | À assigner | Les collisions sont détectées par type ; un event ou log est émis (pas obligatoirement le score tout de suite). | Bille physique, playfield | M |
| Gestion du score : points selon type de collision / cible | P1 | À assigner | Selon la collision (bumper, trou, etc.), des points sont ajoutés au score et broadcast. | Collisions, état serveur | M |
| Insérer une pièce (crédit) — optionnel | P1 | À assigner | Une action “insérer pièce” crédite la machine (ex. +1 crédit ou déblocage partie). DoD défini par l’équipe. | État serveur | S |

---

## P2

| Tâche | Priorité | Owner | DoD | Dépendances | Estimation |
|-------|----------|-------|-----|-------------|------------|
| Combos : bonus score sur enchaînements | P2 | À assigner | Des enchaînements (ex. 2 bumpers en peu de temps) donnent un bonus de points. Règles définies et testables. | Score, collisions | M |
| Nudge (secousse) : détection et effet sur la bille | P2 | À assigner | Une action “nudge” (input ou capteur) est détectée et a un effet sur la trajectoire de la bille (léger déplacement/impulsion). | Bille physique, inputs | L |
| Effets sonores sur événements (collision, batteur, etc.) | P2 | À assigner | Au moins 2 événements déclenchent un son distinct (ex. collision, batteur). Lecture côté client ou serveur selon choix. | Collisions / inputs | M |
| Musique de fond | P2 | À assigner | Une musique de fond joue pendant la partie (arrêt ou boucle en Game Over selon spec). | — | S |
| ESP32 : lecture boutons physiques et envoi events au serveur | P2 | À assigner | L’ESP32 envoie des events (ex. batteur gauche/droit, plunger) au serveur via WiFi/WebSocket. Doc ou schéma de câblage. | Serveur WebSocket | L |

---