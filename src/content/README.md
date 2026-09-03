# `src/content` — données de contenu

- `geo/countries.v1.json` — catalogue factuel (pays, capitale, continent, noms FR/AR,
  difficulté de base). Une donnée validée → plusieurs questions par gabarit.
- `questions/curated.v1.json` — banque curée (religion, histoire, arabe, logique,
  gestion, culture). **Vide pour la religion** tant que les sources n'ont pas été
  fournies et validées : jamais de contenu religieux inventé, jamais d'URL fictive.

Règles : explication FR **et** AR obligatoires pour toute question jouable ;
`status = validated` obligatoire ; source primaire obligatoire si la catégorie
l'exige (`requiresSource`). Voir `docs/decisions/0004`, `0020`.
