# 0017 — Résolveur de démonstration Phase 3 (temporaire)

**Statut** : **supprimée en Phase 4** (ADR 0021) — conservée pour l'historique

## Contexte
En Phase 3, les interactions de case (question, monument, événement, gestion,
défi, solidarité, trésor) ne sont pas implémentées, mais le moteur les attend.

## Décision
- `src/dev/phase3DemoResolver.ts` émet une commande ordinaire et
  déterministe (réponse « correct / none / collective », achat refusé,
  première option) quand le moteur attend une interaction.
- Panneau `DemoInteractionPanel` volontairement technique et austère
  (libellé « Interaction de la Phase 4 — non implémentée », police mono) :
  ce n'est pas un bouton « Continuer » du jeu.
- Isolé du noyau (`src/core` ne peut pas l'importer — frontière ESLint) et
  de l'interface finale ; aucune règle métier modifiée.

## Conséquences
- Suppression en Phase 4 avec les vraies interactions ; les tests qui le
  couvrent seront retirés en même temps.
