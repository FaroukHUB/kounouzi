# 0011 — Plateau 32 cases : configuration V1 de travail, jamais dans le moteur

**Statut** : acceptée (Phase 2)

## Contexte
La répartition et l'ordre des 32 cases ne sont pas définitifs ; ils seront
équilibrés après de vraies parties familiales. Le moteur ne doit dépendre ni
du nombre de cases, ni de leur ordre, ni des types présents.

## Décision
- `src/config/board/board-32.v1.json` porte la disposition de travail :
  1 départ · 10 question · 8 monument · 4 événement · 3 gestion · 2 défi ·
  2 solidarité · 2 trésor, dans l'ordre fourni.
- Le moteur accepte tout plateau validé par `boardConfigSchema` (exactement
  une case de départ, positions uniques et contiguës). La position de départ
  et le bouclage sont lus dans le plateau, pas codés.
- Les cases `heritage` reçoivent leurs sites par `resolveBoard(board, sites)`,
  dans l'ordre des positions ; un site non achetable est refusé.
- Une case `question` produit `QuestionRequested` sans catégorie ni contenu :
  le moteur pédagogique choisira plus tard, selon le joueur actif.
- Les autres types tirent un scénario générique configuré (`Scenario`) ;
  sans scénario, la case ne fait rien.

## Conséquences
- Changer le plateau = changer un fichier JSON ; aucun test du moteur n'y est
  couplé (un plateau de 8 cases sert aux tests ciblés, un de 12 prouve la
  portabilité).
