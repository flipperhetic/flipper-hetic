# Limites Connues et Roadmap (Post-MVP)

Ce document liste les limites assumées de la version actuelle (MVP) du Flipper Hétic et détaille les prochaines étapes de développement.

## Limites actuelles (MVP)

1. **Moteur physique et collisions :** À très haute vélocité, la gestion de la physique par Cannon-es peut présenter des limites. La bille peut ponctuellement traverser des modèles 3D très fins (glitching).
   
2. **Persistance des données :** L'architecture actuelle ne dispose pas de base de données. Les scores et l'état de la partie sont stockés en mémoire vive sur le serveur. Par conséquent, l'historique et les "High Scores" sont définitivement perdus à chaque redémarrage du processus serveur.

3. **Sécurité et réseau :** Les connexions WebSockets entre les clients et le serveur ne sont pas chiffrées, et les messages ne sont pas authentifiés. N'importe quel client connaissant l'adresse du serveur et le format des événements peut envoyer de fausses commandes (ex: simuler un score).

---

## Roadmap des futures fonctionnalités

### Phase 1 : Intégration Matérielle (IoT)
* Remplacement des contrôles clavier par un véritable meuble physique.
* Intégration de microcontrôleurs (Arduino ou ESP32) pour capturer les appuis sur de vrais boutons d'arcade.
* Communication série/réseau entre le matériel physique et la couche logicielle existante via notre système d'inputs découplé.

### Phase 2 : Fiabilisation et Refactoring
* Transition du serveur Node.js vers une architecture plus robuste (Clean Architecture ou MVC strict).
* Optimisation des paramètres de Cannon-es (sub-stepping) pour corriger les bugs de collision à haute vitesse.

### Phase 3 : Persistance et Compétition
* Déploiement d'une base de données (ex: MongoDB, PostgreSQL ou Redis).
* Création d'un système de "Leaderboard" mondial persistant affiché sur le Backglass ou une page web dédiée en fin de partie.

### Phase 4 : Enrichissement du Gameplay
* Conception de nouveaux éléments de plateau en 3D : rampes, cibles tombantes, spinners.
* Implémentation d'une machine à états plus complexe sur le serveur pour gérer des missions spécifiques et un mode multi-billes (multiball).