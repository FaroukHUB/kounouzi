# 0018 — Variantes déterministes du Chemin et rotation entre les parties

**Statut** : acceptée (Phase 3.1) — complète l'ADR 0013

## Contexte
Un cycle unique, toujours le même pour chaque siège, deviendrait mémorisable
d'une partie à l'autre et recréerait indirectement une anticipation des
destinations. Il faut varier entre les parties **sans aucun hasard**.

## Décision
- **Six cycles préconstruits** `journey-cycle-A..F.v1.json`, générés par
  recherche exhaustive déterministe (permutations de 1..5 à sommes partielles
  proches de 3·k, sans valeurs identiques consécutives, bouclage compris,
  au plus deux blocs par première valeur, ≥ 4 premières et dernières valeurs
  distinctes). Aucun n'est une rotation d'un autre. Tous passent la même
  batterie de tests que le cycle initial (équilibre, absence d'avantage de
  siège, écart ≤ 4 à tout horizon, égalité à tout multiple de 5 voyages) et
  un test transversal N variantes × 2–6 joueurs.
- **Rotation par compteur persistant** `familyGameOrdinal` (1, 2, 3, …) :
  partie n°1 → A, n°2 → B, … puis retour à A. Le compteur vit dans la
  persistance locale (`GameRepository.nextFamilyGameOrdinal`, IndexedDB
  `kounouzi-meta`) et est **monotone** : une partie créée puis abandonnée a
  consommé son numéro. Aucune date, aucun UUID, aucune fonction aléatoire
  n'intervient dans la sélection.
- **Le moteur reste pur** : la couche de création résout la variante et
  passe le cycle complet dans `GameSetup.journey` ; le moteur ne consulte
  jamais le compteur. L'identifiant du cycle (`journeyScheduleId` de fait)
  est `config.journey.id`, présent dans l'état pour la reprise.
- **Invisible et non sélectionnable** : l'écran de création ne propose pas
  de cycle ; aucun composant d'interface, store, animation ou expérience ne
  lit `config.journey`, `assignJourneySteps`, `flattenCycle` ni
  `JOURNEY_VARIANTS` (test d'architecture). L'interface ne reçoit que
  `MovementAssigned { steps }` du tour courant.
- **Identifiants techniques** : un identifiant unique (`gameId`) peut être
  produit techniquement à partir de l'horloge ou d'un UUID ; il n'influence
  jamais déplacement, événement, question, récompense ni économie.

## Conséquences
- Variable entre les parties, parfaitement déterministe à l'intérieur d'une
  partie (même variante + mêmes commandes ⇒ même déroulement, testé).
- Ajouter une variante = ajouter un fichier validé par le schéma.
