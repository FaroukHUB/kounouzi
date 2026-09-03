# 0008 — ESLint 9 (version ciblée par Next 16.3), pas ESLint 10

**Statut** : acceptée (Phase 1) — à revoir quand `eslint-config-next` supportera ESLint 10

## Contexte
ESLint 9 est marqué fin de vie en amont ; ESLint 10 est publié. Mais
`eslint-config-next` 16.3.4 embarque `eslint-plugin-react` 7.37, qui échoue
sous ESLint 10 (`context.getFilename is not a function`), vérifié en Phase 1.

## Décision
Rester sur ESLint 9.39.5, version que `create-next-app` 16.3.4 scaffolde et
que la configuration Next officielle cible. Passer à ESLint 10 dès qu'une
version d'`eslint-config-next` le supporte.

## Conséquences
- Avertissement « deprecated » à l'installation, connu et accepté.
- Point à vérifier à chaque montée de version de Next.
