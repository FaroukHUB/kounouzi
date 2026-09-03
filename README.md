# Kounouzi

**Joue. Apprends. Gère.**

Jeu de plateau numérique familial : enfants et adultes jouent ensemble autour
d'une tablette, chacun avec son pion, son argent virtuel, son patrimoine de
monuments, ses questions adaptées à son niveau réel et sa progression.

## Prérequis

- Node.js ≥ 22
- pnpm 10

## Scripts

```sh
pnpm install
pnpm dev          # serveur de développement
pnpm lint         # ESLint (frontières d'import, Tailwind logique, règles Next)
pnpm typecheck    # tsc --noEmit (TypeScript strict)
pnpm test         # Vitest
pnpm build        # next build
pnpm check        # lint + typecheck + test + build
```

## Structure

```
app/            Next.js App Router — UI uniquement
src/core/       noyau TypeScript pur : game · learning · content · shared
src/config/     données de configuration versionnées + schémas Zod
src/data/       accès aux données (ports, local, supabase, sync)
src/i18n/       dictionnaires FR/AR typés, direction du texte
src/ui/         composants React (primitives, plateau, cartes…)
tests/          unit · integration · e2e · fixtures
docs/           architecture.md · decisions/ (ADR)
```

Voir `docs/architecture.md` pour l'architecture validée et `docs/decisions/`
pour les décisions tracées.
