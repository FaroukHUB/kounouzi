# 0046 — Une révision est une priorité, pas un passe-droit

Date : 2026-10-01
Statut : acceptée

## Contexte

De vraies parties en famille ont montré deux défauts que les tests ne voyaient
pas, parce qu'ils mesuraient une partie isolée :

- les mêmes questions revenaient alors que les banques en comptent des
  centaines — « il y en a assez, pourquoi elles reviennent ? » ;
- une catégorie occupait un tiers de la partie.

Cause : la révision due écrasait tout. Son poids (`due = 100`) dominait la
nouveauté (`novelty = 15`), et surtout une question due était DISPENSÉE des
garde-fous de variété (notion déjà vue dans la partie ou à la tablée, catégorie
récente). Or, avec un premier intervalle de trois jours, une famille qui joue
chaque semaine retrouve dues presque toutes les questions de la partie
précédente : la partie devenait une reprise de la précédente.

Mesure sur quatre parties de huit questions par joueur, deux jours d'écart :
24 questions distinctes sur 32, une même carte jusqu'à trois fois, catégorie
dominante à 31 %.

## Décision

1. **Rééquilibrage des poids** (données, `learning.v1.json`) : `due` 100 → 40,
   `novelty` 15 → 35. Une révision reste prioritaire, elle n'est plus hors
   concours.
2. **Plafond de révision par partie** (`variety.revisionShare` = 0,34) : tant
   que les révisions n'occupent pas plus d'un tiers des questions déjà posées
   au joueur dans la partie, une révision due garde ses dispenses ; au-delà,
   elle repasse sous les garde-fous de variété comme n'importe quelle question.
3. **Ce qui ne change pas** : une question déjà posée dans la partie ne revient
   jamais ; la révision due reste dispensée des fenêtres en nombre d'essais
   (sans quoi un joueur qui joue peu ne reverrait jamais ce qu'il a raté) ; la
   difficulté reste une pénalité par distance, jamais un filtre.

## Conséquences

- Mesuré après correction : 24 à 27 questions distinctes sur 32, catégorie
  dominante 22 à 31 %, et la révision existe toujours (8 à 11 questions sur 32).
- Deux tests qui figeaient l'ancienne règle (« une révision due l'emporte
  toujours ») ont été réécrits : ils vérifient maintenant que la révision
  remonte en tête des questions DÉJÀ VUES et que son score augmente quand elle
  devient due — sans prétendre qu'elle passe devant le catalogue neuf.
- Un test nouveau (`revisionShare`) vérifie le plafond sur deux parties
  successives : la révision existe, elle ne remplit pas la partie, et aucune
  catégorie n'occupe la moitié des questions.
