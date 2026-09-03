# 0015 — Équilibrage familial (FamilyAssist) : modèle documenté, implémentation différée

**Statut** : acceptée sur le principe ; **non implémentée** (Phase 2.1 : modèle et frontières seulement)

## Contexte
Des joueurs de 6 ans, 11 ans et adultes jouent ensemble. Le but n'est pas
que le plus jeune gagne, mais qu'il ne décroche pas.

## Décision (modèle)
- `GameConfig.familyAssist: { enabled, assistedPlayers: [{ playerId, level }] }`,
  `level ∈ { "subtle" }` pour commencer (`off` = désactivé). Configuration
  **par partie**, jamais sur un profil permanent. Plusieurs joueurs assistés
  possibles.
- Parental et **secret** : l'interface de jeu n'affiche jamais qu'une aide est
  active ; la configuration appartient à un espace parental protégé (PIN,
  appui long — ultérieur).
- Détection d'un écart possible plus tard, **activation jamais automatique** :
  le parent décide.
- Intervention non constante : seulement si le joueur aidé décroche
  réellement ; arrêt quand il revient dans la course ; futur `assistBudget`
  limitant le nombre d'interventions (valeur non définie).
- Leviers futurs possibles (dimension jeu/économie) : réduction ponctuelle
  d'une perte, remise contextuelle, trésor légèrement augmenté, protection
  contre une pénalité, avantage temporaire, bonus discret. Chaque
  intervention doit ressembler à une mécanique normale.

## Frontières absolues (testées ou structurelles)
FamilyAssist ne peut **jamais** :
- modifier le Chemin (le scheduler ne reçoit pas l'état : testé) ;
- modifier la bonne réponse, transformer une mauvaise réponse en bonne ;
- falsifier la progression pédagogique, le niveau du Learning Engine ou les
  connaissances mémorisées (le Learning Engine adapte déjà la difficulté) ;
- annoncer au joueur qu'il bénéficie d'une aide.

## Conséquences
- Phase 3 : aucun bonus factice. L'implémentation viendra quand économie,
  scoring, trésors et pénalités seront définis.
- Le scoring définitif n'est pas « argent + patrimoine » ; il intégrera
  patrimoine, gestion, savoir, solidarité. Les poids actuels sont des fixtures.
