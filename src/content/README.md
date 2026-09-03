# `src/content` — données de contenu

- `geo/countries.demo.v1.json` — catalogue factuel de **démonstration** (pays,
  capitale, continent, noms FR/AR, difficulté de base), entièrement
  `status = unverified` : servi uniquement si `DEMO_CONTENT_ENABLED`. Un fait
  passe à `validated` (avec `verifiedAt` et sources) après vérification humaine,
  jamais par un drapeau. Une donnée validée → plusieurs questions par gabarit.
- `questions/curated.v1.json` — banque curée (religion, histoire, arabe, logique,
  gestion, culture). **Vide pour la religion** tant que les sources n'ont pas été
  fournies et validées : jamais de contenu religieux inventé, jamais d'URL fictive.

Règles : explication FR **et** AR obligatoires pour toute question jouable ;
`status = validated` obligatoire ; source primaire obligatoire si la catégorie
l'exige (`requiresSource`). Voir `docs/decisions/0004`, `0020`, `0022`.
