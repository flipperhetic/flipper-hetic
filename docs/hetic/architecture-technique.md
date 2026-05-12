# Architecture technique

## Vue d'ensemble

**4 composants interconnectés via WebSocket :**

- **PLAYFIELD** : Rendu 3D (Three.js) + physique (Rapier). Détecte les collisions côté client et notifie le serveur.
- **SERVEUR** : Logique centrale. Calcule score. Synchronise les 3 écrans.
- **BACKGLASS** : Affiche score, vies, high score.
- **DMD** : Messages arcade ("100 POINTS!", "GAME OVER").

**Communication :** WebSocket temps réel (< 50 ms).

**Flux type :** collision détectée sur le playfield (Rapier) → événement vers le serveur → serveur applique les règles (score, billes) → broadcast aux 3 écrans → affichage synchronisé.

---

## Schéma de communication

```
SERVEUR (Node.js + Socket.io, Port 3000)
    |
    +- WebSocket connection
    |
    +-----> PLAYFIELD (Three.js + Rapier, Port 5173)
    |
    +-----> BACKGLASS (DOM, Port 5174)
    |
    +-----> DMD (Canvas, Port 5175)
```

---

## Flux de données

```
Collision detectee (Rapier cote playfield)
    --> Playfield envoie au Serveur
        --> Serveur calcule score
            --> Serveur broadcast a tous les clients
                --> Affichage synchronise sur 3 écrans
```
