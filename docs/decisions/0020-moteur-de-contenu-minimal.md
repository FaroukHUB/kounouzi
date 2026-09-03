# 0020 — Moteur de contenu minimal (Phase 4)

**Statut** : acceptée (Phase 4) — sélection provisoire jusqu'au Learning Engine (Phase 5)

## Contexte
Rendre les cases interactives exige des questions, sans construire une grande
banque ni inventer de contenu religieux.

## Décision
- `src/core/content` : contrat unique `ContentProvider.resolve(request) →
  QuestionInstance | null`, trois régimes derrière un registre :
  - **algorithmique** (mathématiques) : addition, soustraction,
    multiplication, division exacte ; plages par difficulté 1..5 ; opérandes
    obtenus par un parcours d'intervalle à pas fixe (`pickInRange`) — toutes
    les valeurs visitées avant répétition, **aucun hasard** ; explications FR
    et AR produites par le générateur ;
  - **factuel** (géographie) : catalogue `src/content/geo/countries.v1.json`
    (pays, capitale, continent en FR/AR, difficulté de base, source) ×
    gabarits bilingues (capitale, pays d'une capitale, continent) ;
  - **curé** (religion, histoire, arabe, logique, gestion, culture) : banque
    `src/content/questions/curated.v1.json`, **vide pour la religion** tant
    qu'aucune source n'a été fournie et validée par l'équipe.
- **Garde-fous** (`guards.ts`) : `status = validated`, explication FR **et**
  AR non vides, source(s) obligatoire(s) si `requiresSource`, URL valide ou
  absente — jamais fictive. Une catégorie sans question jouable ne fournit
  rien ; elle n'est jamais remplie artificiellement.
- **Frontière d'audience** respectée par chaque fournisseur.
- **Résolution déterministe** (`experience/questionResolver.ts`) : numéro de
  demande → rotation des catégories disponibles → milieu de la bande de
  difficulté du profil (`bands.v1.json`, provisoire) → variation. Une partie
  rechargée retrouve la même question sans rien persister.
- Le catalogue géographique est marqué **provisoire** : capitales et
  continents officiels de connaissance courante, à référencer par l'équipe
  avant publication commerciale ; aucune URL n'est citée tant qu'elle n'a pas
  été vérifiée.

## Conséquences
- Le Learning Engine remplacera `rotateCategory` / `midDifficulty` par la
  sélection pédagogique (niveau réel, révisions, historique, départage stable).
- Ajouter du contenu = données validées par schéma, jamais du code.
