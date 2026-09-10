# 0035 — Voix automatique OFF, « Monument » devient « Établissement » (services payants), cartes Hassanāt

**Statut** : acceptée (décisions produit, 2026-09-10) — complète les ADR 0033 et 0034

## Contexte
En playtest, la narration automatique (changement de joueur, Chemin,
arrivée) ralentissait la partie et parlait mal l'arabe. Les « monuments »
du plateau 26 n'apportaient qu'un Défi Patrimoine à la visite : le jeu
manquait d'argent qui circule entre joueurs. Enfin, Kounouzi a besoin
d'une seconde ressource, distincte de l'argent, pour valoriser la
générosité sans la monétiser.

## Décision
### 1. Voix automatique OFF
- `narrationEnabled` est **faux par défaut** (session v2 ; une préférence
  antérieure « voix ON » est migrée vers OFF, les autres réglages sont
  conservés). L'écran de jeu n'appelle plus `speak()` pour les événements
  (tour, Chemin, arrivée) ; `utteranceFor` reste disponible pour les tests.
- Le rythme du jeu ne dépend jamais de la voix : le rejoueur d'animation, le
  store et la file n'importent pas la narration. Désactivée, la file vocale
  est vidée (`setEnabled(false)` → `stop()`), rien n'est mis en attente.
- Le `NarrationService` et le lexique (ADR 0031) restent en place pour un
  futur bouton 🔊 sur les explications ; aucune fonctionnalité vocale n'est
  supprimée du code.

### 2. « Monument » → « Établissement »
- À l'écran (FR/AR), tout « Monument » devient « Établissement » ; le type
  interne `purchasable_monument`, la case `heritage` et le motif
  `heritage_contribution` sont conservés pour la compatibilité des
  sauvegardes. Les lieux de culte restent non achetables et ne portent
  jamais d'établissement (schéma).
- Un site achetable porte des **données d'établissement** :
  `establishment { family, serviceType, serviceFee, name { fr, ar }, icon }`.
  Douze établissements FICTIFS de démonstration
  (`src/config/demo/establishments-demo.v1.json`) : Maktaba Cheikh
  Al-Albānī, Maktaba Cheikh Ibn Bāz (noms en référence à des savants, sans
  prétendre être leurs bibliothèques), Hôtel de Médine A/B, Hôtel de La
  Mecque A/B, Saveurs d'Algérie, Saveurs du Maroc, Agence ʿUmra A/B (noms
  PROVISOIRES), Musée des Civilisations Islamiques de Dubaï (aucune
  information historique fabriquée), Parc Kounouzi (familial, sans musique).
- **Familles** : `maktaba`, `madinah_hotel`, `makkah_hotel`,
  `maghreb_restaurant`, `umrah_agency` ; `museum` et `park` sont
  indépendants. `ownsWholeFamily(state, joueur, famille)` dit si un joueur
  possède toute une famille : **aucun bonus n'est codé**.
- **Arrivée chez un autre joueur** : le visiteur consomme le service (séjour,
  repas, livre, ʿUmra, billet) — phase `awaiting_service`, événement
  `ServiceOffered`, commande `PayService` — et paie `serviceFee` au
  propriétaire par un transfert `service_fee` (deux écritures liées, somme
  nulle, une seule fois ; politique `rules.service.insufficient`, plafonnée
  au solde par défaut). Chez soi : rien. Un site **sans** `serviceFee`
  (parties anciennes) garde l'ancien Défi Patrimoine.
- Carte Établissement (achat : icône, nom FR/AR, illustration, famille, prix,
  Kounouz du joueur, ACHETER / PASSER) et carte Service (propriétaire
  visible, « Tu y séjournes. », coût, PAYER, puis « X paie N Kounouz à Y »).
  La case du plateau montre l'icône de l'établissement et son propriétaire.

### 3. Cartes Hassanāt
- Nouvelle ressource **`hassanatPoints`**, distincte des Kounouz, avec son
  grand livre (`hassanatLedger`, références uniques : jamais deux fois le
  même gain). Les points Hassanāt sont une mécanique de **score du jeu** ;
  le texte affiché dit « +10 points Hassanāt », jamais une affirmation sur
  une récompense réelle. Aucune conversion 1 Kounouz = 1 Hassanāt ; le
  poids `rules.scoring.hassanatWeight` vaut 0 : **la formule de victoire
  n'est pas décidée**.
- Banque `src/content/hassanat/hassanat-cards.v1.json` (Zod) : `offer_meal`,
  `offer_umrah`, `help_player`, avec `cost`, `costDestination`
  (`beneficiary` | `masakin` | `none`), `hassanatReward`, et le lien
  établissement ↔ Hassanāt préparé (`requiresEstablishmentFamily?`,
  `ownerCost?`) sans aucun rabais décidé. Coûts et points de démonstration,
  NON validés.
- Déclenchement par le système déterministe existant : une case Défi peut
  servir `family_challenge`, `question` ou `hassanat_opportunity`
  (scénario `challenge-hassanat`). Défi ≠ Hassanāt, Don ≠ Hassanāt, Zakat ≠
  Hassanāt (la Zakat ne crédite jamais de points).
- Phase `awaiting_hassanat`, `AcceptHassanat { beneficiaryId }` (coût réglé
  selon la destination, action de solidarité comptée, `HassanatAccepted`,
  `HassanatGranted` une fois) ou `SkipHassanat` (0 point, 0 pénalité). Sans
  carte éligible (coût, bénéficiaire) : `HassanatUnavailable`, le tour
  continue. Sélection : la carte la moins servie au joueur, rotation par
  compteur (aucun hasard).
- Carte Hassanāt : famille visuelle propre (émeraude et or), titre et texte
  de la carte, coût, « +N points Hassanāt », ACCEPTER (bénéficiaire si
  plusieurs) / PASSER. Points visibles sur la tuile joueur et le classement.
- Sauvegardes : schéma v9, migration v8 → v9 (établissements absents,
  banque Hassanāt vide, points à zéro, poids 0) ; les parties anciennes
  restent jouables avec l'ancien flux de visite.

## Décisions ouvertes (rien n'est inventé)
- Noms définitifs des hôtels et des agences ; illustrations par site.
- Prix d'achat et frais de service par établissement (30 partout en démo).
- Coûts et points des cartes Hassanāt ; textes AR des cartes (FR seul pour
  l'instant : aucune traduction inventée).
- Bonus de famille complète, rabais propriétaire (`ownerCost`), système
  d'amélioration : non décidés, non codés.
- Formule de victoire (Kounouz / patrimoine / Hassanāt) : non décidée.
- Bénéficiaire joueur de la Zakat : critères à définir (ADR 0034).

## Tests
`tests/unit/game/establishments.test.ts` (12 établissements, familles,
achat libre, revisite sans paiement, service et paiement unique équilibré,
frais en données, solde insuffisant, famille complète, sauvegarde v9 et
migration v8), `tests/unit/game/hassanat.test.ts` (banque, coûts
configurables, accepter / passer, aucun double gain, destinations du coût,
bénéficiaire invalide, indisponibilité, rotation, score configurable, Zakat
et Don sans Hassanāt, Défi ≠ Hassanāt, sauvegarde, partie complète sur le
plateau 26), `tests/unit/experience/voiceOff.test.ts` (session OFF et
migration, écran sans narration automatique, file neutralisée, rejoueur
sans attente), `tests/unit/ui/establishmentCards.test.tsx` (cartes,
plateau, tuile, bandeaux).
