# 0013 — Aucun hasard : le Chemin, déplacement déterministe

**Statut** : acceptée (Phase 2.1) — remplace la roue de la Phase 2

## Contexte
Kounouzi ne veut ni dé, ni roue, ni tirage, ni déplacement choisi par le
joueur. Le joueur ne choisit pas où son chemin le conduit ; il choisit ce
qu'il fait une fois arrivé. Le déplacement ne doit dépendre ni de la chance,
ni d'un calcul stratégique, ni d'une manipulation par le moteur.

## Décision
- Suppression totale du hasard dans `src/core` : plus de `rng.ts`, de
  graine, d'état RNG, de compteur d'appels, de `SpinWheel`, de `WheelSpun`,
  de `wheel` dans les règles. ESLint refuse `Math.random` et
  `crypto.getRandomValues` dans le noyau ; un test lit les sources et refuse
  tout vocabulaire de roue/dé/graine.
- Commande `StartJourney` sans paramètre ; le moteur émet
  `MovementAssigned { playerId, steps, journeyIndex }` puis `PawnMoved`.
- **Journey Scheduler** (`journeyScheduler.ts`) : `assignJourneySteps(cycle,
  seat, journeyIndex)`. La fonction ne reçoit **pas** le `GameState` ; elle ne
  peut donc lire ni argent, ni patrimoine, ni propriétaires, ni score, ni
  âge, ni FamilyAssist, ni le type des cases devant le joueur.
- **Cycle versionné** (`src/config/journey/journey-cycle.v1.json`) : 6 blocs,
  chacun une permutation de 1..5, sans deux valeurs identiques consécutives
  (bouclage compris), sommes partielles proches de 3·k. Le siège `s` commence
  au bloc `s` ; le `k`-ième voyage lit la position `s·5 + k` du cycle aplati.
- Propriétés garanties et testées : chaque siège reçoit chaque valeur 6 fois
  par cycle ; après tout multiple de 5 voyages, tous les sièges ont parcouru
  la même distance ; l'écart entre sièges ne dépasse jamais 4 ; deux voyages
  consécutifs d'un joueur ne sont jamais identiques ; la suite n'est pas
  1,2,3,4,5.
- L'interface n'affiche que le Chemin du tour courant, une fois attribué. La
  suite n'est jamais montrée. (Dans une application locale, le code du cycle
  est par nature public ; ce qui est garanti est l'absence d'exposition dans
  l'expérience de jeu, pas un secret cryptographique.)
- **Scénarios** : plus aucun tirage. Les scénarios d'un type de case sont
  servis dans l'ordre configuré selon le compteur de visites de la case
  (`cellVisits`).
- **Learning Engine (Phase 5, règle architecturale)** : jamais de tirage
  parmi plusieurs questions adaptées ; sélection de la meilleure question
  suivante (joueur, catégorie, niveau, révisions, historique, difficulté,
  répétition, priorité pédagogique) avec un départage déterministe stable.

## Conséquences
- La reproductibilité d'une partie découle du déterminisme complet du
  moteur : même configuration + mêmes commandes ⇒ même déroulement.
- L'état sérialisé passe en version 2 (la v1 n'a jamais été publiée : pas de
  migration).
