# Use Cases

| ID    | Nom                                      | Acteur   | But |
|-------|-------------------------------------------|----------|-----|
| UC01  | Insérer une pièce (optionnel)            | Joueur   | Démarrer une partie via la touche "pièce" (alias de start_game, sans système de crédit) |
| UC02  | Démarrer une partie                      | Joueur   | Lancer une nouvelle partie |
| UC03  | Lancer la bille                          | Joueur   | Envoyer la bille sur le playfield |
| UC04  | Contrôler le batteur droit               | Joueur   | Activer le batteur droit |
| UC05  | Contrôler le batteur gauche              | Joueur   | Activer le batteur gauche |
| UC06  | Terminer la partie (Game Over)           | Système  | Mettre fin à la partie |
| UC07  | Détecter les différents types de collisions | Système | Identifier les collisions dans le jeu |
| UC08  | Détecter la perte de la bille            | Système  | Identifier que la bille est sortie du playfield |
| UC09  | Synchroniser les 3 écrans                | Système  | Maintenir la cohérence entre Playfield, Backglass et DMD |
| UC10  | Gérer le score                           | Système  | Calculer et mettre à jour le score |
| UC11  | Jouer effets sonores                     | Système  | Activer certains sons attribués à certaines interactions |
| UC12  | Jouer musique de fond                    | Système  | Musique de fond en continu |

---

# Use cases détaillés

## UC02 : Démarrer une partie

**Acteurs :** Joueur (clavier ou ESP32).  
**Préconditions :** Serveur WebSocket démarré, au moins le playfield connecté.

**Scénario nominal :**
1. Le joueur appuie sur Start (ex. touche « D » ou bouton).
2. Le Playfield envoie `start_game` au serveur.
3. Le serveur réinitialise score à 0, ballsLeft à 3, state à "playing".
4. Le serveur broadcast `game_started` aux trois écrans.
5. Playfield positionne la bille sur la rampe ; Backglass affiche score 0 et billes 3/3 ; DMD affiche "BALL 1". Le joueur appuie sur Espace pour lancer la bille.

**Extensions :**
- Partie déjà en cours : la demande est ignorée (le score en cours est préservé).

**Postconditions :** Partie en état "playing", une bille en jeu, les 3 écrans à jour.

---

## UC07 : Détecter les différents types de collisions

**Scénario nominal :**
1. La bille se déplace sur le playfield.
2. Le système détecte une collision (bumper, batteur, mur, trou).
3. Le système identifie le type, déclenche l’événement associé (points, animation, message) et envoie l’info aux écrans (Backglass/DMD).

**Extensions :**
- Collisions multiples très rapides : regrouper ou limiter les événements.
- Collision non reconnue : ignorer ou logger sans bloquer.
- État Game Over : ignorer la collision.

**Postconditions :** Collision traitée, événements (score/affichage) déclenchés, état du jeu cohérent.
