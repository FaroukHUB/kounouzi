# 0032 — Questions : anti-répétition par tablée, tirage entre questions équivalentes hors du noyau, défis comptés

**Statut** : acceptée (décision du propriétaire du projet après playtest, 2026-09-05)

## Contexte
En partie, « les mêmes questions reviennent ». Diagnostic :
- l'anti-répétition par partie (ADR 0029) ne regardait que la mémoire du
  joueur qui répond : deux joueurs semblables et neufs (deux enfants du même
  âge, deux adultes) recevaient exactement la même suite, chaque question
  étant posée deux fois à la tablée ;
- sans aucun hasard, le départage stable (alphabétique) faisait commencer
  toute partie de joueurs neufs par les mêmes questions, et servait toujours
  la même banque religieuse en premier ;
- une question jouée dans un Défi famille (CH-094 à CH-097) n'entrait pas
  dans la mémoire et pouvait revenir comme question ordinaire.

Le propriétaire décide : **le hasard reste banni des dés et du Chemin**
(ADR 0013), mais **le choix des questions est un quiz et peut être tiré au
sort**.

## Décision
- **Anti-répétition par tablée.** La sélection reçoit les essais des AUTRES
  joueurs de la même partie (`tableAttempts`) : une formulation déjà posée à
  quelqu'un d'autre est pénalisée comme si le joueur l'avait eue
  (`repeatAtTable`), une notion déjà vue à la tablée l'est plus légèrement
  (`repeatNodeAtTable`). Poids dans `learning.v1.json`. La couche
  d'expérience (`resolveQuestion`) les calcule depuis les mémoires chargées.
- **Le noyau ne tire rien ; l'appelant fournit une clé de départage.**
  `selectQuestion` accepte `tieBreak` dans [0, 1). Les créneaux dont le score
  est à moins de `variety.tieBreakMargin` points du meilleur sont
  équivalents ; la clé choisit parmi eux. Sans clé : premier de l'ordre
  stable, comme avant (tests et simulations restent déterministes). Une
  révision due, une faiblesse, la distance au niveau visé restent
  prioritaires : la clé ne renverse jamais un écart supérieur à la marge.
  L'interface de jeu fournit `Math.random()` au moment de distribuer, une
  seule fois par demande ; la question est ensuite figée dans l'état, donc
  la reprise ne retire jamais rien. `src/core` reste sans `Math.random`
  (règle ESLint et test d'architecture inchangés).
- **Les questions des Défis famille comptent.** `FamilyChallengeCompleted`
  porte la question jouée et l'identifiant de demande ; la mémoire
  l'enregistre comme un essai (réussi = correct, raté = incorrect, mode
  collectif), avec la récompense du défi.

## Conséquences
- Deux enfants du même âge dans une même partie ne reçoivent plus la même
  question ; les parties d'une famille ne commencent plus toutes pareil ; la
  Religion ne sert plus toujours le même livre en premier.
- Le Chemin, la roue-sans-roue, les défis (rotation cachée) et l'économie
  restent entièrement déterministes.

## Tests
`tests/unit/learning/tableRepetition.test.ts` (défaut reproduit, 24
questions alternées sans doublon à la tablée, raison « déjà posée à la
tablée », partie distincte non concernée ; clé de départage : même clé même
question, clés différentes variété dans la marge, clé bornée, révision due
prioritaire), résolveur (tablée, clé fournie), mémoire (défi réussi / raté /
sans question), moteur (événement enrichi).
