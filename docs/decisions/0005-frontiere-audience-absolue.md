# 0005 — Frontière d'audience absolue

**Statut** : acceptée (Phase 0)

## Contexte
Un contenu peut être formulé pour un enfant, pour un adulte, ou pour tous.
Servir à un adulte une question enfantine « faute de mieux » dégrade le
plaisir ; servir à un enfant un contenu adulte est inacceptable.

## Décision
- `audience_scope ∈ { all, child, adult }`, défaut `all`.
- Enfant → `all` | `child` ; adulte → `all` | `adult`. Jamais franchie, même
  vivier vide. Le relâchement d'un vivier porte sur la difficulté, les
  notions, puis le contenu `all`, puis une stratégie de repli configurée —
  jamais sur l'audience.

## Conséquences
- Prédicat unique `isAudienceAllowed` dans `src/core/shared`, testé sur toutes
  les combinaisons ; tout sélecteur doit passer par lui.
