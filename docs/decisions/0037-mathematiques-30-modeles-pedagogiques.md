# 0037 — Mathématiques : 30 modèles pédagogiques validés, variantes numériques contrôlées

**Statut** : acceptée (décision produit, 2026-09-19) — remplace le générateur
d'opérations nues de l'ADR 0020 pour la catégorie Mathématiques

## Contexte
Le générateur de mathématiques de la Phase 4A produisait des opérations nues
(`4 × 5 = ?`, `17 × 13 = ?`, `87 × 15 = ?`) : quatre familles (addition,
soustraction, multiplication, division) déclinées par difficulté, avec des
opérandes choisis dans un intervalle. C'est un exercice scolaire, pas une
situation. Rien n'y est utile, rien n'y est concret, et le format ne se dit
pas oralement à une table de famille. L'audit du contenu Savoir a confirmé
que c'était la partie la plus artificielle du jeu.

Le besoin est l'inverse : des situations courtes que l'on comprend à
l'oral — recevoir, dépenser, comparer, partager, lire l'heure, tenir un
budget, calculer un prix unitaire ou un pourcentage. Une multiplication peut
être travaillée, mais **dans** une situation.

## Décision

### 1. Une banque de modèles, pas une banque de questions
`src/core/content/generators/mathsModels.ts` contient **30 modèles
pédagogiques validés** (`MATH-001` … `MATH-030`). Un modèle porte un
identifiant stable, une difficulté, une compétence (`knowledgeNodeId`), un
régime, une fonction `values(variation)` qui produit des nombres et une
fonction `render(params)` qui produit les six textes obligatoires : énoncé,
réponse et explication, en **français ET en arabe**.

Les 30 modèles se répartissent en 21 compétences distinctes : plusieurs
modèles peuvent viser la même compétence, ce qui permet de la travailler sous
plusieurs formes sans multiplier les notions.

### 2. Deux régimes : statique et paramétrique
- **`static` (3 modèles : MATH-023, MATH-026, MATH-027)** — les nombres SONT
  la démonstration. Faire varier MATH-026 détruirait son enseignement :
  +20 % puis −20 % sur 100 donne 96, pas 100. De même pour les deux
  comparaisons de prix unitaire, dont la décimale est le point à comprendre.
  Ces modèles ne varient jamais : formulation et raisonnement restent
  identiques.
- **`parametric` (27 modèles)** — les nombres varient sans changer la
  compétence travaillée. Les valeurs viennent du parcours déterministe
  d'intervalle existant (`pickInRange`, ADR 0020), jamais d'un tirage.

### 3. Justesse par construction, pas par vérification
Un modèle paramétrique ne tire pas des nombres puis ne teste pas si le
résultat tombe juste : il est **construit** pour qu'il tombe juste. Le total
d'un partage est bâti comme `enfants × part` (division toujours exacte) ; un
budget est bâti comme `dépenses + reste` (soustraction jamais négative) ; un
pourcentage porte sur un montant multiple de 100 avec un taux choisi dans une
liste (remise toujours entière) ; une durée est bâtie pour franchir l'heure.
Aucune valeur impossible ne peut donc être produite, quelle que soit la
variation.

### 4. Les bornes sont pédagogiques, jamais économiques
`MATHS_BOUNDS` (d1 ≤ 20, d2 ≤ 100, d3 ≤ 500, d4 ≈ 1000, d5 ≈ 1000) borne les
nombres d'un exercice selon sa difficulté. Ces bornes n'ont **aucun rapport**
avec l'économie du plateau : elles ne touchent ni les montants, ni les frais,
ni le Don, ni la Zakāt, ni la formule de victoire.

### 5. Un modèle = un créneau du Learning Engine
`mathsSlots()` expose 30 `KnowledgeSlot` (`maths.model.MATH-0XX`), un par
modèle. Rien d'autre ne change : la sélection pédagogique, le départage
stable fourni par l'appelant (ADR 0032), l'anti-répétition par joueur, par
partie et par tablée continuent de fonctionner à l'identique. **Aucun second
moteur de progression n'est créé.**

L'enchaînement reste celui qui existait : l'âge donne la bande de difficulté
initiale (`bands.v1.json`) qui amorce le niveau de la catégorie ; ensuite le
Learning Engine seul fait évoluer ce niveau, demande une difficulté, et le
générateur produit une variante compatible. **L'âge amorce, il ne plafonne
pas** : un enfant qui réussit dépasse sa bande de départ. Les profils adultes
gardent `discovery | standard | advanced`, sans âge.

### 6. Référence versionnée
`MATHS_GENERATOR_VERSION` passe à **2**. Le `generatorId` d'une question est
désormais `maths.MATH-0XX` (le modèle servi), et `params` porte les opérandes
réels du modèle. Une référence v1 (`maths.addition` …) n'est plus
reconstructible : `rebuildMaths` renvoie `null`, comportement déjà prévu pour
un contenu retiré — la question figée dans l'état d'une partie en cours
(ADR 0022) reste intacte, elle ne dépend pas du générateur.

### 7. Arabe provisoire, assumé
Les formulations arabes sont mathématiquement justes et respectent le sens du
français, mais restent marquées `review.ar = "provisional"` jusqu'à relecture
humaine, comme tout contenu non encore validé. Les mathématiques pures ne
demandent aucune source externe : `sources: []` est correct ici, et ne
s'applique à aucune autre catégorie.

## Conséquences
- Les opérations nues disparaissent du contenu servi ; un test interdit qu'un
  énoncé se réduise à `a op b = ?`.
- Le vivier de maths passe de 141 créneaux (4 familles × difficultés ×
  variantes) à 30 créneaux réellement distincts sur le plan pédagogique. La
  variété vient désormais des variantes d'un même modèle, pas du nombre de
  créneaux.
- Une formulation paramétrique déjà posée dans la partie ne revient pas :
  l'essai suivant sur la même compétence propose d'autres nombres. La
  pénalité « déjà posée dans la partie » ne s'observe donc à l'état pur que
  sur les modèles statiques, ce que le test démontre explicitement.
- Aucune autre catégorie n'est touchée : Religion (375 cartes validées),
  Défis famille, géographie, économie du plateau et formule de victoire sont
  inchangées, et des tests de non-régression le verrouillent.

## Alternatives écartées
- **Garder les opérations nues en les habillant d'une phrase** : l'habillage
  ne rend pas l'exercice utile, et la phrase générée serait inventée.
- **Écrire 300 questions de maths en banque** : impossible à maintenir, et
  inutile — en mathématiques, la variante numérique est gratuite dès lors
  qu'elle est construite pour tomber juste.
- **Un moteur de progression propre aux maths piloté par l'âge** : ferait
  de l'âge un plafond et dupliquerait le Learning Engine. Refusé.
