# 0010 — Récompense relative au niveau du joueur

**Statut** : acceptée (Phase 0)

## Contexte
Le contenu s'adapte à chaque joueur mais l'argent est commun. Indexer la
récompense sur la difficulté absolue ferait gagner mécaniquement l'adulte ou
l'enfant le plus âgé.

## Décision
La récompense de base est indexée sur la difficulté **relative au niveau réel
du joueur** dans la catégorie : une question à son niveau rapporte une
récompense comparable, qu'il ait 7 ou 35 ans. Un dépassement réussi donne un
bonus. Montants et barèmes en configuration (`rewards.v*.json`).

## Conséquences
- `rewardMode` configurable (`relative` par défaut) ; les valeurs exactes sont
  équilibrées après les premières parties réelles.
