# 0034 — Zakat al-Māl par ḥawl, taux exact au centime, Don à montant fixe

**Statut** : acceptée (décisions produit, 2026-09-10) — précise l'ADR 0033

## Contexte
L'ADR 0033 évaluait la Zakat sur le solde au moment d'une échéance annuelle
commune, arrondissait le montant à l'entier inférieur et proposait plusieurs
montants de don non validés. Décisions produit : le ḥawl doit être suivi par
joueur, le taux doit être exactement 2,5 % avec des Kounouz à deux décimales,
le don est d'un montant fixe.

## Décision
- **Ḥawl par joueur** (`PlayerState.hawlRounds`) contrôlé à la fin de
  chaque tour de table complet, dans l'ordre des sièges :
  1. `zakatBase` = Kounouz monétaires éligibles ;
  2. sous le nissab → `hawlRounds = 0` (`HawlInterrupted` si un ḥawl était
     ouvert) ;
  3. sinon → `hawlRounds + 1` (`HawlAdvanced`) ;
  4. à `cycleRounds` tours consécutifs (6) → `HawlCompleted`, Zakat due sur
     la base possédée à ce moment, versée à la Caisse Masākīn (`ZakatPaid`),
     puis `hawlRounds = 0` : un nouveau ḥawl commence au tour suivant si le
     nissab est encore atteint.
  Aucune Zakat de fin de partie sans ḥawl accompli. Le calendrier commun
  (`calendar`) reste pour l'affichage de l'année.
- **Nissab V1** : `nisabKounouz = 1000`, équivalence de jeu configurable,
  à équilibrer après playtest.
- **Taux exact** : `rate = 0.025` appliqué par `percentOf` en arithmétique
  entière (centimes × millionièmes du taux), arrondi au centime le plus
  proche (demi-centime vers le haut), jamais tronqué. 2,5 % de 1000 = 25 ;
  de 1005 = 25,13 ; de 1072,50 = 26,81.
- **Kounouz à deux décimales** (`src/core/game/money.ts`) : toute addition,
  plafonnement, somme de grand livre ou pourcentage passe par des centimes
  entiers (`toCents`, `addMoney`, `sumMoney`, `roundMoney`). Les schémas
  acceptent des montants finis exprimables en centimes ; les invariants le
  vérifient sur les soldes et le grand livre. L'affichage utilise
  `formatKounouz` (virgule, deux décimales seulement si nécessaire). Les
  règles (prix, récompenses, montants de scénarios) restent entières.
- **Don** : `rules.donation.amount` (20 Kounouz), le joueur choisit
  seulement la destination (Caisse Masākīn ou autre joueur). Sans les
  20 Kounouz, ou à 0 dans une partie migrée, la case ne demande rien. Le don
  reste totalement distinct de la Zakat.
- **Destination de la Zakat** : Caisse Masākīn uniquement pour l'instant.
  Le bénéficiaire joueur (pauvre, endetté) est une fonctionnalité incomplète,
  pas abandonnée : `MoneyDestination` et le motif `zakat` sont prêts, les
  critères seront définis séparément.
- **Questions (ADR 0032)** : inchangées ; le hasard reste réservé au
  départage de questions pédagogiquement équivalentes.
- **Sauvegardes** : schéma v8, migration v7 → v8 (ḥawl à zéro ; une liste de
  montants v7 devient son premier montant, sinon 0).

## Tests
`tests/unit/game/board26.test.ts` : ḥawl accompli après exactement 6 tours
de table (18 fins de tour), second ḥawl après paiement, base de 1000 pile
puis passage sous le nissab, interruption, monuments exclus, désactivation,
partie plus courte que le ḥawl sans Zakat, taux exact (25,13 ; 26,81 ;
30,86), additions exactes, don fixe vers caisse et vers joueur, refus,
indisponibilité, migrations v6 et v7.
