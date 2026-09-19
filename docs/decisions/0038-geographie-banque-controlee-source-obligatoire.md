# 0038 — Géographie : banque contrôlée de 30 cartes, source obligatoire même pour l'évidence

**Statut** : acceptée (décision produit, 2026-09-19) — remplace le régime
factuel de la géographie décidé à l'ADR 0020

## Contexte
La géographie était le seul contenu produit par assemblage : un catalogue de
faits (pays, capitale, continent) et des gabarits qui en tiraient des
questions. Ce régime convient à une donnée tabulaire, pas à de la
géographie utile. Il produisait mécaniquement un quiz de capitales, et
surtout il **fabriquait des affirmations** : un gabarit peut composer une
phrase fausse ou discutable sans que personne ne l'ait jamais lue.

Les 22 faits de démonstration étaient déjà désactivés en production, faute
de vérification. La catégorie n'avait donc aucun contenu servi.

Une question de mathématiques ne transporte aucun fait : la variante
numérique est gratuite (ADR 0037). Une question de géographie transporte un
fait. Les deux ne peuvent pas suivre le même régime.

## Décision

### 1. Régime curé, plus aucun assemblage
`geography.generationMode` passe de `factual` à `curated`. La géographie est
désormais une banque de cartes écrites et contrôlées une par une, comme les
banques religieuses — jamais générées. La V1 compte **30 cartes**
(`GEO-001` … `GEO-030`, `src/content/questions/geography/geographie.v1.json`)
couvrant 25 compétences.

Le régime factuel n'est pas supprimé : son contrat, son fournisseur et ses
tests restent en place, simplement plus déclarés par aucune catégorie. Les
tests qui l'exercent déclarent eux-mêmes une catégorie factuelle
(`FACTUAL_GEO_CATEGORIES`) au lieu de supposer que la géographie l'est
encore.

### 2. Source obligatoire, même quand le fait paraît évident
`geography.requiresSource` passe à `true`. C'est la règle propre à cette
catégorie : **aucune carte géographique n'est publiable sans source**, y
compris « l'Algérie est en Afrique ». L'évidence n'est pas une source, et
une carte qui paraît évidente à un adulte est exactement celle qu'un enfant
retiendra comme vraie sans discuter.

La garde de jouabilité existante applique cette règle sans exception
possible : `source obligatoire absente` est bloquant.

### 3. Rien n'est servi tant que la vérification humaine n'a pas eu lieu
Aucune source n'a encore été fournie. Les 30 cartes sont donc importées en
`draft`, avec un tableau `sources` **vide** — pas approximatif, pas
« à compléter plus tard » par une référence plausible. Aucune source n'est
inventée, aucune URL fictive n'entre dans le dépôt. En conséquence, la
géographie n'apparaît dans aucun créneau, n'est proposée à aucun joueur, et
`availableCategories` reste `["religion", "maths"]`.

C'est le même chemin que les banques religieuses : import en brouillon, puis
validation humaine appliquée en données, jamais une validation déduite.

### 4. Arabe provisoire, porté par la donnée
`CuratedQuestion.arReview` (nouveau champ facultatif) déclare la qualité
linguistique de l'arabe de **cette carte**. Absent, il vaut `reviewed` : les
banques religieuses, relues contre leur source, ne changent pas. Les 30
cartes de géographie portent `provisional` : leur arabe est juste quant au
sens, mais attend une relecture humaine.

Auparavant le fournisseur curé supposait tout arabe relu ; il lit désormais
ce que la donnée déclare.

### 5. Une explication manquante reste manquante
Quatre cartes (GEO-011, GEO-021, GEO-022, GEO-027) n'ont reçu aucune
explication : leur réponse est déjà la définition complète. Elles restent
**vides**, signalées par `reviewNotes`, plutôt que remplies d'un texte
inventé pour satisfaire un schéma. Le schéma de banque est donc assoupli de
façon symétrique pour le français et l'arabe : une explication peut être
vide en brouillon, jamais sur une carte `validated` (deux `refine`, plus la
garde de jouabilité).

### 6. La progression ne change pas
L'âge donne la tranche de départ, et rien d'autre. Les cinq tranches de la
V1 (5-6, 7-8, 9-10, 11-12, 13+, six cartes chacune) coïncident exactement
avec les bandes d'amorçage de `bands.v1.json` ; un test le vérifie carte par
carte. Ensuite, le Learning Engine seul fait monter ou redescendre le joueur,
exactement comme pour les autres catégories : **l'âge amorce, il ne plafonne
pas**. Aucun moteur de progression propre à la géographie n'est créé.

## Conséquences
- La géographie ne peut plus produire une affirmation que personne n'a lue.
- Le vivier passe d'un catalogue extensible à 30 cartes finies. C'est voulu :
  30 cartes justes valent mieux qu'un générateur d'affirmations.
- Tant que la vérification humaine n'a pas eu lieu, la catégorie reste
  invisible en partie. Elle ne dégrade donc rien.
- `showsExplanation` reste `false` pour la géographie, comme avant : la
  plupart des cartes portent pourtant une nuance utile dans leur explication.
  C'est un point à trancher séparément, pas un effet de bord de cette
  décision.

## Alternatives écartées
- **Garder le régime factuel et allonger le catalogue de faits** : produit un
  quiz de capitales et fabrique des affirmations non relues.
- **Publier les 30 cartes sans source, « parce que c'est évident »** :
  contredit la règle posée pour cette catégorie, et c'est exactement sur
  l'évidence que les erreurs passent.
- **Compléter les quatre explications manquantes** : ce serait inventer du
  contenu à la place de l'auteur.
