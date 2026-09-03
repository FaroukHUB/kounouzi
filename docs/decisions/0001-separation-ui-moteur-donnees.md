# 0001 — Séparation stricte UI / noyau / données

**Statut** : acceptée (Phase 0)

## Contexte
Les règles d'un jeu de plateau dispersées dans des composants React deviennent
intestables et impossibles à faire évoluer. Les animations ne doivent jamais
déterminer un résultat.

## Décision
- `src/core` est du TypeScript pur : aucun import de React, Next, Motion,
  Zustand, Supabase ni d'une autre couche (`app/`, `src/ui`, `src/state`,
  `src/data`, `src/i18n`, `src/config`).
- Depuis le noyau, seuls `@/core/**` et `./voisin` sont autorisés ; les `../`
  sont interdits pour qu'aucun chemin ne puisse en sortir.
- Le moteur de jeu est une fonction pure `reduce(state, command) → { state,
  events }` ; horloge et générateur aléatoire à graine sont injectés.
- Deux stores distincts : état persistant du jeu ≠ état transitoire de l'UI.

## Conséquences
- Frontière vérifiée par ESLint (`no-restricted-imports`) et prouvée par un
  test qui linte des fragments à des chemins virtuels.
- Le cœur se teste avec Vitest en millisecondes, sans navigateur.
