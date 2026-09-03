# 0022 — Question figée dans l'état et contenu de démonstration séparé du contenu validé (Phase 4.1)

**Statut** : acceptée (Phase 4.1)

## Contexte
En Phase 4, la question affichée était recalculée à chaque rendu depuis le
numéro de demande. Une modification du contenu (catalogue réordonné, fait
corrigé, générateur révisé) pouvait donc changer une question **déjà
commencée** à la reprise d'une partie, et le catalogue géographique de
démonstration était traité comme s'il était validé.

## Décision
- **`QuestionRef` versionné** (`src/core/content/types.ts`) : trois formes
  discriminées par `origin` — `curated` (`questionId`, `contentVersion`),
  `algorithmic` (`generatorId`, `generatorVersion`, `params` réels, ex.
  `{ a, b }`), `factual` (`factId`, `factVersion`, `templateId`,
  `templateVersion`). `questionRefKey(ref)` en donne une clé stable.
- **Question figée dans l'état** : la commande `ServeQuestion { requestId,
  question }` enregistre la `QuestionInstance` complète dans
  `phase.served` (événement `QuestionServed`). La carte n'affiche que cette
  question ; tant qu'elle n'est pas servie, la carte attend. Un double service
  ou un service hors demande est refusé (`QUESTION_ALREADY_SERVED`,
  `NO_PENDING_QUESTION`). `AnswerRecorded.question` porte le résumé
  pédagogique (référence, nœud, catégorie, difficulté) — jamais le montant.
- **Schéma d'état v3** : `GAME_SCHEMA_VERSION = 3` ; migration 2 → 3 sans
  question figée (une partie v2 en attente de réponse se voit servir une
  question au prochain rendu, comme une demande neuve).
- **Reprise exacte testée** : servir → sérialiser → modifier le catalogue
  (ordre inversé, fait supprimé, capitale « corrigée », version 2) →
  restaurer : la question, ses paramètres, sa réponse et ses explications
  sont identiques ; une nouvelle résolution donnerait autre chose et n'est
  jamais consultée.
- **Reconstruction algorithmique** : `rebuildMaths(ref)` reconstruit une
  question à l'identique depuis ses paramètres réels et refuse une version de
  générateur inconnue.
- **Démonstration ≠ validé** : `GeoFact.status = unverified | validated`
  (+ `version`, `verifiedAt`). Le catalogue livré est
  `src/content/geo/countries.demo.v1.json`, **entièrement `unverified`** ;
  `VALIDATED_GEO_FACTS` est vide. Le fournisseur factuel n'accepte les faits
  non vérifiés que si `allowUnverified` est vrai, piloté par
  `DEMO_CONTENT_ENABLED` (`src/config/demo`). Aucun fait n'est marqué validé
  sans vérification humaine ; aucune URL n'est citée.
- **Revue linguistique** : `QuestionInstance.review.ar =
  "provisional" | "reviewed"`. Les explications arabes des générateurs
  mathématiques sont `provisional` ; les questions curées sont `reviewed`
  (elles passent par la validation humaine).
- **Religion** : inchangée — banque vide, jamais remplie pour un test ou une
  démonstration.

## Conséquences
- Le Learning Engine (Phase 5) reçoit une référence stable et versionnée
  pour chaque tentative ; l'historique reste lisible même après évolution du
  contenu.
- Passer un contenu de démonstration en production = le vérifier et le
  marquer `validated`, jamais changer un drapeau.
