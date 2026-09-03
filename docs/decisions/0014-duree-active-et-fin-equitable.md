# 0014 — Parties configurées par durée active ; fin à la fin du tour de table

**Statut** : acceptée (Phase 2.1)

## Contexte
Pour une famille, « 45 minutes » est plus compréhensible que « 10 tours ».
Mais une partie ne doit jamais s'arrêter au milieu d'un tour, et personne ne
doit avoir joué un tour de plus que les autres.

## Décision
- `EndCondition = active_time { targetSeconds } | free | turns_per_player`.
  Modes V1 en configuration (`src/config/game-modes/game-modes.v1.json`) :
  quick 30 min · classic 45 min · long 60 min · free. Le moteur ne connaît
  pas ces libellés.
- **Temps actif** : `GameState.clock.activePlaySeconds` n'avance que par la
  commande de session `AdvanceClock { seconds }`, envoyée par la couche
  session uniquement quand la partie est visible et non en pause. Le moteur
  ne lit jamais `Date.now()` ; l'horloge est injectée et testable. Une
  interruption de 3 heures ne compte pas.
- **Fin équitable** : la fin par durée ou sur demande n'est évaluée qu'au
  moment où la main passerait au siège 0, c'est-à-dire à la fin d'un tour de
  table complet (`shouldEndAfterTurn`). Si le temps expire pendant B sur
  A B C D, B, C et D terminent, puis la partie s'arrête avant A.
- `TimeTargetReached` est émis une seule fois (dernier tour de table).
- **Mode libre** : aucune fin automatique. `RequestGameEnd` (espace parent,
  interface ultérieure) positionne `endRequested` ; la partie se termine à la
  fin du tour de table en cours. Idempotent. Valable dans tous les modes.
- L'affichage du temps peut être approximatif (« environ 28 min ») pour ne
  pas stresser les enfants ; le moteur reste précis à la seconde.

## Conséquences
- Tests : pause sans perte, fin équitable, mode libre sans fin, demande de
  fin propre, déterminisme sans horloge système.
