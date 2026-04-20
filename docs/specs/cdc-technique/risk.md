# Risques et contraintes

## Risques techniques

| Risque | Probabilité | Impact | Mitigation |
|--------|-------------|--------|------------|
| Latence WebSocket > 50 ms (synchro des 3 écrans) | Moyenne | Fort | Envoyer uniquement les événements importants (bumper touché, bille perdue, score) plutôt que position/vitesse en continu ; POC réseau en S2. |
| Collision non détectée (bille sort de la map) | Moyenne | Moyen | Tests précoces (S2), ajuster paramètres physique (Cannon-es) et zones de détection. |
| Gestion de 3 fenêtres navigateurs trop lourde | Faible | Moyen | Vue de secours : une seule page regroupant les 3 écrans si besoin. |

## Contraintes du projet

- **Délai :** 10 semaines.
- **Équipe :** 4 personnes.
- **Matériel :** 3 écrans, ESP32/Arduino, composants (~50 €). Code prévu d’abord pour clavier, puis intégration contrôleurs physiques pour la soutenance.
- **Règles :** Pas de push direct sur `main` ; contributions via PR et review.
- **Interface :** Desktop uniquement (pas d’adaptation mobile prévue).
