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

### 4. Treize cartes restent en brouillon
Treize cartes (LOG-003, 005, 006, 009, 012, 014, 016, 018, 020, 022, 024,
026, 029) n'ont reçu **aucune explication** de l'auteur. Elles restent
`draft`, explication vide et `reviewNotes` posée, plutôt que complétées par
un texte inventé — c'est la règle déjà appliquée à la géographie (ADR 0038),
et la décision prise par l'auteur pour les quatre cartes géographiques
manquantes : une carte jouable doit avoir FR **et** AR complets.

La garde de jouabilité les refuse donc, et elles ne sont servies nulle part.
Les 17 cartes complètes sont `validated` et jouables.

### 5. Aucune logique de progression nouvelle
L'âge donne la tranche de départ, et rien d'autre. Les cinq tranches tiennent
exactement dans les bandes d'amorçage de `bands.v1.json`, vérifié carte par
carte. Ensuite le Learning Engine existant est seul à faire monter ou
descendre le joueur. Un test relit `src/core/learning` et exige qu'aucun
fichier n'y mentionne Logique.

## Conséquences
- Logique devient la **quatrième catégorie servie** :
  `availableCategories` vaut `["religion", "maths", "logic", "management"]`.
- Le vivier jouable est de 17 cartes et couvre les cinq difficultés, mais
  **deux notions n'ont aucune carte jouable** (`comparaison` et
  `elimination`, dont les cartes sont toutes parmi les treize sans
  explication), et deux autres n'en ont qu'une (`contraintes`,
  `representation`). Le groupement est correct sur la banque complète ; ce
  sont les explications manquantes qui le creusent. Un test constate cet état
  plutôt que de le masquer, et il devra être mis à jour quand les treize
  cartes seront complétées.
- `showsExplanation` reste `false` pour Logique, comme avant. La question se
  pose — la religion, la géographie et la gestion l'ont à `true` — mais elle
  n'a pas été tranchée et n'est pas un effet de bord de cette décision.

## Alternatives écartées
- **Écrire nous-mêmes les treize explications manquantes** : ce serait
  inventer du contenu à la place de l'auteur.
- **Servir les treize cartes sans explication** : une carte de logique sans
  explication n'apprend rien ; elle devient un quiz.
- **Garder les énigmes longues** : bonnes sur Internet, mauvaises autour d'un
  plateau — cinq minutes d'explication pour une case.
