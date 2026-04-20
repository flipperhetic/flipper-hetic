# MVP et critères

Ce projet est un flipper virtuel qui combine simulation physique (Three.js/Cannon.js) et contrôle clavier/ESP32, jouable sur 3 écrans synchronisés en temps réel, pour une expérience arcade moderne.

**MVP — 5 points clés :**
- Démarrer une partie puis lancer la bille (bouton).
- Bille avec mouvements cohérents (gravité, chocs obstacles/murs).
- 2 battes activables (bouton chacune).
- Partie commence au lancer et se termine quand la bille tombe.
- 3 écrans synchronisés (score, messages "PRESS START", "SCORE : 1500", "GAME OVER", etc.).

**Écrans :** Playfield (gameplay), Backglass (ambiance + high score), DMD (messages courts).

**Contrôles :** Espace = lancer bille ; flèche gauche/droite = batte gauche/droite.

**Critères de succès :** Latence synchro < 50 ms ; collisions et gravité détectées ; PR avec au moins 1 review.

**Contraintes :** Clavier d’abord, puis ESP32/Arduino pour soutenance ; pas de push sur main ; desktop uniquement.
