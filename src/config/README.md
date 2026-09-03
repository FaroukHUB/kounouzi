# `src/config` — données de configuration

Principe validé : **contenu ≠ code**. Le plateau, les catégories, l'économie,
les récompenses, les bandes de difficulté sont des **données versionnées**
(`*.v1.json`), validées par un schéma Zod au chargement, jamais codées en dur.

- `schemas/` — schémas Zod. Chaque schéma dérive ses énumérations des
  constantes du noyau (`@/core/shared`) pour qu'un type et son schéma ne
  puissent pas diverger.
- Les fichiers de données eux-mêmes (`board/`, `economy/`, `rewards/`,
  `categories/`, `difficulty/`) arrivent avec les phases qui les utilisent.
  Aucune valeur de jeu n'est définie en Phase 1.

Une partie enregistre l'identifiant des configurations avec lesquelles elle a
été créée : modifier une configuration n'altère jamais une partie en cours.
