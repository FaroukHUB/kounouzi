# 0026 — Explication réservée aux catégories qui la déclarent, voix coupée à la suite

**Statut** : acceptée (retour du premier playtest familial)

## Contexte
Au premier vrai playtest, l'étape « explication » (FR puis AR, lue à voix
haute) allongeait chaque question, y compris en maths ou en géographie où
elle n'apporte rien. Pire : la file vocale continuait de lire l'explication
alors que la carte était fermée et que le joueur suivant jouait déjà. Les
voix se chevauchaient et la tablée ne savait plus qui parlait à qui.

## Décision
- L'affichage et la lecture de l'explication après la réponse deviennent une
  **propriété de catégorie** (`showsExplanation`, donnée validée par Zod dans
  `categories.v1.json`), vraie pour la religion seulement. Pour les autres
  catégories, la réponse validée (Correct / Presque / Incorrect) part
  directement au moteur avec `explanationMastery = none` ; l'étape
  « connaissais-tu déjà ? » n'est donc proposée qu'avec une explication.
- Dès que la tablée quitte l'étape « explication » (bouton Suite, ou carte
  fermée), la narration est **arrêtée** (`stop()`), file comprise. Le tour
  suivant commence toujours sur une voix libre.
- La lecture automatique est en **français seulement** ; l'explication arabe
  reste toujours visible quand elle existe et s'écoute à la demande par le
  bouton « Écouter en arabe » (jamais d'enchaînement FR + AR automatique).
- Le narrateur Web Speech ignore les fins et minuteries des phrases annulées
  (génération incrémentée à chaque `stop()`), afin qu'une phrase annulée ne
  coupe jamais la suivante.

## Conséquences
- Une catégorie sans explication ne peut pas obtenir le bonus « explication
  maîtrisée » (×2) : cohérent, il n'y a rien à maîtriser. Les montants restent
  DEMO, la formule de score n'est pas décidée.
- Les banques religieuses conservent leurs explications FR **et** AR
  obligatoires : rien ne change côté contenu ni côté garde-fous de
  jouabilité.
- Une nouvelle catégorie choisit explicitement si elle montre une
  explication ; aucune valeur par défaut implicite (une catégorie inconnue
  n'en montre pas).
