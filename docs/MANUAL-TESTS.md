# Checklist de tests manuels — MVP Stabilisation

Protocole : 3 fenêtres côte à côte (playfield, backglass, DMD), 5 parties consécutives, ~10 minutes.

## Préparation

```bash
npm run dev:all
```

Ouvrir :
- Playfield : http://localhost:5173 (focus clavier)
- Backglass : http://localhost:5174
- DMD : http://localhost:5175

## Checklist par partie

Répéter pour 5 parties consécutives. Cocher chaque item pour chaque partie.

### Boot (avant toute action)

- [ ] Backglass : score=0, billes=3, status=idle
- [ ] DMD : affiche PRESS START, PTS 0
- [ ] Playfield : bille visible au spawn, Space sans effet
- [ ] Console serveur : pas d'erreur

### Start (`D`, `F` pièce, ou `Enter`)

- [ ] Backglass : status=playing, score=0, billes=3
- [ ] DMD : BALL 1
- [ ] Playfield : bille au spawn, Space actif

### Lancement (Space)

- [ ] Bille propulsée vers le haut du plateau
- [ ] Second Space immédiat : aucune impulsion (anti double-launch)
- [ ] Backglass/DMD : pas de changement inattendu

### Jeu (flippers + bumpers)

- [ ] `X` / `C` (ou flèches) : flippers réactifs
- [ ] Contact bumper : score +50 (barril) ou +10 (losange/triangle) visible sur backglass et DMD
- [ ] Pas de collision fantôme (score qui monte sans contact)
- [ ] Bille ne traverse pas les murs (anti-tunneling)

### Drain (bille perdue)

- [ ] ball_lost emis une seule fois par drain (pas de doublon)
- [ ] Billes décrémentée sur backglass
- [ ] DMD : BALL 2, puis BALL 3
- [ ] Bille respawn au plunger, Space re-actif

### Game over (3e perte)

- [ ] Backglass : status=game_over, billes=0, score final
- [ ] DMD : GAME OVER
- [ ] Space désactivé

### Restart (`D`, `F` ou `Enter` après game_over)

- [ ] Score remis à 0, billes à 3
- [ ] DMD : BALL 1
- [ ] Jeu reparti normalement

## Tests de résilience

### Refresh client mid-game

- [ ] Refresh backglass pendant une partie : score et status corrects après rechargement
- [ ] Refresh DMD pendant une partie : message et score corrects après rechargement
- [ ] Refresh playfield : bille au spawn, état synchronisé avec le serveur

### Session longue

- [ ] 5 parties consécutives sans crash ni désynchronisation
- [ ] Pas de fuite mémoire évidente (onglet ne ralentit pas)
- [ ] Console du navigateur : pas d'erreur rouge

### Edge-cases

- [ ] `D` / `F` / `Enter` pendant playing : ignore (pas de reset)
- [ ] Space hors partie : ignore
- [ ] Multiples starts rapides (`D`/`F`/`Enter`) : une seule partie démarre

## Résultat

| Critère | OK / KO | Notes |
|---------|---------|-------|
| 5 parties sans crash | | |
| Refresh resync OK | | |
| Pas de double-émission | | |
| Console propre | | |

Date du test : ___________
Testeur : ___________
