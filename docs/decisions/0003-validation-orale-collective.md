# 0003 — Validation orale V1 : collective par défaut, auto-évaluation explicite

**Statut** : acceptée (Phase 0)

## Contexte
Le joueur actif répond à l'oral ; il n'y a ni reconnaissance vocale ni IA qui
juge. Le moteur ne peut pas savoir qui, autour de la table, est capable
d'évaluer une réponse.

## Décision
- `validation_mode = collective` par défaut : après révélation, la tablée
  choisit Correct / Presque / Incorrect ; l'identité de la personne qui appuie
  n'est pas enregistrée.
- Une action discrète « Auto-évaluation » permet au joueur actif de trancher
  lui-même → `validation_mode = self`.
- Le moteur ne déduit jamais le mode (ni du nombre ni du type de joueurs).
- Pas de validateur désigné, de rotation ni de permissions en V1.

## Conséquences
- `player_attempts.validation_mode ∈ { collective, self }`, rien de plus.
- Le bonus de maîtrise (×2) est tranché par le même mécanisme.
- Extensible plus tard par ajout d'un mode, sans changer le schéma existant.
