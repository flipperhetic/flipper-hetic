# Script de Soutenance - Flipper Hétic MVP
**Durée cible :** 12 minutes (laisse 3 minutes pour les questions du jury)

## 1. Introduction et Concept (3 minutes)
** Intervenant suggéré : **

* **Accroche :** Présentation de l'équipe et de l'ambition du projet (recréer l'expérience sociale et physique d'un vrai flipper, mais en version numérique et distribuée).
* **Le concept "Multi-écrans" :** Expliquer pourquoi on n'a pas fait un simple jeu web classique. L'idée est d'avoir une vraie borne avec un écran de plateau (Playfield), un fronton pour les scores (Backglass), et un petit écran matriciel pour les animations (DMD).
* **Cible du MVP :** Préciser qu'aujourd'hui, l'objectif est de prouver que la synchronisation temps réel entre ces différents écrans et un moteur physique 3D fonctionne parfaitement.

## 2. Architecture Technique (3 minutes)
** Intervenant suggéré :  (Développement & Intégration)**

* **L'approche "Client-Serveur" :** Expliquer que le serveur Node.js est le "cerveau" (arbitre) du jeu. Les autres écrans ne sont que des affichages qui réagissent aux ordres du serveur.
* **Les WebSockets (Socket.IO) :** Comment l'état du jeu (score, billes restantes) circule instantanément. Mentionner rapidement le fichier de contrat (`EVENTS.md`) qui a permis à l'équipe de travailler en parallèle.
* **Le découpage :** * Playfield : Moteur 3D (Three.js) + Physique (Cannon-es).
  * Backglass & DMD : Interfaces web légères pour le retour visuel.

## 3. Démonstration Live (4 minutes)
** Intervenants : Toute l'équipe (Un qui parle, un qui joue)**

* **Lancement (1 min) :** Montrer très rapidement les 4 terminaux qui tournent et l'affichage des 3 fenêtres côte à côte.
* **Scénario Bout-en-Bout (3 min) :** (Suivre à la lettre le `integration-scenario.md`)
  * *Action :* Appuyer sur `Start`. Faire remarquer au jury que le DMD affiche "BALL 1" et le Backglass passe en mode jeu.
  * *Action :* Lancer la bille (`Space`).
  * *Action :* Jouer un peu. **Amine** peut prendre la parole ici pour expliquer rapidement comment il a géré la physique 3D, les rebonds sur les bumpers (+100 pts synchronisés en direct) et les slingshots.
  * *Action :* Laisser couler la bille (Drain). Montrer la transition vers "BALL 2".
  * *Action :* Provoquer le Game Over pour montrer la fin du cycle.

## 4. Limites et Roadmap (2 minutes)
** Intervenant suggéré : **

* **Les limites assumées du MVP :** Parler en toute transparence des petits glitchs physiques à haute vitesse et de l'absence de base de données (scores non sauvegardés au redémarrage). C'est très pro de connaître ses failles.
* **La suite (L'intégration IoT) :** Expliquer la prochaine grosse étape : remplacer le clavier par un vrai meuble en bois avec des boutons d'arcade connectés via un microcontrôleur (ESP32/Arduino).
* **Conclusion :** Remercier le jury et ouvrir aux questions.