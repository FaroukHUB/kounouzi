# 0025 — Catégorie de Duel neutre, adversaires disponibles, diagnostic de playtest local (Phase 5.2)

**Statut** : acceptée (Phase 5.2) — prépare le premier playtest familial

## Contexte
En Phase 5.1, la catégorie d'un Duel était fixée par la première question
servie au défieur : le Duel « appartenait » pédagogiquement au défieur. Un
joueur pouvait aussi défier toujours la même personne. Enfin, pour observer
de vraies parties, il faut des mesures locales sans aucune télémétrie.

## Décision

### Catégorie du Duel : elle appartient au Duel
- `commonEligibleCategories(challenger, opponent)` : catégories où les DEUX
  joueurs possèdent du contenu autorisé pour leur audience (ordre stable).
- `selectDuelCategory` (`src/core/learning/duel.ts`) : pour chaque
  catégorie commune, le besoin de chaque joueur est le meilleur score de ses
  créneaux dans cette catégorie (révision due, faiblesse, proximité de sa
  difficulté, notion peu vue, anti-répétition, exposition récente) ; le score
  du Duel est la SOMME des deux besoins. Inverser défieur et adversaire ne
  change ni la catégorie ni le score (testé). Départage stable par
  identifiant. Aucun hasard.
- Une fois la catégorie fixée, chaque dueliste reçoit SA question dans cette
  catégorie, à sa propre difficulté (`resolveQuestion` → `duelCategoryFor`).
  Le moteur continue de refuser une seconde question d'une autre catégorie.

### Adversaires disponibles (V1)
- `PlayerState.lastDuelOpponentId` : l'adversaire du dernier Duel déclenché
  par ce joueur. `duelCandidates` l'exclut quand un autre adversaire existe ;
  il redevient disponible au Duel suivant. À deux joueurs, tous les Duels
  restent possibles. Choisir un adversaire absent de la liste est refusé
  (`INVALID_OPPONENT`).
- Interface : les autres joueurs sont affichés ; un joueur momentanément
  indisponible est légèrement désactivé, sans explication ni vocabulaire
  négatif.

### Diagnostic de playtest LOCAL (développement)
- `playtestStore` observe passivement chaque lot d'événements dispatché et
  l'horodate (horloge murale + temps de jeu actif lu dans l'état). Il n'émet
  aucune commande et ne modifie aucun état (testé structurellement : le
  noyau ignore le playtest ; le playtest n'appelle ni `dispatch`, ni
  `reduce`, ni le réseau).
- `buildPlaytestReport(state, log)` (`src/experience/playtest`) : durées
  active et murale, tours, questions, Duels (dont enfant/adulte, victoires,
  égalités), Haltes, monuments achetés, visites, transferts, Trésors, choix
  Gestion, actions Solidarité, événements collectifs ; statistiques par
  joueur ; temps approximatif par interaction (question, Duel, monument,
  Défi Patrimoine, événement, gestion, solidarité, trésor, halte) mesuré
  entre l'ouverture et la clôture de l'interaction ; journal lisible
  horodaté en temps actif.
- Écran développeur `/diagnostic/<gameId>` (aucune entrée dans l'interface
  joueur), export JSON et TXT générés localement dans le navigateur.
- Persistance : IndexedDB locale (`kounouzi-playtest`), une entrée par
  partie. Aucune analytics externe, aucun serveur, aucun envoi.

### Ce qui ne change pas
FamilyAssist non implémenté ; montants DEMO inchangés ; formule de score
finale non décidée ; aucun élément de Phase 6.

## Conséquences
- Les chiffres du diagnostic sont dérivés des événements, jamais recalculés
  par des règles : ils ne peuvent pas diverger du jeu.
- Le temps par interaction reste approximatif (il inclut animations et
  discussions) : c'est précisément ce que le playtest doit révéler.
