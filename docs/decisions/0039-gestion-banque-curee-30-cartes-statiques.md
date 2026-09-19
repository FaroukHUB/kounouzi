# 0039 — Gestion : banque curée de 30 cartes statiques, sans régime documentaire

**Statut** : acceptée (décision produit, 2026-09-19)

## Contexte
La catégorie Gestion était déclarée `curated` et active depuis l'origine,
mais n'avait aucune carte : elle ne servait donc rien. L'auteur a écrit
30 cartes réparties par tranche d'âge.

Une carte de gestion ne se comporte ni comme une carte de mathématiques ni
comme une carte de géographie. Elle ne contient pas un calcul dont on
pourrait faire varier les nombres (ADR 0037), et elle n'énonce pas un fait
vérifiable contre une référence extérieure (ADR 0038) : elle porte un
**raisonnement**. « Une promotion n'est pas forcément une économie » ne se
paramètre pas et ne se source pas ; cela se comprend, ou non.

## Décision

### 1. Banque curée de cartes statiques, aucun générateur
30 cartes (`GEST-001` … `GEST-030`,
`src/content/questions/management/gestion.v1.json`), servies telles quelles.
Le régime `curated` existant est réutilisé sans modification : rien de
nouveau n'est écrit dans le noyau, le fournisseur curé et la garde de
jouabilité suffisent. Un créneau curé ignore la variation qu'on lui passe :
une carte rend toujours la même formulation, ce qu'un test vérifie.

### 2. Identifiant de catégorie conservé
La catégorie reste `management`, l'identifiant déjà persisté dans les
mémoires pédagogiques (`attempt.categoryId`, `memory.categories`). Le
renommer réinitialiserait silencieusement la progression enregistrée. Seuls
les `knowledgeNodeId` sont écrits en français, comme le reste du vocabulaire
de notions du dépôt (`gestion.reserve`, `gestion.cout-opportunite`).

### 3. Douze notions pour trente cartes
Les cartes sont regroupées autour de 12 notions stables plutôt que
d'inventer 30 notions distinctes : `besoin-envie`, `epargne`, `reserve`,
`budget`, `priorite`, `planification`, `cout-total`, `valeur-unitaire`,
`cout-duree`, `entrees-sorties`, `risque`, `cout-opportunite`.

Une même notion est travaillée à plusieurs difficultés : le coût
d'opportunité apparaît en d3 sous la forme « ce jouet ou mon objectif plus
vite ? » et en d5 sous son nom. Le Learning Engine peut donc réviser une
compétence sans reposer la même carte.

### 4. Aucun régime documentaire
`management.requiresSource` reste `false` : comportement conservé, pas une
exception créée pour l'occasion. Un raisonnement de gestion ne se vérifie
pas contre une référence externe, et exiger une source reviendrait soit à
bloquer la catégorie, soit — bien pire — à en inventer une. Le tableau
`sources` est donc vide, et un test interdit toute URL dans le fichier.

Ces cartes restent néanmoins du contenu curé **contrôlé** : elles sont
`validated` parce que l'auteur du jeu les a écrites et arrêtées lui-même,
ce qui est la validation humaine exigée — jamais une validation déduite.

### 5. L'explication fait partie de l'apprentissage
`management.showsExplanation` passe à `true`, comme la religion (ADR 0030)
et la géographie (ADR 0038). La réponse d'une carte de gestion est souvent
courte (« Non. », « Le cahier. ») et c'est l'explication qui porte
l'enseignement. Sans elle, la carte devient un quiz.

### 6. L'arabe reste provisoire
Les 30 cartes portent `arReview: "provisional"` (ADR 0038). La justesse du
contenu est validée ; la qualité linguistique de l'arabe attend une
relecture humaine. Ce sont deux axes distincts.

### 7. Aucune logique de progression nouvelle
L'âge donne la tranche de départ, et rien d'autre. Les cinq tranches
(5-6, 7-8, 9-10, 11-12, 13+, six cartes chacune) tiennent exactement dans
les bandes d'amorçage de `bands.v1.json` ; un test le vérifie carte par
carte. Ensuite le Learning Engine existant est seul à faire monter ou
descendre le joueur : **l'âge amorce, il ne plafonne pas**, et un test
montre aussi bien la montée au-delà de la bande initiale que la redescente
après échecs répétés, sans passer sous le minimum configuré.

Le noyau d'apprentissage ne connaît ni cette catégorie ni ses notions : un
test relit `src/core/learning` et exige qu'aucun fichier n'y mentionne
Gestion.

## Conséquences
- Gestion devient la **troisième catégorie servie**, après Religion et
  Mathématiques : `availableCategories` vaut désormais
  `["religion", "maths", "management"]`.
- Les parties gagnent une catégorie de variété. Rien d'autre ne change :
  Religion (375 cartes), Mathématiques (30 créneaux) et Géographie (30
  cartes toujours en attente de leurs sources) sont inchangées, et des tests
  de non-régression le verrouillent.
- Le vivier de Gestion est fini : 30 cartes, jamais plus, tant qu'aucune
  n'est ajoutée à la main. C'est voulu.

## Alternatives écartées
- **Un générateur de situations de gestion** : produirait des affirmations
  assemblées, exactement ce que l'ADR 0038 a écarté pour la géographie.
- **Exiger une source comme en géographie** : bloquerait la catégorie, ou
  pousserait à inventer une référence.
- **Renommer la catégorie `gestion`** : réinitialiserait silencieusement la
  progression déjà enregistrée des joueurs.
