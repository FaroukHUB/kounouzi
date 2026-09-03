# `src/data` — accès aux données

- `ports/` — interfaces de dépôt (repositories) consommées par l'application.
  Le noyau ne connaît pas l'origine des données (IndexedDB, Supabase, objet de
  test) ; il reçoit ce dont il a besoin en paramètre.
- `local/` — implémentation IndexedDB, **source de vérité pendant la partie**
  (Phase 3).
- `supabase/` — client, dépôts distants, types générés (Phase 6).
- `sync/` — synchronisation en arrière-plan, jamais bloquante (Phase 6).

Aucune implémentation en Phase 1.
