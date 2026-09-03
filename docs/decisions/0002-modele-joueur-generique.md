# 0002 — Modèle joueur générique (enfants et adultes)

**Statut** : acceptée (Phase 0, corrigée)

## Contexte
Kounouzi est un jeu familial : les adultes jouent, avec pion, argent,
patrimoine, questions, progression et score. Un modèle centré sur l'enfant
aurait dû être réécrit.

## Décision
- `player_profiles` (commun) + `player_child_details` (année de naissance,
  classe) + `player_adult_details` (niveau initial `discovery` / `standard` /
  `advanced`, défaut `standard`).
- Mémoire pédagogique commune : `player_knowledge_state`, `player_attempts`,
  `player_category_progress`.
- La classe scolaire et le niveau initial adulte servent uniquement à amorcer
  et borner ; le moteur pédagogique apprend le niveau réel par catégorie.
- Aucun champ `can_validate` ni `validation_eligible`.

## Conséquences
- Les tables d'extension rendent impossibles, au niveau du schéma, une classe
  pour un adulte ou un niveau initial pour un enfant.
- Minimisation des données identique pour les deux types de profil.
