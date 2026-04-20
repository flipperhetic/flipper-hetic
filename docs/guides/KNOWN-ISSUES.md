# Known Issues — MVP (non bloquantes)

Issues connues qui ne bloquent pas la soutenance / release MVP.

## Physique

- **Tunneling rare a haute vitesse** : malgre le velocity cap (25 unites/s), le solver 120 Hz et le SAPBroadphase, une bille lancee a un angle defavorable peut exceptionnellement traverser un mur fin. Mitigation : augmenter le nombre de substeps ou passer en CCD (non supporte nativement par cannon-es).

- **Micro-rebonds Y** : `clampBall()` force la position Y a chaque frame, ce qui masque les rebonds verticaux mais peut provoquer un leger jitter visuel sur certains navigateurs.

## Reseau

- **Latence locale uniquement** : le MVP est teste en localhost. En reseau reel, la latence Socket.IO pourrait provoquer un decalage visible entre le playfield et les ecrans secondaires.

- **Refresh playfield** : apres un refresh du playfield, la bille revient au spawn mais la physique locale est reinitialisee — la partie continue cote serveur avec l'etat correct, mais la position de la bille sur le plateau est perdue.

## Gameplay

- **Pas de nudge/tilt** : le plateau ne reagit pas aux secousses.
- **Pas d'audio** : aucun retour sonore sur les collisions, flippers ou drain.
- **Score bumper uniquement** : seuls les bumpers rapportent des points (+100). Les slingshots et autres obstacles ne scorent pas.

## Tests

- **Pas de tests E2E** : les tests E2E Playwright (multi-navigateur) sont prevus en phase ulterieure. Seuls les tests unitaires serveur/playfield et l'integration Socket.IO sont en place.
- **Couverture playfield partielle** : `flippers.js`, `bumpers.js`, `slingshots.js` ne sont pas testes unitairement (logique triviale, risque faible).
