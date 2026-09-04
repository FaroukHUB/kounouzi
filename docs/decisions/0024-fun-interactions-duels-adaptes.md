# 0024 — Fun, interactions et Duels adaptés (Phase 5.1)

**Statut** : acceptée (Phase 5.1)

## Contexte
La boucle « Chemin → case → résultat → joueur suivant » était solide mais
laissait chacun jouer seul. Kounouzi doit créer rivalité légère, entraide,
suspense et décisions — sans jamais réintroduire le hasard (SURPRISE ≠
HASARD), sans toucher au Chemin, et sans falsifier la vérité pédagogique.

## Décision

### Variété des catégories (Learning Engine)
- `antiRepetition.recentCategoryWindow` (fenêtre d'essais récents) et
  `selectionWeights.categoryExposure` : pénalité progressive proportionnelle
  au nombre d'essais de la catégorie dans la fenêtre. Pas de quota rigide :
  une révision due passe toujours devant (testé). Résultat : aucune
  catégorie disponible ne dépasse la moitié des sélections.

### Duel Kounouzi (`Outcome.duel`, phases `awaiting_duel_opponent` / `awaiting_duel`)
- Le joueur actif choisit un adversaire (seule décision stratégique) ; il
  ne choisit ni la question, ni la difficulté, ni la notion.
- **Chaque dueliste reçoit SA question du vrai Learning Engine** : mémoire,
  niveau, révisions, historique, audience de celui qui répond. Catégorie
  commune fixée par la première question servie (meilleur créneau du
  défieur parmi les catégories où l'adversaire a aussi du contenu
  autorisé) ; le moteur refuse une seconde question d'une autre catégorie
  (`DUEL_CATEGORY_MISMATCH`).
- Équité : on compare uniquement correct > presque > incorrect. Jamais le
  temps, jamais l'ordre, jamais la maîtrise de l'explication (qui garde son
  bonus individuel).
- Deux vrais `player_attempts` : chaque réponse est un `AnswerRecorded` avec
  sa question ; le résultat du Duel est une donnée de jeu séparée.
- `DuelState` persistant explicite (questions figées, résultats partiels,
  étape) : une reprise après la réponse du défieur attend l'adversaire sans
  rien redistribuer.
- Récompenses DEMO configurables (`rules.duel`) : victoire, égalité (petit
  bonus), défaite (0).

### Halte du voyage (case `halt`, `Outcome.halt`)
- Arrivée → `halted`. Au tour suivant, AVANT tout Chemin, un Défi de
  reprise (`purpose: halt`, vraie question du Learning Engine). Correct ou
  Presque : Halte levée, Chemin immédiat. Incorrect : tour consommé sans
  déplacement, Halte levée quand même — personne ne reste bloqué plusieurs
  tours. Jamais le mot « prison ».

### Visite de patrimoine et Défi Patrimoine (`purpose: heritage_visit`)
- Monument d'un autre joueur : Défi Patrimoine ; la contribution due au
  propriétaire dépend de la réponse (`rules.heritageVisit.contribution`,
  DEMO : 25 / 50 / 100), transférée par la primitive de transfert. Aucune
  récompense de réponse sur cette question (l'enjeu est la contribution).
- Son propre monument : `HeritageRevisited`, rien à payer, rien à acheter.
- Monument libre : acheter / passer ; achat refusé si le solde est
  insuffisant (`INSUFFICIENT_FUNDS`), réduction `next_purchase_discount`
  appliquée au prix effectif.

### Transferts et politiques d'argent insuffisant
- `transferMoney(from, to, amount, reason, policy)` : UNE primitive, deux
  écritures liées (`transfer_sent` / `transfer_received`, `ref = t<n>`), un
  événement `MoneyTransferred`. Invariant : chaque transfert est équilibré.
- Toute perte déclare `insufficient` : `cap_to_balance`,
  `require_full_amount` (option refusée), `cancel_if_insufficient`
  (résultat annulé, `OutcomeCancelled`). Le schéma refuse une perte sans
  politique. Si les règles autorisent un solde négatif, le montant complet
  s'applique.
- Solidarité tracée à part (`SolidarityActionRecorded`, compteurs par
  joueur) ; aucune formule de score encore.

### Scénarios et effets
- Nouveaux résultats : `duel`, `halt`, `transfer_choice`
  (`awaiting_recipient`), `give_to_poorest`, `aid_from_richest`,
  `collective_fund`, `heritage_maintenance`, `heritage_bonus`, `invest`,
  `save`, `clear_effects`.
- Effets : `next_reward_bonus`, `penalty_shield`, `next_purchase_discount`,
  `investment_pending` (réglé par la prochaine réponse), `saving_pending`
  (mûrit après N tours consommés), `reward_multiplier` (×1,5 possible).
  Chaque effet porte propriétaire, tour d'acquisition, déclencheur explicite
  et expiration éventuelle (`expiresAtTurn`, purgée au début du tour).
- Séquences déterministes : scénarios servis dans l'ordre configuré selon
  les visites de la case, décalés par `scenarioOffset` = numéro de partie
  familiale − 1 (rotation inter-parties, aucun tirage).
- `resolveDestination = false` par défaut : pas de chaînes infinies.
- Plateau 32 : départ 1, question 9, monument 8, événement 4, gestion 3,
  défi 2, solidarité 2, trésor 2, halte 1 (la case 22 devient une Halte).

### Interface et narration
- Cartes : choix d'adversaire, face-à-face VS → « X, à toi ! » → question
  du dueliste → résultat ; Halte ; Défi Patrimoine (propriétaire et enjeu
  affichés) ; choix du destinataire ; bandeaux pour transferts, protection,
  investissement, épargne. Narration étendue, jamais bloquante.
- Reprise : `cardForPhase` reconstruit la carte de chaque nouvelle phase.

### Ce qui ne change pas
Zéro hasard ; Chemin intact (les valeurs par siège sont identiques quelle
que soit l'économie — une Halte perdue raccourcit la liste sans la
modifier) ; FamilyAssist modélisé, non implémenté, sans effet (testé sur la
simulation familiale complète) ; contenu religieux jamais généré ; le plus
riche n'est pas encore le gagnant (dimensions séparées, poids non fixés).

## Conséquences
- Schéma d'état v4 (migration 3 → 4 avec règles à montants nuls : aucune
  économie inventée pour une partie ancienne).
- `SubmitAnswer.playerId` désigne celui qui répond : l'adversaire d'un Duel
  n'est pas le joueur actif.
