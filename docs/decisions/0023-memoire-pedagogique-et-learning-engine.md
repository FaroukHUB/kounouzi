# 0023 — Mémoire pédagogique et Learning Engine (Phase 5)

**Statut** : acceptée (Phase 5) — remplace la sélection provisoire de l'ADR 0020

## Contexte
Kounouzi doit connaître réellement chaque joueur, enfant **et** adulte, et
choisir la prochaine question selon son niveau réel, ses révisions et son
historique — sans hasard, sans jamais franchir la frontière d'audience, et
sans que l'équilibrage familial (ADR 0015) puisse altérer cette vérité.

## Décision
- **Mémoire générique par joueur** (`src/core/learning/types.ts`, jamais de
  `child_*`) : `player_knowledge_state` (agrégat borné par notion : maîtrise
  0..1, essais/réussites/presque/erreurs, boîte de révision, dernière
  rencontre, prochaine échéance), `player_attempts` (journal : joueur, partie,
  notion, `QuestionRef` versionné, catégorie, difficulté, résultat, mode de
  validation, explication connue, récompense accordée oui/non, date),
  `player_category_progress` (niveau estimé par catégorie, point de départ,
  compteurs, fenêtre d'ajustement). Aucun montant, aucune donnée économique :
  le schéma d'un essai est strict et refuse tout champ supplémentaire.
- **Notion ≠ formulation** : la mémoire suit le `knowledgeNodeId` (ex.
  `maths.multiplication.table-7` produit 7 × 8, 7 × 6…) ; la formulation
  exacte reste tracée par le `QuestionRef`.
- **Créneaux de connaissance** (`KnowledgeSlot`, `src/core/content`) : chaque
  fournisseur énumère ses questions potentielles (notion, difficulté,
  audience, instanciation par compteur) ; le registre les filtre par
  catégorie active, régime et audience. Contenu éligible : algorithmique testé,
  factuel validé (ou démo derrière `DEMO_CONTENT_ENABLED`), curé validé et
  sourcé ; la religion reste vide tant qu'aucun contenu humainement validé
  n'est fourni.
- **Sélection sans hasard** (`select.ts`) : score déterministe = révision
  due (+ retard plafonné) + faiblesse × (1 − maîtrise) − distance à la
  difficulté cible + notion peu rencontrée + nouveauté − formulation récente
  − notion récente non due − catégorie du dernier essai − notion déjà
  maîtrisée non due. Départage total et stable : score → prochaine échéance →
  dernière rencontre → notion → référence → créneau. Même mémoire + même
  catalogue ⇒ même question, quel que soit l'ordre d'entrée (testé). La
  formulation algorithmique avance avec le compteur d'essais de la notion.
- **Frontière d'audience revérifiée** dans le registre ET dans le moteur de
  sélection ; un créneau interdit injecté est refusé (testé sur 1 000
  sélections enfant et adulte).
- **Niveau par catégorie, évolution lente** (`update.ts`) : amorcé par la
  classe (enfant) ou le niveau initial (adulte, défaut `standard`) via les
  bandes de `bands.v1.json`, uniquement comme point de départ ; ensuite, seuls
  les essais dont la difficulté est proche du niveau estimé sont informatifs,
  et il faut `minAttempts` essais à moyenne ≥ `upThreshold` (ou ≤
  `downThreshold`) pour bouger d'un `step` (0,5). Jamais ±1 sur une seule
  réponse. Un joueur peut être fort en maths et débutant en arabe.
- **Maîtrise par notion** : moyenne mobile exponentielle des poids
  (`correct = 1`, `partial = 0,5`, `incorrect = 0`, isolés en configuration)
  à partir d'un a priori neutre : une bonne réponse isolée ne « maîtrise »
  pas une notion.
- **Explication connue ≠ difficulté** : `explanationKnown` est journalisé
  (bonus ×2 côté jeu, compteurs « Mes Trésors ») mais n'entre ni dans la
  maîtrise ni dans le niveau (testé : `both` ⇒ même niveau que `none`).
- **Révision espacée simplifiée** : boîtes avec intervalles en jours
  configurables (`spacing.intervalsDays`) ; correct → boîte + 1, presque →
  boîte conservée, incorrect → boîte 0 ; horloge toujours injectée (le noyau
  ne lit jamais l'heure : testé structurellement).
- **Anti-répétition ≠ révision** : une formulation ou une notion récente est
  pénalisée seulement si elle n'est pas due ; une notion due remonte en tête.
- **Configuration en données** : `src/config/learning/learning.v1.json`,
  validée par `learningConfigSchema` ; tous les coefficients y sont
  provisoires et ajustables après de vraies parties.
- **Persistance locale par port** : `LearningRepository` (une mémoire
  sérialisée et versionnée par joueur) et `PlayerProfileRepository` (profils
  persistants à identifiant stable), implémentés en IndexedDB et en mémoire.
  Le Learning Engine ne connaît jamais IndexedDB. La progression survit aux
  parties, fermetures et nouvelles sessions : l'écran de création propose les
  joueurs connus et réutilise leur identifiant.
- **Intégration** : `learningStore` enregistre chaque `AnswerRecorded` portant
  une question servie (idempotent par `gameId:requestId`), jamais une carte
  « Passer » ; `resolveQuestion` demande au Learning Engine la question du
  joueur actif, puis `ServeQuestion` la fige (ADR 0022).
- **Garde-fou FamilyAssist** : structurel (aucune référence à l'équilibrage,
  à l'argent, au patrimoine ou au score dans `src/core/learning`) et
  comportemental (activé ou non, mêmes réponses ⇒ mémoire identique, testé).
- **« Mes Trésors »** : uniquement des agrégations dérivées
  (`summarizeMemory`) — notions rencontrées / maîtrisées, questions répondues
  / réussies, révisions dues, explications connues FR / AR (notions
  distinctes), progression par catégorie. Aucun compteur dupliqué, aucun
  écran gamifié encore.
- **Récompense relative** : inchangée — le gain dépend du résultat, jamais de
  la difficulté absolue ; enfant et adulte, chacun à son niveau, gagnent
  autant.

## Conséquences
- `rotateCategory` / `midDifficulty` disparaissent ; les bandes ne servent
  plus qu'à l'amorçage.
- Le nœud d'une multiplication est la table du premier opérande.
- Phase 6 (Supabase) pourra synchroniser les mêmes structures sérialisées
  sans toucher au moteur.
