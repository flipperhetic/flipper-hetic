# Checklist de tests manuels — MVP Stabilisation

Protocole : 3 fenetres cote a cote (playfield, backglass, DMD), 5 parties consecutives, ~10 minutes.

## Preparation

```bash
npm run dev:all
```

Ouvrir :
- Playfield : http://localhost:5173 (focus clavier)
- Backglass : http://localhost:5174
- DMD : http://localhost:5175

## Checklist par partie

Repeter pour 5 parties consecutives. Cocher chaque item pour chaque partie.

### Boot (avant toute action)

- [ ] Backglass : score=0, billes=3, status=idle
- [ ] DMD : affiche PRESS START, PTS 0
- [ ] Playfield : bille visible au spawn, Space sans effet
- [ ] Console serveur : pas d'erreur

### Start (Enter ou S)

- [ ] Backglass : status=playing, score=0, billes=3
- [ ] DMD : BALL 1
- [ ] Playfield : bille au spawn, Space actif

### Lancement (Space)

- [ ] Bille propulsee vers le haut du plateau
- [ ] Second Space immediat : aucune impulsion (anti double-launch)
- [ ] Backglass/DMD : pas de changement inattendu

### Jeu (flippers + bumpers)

- [ ] ArrowLeft/ArrowRight : flippers reactifs
- [ ] Contact bumper : score +100 visible sur backglass et DMD
- [ ] Pas de collision fantome (score qui monte sans contact)
- [ ] Bille ne traverse pas les murs (anti-tunneling)

### Drain (bille perdue)

- [ ] ball_lost emis une seule fois par drain (pas de doublon)
- [ ] Billes decrementee sur backglass
- [ ] DMD : BALL 2, puis BALL 3
- [ ] Bille respawn au plunger, Space re-actif

### Game over (3e perte)

- [ ] Backglass : status=game_over, billes=0, score final
- [ ] DMD : GAME OVER
- [ ] Space desactive

### Restart (Enter apres game_over)

- [ ] Score remis a 0, billes a 3
- [ ] DMD : BALL 1
- [ ] Jeu reparti normalement

## Tests de resilience

### Refresh client mid-game

- [ ] Refresh backglass pendant une partie : score et status corrects apres rechargement
- [ ] Refresh DMD pendant une partie : message et score corrects apres rechargement
- [ ] Refresh playfield : bille au spawn, etat synchronise avec le serveur

### Session longue

- [ ] 5 parties consecutives sans crash ni desynchro
- [ ] Pas de fuite memoire evidente (onglet ne ralentit pas)
- [ ] Console du navigateur : pas d'erreur rouge

### Edge-cases

- [ ] Enter pendant playing : ignore (pas de reset)
- [ ] Space hors partie : ignore
- [ ] Multiples Enter rapides : une seule partie demarre

## Resultat

| Critere | OK / KO | Notes |
|---------|---------|-------|
| 5 parties sans crash | | |
| Refresh resync OK | | |
| Pas de double-emission | | |
| Console propre | | |

Date du test : ___________
Testeur : ___________
