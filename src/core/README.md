# `src/core` — le noyau

TypeScript pur. **Aucun import** de React, Next, Motion, Zustand, Supabase, ni
d'aucune autre couche de l'application (`app/`, `src/ui`, `src/state`,
`src/data`, `src/i18n`, `src/config`, …). Cette frontière est vérifiée par
ESLint (`eslint.config.mjs`) et par un test (`tests/unit/architecture`).

Depuis un fichier du noyau, seuls sont autorisés :

- les imports relatifs vers un fichier voisin (`./x`) ;
- les imports `@/core/**`.

| Dossier     | Responsabilité (détail dans `docs/architecture.md`)                               | Phase |
| ----------- | --------------------------------------------------------------------------------- | ----- |
| `shared/`   | Types et constantes transverses validés (locales, joueur, audience, validation)    | 1     |
| `game/`     | Moteur de jeu : tours, roue, déplacement, économie, récompenses, patrimoine, effets, fin, sérialisation | 2 (livrée) |
| `learning/` | Moteur pédagogique : sélection adaptative, maîtrise, répétition, progression      | 5     |
| `content/`  | Moteur de contenu : fournisseurs de questions, générateurs, gabarits, garde-fous  | 4     |

Le noyau ne lit jamais l'horloge système ni `Math.random` : l'horloge et le
générateur aléatoire à graine lui sont injectés, ce qui le rend déterministe et
testable.
