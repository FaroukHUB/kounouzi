# 0055 — La tranche d'âge compte dans la sélection

Date : 2026-10-06
Statut : acceptée

## Contexte

« Le niveau n'est pas respecté », signalé après de vraies parties. Mesure faite
avant toute correction, sur quatre parties de huit questions, pour des enfants
de 6, 7, 9 et 12 ans :

| Âge | Questions hors de sa tranche d'âge |
|----|----|
| 6 ans | 14 sur 32 |
| 7 ans | 18 sur 32 |
| 9 ans | 21 sur 32 |
| 12 ans | 13 sur 32 |

Et pourtant l'écart entre la difficulté servie et le niveau estimé du joueur
était de 0,02 à 0,47 — excellent. Les deux faits ne se contredisent pas, ils
expliquent le problème : **le numéro de difficulté ne dit pas l'âge**. Une
difficulté 2 vaut 5-6 ou 7-8 ans en géographie, et 8-10 ans en religion. Le
moteur visait le bon NUMÉRO et servait des questions écrites pour des enfants
bien plus grands.

La cause est nette : `ageBand` existait dans les banques et dans les types, avec
le commentaire « information de contrôle ». Elle n'était lue par personne.
`LearnerContext` ne transportait même pas l'âge de l'enfant — seulement un
niveau d'amorçage calculé une fois puis oublié.

## Décision

1. **L'âge suit le joueur jusqu'à la sélection** (`LearnerContext.age`), et la
   tranche suit la question jusqu'au créneau (`KnowledgeSlot.ageBand`).
2. **L'écart à la tranche est pénalisé**, en années, au-delà d'une tolérance.
   Poids et tolérance sont des DONNÉES (`selectionWeights.ageBand`,
   `variety.ageToleranceYears`).
3. **Une pénalité, pas un mur.** Les banques hors religion n'ont que six
   questions par âge : un filtre strict les ferait tourner en boucle. Une
   pénalité forte laisse le moteur servir autre chose plutôt que rien.
4. **Rien n'est pénalisé sans information** : un adulte n'a pas d'âge, le
   contenu généré (maths) n'a pas de tranche. Aucune question n'est écartée
   faute d'étiquette.

### Les valeurs viennent d'un balayage, pas d'un avis

| Poids / tolérance | Hors tranche (6/7/9/12 ans) | Questions distinctes sur 32 |
|----|----|----|
| 0 (avant) | 14 / 18 / 21 / 13 | 27 / 27 / 26 / 27 |
| 30, tolérance 1 an | 8 / 15 / 16 / 0 | 27 / 25 / 26 / 25 |
| **30, tolérance 0** | **0 / 0 / 0 / 0** | 25 / 25 / 27 / 25 |
| 60 ou 120, tolérance 0 | 0 / 0 / 0 / 0 | identique à 30 |

C'est la TOLÉRANCE qui décide, pas le poids. À un an d'écart toléré, les
questions « 8-10 » passaient encore à un enfant de 7 ans — c'était précisément
le gros du défaut. À zéro, il ne reste aucune question hors tranche, pour une à
deux questions distinctes de moins sur 32 : la répétition ne bouge pas (même
question trois fois au plus, avant comme après). Au-delà de 30, le poids ne
change plus rien : inutile de monter.

## Conséquences

- Pour les enfants de 7 et 9 ans, les mathématiques prennent un peu plus de
  place (8 à 9 questions sur 32) : c'est le seul contenu GÉNÉRÉ, donc sans
  tranche et toujours au niveau réel. C'est un effet du manque de contenu curé
  dans leur tranche, pas un choix.
- **Ceci ne corrige PAS la répétition**, et il faut le dire : avec la tranche
  respectée, un enfant n'a que 6 à 7 questions en géographie, 6 en logique et 6
  en gestion pour son âge — contre 75 à 150 en religion. Une partie en sert huit
  par joueur. Aucun réglage ne peut faire tourner six questions sans les
  répéter : il manque du contenu validé, et il n'en sera jamais inventé ici.
- Un test de non-régression parcourt quatre parties pour quatre âges et vérifie
  que toute question de banque servie est DANS la tranche de l'enfant, et que la
  banque ne se tarit jamais.
