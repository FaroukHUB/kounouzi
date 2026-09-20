# 0040 — Logique : banque curée de 30 cartes, dix-sept jouables et treize en attente

**Statut** : acceptée (décision produit, 2026-09-19)

## Contexte
La catégorie Logique était déclarée `curated` et active depuis l'origine mais
n'avait aucune carte. L'auteur a écrit 30 cartes réparties par tranche d'âge.

Le critère retenu n'est pas la difficulté de l'énigme mais sa **durée à
l'oral** : une carte Logique doit se comprendre et se résoudre en 10 à
30 secondes autour d'une table. Les énigmes classiques qui demandent une
longue mise en place — cordes qui brûlent, seaux de 3 et 5 litres, traversée
de pont, billes à peser — ont été écartées par l'auteur, non parce qu'elles
sont mauvaises, mais parce qu'elles cassent le rythme d'une partie familiale.

## Décision

### 1. Même architecture que Gestion, réutilisée sans une ligne de noyau
30 cartes statiques (`LOG-001` … `LOG-030`,
`src/content/questions/logic/logique.v1.json`) servies par le fournisseur
curé existant. Aucun générateur, aucun tirage. L'identifiant de catégorie
reste `logic`, celui déjà persisté dans les mémoires.
`requiresSource` reste `false` : une carte de logique énonce un
raisonnement, pas un fait vérifiable contre une référence externe.

### 2. Dix notions, chacune portée par au moins deux cartes
`suite`, `comparaison`, `ordre`, `appartenance`, `elimination`,
`contraintes`, `coherence`, `piege`, `denombrement`, `representation`.
La contrainte posée pour Gestion (ADR 0039) est appliquée d'emblée : aucune
notion ne repose sur une carte unique, sinon sa révision reposerait
forcément la même carte.

Le découpage suit la progression voulue par l'auteur : reconnaître, ordonner
et comparer à 5-6 ans ; comprendre une règle simple à 7-8 ; un petit piège ou
une petite déduction à 9-10 ; croiser deux informations à 11-12 ; cohérence
logique, conditions et déduction à 13 ans et plus.

### 3. Tout l'arabe est une traduction, et il est déclaré comme tel
L'auteur a fourni le français seul. L'arabe des 30 énoncés, des 30 réponses
et des 17 explications est une **traduction fidèle**, sans ajout : une carte
de logique ne transporte aucun fait, la traduction n'introduit donc aucune
affirmation nouvelle. Les 30 cartes portent `arReview: "provisional"`
jusqu'à relecture humaine.

### 4. L'explication fait partie de l'apprentissage
`logic.showsExplanation` passe à `true`, comme la religion (ADR 0030), la
géographie (ADR 0038) et la gestion (ADR 0039). La réponse d'une carte de
logique est souvent un seul mot (« Adam. », « Dans la bleue. ») : sans
l'explication affichée, la carte devient un quiz.

Corollaire : une carte jouable doit avoir une explication complète en FR et
en AR. Les treize cartes qui n'en avaient pas ont été complétées par
l'auteur, jamais inventées ici.

### 5. Une carte retenue, parce que son explication ne décrit pas sa carte
LOG-003 demande qui est le plus petit entre Lina et Adam ; l'explication
fournie pour elle décrit une petite boîte qui entre dans une grande. Le
texte de l'auteur est enregistré **tel quel**, sans être retouché ni
remplacé — ce n'est pas à nous de réécrire son contenu — mais la carte reste
`draft` et n'est pas publiée tant qu'il n'a pas tranché. Publier une
explication qui contredit sa question apprendrait quelque chose de faux à un
enfant, et `showsExplanation` la lui met précisément sous les yeux.

Les 29 autres cartes sont `validated` et jouables.

### 6. Aucune logique de progression nouvelle
L'âge donne la tranche de départ, et rien d'autre. Les cinq tranches tiennent
exactement dans les bandes d'amorçage de `bands.v1.json`, vérifié carte par
carte. Ensuite le Learning Engine existant est seul à faire monter ou
descendre le joueur. Un test relit `src/core/learning` et exige qu'aucun
fichier n'y mentionne Logique.

## Conséquences
- Logique devient la **quatrième catégorie servie** :
  `availableCategories` vaut `["religion", "maths", "logic", "management"]`.
- Le vivier jouable est de 29 cartes, couvre les cinq difficultés et les dix
  notions : **aucune notion n'est sans carte jouable**, et la seule carte
  retenue ne vide pas la sienne (`comparaison` garde LOG-016 et LOG-020).
- Logique affiche désormais son explication après la réponse, comme la
  religion, la géographie et la gestion.

## Alternatives écartées
- **Écrire nous-mêmes les explications manquantes** : ce serait inventer du
  contenu à la place de l'auteur. Elles ont été écrites par lui, puis
  reprises telles quelles.
- **Servir une carte sans explication** : une carte de logique sans
  explication n'apprend rien ; elle devient un quiz.
- **Corriger nous-mêmes l'explication de LOG-003, ou la publier telle
  quelle** : la réécrire serait inventer, la publier serait enseigner à un
  enfant une explication qui contredit sa question. La carte attend.
- **Garder les énigmes longues** : bonnes sur Internet, mauvaises autour d'un
  plateau — cinq minutes d'explication pour une case.
