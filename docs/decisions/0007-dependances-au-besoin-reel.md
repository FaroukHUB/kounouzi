# 0007 — Aucune dépendance avant son besoin réel

**Statut** : acceptée (Phase 0)

## Contexte
Favoriser une architecture simple. Pas de Redis, Docker, microservices ni
bibliothèque « au cas où ».

## Décision
- Versions exactes (sans `^`) dans `package.json`.
- Phase 1 : Next, React, TypeScript, Tailwind 4, Zod, Vitest (+ Vite, requis
  par Vitest), ESLint + `eslint-config-next`.
- Différées : Motion, Zustand, couche IndexedDB → Phase 3 ; client Supabase →
  Phase 6 ; Playwright → phase E2E.
- Refusées sans besoin démontré : bibliothèque i18n (dictionnaires typés
  maison), machine à états, générateur aléatoire (quinze lignes maison).

## Conséquences
- Toute nouvelle dépendance est justifiée dans la phase qui l'introduit.
