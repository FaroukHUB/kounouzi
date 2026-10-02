# 0053 — L'explication après la réponse est réservée à la religion

Date : 2026-10-02
Statut : acceptée

## Contexte

Quatre catégories affichaient et lisaient une explication après chaque réponse :
religion, Histoire & Géographie, logique et gestion (ADR 0038, 0039, 0040,
0045). L'intention était bonne — la nuance d'une carte vit souvent dans son
explication — mais en partie réelle, l'enchaînement devient lourd : après chaque
question, la carte ajoute une explication en français, le texte arabe, parfois
la source, puis une question de plus (« connaissais-tu déjà cette explication ? »).
Le jeu s'arrête pour lire.

Décision de l'auteur après des parties en famille : garder l'explication là où
elle porte vraiment.

## Décision

**Une seule catégorie montre et lit son explication : la religion.**
`showsExplanation` passe à `false` pour `geography`, `logic` et `management`.
Partout ailleurs, Correct / Presque / Incorrect envoie la réponse directement au
moteur, sans étape d'explication ni déclaration de maîtrise.

**Ce qui ne change pas — et c'est l'essentiel :** la garde de jouabilité
continue d'exiger une explication en français ET en arabe pour toute question
validée, quelle que soit sa catégorie, et `requiresSource` reste vrai pour
l'Histoire & Géographie. Les explications et les sources restent écrites,
relues et conservées. `showsExplanation` ne décrit QUE l'affichage : c'est une
règle d'interface, pas une règle de contenu.

## Conséquences

- Le tour est plus court : on répond, on valide, on avance.
- La déclaration de maîtrise (`explanationKnown`) ne remonte plus que pour la
  religion. Elle valait déjà « none » pour les maths, l'arabe et la culture ; la
  mémoire pédagogique n'en dépend pas pour estimer un niveau.
- **À noter** : les sources sont affichées DANS la section explication. Celles
  de l'Histoire & Géographie — le catalogue ONU et UNESCO de l'ADR 0045 — ne
  sont donc plus visibles pendant la partie, bien qu'elles restent exigées à la
  publication. Si l'auteur veut les garder sous les yeux, il faudra décider où :
  ce serait un autre ADR, pas un effet de bord de celui-ci.
- Les tests qui figeaient l'ancienne liste ont été réécrits ; ils vérifient
  maintenant qu'une seule catégorie montre son explication, et que la garde de
  contenu, elle, n'a pas bougé.
