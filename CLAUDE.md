@AGENTS.md

# Kounouzi — règles de travail

- Lire `docs/architecture.md` et `docs/decisions/` avant toute modification.
- Une phase à la fois, validée explicitement avant la suivante. Aucune
  fonctionnalité non demandée, aucun changement d'architecture silencieux,
  aucune dépendance sans besoin réel (versions exactes).
- `src/core` est du TypeScript pur : ni React, ni Next, ni Motion, ni Zustand,
  ni Supabase, ni autre couche. Depuis le noyau, seuls `@/core/**` et
  `./voisin` sont autorisés (règle ESLint, testée).
- Tailwind : propriétés logiques uniquement (`ms-`/`me-`, `ps-`/`pe-`,
  `start-`/`end-`, `text-start`/`text-end`), jamais `ml-`/`pr-`/`left-`… (règle ESLint).
- Les règles configurables (plateau, économie, récompenses, catégories,
  difficulté) sont des données validées par Zod, jamais codées en dur. Si une
  règle métier n'est pas définie, la rendre configurable au lieu de l'inventer.
- Contenu religieux : jamais inventé, jamais de source ni d'URL fictive,
  validation humaine avant publication. Explications FR **et** AR obligatoires.
- Aucune référence à un autre jeu, nulle part (code, docs, commentaires, UI).
- Avant de considérer une tâche terminée : `pnpm check` (lint, typecheck, test, build) vert.
