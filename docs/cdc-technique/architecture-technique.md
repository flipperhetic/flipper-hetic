# Architecture technique

## Vue d'ensemble

**4 composants interconnectés via WebSocket :**

- **PLAYFIELD** : Rendu 3D (Three.js) + physique (Cannon.js). Détecte collisions.
- **SERVEUR** : Logique centrale. Calcule score. Synchronise les 3 écrans.
- **BACKGLASS** : Affiche score, vies, high score.
- **DMD** : Messages arcade ("100 POINTS!", "GAME OVER").

**Communication :** WebSocket temps réel (< 50 ms).

**Flux type :** Collision détectée par Cannon.js → Serveur calcule points → Broadcast aux 3 écrans → Affichage synchronisé.

---

## Schéma de communication

```
SERVEUR (Node.js + Socket.io, Port 3000)
    |
    +- WebSocket connection
    |
    +-----> PLAYFIELD (Three.js + Cannon.js, Port 5173)
    |
    +-----> BACKGLASS (Canvas, Port 5174)
    |
    +-----> DMD (Canvas, Port 5175)
```

---

## Flux de données

```
Collision detectee (Cannon.js)
    --> Playfield envoie au Serveur
        --> Serveur calcule score
            --> Serveur broadcast a tous les clients
                --> Affichage synchronise sur 3 écrans
```
