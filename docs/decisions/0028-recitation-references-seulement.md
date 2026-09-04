# 0028 — Récitation : références de sourates seulement, maîtrise par joueur, sélection déterministe

**Statut** : acceptée (suite de l'ADR 0027)

## Contexte
Les défis CH-091 à CH-093 demandent de réciter une sourate. Kounouzi ne
stocke, n'affiche et ne génère JAMAIS de texte du Coran ; la validation est
orale et collective, sans reconnaissance vocale.

## Décision
- **Banque de références** `src/content/religion/quran/surah-bank.v1.json`
  (38 sourates : identifiant, numéro, nom FR/AR, niveau de JEU). Schéma Zod
  strict (`src/config/challenges/surahs.ts`) : tout champ de texte inconnu est
  refusé, `display_quran_text` doit être `false`, `content_kind` doit être
  `recitation_reference_only`. `status: validated` ne signifie que : nom et
  numéro validés pour le défi oral. `level` est une difficulté de jeu, jamais
  un classement religieux.
- **Figée dans la partie** : `ChallengesConfig.recitations` (`RecitationRef`),
  schéma d'état v6 (migration v5 → v6 : aucune référence, aucune maîtrise).
- **État de récitation du joueur** : `PlayerState.masteredSurahs` (références),
  initialisé depuis le profil (`PlayerProfileDraft.recitation.mastered`), mis
  à jour par l'événement `RecitationMastered` émis à la première récitation
  réussie d'une sourate ; la couche état réécrit le profil. Aucun texte.
- **Éligibilité et sélection dans le moteur** (`recitationCandidates`,
  `selectRecitations`) : CH-093 impose toujours `surah_001` ; CH-091 choisit
  parmi les sourates validées dont le niveau ≤ niveau de jeu du joueur
  (tranches d'âge : 5-8 → 1 … 14+/adulte → 5) ; CH-092 n'est éligible qu'avec
  au moins deux sourates maîtrisées et choisit deux sourates différentes parmi
  elles. Anti-répétition par joueur (`recitationServed`) et rotation
  (compteur de défis + décalage de partie). Aucun hasard. Sans banque figée,
  aucun défi de récitation n'est proposable.
- **Carte** : uniquement « Récite sourate <nom FR> (<nom AR>) » et un rappel
  de validation orale. Aucun texte affiché.

## Conséquences
- `contentAvailable` ne concerne plus que les défis à question validée.
- Les sourates maîtrisées suivent le profil entre les parties (référence
  seulement) ; rien n'est envoyé nulle part.
