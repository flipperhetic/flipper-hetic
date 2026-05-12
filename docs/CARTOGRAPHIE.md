# Cartographie d'architecture — Flipper Virtuel

Vue d'ensemble des composants du système, des technologies et des flux de communication.

---

## 1. Vue système (composants)

| Composant   | Technologie      | Rôle |
|------------|------------------|------|
| **Server** | Node.js + WebSocket | Source de vérité : état du jeu (score, balles, gameOver). Connexion des clients, broadcast de l'état à tous les écrans. |
| **Playfield** | Three.js + Rapier (`@dimforge/rapier3d-compat`) | Écran principal 3D : scène du flipper, physique (gravité, collisions), bille, battes. Reçoit l'état et envoie les inputs (plunger, batteur gauche/droit). Le moteur physique est swappable via `adapters/physics/index.js`. |
| **Backglass** | (Frontend) | Écran arrière : ambiance, score, nombre de balles, meilleur score. Affichage piloté par l'état reçu du serveur. |
| **DMD** | (Frontend) | Affichage type dot-matrix : messages courts (PRESS START, SCORE, BALL 2, GAME OVER). Piloté par l'état serveur. |
| **ESP32** (optionnel) | WiFi / WebSocket / simulation clavier | Annexe HETIC : boutons physiques ou **X / C / D / F** côté playfield ; évolution possible vers envoi d’événements réseau. |

---

## 2. Flux de communication

```
                    ┌─────────────────────────────────────────────────────────┐
                    │                      SERVER (Node.js)                    │
                    │  État : score, balles, gameOver                          │
                    │  WebSocket : écoute, broadcast                           │
                    └──────────────────────────┬───────────────────────────────┘
                                               │
                     broadcast état (temps réel < 50 ms)
                                               │
           ┌───────────────────────────────────┼───────────────────────────────────┐
           │                                   │                                   │
           ▼                                   ▼                                   ▼
┌──────────────────────┐         ┌──────────────────────┐         ┌──────────────────────┐
│     PLAYFIELD        │         │     BACKGLASS         │         │         DMD           │
│  Three.js + Rapier   │         │  Score, balles,       │         │  Messages courts     │
│  Scène 3D, physique  │         │  meilleur score,      │         │  PRESS START, SCORE,  │
│  Bille, battes, map  │         │  ambiance             │         │  GAME OVER...         │
└──────────┬───────────┘         └──────────────────────┘         └──────────────────────┘
           │
           │  inputs : plunger, batteur G/D
           │  (clavier ou ESP32)
           │
           └──────────────────────────────► SERVER
```

- **Client → Server** : connexion WebSocket, envoi des actions (démarrer partie, lancer bille, batteur gauche, batteur droit).
- **Server → Tous les clients** : broadcast de l'état (score, balles, gameOver, messages) pour garder les 3 écrans synchronisés (< 50 ms).

---

## 3. Répartition des responsabilités

| Responsabilité | Où elle est gérée |
|----------------|-------------------|
| État du jeu (score, balles, gameOver) | Server |
| Règles de fin de partie, décrément des balles | Server |
| Physique (gravité, collisions, rebonds) | Playfield (Rapier — port `adapters/physics/`) |
| Rendu 3D (map, bille, battes, murs) | Playfield (Three.js) |
| Affichage score / balles / ambiance | Backglass |
| Affichage messages courts | DMD |
| Synchronisation des 3 écrans | Server (broadcast) + réception côté chaque client |

---