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

### 5. L'explication fait partie de l'apprentissage
`geography.showsExplanation` passe à `true`. Plusieurs cartes portent leur
nuance dans l'explication — « certaines rivières terminent leur trajet
ailleurs que dans la mer », « ce n'est pas la seule raison possible » — et la
perdraient si elle n'était pas lue après la réponse. La géographie rejoint
donc la religion : les deux affichent et lisent l'explication.

Corollaire : une carte jouable doit avoir une explication **complète en FR et
en AR**. Les quatre cartes qui n'en avaient pas (GEO-011, GEO-021, GEO-022,
GEO-027) ont été complétées par l'auteur, jamais inventées ici. Le schéma de
banque reste assoupli de façon symétrique pour le français et l'arabe — une
explication peut être vide en brouillon, jamais sur une carte `validated`
(deux `refine`, plus la garde de jouabilité) — parce qu'une banque importée
passe toujours par un état incomplet avant sa relecture.

### 5 bis. Un catalogue de sources, pas trente copies
Une source institutionnelle couvre souvent plusieurs cartes : une définition
de l'échelle vaut pour GEO-017 et GEO-022, une même fiche sur l'altitude vaut
pour GEO-005 et GEO-027. Le fichier de banque porte donc un **catalogue**
(`sources`, entrées nommées par une `key`) et chaque carte cite les clés qui
la couvrent (`sourceKeys`). Une source est ainsi décrite une seule fois, et
il n'y a qu'une vérité à corriger si elle change.

Une clé citée mais absente du catalogue fait **échouer le chargement** :
aucune référence fantôme ne peut exister. La résolution se fait au
chargement de la configuration ; le noyau, la garde et le fournisseur ne
voient que le résultat (`CuratedQuestion.sources`) et ne changent pas.

Le catalogue de la banque géographique est en place et **vide** : les sources
institutionnelles définitives seront fournies par l'auteur. Aucune n'est
inventée, aucune URL n'est devinée.

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
- La géographie affiche désormais son explication après la réponse, comme la
  religion. Aucun effet en partie tant que la catégorie n'est pas servie.
- Ajouter les sources se réduit à une modification de données : remplir le
  catalogue, puis citer les clés sur les cartes couvertes. Aucun code à
  toucher, et la validation humaine reste une décision séparée.

## Alternatives écartées
- **Garder le régime factuel et allonger le catalogue de faits** : produit un
  quiz de capitales et fabrique des affirmations non relues.
- **Publier les 30 cartes sans source, « parce que c'est évident »** :
  contredit la règle posée pour cette catégorie, et c'est exactement sur
  l'évidence que les erreurs passent.
- **Compléter les quatre explications manquantes nous-mêmes** : ce serait
  inventer du contenu à la place de l'auteur. Elles ont été écrites par lui,
  puis reprises telles quelles.
- **Recopier la même source sur chaque carte qu'elle couvre** : trente copies
  à corriger le jour où une référence change.
