# Kounouzi — Architecture

> **KOUNOUZI — Joue. Apprends. Gère.**
> Jeu de plateau numérique familial : plusieurs joueurs, enfants **et** adultes,
> autour d'un seul écran (tablette en priorité). Chaque joueur a son pion, son
> argent virtuel, son patrimoine, ses questions adaptées à son niveau réel, sa
> progression et son score. N'importe quel joueur peut gagner.

Ce document résume l'architecture validée en Phase 0. Les décisions
individuelles sont tracées dans `docs/decisions/`.

## 1. Principe directeur

> **Le moteur décide. L'interface montre. Les données configurent.**

- Le noyau (`src/core`) est du TypeScript pur, déterministe, sans React, Next,
  Motion, Zustand ni Supabase. Frontière vérifiée par ESLint et testée.
- Les règles configurables (plateau, économie, récompenses, bandes de
  difficulté, catégories) sont des **données versionnées** validées par Zod,
  jamais du code. Une partie fige les configurations avec lesquelles elle a
  démarré.
- L'interface est **française en V1**, mais le RTL et le bilinguisme FR/AR sont
  prévus structurellement dès les fondations (dictionnaires typés, composant
  d'isolation bidirectionnelle, utilitaires Tailwind logiques imposés par lint).

## 2. Couches

```
UI (app/, src/ui, src/animation)        React · Next · Tailwind · Motion
   │ commandes ↓            ↑ état + événements
ÉTAT (src/state)                         gameStore (persistant) ≠ uiStore (transitoire)
   │
CORE (src/core)                          TypeScript pur
   ├─ game/       tours, roue, déplacement, économie, récompenses, patrimoine, effets, score
   ├─ learning/   sélection adaptative, maîtrise, répétition, progression par catégorie
   ├─ content/    fournisseurs de questions (algorithmique · factuel · curé), garde-fous
   └─ shared/     types et constantes validés
   │ ports
DONNÉES (src/data)                       IndexedDB (vérité en partie) · Supabase (sync, contenu, RLS)
CONFIGURATION (src/config)               JSON versionné + schémas Zod
```

Contrat du moteur de jeu : `reduce(state, command) → { state, events }`, pur et
sérialisable. Le moteur n'attend jamais une animation, seulement des décisions
humaines. L'UI rejoue les événements sous forme d'animations ; l'état est déjà
acquis avant qu'elles ne commencent.

### Moteur de jeu (`src/core/game`, Phase 2)

- **Commandes joueur** : `StartJourney` (sans paramètre : le joueur ne
  choisit jamais son déplacement), `SubmitAnswer`, `DecidePurchase`, `Choose`.
  **Commandes de session** : `AdvanceClock { seconds }` (temps actif injecté),
  `RequestGameEnd`. Tout le reste — Chemin, déplacement, résolution de case,
  clôture du tour, passage au joueur suivant, fin de partie — est automatique.
- **Le Chemin** (ADR 0013, 0018) : aucun hasard dans le noyau. `journeyScheduler`
  attribue les étapes depuis un cycle versionné, le siège et le compteur de
  voyages — sans jamais recevoir l'état de la partie. Six variantes de cycle
  tournent d'une partie à l'autre selon un compteur persistant monotone,
  invisible et non sélectionnable. Les scénarios d'une case sont servis dans
  l'ordre configuré selon ses visites.
- **Phases** : `awaiting_journey` → (`MovementAssigned`, déplacement,
  arrivée) → `awaiting_answer` | `awaiting_purchase` | `awaiting_choice` →
  clôture → joueur suivant, ou `finished`.
- **Durée** (ADR 0014) : `active_time` (temps de jeu actif, pauses exclues),
  `free` (fin sur demande parentale) ou `turns_per_player` (tests). La fin
  n'intervient qu'à la fin d'un tour de table complet.
- **FamilyAssist** (ADR 0015) : modèle par partie, parental et secret,
  **non implémenté** ; ne pourra jamais toucher au Chemin ni à la vérité
  pédagogique.
- **Résolution de case** : une case produit une file de résultats (`Outcome`)
  traitée dans l'ordre ; un résultat exigeant une décision suspend la file
  dans la phase, et la partie reprend exactement là après sérialisation.
- **Économie** : grand livre (`ledger`), aucun solde écrit directement ;
  `checkInvariants` vérifie que chaque solde égale la somme de ses transactions.
- **Patrimoine** : achat d'un site libre si le solde suffit ; un site possédé
  (par soi ou un autre) n'est plus proposé ; aucun paiement entre joueurs.
- **Effets** : `skip_turn`, `extra_turn`, `reward_multiplier`, en file par
  joueur, consommés aux points de déclenchement.
- **Fin** : condition configurable (`turns_per_player` en V1), classement
  déterministe par score puis argent puis siège.
- **Déterminisme** : aucun hasard nulle part ; même configuration + mêmes
  commandes ⇒ mêmes événements et même état sérialisé (testé). Règle étendue
  au futur Learning Engine (sélection déterministe, départage stable).

## 3. Modèle joueur (validé)

| Table                  | Rôle                                                       |
| ---------------------- | ---------------------------------------------------------- |
| `player_profiles`      | Commun : `display_name`, `profile_type` (`child`/`adult`), `avatar_id`, `preferred_language` |
| `player_child_details` | 1-1 si enfant : `birth_year`, `school_grade`               |
| `player_adult_details` | 1-1 si adulte : `initial_level` (`discovery`/`standard`/`advanced`, défaut `standard`) |

Les tables d'extension rendent structurellement impossible d'attribuer une
classe scolaire à un adulte ou un niveau initial à un enfant. Minimisation des
données : aucun nom de famille, aucune date de naissance exacte, aucun email ni
téléphone au niveau du joueur, aucune photo.

La mémoire pédagogique est commune à tous les joueurs :
`player_knowledge_state` (agrégat borné par notion), `player_attempts`
(journal), `player_category_progress` (dérivé). Le niveau initial adulte et la
classe scolaire ne servent qu'à **amorcer et borner** ; le niveau réel est
appris par catégorie, indépendamment.

## 4. Règles absolues

1. **Frontière d'audience.** Enfant → `all` | `child` ; adulte → `all` |
   `adult`. Jamais franchie, même vivier vide (`isAudienceAllowed`, testé).
2. **FR + AR obligatoires.** Toute question jouable portant une explication a
   une explication française **et** arabe, quel que soit le régime de
   génération. Contrainte de publication, pas convention.
3. **Contenu religieux sourcé et validé humainement.** Aucune réponse
   religieuse n'est inventée ni générée automatiquement vers le jeu. URL,
   titre, auteur/savant, date, empreinte conservés ; explication rédigée pour
   Kounouzi ; source liée, jamais recopiée.
4. **Lieux religieux jamais achetables.** `heritage_sites.kind =
   'purchasable_monument'` est la seule valeur autorisant un prix (contrainte
   SQL). Les monuments patrimoniaux, eux, sont achetables et entrent dans le
   patrimoine du joueur.
5. **La déclaration de maîtrise de l'explication (bonus ×2) n'influence jamais
   la difficulté pédagogique.** Elle est stockée séparément.
6. **Aucune référence à un autre jeu**, nulle part.

## 5. Validation orale (V1)

Le joueur actif répond à l'oral ; la réponse officielle est révélée (appui
long) ; la tablée choisit **Correct / Presque / Incorrect**.

- `validation_mode = collective` par défaut ;
- action discrète « Auto-évaluation » → `validation_mode = self` ;
- le moteur ne déduit jamais le mode ; aucune notion de validateur désigné ni
  de permission en V1.

## 5 bis. Couche expérience (Phase 3)

```
moteur ──► événements ──► gameStore (persistant, miroir de GameState)
                     └──► uiStore.queue ──► useAnimationQueue
                                              ├── narration (NarrationService)
                                              └── playEvent → uiStore (pions, bandeaux, Chemin)
```

- **Stores** : `gameStore` (fabrique `createGameStore({ repository, now,
  onEvents })`, état du moteur + brouillons de profil, sauvegarde après chaque
  commande) ≠ `uiStore` (pions visuels, case en évidence, aperçu du Chemin,
  bandeau, file, `isAnimating`, **état présenté** — ADR 0019) ≠
  `sessionStore` (préférences persistées : animations réduites, narration,
  vitesse, temps précis). Aucune règle de jeu hors du moteur.
- **File d'animation** : un événement à la fois ; `PawnMoved.path` est rejoué
  case par case sans jamais être recalculé ; délai de sécurité (durée × 2 +
  500 ms) ; mode réduit = mêmes étapes, durées nulles ; à la reprise, la file
  est vidée (aucune animation rejouée).
- **Le Chemin à l'écran** : « Au tour de X » → bouton « Découvrir mon chemin »
  → `StartJourney` → « Ton chemin se dévoile… N étapes » (N = valeur du
  moteur), aperçu des cases du trajet (copié de `PawnMoved.path`), puis le
  pion parcourt réellement les cases, retour visuel à l'arrivée.
- **Plateau** : grille CSS 9×9 statique, cases sur le périmètre
  (`perimeterPosition`), pions en `transform` uniquement (translate en unités
  de case), grappes étalées sur une même case.
- **Temps actif** : `startPlayClock` (couche session) compte les secondes
  visibles et non en pause, les envoie par paquets `AdvanceClock` ; le moteur
  ne lit jamais l'horloge.
- **Persistance** : `GameRepository` (port) → IndexedDB (`idb-keyval`) dans
  le navigateur, mémoire en test ; `SavedGame` = état sérialisé + brouillons
  de profil + résumé. Reprise depuis l'accueil.
- **Cartes** (ADR 0021) : ouvertes et refermées par la file d'animation,
  état transitoire reconstruit depuis la phase à la reprise.
- **Contenu** (ADR 0020) : `src/core/content` (maths algorithmiques,
  géographie factuelle, banque curée gardée) ; résolution déterministe d'une
  question par demande, sélection provisoire jusqu'au Learning Engine.

## 6. Persistance

Local-first : IndexedDB est la source de vérité pendant la partie ; session
Supabase anonyme invisible dès la V1 pour que la RLS existe au premier jour ;
synchronisation en arrière-plan, jamais bloquante. Snapshot `game_state` (une
ligne par partie) + journal `game_events`. `pendingInteraction` fait partie de
l'état : une partie reprend exactement à l'écran où elle s'est arrêtée.

## 7. Phases

| Phase | Contenu                                                      | État     |
| ----- | ------------------------------------------------------------ | -------- |
| 1     | Fondations : outillage, frontières, i18n, Bidi, docs         | livrée   |
| 2     | Moteur de jeu pur : tours, roue, déplacement, économie, patrimoine, effets, fin, sérialisation | livrée |
| 3     | Plateau, Chemin, pions, animations, narration, Zustand, IndexedDB, reprise | livrée |
| 4     | Cartes interactives, validation, explications FR/AR, récompenses ×2, monuments, choix, scénarios, contenu minimal — **première partie jouable** | livrée |
| 5     | Mémoire pédagogique et algorithme adaptatif                  | à venir  |
| 6     | Supabase, auth anonyme, RLS, synchronisation                 | à venir  |
| 7     | Mes trésors, écran parent                                    | à venir  |
| 8     | Back-office de contenu                                       | à venir  |
| 9     | Finition, performance, E2E                                   | à venir  |

Une phase à la fois ; validation explicite avant la suivante ; aucune
dépendance installée avant son besoin réel.
