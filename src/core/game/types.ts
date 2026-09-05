import type { QuestionRef, ServedQuestion } from "@/core/content/types";
import type { AnswerOutcome, ExplanationMastery, GameId, PlayerId, ProfileType, ValidationMode } from "@/core/shared";

/* ---------------------------------------------------------------------------
 * Plateau (configuration — jamais codé en dur dans les règles)
 * ------------------------------------------------------------------------- */

/**
 * Types de case. Correspondance avec la nomenclature de conception :
 * start=DÉPART · question=SAVOIR · heritage=MONUMENT achetable ·
 * challenge=DÉFI · halt=HALTE · donation=DON (Caisse Masākīn ou joueur) ·
 * treasure=TRÉSOR (+montant fixe des règles). `event`, `management` et
 * `solidarity` ne figurent plus sur le plateau 26 (ADR 0033) ; ils restent
 * acceptés pour les parties sauvegardées et les scénarios de démonstration.
 * La Zakat al-Māl n'est JAMAIS une case : mécanique annuelle hors plateau.
 */
export const CELL_TYPES = ["start", "question", "heritage", "event", "management", "challenge", "solidarity", "treasure", "halt", "donation"] as const;
export type CellType = (typeof CELL_TYPES)[number];

export interface BoardCellConfig {
  readonly position: number;
  readonly type: CellType;
}

/** Disposition d'un plateau : uniquement des positions et des types. */
export interface BoardConfig {
  readonly id: string;
  readonly version: number;
  readonly cellCount: number;
  readonly cells: readonly BoardCellConfig[];
}

/* ---------------------------------------------------------------------------
 * Sites patrimoniaux
 * ------------------------------------------------------------------------- */

export const HERITAGE_KINDS = ["purchasable_monument", "religious_place", "educational_site", "city", "country", "event", "other"] as const;
export type HeritageKind = (typeof HERITAGE_KINDS)[number];

/**
 * Un site tel que décrit par le contenu. Règle structurelle : `price` et
 * `heritageValue` existent si et seulement si `kind === "purchasable_monument"`
 * (vérifié par le schéma, refusé par `resolveBoard`).
 */
export interface HeritageSite {
  readonly id: string;
  readonly kind: HeritageKind;
  readonly price?: number | undefined;
  readonly heritageValue?: number | undefined;
}

/** Vue du moteur : un site achetable, prix et valeur garantis. */
export interface PurchasableSite {
  readonly id: string;
  readonly price: number;
  readonly heritageValue: number;
}

export type ResolvedCell =
  | { readonly position: number; readonly type: Exclude<CellType, "heritage"> }
  | { readonly position: number; readonly type: "heritage"; readonly siteId: string };

export interface ResolvedBoard {
  readonly id: string;
  readonly version: number;
  readonly cellCount: number;
  readonly startPosition: number;
  readonly cells: readonly ResolvedCell[];
}

/* ---------------------------------------------------------------------------
 * Le Chemin — déplacement déterministe, sans hasard ni choix du joueur
 * ------------------------------------------------------------------------- */

/**
 * Cycle de voyage versionné : une suite de blocs, chacun étant une permutation
 * de 1..stepMax. Le siège d'un joueur détermine son bloc de départ ; son
 * compteur de voyages avance dans le cycle. Aucune donnée économique, aucun
 * contenu de case, aucun hasard n'intervient (voir `journeyScheduler.ts`).
 */
export interface JourneyCycle {
  readonly id: string;
  readonly version: number;
  readonly stepMax: number;
  readonly blocks: readonly (readonly number[])[];
}

/* ---------------------------------------------------------------------------
 * Effets différés, résultats de case, scénarios
 * ------------------------------------------------------------------------- */

/**
 * Politique déclarée par tout résultat économique négatif : jamais de
 * comportement implicite quand l'argent manque.
 * - `cap_to_balance` : on prend ce qui existe (solde à 0, jamais négatif) ;
 * - `require_full_amount` : l'action est refusée si le montant complet manque
 *   (choix du joueur : option indisponible) ;
 * - `cancel_if_insufficient` : le résultat est annulé silencieusement
 *   (résultat automatique d'un scénario).
 */
export const INSUFFICIENT_POLICIES = ["cap_to_balance", "require_full_amount", "cancel_if_insufficient"] as const;
export type InsufficientPolicy = (typeof INSUFFICIENT_POLICIES)[number];

/** Motif d'un transfert entre joueurs (traçable dans le grand livre et les événements). `donation` = case Don ; `zakat` = Zakat versée à un joueur éligible (règles à définir). */
export const TRANSFER_REASONS = ["heritage_contribution", "gift", "solidarity", "collective_fund", "aid", "donation", "zakat"] as const;
export type TransferReason = (typeof TRANSFER_REASONS)[number];

/** Gains d'un résultat de réponse : ce que rapporte correct / presque / incorrect. */
export interface OutcomePayout {
  readonly correct: number;
  readonly partial: number;
  readonly incorrect: number;
}

/**
 * Effets différés. Chaque effet déclare EXPLICITEMENT son déclencheur de
 * consommation (`consumeOn`) ; rien n'est déduit d'une sémantique implicite.
 * Le propriétaire, le tour d'acquisition et l'expiration éventuelle vivent
 * dans `QueuedEffect`. Aucun booléen dispersé.
 */
export type EffectSpec =
  | { readonly type: "skip_turn"; readonly consumeOn: "turn_start" }
  | { readonly type: "extra_turn"; readonly consumeOn: "turn_end" }
  /** Multiplie la prochaine récompense de réponse (consommé seulement si une récompense est versée). */
  | { readonly type: "reward_multiplier"; readonly multiplier: number; readonly uses: number; readonly consumeOn: "reward_granted" }
  /** Bonus fixe ajouté à la prochaine récompense de réponse. */
  | { readonly type: "next_reward_bonus"; readonly amount: number; readonly consumeOn: "reward_granted" }
  /** Annule la prochaine petite pénalité (perte de scénario ≤ `maxAmount`). */
  | { readonly type: "penalty_shield"; readonly maxAmount: number; readonly consumeOn: "penalty" }
  /** Réduction (en %) sur le prochain achat de monument. */
  | { readonly type: "next_purchase_discount"; readonly percent: number; readonly consumeOn: "purchase" }
  /** Investissement en attente : la prochaine réponse décide du versement (aucun hasard, le joueur décide). */
  | { readonly type: "investment_pending"; readonly payout: OutcomePayout; readonly consumeOn: "answer_recorded" }
  /** Épargne : versement après `turnsRemaining` tours du joueur consommés. */
  | { readonly type: "saving_pending"; readonly payout: number; readonly turnsRemaining: number; readonly consumeOn: "turn_end" };

export interface QueuedEffect {
  readonly id: string;
  readonly playerId: PlayerId;
  readonly spec: EffectSpec;
  /** Tour (numéro global) où l'effet a été acquis. */
  readonly queuedAtTurn: number;
  /** Expiration éventuelle : l'effet disparaît au début d'un tour du joueur postérieur à ce numéro. */
  readonly expiresAtTurn?: number | undefined;
}

/**
 * Résultat élémentaire produit par la résolution d'une case. Une séquence est
 * traitée dans l'ordre ; ceux qui exigent une décision humaine (`question`,
 * `heritage_offer`, `choice`) suspendent la file.
 */
export type Outcome =
  /** Gain (amount > 0) ou perte (amount < 0, politique obligatoire ; une perte peut être annulée par un `penalty_shield`). */
  | { readonly kind: "money"; readonly amount: number; readonly insufficient?: InsufficientPolicy | undefined }
  | { readonly kind: "move"; readonly steps: number; readonly resolveDestination?: boolean | undefined }
  | { readonly kind: "move_to"; readonly position: number; readonly resolveDestination?: boolean | undefined }
  | { readonly kind: "effect"; readonly effect: EffectSpec; readonly expiresInTurns?: number | undefined }
  | { readonly kind: "question" }
  | { readonly kind: "heritage_offer"; readonly siteId: string }
  | { readonly kind: "choice"; readonly choiceId: string; readonly options: readonly ChoiceOption[] }
  /** Duel Kounouzi : le joueur actif choisit un adversaire, chacun reçoit SA question (Learning Engine). */
  | { readonly kind: "duel" }
  /** Halte du voyage : le prochain tour commence par un Défi de reprise. */
  | { readonly kind: "halt" }
  /** Défi famille : un défi de la banque (données), choisi par rotation déterministe cachée. Le Duel reste distinct. */
  | { readonly kind: "family_challenge" }
  /** Trésor : gain fixe des règles (`rules.treasure.amount`), versé une seule fois par arrivée, par le grand livre. */
  | { readonly kind: "treasure" }
  /** Don volontaire (case Don) : le joueur choisit un montant des règles et une destination (Caisse Masākīn ou un joueur). Jamais une Zakat. */
  | { readonly kind: "donation" }
  /** Le joueur actif choisit un destinataire et lui transfère `amount`. */
  | { readonly kind: "transfer_choice"; readonly amount: number; readonly reason: TransferReason; readonly insufficient: InsufficientPolicy }
  /** Le joueur actif donne `amount` au joueur qui a le moins d'argent (autre que lui). */
  | { readonly kind: "give_to_poorest"; readonly amount: number; readonly reason: TransferReason; readonly insufficient: InsufficientPolicy }
  /** Le joueur le plus riche aide le moins riche (s'ils diffèrent). */
  | { readonly kind: "aid_from_richest"; readonly amount: number; readonly insufficient: InsufficientPolicy }
  /** Chaque joueur (sauf le bénéficiaire) contribue `amount` au joueur qui a le moins d'argent. */
  | { readonly kind: "collective_fund"; readonly amount: number; readonly insufficient: InsufficientPolicy }
  /** Entretien : coût par monument possédé. */
  | { readonly kind: "heritage_maintenance"; readonly amountPerSite: number; readonly insufficient: InsufficientPolicy }
  /** Valorisation : gain par monument possédé. */
  | { readonly kind: "heritage_bonus"; readonly amountPerSite: number }
  /** Investissement : débit immédiat, versement décidé par la prochaine réponse. */
  | { readonly kind: "invest"; readonly amount: number; readonly payout: OutcomePayout; readonly insufficient: InsufficientPolicy }
  /** Épargne : débit immédiat, versement après `turns` tours consommés. */
  | { readonly kind: "save"; readonly amount: number; readonly payout: number; readonly turns: number; readonly insufficient: InsufficientPolicy }
  /** Reprise : supprime les effets négatifs listés (et la Halte si demandé). */
  | { readonly kind: "clear_effects"; readonly types: readonly EffectSpec["type"][]; readonly liftHalt: boolean };

export interface ChoiceOption {
  readonly id: string;
  readonly outcomes: readonly Outcome[];
}

/**
 * Scénario générique attaché à un type de case. Quand plusieurs scénarios
 * existent pour un type, ils sont servis dans l'ordre configuré selon le
 * compteur de visites de la case (visite 1 → premier, visite 2 → second, …).
 */
export interface Scenario {
  readonly id: string;
  readonly cellType: CellType;
  readonly outcomes: readonly Outcome[];
}

/* ---------------------------------------------------------------------------
 * Défis famille — DONNÉES (banque), sélection déterministe, réglages parents
 * ------------------------------------------------------------------------- */

export const CHALLENGE_CATEGORIES = ["movement", "animals", "family", "solidarity", "oh_no", "memory", "reflection", "geography", "observation", "language", "maths", "logic", "arabic", "religion", "boss"] as const;
export type ChallengeCategory = (typeof CHALLENGE_CATEGORIES)[number];

/** Réglages parents : chaque interrupteur active un groupe de catégories (données) ou un drapeau de carte. */
export const CHALLENGE_TOGGLES = ["movement", "fun", "family", "contact", "ohNo", "memoryLogic", "arabic", "religion", "boss"] as const;
export type ChallengeToggle = (typeof CHALLENGE_TOGGLES)[number];
export type ChallengeSettings = Readonly<Record<ChallengeToggle, boolean>>;
export const ALL_CHALLENGES_ON: ChallengeSettings = { movement: true, fun: true, family: true, contact: true, ohNo: true, memoryLogic: true, arabic: true, religion: true, boss: true };

/** Variante d'âge d'un défi (« 5-8 : 5 s ») ; `ageMax` exclusif, absent = sans limite. */
export interface ChallengeVariant {
  readonly ageMin: number;
  readonly ageMax?: number | undefined;
  readonly text: string;
}

/**
 * Référence à du contenu DÉJÀ VALIDÉ : un défi religieux ne porte jamais de
 * texte religieux ; il n'est éligible que si le contenu référencé existe
 * (`ChallengesConfig.contentAvailable`, calculé hors du moteur depuis le
 * registre validé, figé à la création).
 */
export type ChallengeContentRef =
  | { readonly kind: "validated_question"; readonly categoryId: string; readonly difficultyDelta: number }
  /** Récitation orale : `count` sourates (2 = parmi celles que le joueur maîtrise), ou une sourate imposée (`surahId`). */
  | { readonly kind: "validated_recitation"; readonly count: number; readonly surahId?: string | undefined };

/**
 * Référence de récitation : nom et numéro d'une sourate validés pour le défi
 * oral. AUCUN verset n'est stocké, affiché ni généré ; `level` est une
 * difficulté de jeu, jamais un classement religieux.
 */
export interface RecitationRef {
  readonly id: string;
  readonly surahNumber: number;
  readonly nameFr: string;
  readonly nameAr: string;
  readonly level: number;
}

export interface ChallengeDefinition {
  readonly id: string;
  readonly title: string;
  readonly category: ChallengeCategory;
  /** Âge minimal (années) ; un adulte est éligible à tout. */
  readonly minAge: number;
  /** Gain crédité EXACTEMENT une fois en cas de réussite ; échec ou refus = 0. */
  readonly reward: number;
  readonly text: string;
  readonly adaptation?: string | undefined;
  readonly variants: readonly ChallengeVariant[];
  /** Carte « OH NON » : alerte amusante avant révélation (présentation). */
  readonly ohNo: boolean;
  readonly boss: boolean;
  /** Défi de contact : consentement obligatoire ; désactivable par les parents. */
  readonly consentRequired: boolean;
  readonly animationKey: string;
  readonly contentRef?: ChallengeContentRef | undefined;
  /** Résultats économiques appliqués après une réussite (défis solidaires : transfert réel, choix). */
  readonly onSuccess?: readonly Outcome[] | undefined;
}

export interface ChallengesConfig {
  readonly definitions: readonly ChallengeDefinition[];
  /** Interrupteur → catégories qu'il active (`contact` et `ohNo` gouvernent des drapeaux de carte). */
  readonly toggles: Readonly<Record<ChallengeToggle, readonly ChallengeCategory[]>>;
  readonly settings: ChallengeSettings;
  /** Identifiants des défis dont la référence de contenu validé est satisfaite (calcul hors moteur, figé). */
  readonly contentAvailable: readonly string[];
  /** Sourates validées pour la récitation (références seulement), figées dans la partie. */
  readonly recitations: readonly RecitationRef[];
}

export const EMPTY_TOGGLES: ChallengesConfig["toggles"] = { movement: [], fun: [], family: [], contact: [], ohNo: [], memoryLogic: [], arabic: [], religion: [], boss: [] };
/** Aucune banque : une case Défi ne propose alors aucun défi famille (parties migrées). */
export const NO_CHALLENGES: ChallengesConfig = { definitions: [], toggles: EMPTY_TOGGLES, settings: ALL_CHALLENGES_ON, contentAvailable: [], recitations: [] };

export const CHALLENGE_STAGES = ["assigned", "accepted"] as const;
export type ChallengeStage = (typeof CHALLENGE_STAGES)[number];
export const CHALLENGE_SKIP_REASONS = ["declined", "consent_refused"] as const;
export type ChallengeSkipReason = (typeof CHALLENGE_SKIP_REASONS)[number];

/** Défi famille en cours — état persistant explicite (sauvegarde et reprise en plein défi). */
export interface ChallengeState {
  readonly challengeId: string;
  readonly playerId: PlayerId;
  /** Identifiant de demande : une question validée peut y être figée (`served`) pour un défi à contenu. */
  readonly requestId: string;
  readonly stage: ChallengeStage;
  readonly served?: ServedQuestion | undefined;
  /** Sourates à réciter (références), choisies à l'assignation de façon déterministe. */
  readonly surahIds?: readonly string[] | undefined;
}

/* ---------------------------------------------------------------------------
 * Règles configurables
 * ------------------------------------------------------------------------- */

/**
 * Condition de fin. `active_time` (temps de jeu ACTIF, pas heure absolue) est
 * l'expérience principale ; `free` ne finit que sur demande ; `turns_per_player`
 * reste disponible pour les tests et simulations. Dans tous les cas la partie
 * se termine à la fin d'un tour de table complet : personne ne joue un tour de
 * plus que les autres.
 */
export type EndCondition =
  | { readonly kind: "active_time"; readonly targetSeconds: number }
  | { readonly kind: "free" }
  | { readonly kind: "turns_per_player"; readonly turns: number };

/** Actifs pris en compte pour la Zakat al-Māl : seuls les Kounouz monétaires aujourd'hui (jamais la valeur des monuments sans décision explicite). */
export const ZAKAT_ASSET_TYPES = ["money"] as const;
export type ZakatAssetType = (typeof ZAKAT_ASSET_TYPES)[number];

/**
 * Zakat al-Māl : mécanique ANNUELLE hors plateau (ADR 0033). Le cycle
 * (`cycleRounds` tours de table complets = une année lunaire simulée) est
 * commun à tous les joueurs ; à chaque échéance, chaque joueur dont les
 * actifs éligibles atteignent le nissab verse `rate` à la Caisse Masākīn.
 */
export interface ZakatConfig {
  readonly enabled: boolean;
  readonly rate: number;
  readonly nisabKounouz: number;
  readonly cycleRounds: number;
  readonly eligibleAssetTypes: readonly ZakatAssetType[];
}

export interface RulesConfig {
  readonly id: string;
  readonly version: number;
  readonly startingMoney: number;
  /** Gain de chaque passage complet par la case Départ (versé une fois par franchissement, par le grand livre). */
  readonly passStartBonus: number;
  /** Trésor : gain fixe à l'arrivée sur la case ; 0 = la case sert ses scénarios (parties anciennes). */
  readonly treasure: { readonly amount: number };
  /** Case Don : montants proposés au joueur (choix humain), destinations = Caisse Masākīn ou un autre joueur. */
  readonly donation: { readonly amounts: readonly number[] };
  readonly zakat: ZakatConfig;
  readonly rewards: { readonly correct: number; readonly partial: number; readonly incorrect: number; readonly masteryMultiplier: number };
  readonly scoring: { readonly moneyWeight: number; readonly heritageWeight: number };
  readonly allowNegativeBalance: boolean;
  readonly endCondition: EndCondition;
  /** Duel Kounouzi : bonus de victoire, d'égalité (petit) et de défaite (pas de grosse pénalité). */
  readonly duel: { readonly winBonus: number; readonly drawBonus: number; readonly loseBonus: number };
  /** Visite de patrimoine : contribution due au propriétaire selon la réponse au Défi Patrimoine. */
  readonly heritageVisit: { readonly contribution: OutcomePayout; readonly insufficient: InsufficientPolicy };
}

/* ---------------------------------------------------------------------------
 * Équilibrage familial (FamilyAssist) — MODÈLE SEULEMENT, non implémenté
 * ------------------------------------------------------------------------- */

export const FAMILY_ASSIST_LEVELS = ["subtle"] as const;
export type FamilyAssistLevel = (typeof FAMILY_ASSIST_LEVELS)[number];

/**
 * Configuration PAR PARTIE (jamais sur un profil permanent), parentale et
 * secrète : l'interface de jeu ne l'affiche jamais. Aucune mécanique n'est
 * encore branchée dessus. Elle ne pourra jamais toucher au Chemin, aux
 * questions, aux réponses ni à la progression pédagogique (ADR 0015).
 */
export interface FamilyAssistConfig {
  readonly enabled: boolean;
  readonly assistedPlayers: readonly { readonly playerId: PlayerId; readonly level: FamilyAssistLevel }[];
}

export const FAMILY_ASSIST_OFF: FamilyAssistConfig = { enabled: false, assistedPlayers: [] };

/* ---------------------------------------------------------------------------
 * État de partie
 * ------------------------------------------------------------------------- */

export interface PlayerState {
  readonly id: PlayerId;
  readonly displayName: string;
  readonly profileType: ProfileType;
  /** Âge (années) au moment de la création, pour l'éligibilité des défis ; absent pour un adulte. */
  readonly age?: number | undefined;
  readonly seat: number;
  readonly position: number;
  readonly money: number;
  readonly turnsPlayed: number;
  /** Nombre de Chemins déjà attribués (index dans le cycle de voyage). */
  readonly journeysTaken: number;
  /** Halte du voyage : le prochain tour commence par un Défi de reprise. Jamais plus d'un tour. */
  readonly halted: boolean;
  /** Dimension solidarité (tracée à part ; aucune formule de score encore). */
  readonly solidarityActions: number;
  readonly solidarityGiven: number;
  /** Adversaire du dernier Duel déclenché par ce joueur : momentanément indisponible s'il existe un autre adversaire. */
  readonly lastDuelOpponentId?: PlayerId | undefined;
  /** Sourates maîtrisées (références) : état de récitation du joueur, mis à jour par une récitation réussie. */
  readonly masteredSurahs: readonly string[];
}

export const TRANSACTION_REASONS = [
  "starting_money",
  "start_bonus",
  "treasure",
  "donation_sent",
  "zakat_paid",
  "question_reward",
  "purchase",
  "scenario_gain",
  "scenario_loss",
  "transfer_sent",
  "transfer_received",
  "duel_reward",
  "investment",
  "investment_payout",
  "saving",
  "saving_payout",
  "heritage_maintenance",
  "heritage_bonus",
  "challenge_reward",
] as const;
export type TransactionReason = (typeof TRANSACTION_REASONS)[number];

export interface Transaction {
  readonly id: number;
  readonly turnNumber: number;
  readonly playerId: PlayerId;
  readonly amount: number;
  readonly reason: TransactionReason;
  readonly balanceAfter: number;
  readonly ref?: string;
}

/** Caisses collectives : des Kounouz qui n'appartiennent à AUCUN joueur. */
export const FUNDS = ["masakin"] as const;
export type FundId = (typeof FUNDS)[number];
export const FUND_TRANSACTION_REASONS = ["donation", "zakat"] as const;
export type FundTransactionReason = (typeof FUND_TRANSACTION_REASONS)[number];

/** Écriture du grand livre d'une caisse, liée à l'écriture du joueur par `ref`. */
export interface FundTransaction {
  readonly id: number;
  readonly turnNumber: number;
  readonly fund: FundId;
  readonly fromPlayerId: PlayerId;
  readonly amount: number;
  readonly reason: FundTransactionReason;
  readonly balanceAfter: number;
  readonly ref: string;
}

/** Destination d'un don ou d'une Zakat : la Caisse Masākīn, ou un joueur (don ; Zakat vers un joueur = règles d'éligibilité à définir). */
export type MoneyDestination = { readonly kind: "masakin" } | { readonly kind: "player"; readonly playerId: PlayerId };

/** Calendrier lunaire simulé, COMMUN à tous les joueurs : une année = `zakat.cycleRounds` tours de table complets. */
export interface GameCalendar {
  readonly year: number;
  readonly roundsInYear: number;
}

export interface Holding {
  readonly siteId: string;
  readonly ownerId: PlayerId;
  readonly price: number;
  readonly heritageValue: number;
  readonly acquiredTurn: number;
}

export interface AnswerRecord {
  readonly outcome: AnswerOutcome;
  readonly explanationMastery: ExplanationMastery;
  readonly validationMode: ValidationMode;
}

/**
 * Pourquoi une question est posée. La question reste une VRAIE question
 * pédagogique (mémoire alimentée normalement) ; seul l'effet de jeu diffère.
 */
export type AnswerPurpose =
  | { readonly kind: "standard" }
  /** Défi de reprise après une Halte du voyage. */
  | { readonly kind: "halt" }
  /** Défi Patrimoine : la contribution due au propriétaire dépend de la réponse. */
  | { readonly kind: "heritage_visit"; readonly siteId: string; readonly ownerId: PlayerId };

export const DUEL_STAGES = ["challenger", "opponent"] as const;
export type DuelStage = (typeof DUEL_STAGES)[number];

/**
 * Duel Kounouzi — état persistant explicite. Chaque dueliste reçoit SA
 * question (choisie par le Learning Engine, même catégorie), figée ici ; on
 * compare uniquement correct > presque > incorrect. Aucun chrono, aucune
 * vitesse, jamais la maîtrise de l'explication.
 */
export interface DuelState {
  readonly challengerId: PlayerId;
  readonly opponentId: PlayerId;
  /** Catégorie commune, fixée à la distribution de la première question. */
  readonly categoryId: string | null;
  readonly challengerRequestId: string;
  readonly opponentRequestId: string;
  readonly challengerServed?: ServedQuestion | undefined;
  readonly opponentServed?: ServedQuestion | undefined;
  readonly challengerOutcome?: AnswerOutcome | undefined;
  readonly opponentOutcome?: AnswerOutcome | undefined;
  readonly stage: DuelStage;
}

/** Phase du tour. Les phases `awaiting_*` sont les seuls points d'attente : une décision humaine. */
export type TurnPhase =
  | { readonly kind: "awaiting_journey" }
  /** `served` : la question distribuée, figée avec sa référence versionnée (reprise exacte quel que soit le contenu). */
  | { readonly kind: "awaiting_answer"; readonly requestId: string; readonly position: number; readonly purpose: AnswerPurpose; readonly queue: readonly Outcome[]; readonly served?: ServedQuestion | undefined }
  | { readonly kind: "awaiting_purchase"; readonly siteId: string; readonly price: number; readonly queue: readonly Outcome[] }
  | { readonly kind: "awaiting_choice"; readonly choiceId: string; readonly options: readonly ChoiceOption[]; readonly queue: readonly Outcome[] }
  /** Le joueur actif choisit son adversaire (décision stratégique autorisée ; jamais la question ni la difficulté). */
  | { readonly kind: "awaiting_duel_opponent"; readonly candidates: readonly PlayerId[]; readonly queue: readonly Outcome[] }
  | { readonly kind: "awaiting_duel"; readonly duel: DuelState; readonly queue: readonly Outcome[] }
  /** Défi famille : le joueur actif accepte ou passe, puis la tablée valide Réussi / Raté. */
  | { readonly kind: "awaiting_challenge"; readonly challenge: ChallengeState; readonly queue: readonly Outcome[] }
  /** Le joueur actif choisit à qui transférer (partage, cadeau, don). */
  | { readonly kind: "awaiting_recipient"; readonly amount: number; readonly reason: TransferReason; readonly insufficient: InsufficientPolicy; readonly candidates: readonly PlayerId[]; readonly queue: readonly Outcome[] }
  /** Case Don : le joueur actif choisit un montant (parmi ceux qu'il peut payer) et une destination. */
  | { readonly kind: "awaiting_donation"; readonly amounts: readonly number[]; readonly candidates: readonly PlayerId[]; readonly queue: readonly Outcome[] }
  | { readonly kind: "finished" };

export interface RankingEntry {
  readonly rank: number;
  readonly playerId: PlayerId;
  readonly score: number;
  readonly money: number;
  readonly heritageValue: number;
}

/** Configuration figée à la création : une partie ne change pas de règles en cours de route. */
export interface GameConfig {
  readonly board: ResolvedBoard;
  readonly sites: Readonly<Record<string, PurchasableSite>>;
  readonly scenarios: readonly Scenario[];
  readonly rules: RulesConfig;
  readonly journey: JourneyCycle;
  readonly familyAssist: FamilyAssistConfig;
  /** Défis famille : banque (données), interrupteurs parents, contenu validé disponible. */
  readonly challenges: ChallengesConfig;
  /** Décalage de la séquence de scénarios (rotation inter-parties par numéro de partie ; jamais un tirage). */
  readonly scenarioOffset: number;
}

/** Temps de jeu ACTIF, en secondes, alimenté par la couche session (horloge injectée). */
export interface PlayClock {
  readonly activePlaySeconds: number;
  readonly timeTargetReached: boolean;
}

/** Résumé pédagogique d'une question répondue (mémoire, Phase 5). */
export interface AnsweredQuestion {
  readonly ref: QuestionRef;
  readonly knowledgeNodeId: string;
  readonly categoryId: string;
  readonly difficulty: number;
}

export const GAME_SCHEMA_VERSION = 7 as const;

export interface GameState {
  readonly schemaVersion: typeof GAME_SCHEMA_VERSION;
  readonly gameId: GameId;
  readonly config: GameConfig;
  readonly players: readonly PlayerState[];
  readonly activePlayerIndex: number;
  readonly turnNumber: number;
  readonly phase: TurnPhase;
  readonly ledger: readonly Transaction[];
  /** Caisses collectives (Kounouz hors joueurs) et leur grand livre. */
  readonly funds: Readonly<Record<FundId, number>>;
  readonly fundLedger: readonly FundTransaction[];
  /** Calendrier commun (année lunaire simulée) qui déclenche la Zakat. */
  readonly calendar: GameCalendar;
  readonly holdings: readonly Holding[];
  readonly effects: readonly QueuedEffect[];
  /** Nombre d'arrivées sur chaque case (sélection déterministe des scénarios). */
  readonly cellVisits: Readonly<Record<string, number>>;
  /** Par joueur, nombre de fois où chaque défi lui a été proposé dans cette partie (anti-répétition tant que son vivier n'est pas épuisé). */
  readonly challengeServed: Readonly<Record<string, Readonly<Record<string, number>>>>;
  /** Par joueur, nombre de fois où chaque sourate lui a été proposée en récitation (anti-répétition). */
  readonly recitationServed: Readonly<Record<string, Readonly<Record<string, number>>>>;
  readonly clock: PlayClock;
  /** Demande de fin (espace parent) : la partie s'arrête à la fin du tour de table. */
  readonly endRequested: boolean;
  readonly counters: { readonly transaction: number; readonly request: number; readonly effect: number; readonly transfer: number; readonly challenge: number };
  readonly status: "in_progress" | "finished";
  readonly ranking?: readonly RankingEntry[];
}

export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 6;
