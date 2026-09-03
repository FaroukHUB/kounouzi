# 0021 — Cartes interactives et déroulé d'une question (Phase 4)

**Statut** : acceptée (Phase 4)

## Décision
- **Ouverture pilotée par les événements** : `QuestionRequested`,
  `PurchaseOffered`, `ChoiceOffered` ouvrent la carte correspondante depuis
  la file d'animation ; `ScenarioTriggered` révèle brièvement un scénario ;
  `AnswerRecorded` / `RewardGranted` / `SiteAcquired` / `PurchaseDeclined`
  font progresser la carte ; `TurnEnded` la referme. Le plateau se met en
  retrait (scale/opacity) pendant qu'une carte est ouverte.
- **Déroulé question** : face cachée → toucher → tourbillon + retournement →
  énoncé → réponse orale → « Voir la réponse » par **appui maintenu**
  (700 ms) → Correct / Presque / Incorrect (validation **collective** par
  défaut ; case à cocher discrète **Auto-évaluation** → `validationMode =
  self`, jamais déduit) → explication FR puis AR (isolée en RTL) et source →
  si correct : « Connaissais-tu déjà cette explication ? » (Non / FR / AR /
  les deux) → `SubmitAnswer` → résultat → récompense (« gain doublé » si
  maîtrise). L'état de la carte est transitoire (`uiStore.card`) ; à la
  reprise, il est reconstruit depuis la phase (`cardForPhase`) et la même
  question est retrouvée.
- **Monument** : nom de démonstration, prix, valeur patrimoniale, « l'histoire
  arrivera avec le contenu validé » (rien d'inventé), Acheter (désactivé si
  insuffisant) / Passer. **Choix** : options du scénario avec libellés de
  démonstration. **Scénario** : titre bref ; le résultat (argent, effet) est
  projeté par l'état présenté.
- **Narration étendue** : énoncé, réponse révélée, explication FR puis AR
  (`lang: "ar"`, voix arabe si disponible, sinon silencieux), résultat,
  récompense, offre de monument, titre de scénario. Jamais bloquante.
- Repli si aucune question n'existe pour la catégorie : carte « Passer »
  (réponse enregistrée comme incorrecte, gain nul) — ne se produit pas avec
  mathématiques et géographie disponibles.
- Le résolveur de démonstration Phase 3 (ADR 0017) est **supprimé**.
