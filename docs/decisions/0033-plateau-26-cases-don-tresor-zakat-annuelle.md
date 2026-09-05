# 0033 — Plateau 26 cases : monuments dominants, Départ +100, Trésor +100, case Don et Caisse Masākīn, Zakat al-Māl annuelle hors plateau

**Statut** : acceptée (décision produit, 2026-09-05) — remplace le plateau de travail 32 cases (ADR 0011)

## Contexte
Le plateau de travail (32 cases : 9 Savoir, 8 monuments, événements,
gestion, solidarité, 2 trésors, 1 halte) donnait peu la sensation d'un jeu de
plateau familial : trop de questions, trop peu d'achats et d'argent qui
circule. Décision produit : 26 cases, les monuments deviennent la catégorie
principale, une seule case Don distincte de toute Zakat, un seul Trésor, et
la Zakat al-Māl sort complètement du plateau pour devenir un événement
annuel automatique commun à tous les joueurs.

## Décision
- **Plateau 26 cases en données** (`src/config/board/board-26.v1.json`,
  ordre imposé) : 12 Monument, 5 Savoir, 4 Défi, 2 Halte, 1 Don, 1 Trésor,
  1 Départ. Le fichier 32 cases est supprimé ; les parties sauvegardées
  gardent leur propre plateau (figé dans l'état) et restent jouables. Le
  nombre de cases vient toujours de `board.cells.length` : moteur, invariants,
  disposition et pions le lisent, rien n'est codé en dur.
- **Départ** : `rules.passStartBonus` (100) versé par le grand livre à
  chaque franchissement du Départ, une fois par franchissement (mécanique
  existante, inchangée ; y compris en atterrissant dessus).
- **Trésor** : `rules.treasure.amount` (100) versé une fois à l'arrivée,
  événement `TreasureFound`, écriture `treasure`. À 0 (parties migrées), la
  case sert ses scénarios comme avant. Aucun hasard.
- **Don** (nouveau type de case `donation`) : phase `awaiting_donation`,
  commande `Donate { amount, to }`. Les montants proposés sont
  `rules.donation.amounts` filtrés par ce que le joueur peut payer ; sans
  montant payable, `DonationUnavailable` et le tour continue. Destination :
  la **Caisse Masākīn** (`funds.masakin`, grand livre `fundLedger`, écritures
  liées par `ref`, des Kounouz qui n'appartiennent plus à aucun joueur) ou
  un autre joueur (transfert `donation` équilibré). Un don est compté comme
  action de solidarité. Ce n'est jamais une Zakat.
- **Zakat al-Māl annuelle, hors plateau** : `rules.zakat { enabled, rate =
  0,025, nisabKounouz, cycleRounds, eligibleAssetTypes }`. Le calendrier
  commun (`state.calendar`) avance d'un cran à chaque tour de table complet ;
  au `cycleRounds`-ième, l'année lunaire simulée s'achève pour TOUS en même
  temps : `ZakatEvaluationRequested`, puis pour chaque joueur (ordre des
  sièges) `ZakatPaid` (base × taux, arrondi inférieur, vers la Caisse
  Masākīn) ou `ZakatNotDue`, puis `YearCompleted`. Seuls les Kounouz
  monétaires sont éligibles ; la valeur des monuments n'entre jamais dans la
  base sans décision explicite. Ni case, ni pion, ni tirage, ni Départ.
- **Inchangés** : monuments (achat libre, revisite, visite avec Défi
  Patrimoine, aucune rente), Savoir (Learning Engine), Défis famille, Halte
  (Défi de reprise au tour suivant ; seulement mise en avant visuelle),
  déterminisme du Chemin et des défis. `event`, `management`, `solidarity`
  restent des types acceptés pour les sauvegardes et les scénarios de
  démonstration, absents du plateau 26.
- **Interface** : disposition rectangulaire générique (26 → 8 × 7, 32 →
  9 × 9), case Don, carte Don (montant puis destination), carte Trésor,
  bandeaux Don / Zakat / année, solde de la Caisse Masākīn affiché,
  Haltes en « grosses cases ». Diagnostic et journal enrichis.
- **Sauvegardes** : schéma v7, migration v6 → v7 (caisse vide, calendrier à
  l'année 1, trésor 0, aucun montant de don, Zakat désactivée : aucune
  économie inventée dans une partie en cours).

## Décisions produit encore ouvertes (non inventées)
- Montants du Don : 10 / 20 / 50 / 100 posés en DONNÉES de démonstration
  d'après la proposition du propriétaire, à confirmer ; le don est-il
  refusable (« ne pas donner ») ? Aujourd'hui non, sauf sans montant payable.
- Nissab en Kounouz et longueur de l'année en tours de table : valeurs de
  démonstration (1000, 3) à décider.
- Condition du ḥawl stricte (avoir détenu le nissab toute l'année) : non
  modélisée ; l'échéance annuelle évalue les Kounouz détenus à ce moment.
- Bénéficiaire joueur de la Zakat (pauvre, endetté…) : règles d'éligibilité
  à définir ; l'architecture (`MoneyDestination`, motif `zakat`) est prête, la
  Caisse Masākīn reste la seule destination.
- Emploi des Kounouz de la Caisse Masākīn (redistribution ? score ?) : rien.

## Tests
`tests/unit/game/board26.test.ts` (composition, Départ +100 une fois par
franchissement, Trésor +100 une fois, Don vers caisse et vers joueur,
refus, indisponibilité, Zakat annuelle globale à 2,5 % au-dessus du nissab,
monuments exclus, désactivation, migration v6, aller-retour, 2 à 6 joueurs,
plateau 12 cases), plateau, disposition (8 × 7 et 9 × 9), composants,
mouvements, simulation familiale sur le vrai plateau.
