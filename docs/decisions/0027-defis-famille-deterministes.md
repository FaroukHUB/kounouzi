# 0027 — Défis famille : banque de données, sélection déterministe cachée, consentement, gain unique

**Statut** : acceptée (Phase Défis famille)

## Contexte
Le Duel Kounouzi existe, mais la partie manque de moments « oh nooon ! »
drôles et faisables par toute la famille. Le PDF « 100 défis pour pimenter la
partie » fournit une banque canonique V1 (mouvement simple, animaux, famille,
solidarité, OH NON, mémoire, savoir, arabe, religion, boss). Règles absolues :
aucun hasard, jamais d'imitation de personne, rien de technique pour les
petits, contact uniquement avec consentement et désactivable, refus sans
pénalité, contenu religieux jamais généré.

## Décision

### Le PDF est de la DONNÉE
- `src/content/challenges/family-challenges.v1.json` (importé par
  `scripts/content/import-defis.mjs`) : 100 `ChallengeDefinition` — `id`,
  `title`, `category`, `minAge`, `reward`, `text`, `adaptation`, `variants`
  (tranches d'âge énoncées par le PDF), `ohNo`, `boss`, `consentRequired`,
  `animationKey`, `contentRef?`, `onSuccess?` (résultats économiques réels des
  défis solidaires : transfert au joueur choisi, au plus pauvre, choix
  « garder ou partager »). Validé par Zod (`challengesConfigSchema`) ; un défi
  religieux SANS `contentRef` est refusé par le schéma.
- Les interrupteurs parents (`ChallengeSettings`) activent des groupes de
  catégories déclarés dans la banque (`toggles`) ; `contact` et `ohNo`
  gouvernent aussi les drapeaux de carte ; `boss` les cartes boss.
- La banque, les réglages et la liste du contenu validé disponible sont
  **figés dans la partie** (`GameConfig.challenges`, schéma d'état v5,
  migration v4 → v5 : aucune banque, donc aucun défi famille dans une partie
  ancienne — le Duel continue).

### Case Défi : `family_challenge` distinct du `duel`
- Nouveau résultat de case `{ kind: "family_challenge" }` servi par un
  scénario de la case Défi (démo : Duel, Défi famille, question — rotation par
  visites comme avant). Le Duel est inchangé.
- Phase `awaiting_challenge` (`ChallengeState` : défi, joueur, demande, étape
  `assigned → accepted`, question figée éventuelle). Commandes
  `AcceptChallenge`, `CompleteChallenge(success)`, `SkipChallenge(reason)` ;
  commande de session `SetChallengeSettings`. Événements
  `FamilyChallengeAssigned / Accepted / Completed / Skipped`,
  `ChallengeRewardGranted`, `FamilyChallengeUnavailable`,
  `ChallengeSettingsChanged`.
- Sauvegarde et reprise en plein défi : la carte est reconstruite à l'étape
  exacte (`cardForPhase`).

### Sélection déterministe cachée (`selectChallenge`)
- Éligibilité : âge minimal (adulte = tout ; enfant d'âge inconnu = le plus
  jeune), interrupteurs de catégorie, drapeaux OH NON / contact / boss,
  contenu validé disponible. **Jamais** le solde, le classement, le patrimoine
  ni la case suivante.
- Rotation : point de départ = (compteur persistant de défis + décalage de
  partie familiale) modulo le vivier éligible ; on prend, à partir de là, le
  défi que CE joueur a le moins souvent reçu dans la partie
  (`challengeServed[playerId]`). Aucun défi ne revient à un joueur tant que
  son vivier éligible n'est pas épuisé. Même état + mêmes commandes = même
  défi ; rechargement = même défi.

### Consentement, refus, gain
- Défi de contact : consentement obligatoire (affiché) ; si l'autre personne
  refuse (`SkipChallenge` `consent_refused`), aucun échec, 0 Kounouz, et le
  défi éligible suivant est proposé de façon déterministe.
- Refus (`declined`) : 0 Kounouz, aucune autre pénalité (aucun effet, aucune
  Halte).
- Réussite : le gain de la définition est crédité **exactement une fois**
  (`challenge_reward`), sans multiplicateur de question ; échec = 0. Un
  `onSuccess` éventuel s'exécute ensuite dans la file normale.

### Contenu religieux
- Un défi religieux ne porte aucun texte religieux : il référence du contenu
  déjà `validated` (`contentRef` : question validée d'une catégorie, avec
  « +1 niveau » possible ; récitation — jamais disponible en V1). Le contenu
  disponible est calculé hors moteur (`challengesConfigFor`, registre) et
  figé ; sans contenu validé, le défi n'est jamais éligible (testé : aucun
  défi religieux aujourd'hui). La question d'un défi à contenu est choisie par
  le Learning Engine (catégorie imposée, niveau + delta) et figée par
  `ServeQuestion` sur la demande du défi.

### Expérience
- Carte animée selon `animationKey` (familles géométriques existantes) ;
  « OH NOOON… » bref avant révélation des cartes `ohNo` ; boutons J'accepte /
  Je passe (+ « Pas d'accord → autre défi » pour le contact), puis Réussi /
  Raté ; gain affiché ; narration courte non bloquante ; aucun chrono imposé.
- Réglages parents dans la feuille de réglages de la partie (commande
  explicite, journalisée).
- Diagnostic de playtest : défis proposés / réussis / ratés / passés, par
  catégorie, Kounouz via défis, taux de réussite par tranche d'âge, fréquence
  des cartes OH NON, temps par défi.

## Conséquences
- Schéma d'état v5 ; `PlayerSetup.age` (enfants) pour l'éligibilité
  seulement. Aucun montant DEMO modifié ailleurs ; les gains des défis sont
  ceux du PDF (à équilibrer après playtest).
- Aucun hasard nulle part (test structurel du noyau inchangé et vérifié).
- FamilyAssist toujours non implémenté ; rien de Phase 6.
