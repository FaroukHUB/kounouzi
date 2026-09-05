import { z } from "zod";
import { journeyCycleIssues } from "./journeyScheduler";
import { CELL_TYPES, CHALLENGE_CATEGORIES, CHALLENGE_TOGGLES, FAMILY_ASSIST_LEVELS, HERITAGE_KINDS, INSUFFICIENT_POLICIES, TRANSFER_REASONS, ZAKAT_ASSET_TYPES, type ChallengesConfig, type Outcome } from "./types";

/* Plateau ---------------------------------------------------------------- */

export const boardCellConfigSchema = z.object({ position: z.number().int().nonnegative(), type: z.enum(CELL_TYPES) });

export const boardConfigSchema = z
  .object({ id: z.string().min(1), version: z.number().int().positive(), cellCount: z.number().int().min(2), cells: z.array(boardCellConfigSchema).min(2) })
  .superRefine((board, ctx) => {
    if (board.cells.length !== board.cellCount) ctx.addIssue({ code: "custom", message: `cellCount=${board.cellCount} mais ${board.cells.length} cases` });
    if (new Set(board.cells.map((c) => c.position)).size !== board.cells.length) ctx.addIssue({ code: "custom", message: "positions dupliquées" });
    for (const c of board.cells) if (c.position >= board.cellCount) ctx.addIssue({ code: "custom", message: `position ${c.position} hors du plateau` });
    const starts = board.cells.filter((c) => c.type === "start").length;
    if (starts !== 1) ctx.addIssue({ code: "custom", message: `exactement une case de départ attendue, ${starts} trouvée(s)` });
  });

/* Sites ------------------------------------------------------------------ */

/** Miroir de la contrainte SQL : un prix existe si et seulement si le site est un monument achetable. */
export const heritageSiteSchema = z
  .object({ id: z.string().min(1), kind: z.enum(HERITAGE_KINDS), price: z.number().int().nonnegative().optional(), heritageValue: z.number().int().nonnegative().optional() })
  .superRefine((site, ctx) => {
    const purchasable = site.kind === "purchasable_monument";
    if (purchasable && (site.price === undefined || site.heritageValue === undefined)) ctx.addIssue({ code: "custom", message: `${site.id} : un monument achetable exige price et heritageValue` });
    if (!purchasable && (site.price !== undefined || site.heritageValue !== undefined)) ctx.addIssue({ code: "custom", message: `${site.id} : un site de type ${site.kind} ne peut pas porter de prix` });
  });

/* Chemin ------------------------------------------------------------------ */

export const journeyCycleSchema = z
  .object({ id: z.string().min(1), version: z.number().int().positive(), stepMax: z.number().int().min(1), blocks: z.array(z.array(z.number().int().positive()).min(1)).min(1) })
  .superRefine((cycle, ctx) => {
    for (const issue of journeyCycleIssues(cycle)) ctx.addIssue({ code: "custom", message: issue });
  });

/* Effets, résultats, scénarios ------------------------------------------ */

const payoutSchema = z.object({ correct: z.number().int().nonnegative(), partial: z.number().int().nonnegative(), incorrect: z.number().int().nonnegative() });
const insufficientSchema = z.enum(INSUFFICIENT_POLICIES);

export const effectSpecSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("skip_turn"), consumeOn: z.literal("turn_start") }),
  z.object({ type: z.literal("extra_turn"), consumeOn: z.literal("turn_end") }),
  z.object({ type: z.literal("reward_multiplier"), multiplier: z.number().positive(), uses: z.number().int().positive(), consumeOn: z.literal("reward_granted") }),
  z.object({ type: z.literal("next_reward_bonus"), amount: z.number().int().positive(), consumeOn: z.literal("reward_granted") }),
  z.object({ type: z.literal("penalty_shield"), maxAmount: z.number().int().positive(), consumeOn: z.literal("penalty") }),
  z.object({ type: z.literal("next_purchase_discount"), percent: z.number().int().min(1).max(100), consumeOn: z.literal("purchase") }),
  z.object({ type: z.literal("investment_pending"), payout: payoutSchema, consumeOn: z.literal("answer_recorded") }),
  z.object({ type: z.literal("saving_pending"), payout: z.number().int().nonnegative(), turnsRemaining: z.number().int().positive(), consumeOn: z.literal("turn_end") }),
]);

const EFFECT_TYPES = ["skip_turn", "extra_turn", "reward_multiplier", "next_reward_bonus", "penalty_shield", "next_purchase_discount", "investment_pending", "saving_pending"] as const;

export const outcomeSchema: z.ZodType<Outcome> = z.lazy(() =>
  z
    .discriminatedUnion("kind", [
      z.object({ kind: z.literal("money"), amount: z.number().int(), insufficient: insufficientSchema.optional() }),
      z.object({ kind: z.literal("move"), steps: z.number().int(), resolveDestination: z.boolean().optional() }),
      z.object({ kind: z.literal("move_to"), position: z.number().int().nonnegative(), resolveDestination: z.boolean().optional() }),
      z.object({ kind: z.literal("effect"), effect: effectSpecSchema, expiresInTurns: z.number().int().positive().optional() }),
      z.object({ kind: z.literal("question") }),
      z.object({ kind: z.literal("heritage_offer"), siteId: z.string().min(1) }),
      z.object({ kind: z.literal("choice"), choiceId: z.string().min(1), options: z.array(z.object({ id: z.string().min(1), outcomes: z.array(outcomeSchema) })).min(1) }),
      z.object({ kind: z.literal("duel") }),
      z.object({ kind: z.literal("halt") }),
      z.object({ kind: z.literal("family_challenge") }),
      z.object({ kind: z.literal("treasure") }),
      z.object({ kind: z.literal("donation") }),
      z.object({ kind: z.literal("transfer_choice"), amount: z.number().int().positive(), reason: z.enum(TRANSFER_REASONS), insufficient: insufficientSchema }),
      z.object({ kind: z.literal("give_to_poorest"), amount: z.number().int().positive(), reason: z.enum(TRANSFER_REASONS), insufficient: insufficientSchema }),
      z.object({ kind: z.literal("aid_from_richest"), amount: z.number().int().positive(), insufficient: insufficientSchema }),
      z.object({ kind: z.literal("collective_fund"), amount: z.number().int().positive(), insufficient: insufficientSchema }),
      z.object({ kind: z.literal("heritage_maintenance"), amountPerSite: z.number().int().positive(), insufficient: insufficientSchema }),
      z.object({ kind: z.literal("heritage_bonus"), amountPerSite: z.number().int().positive() }),
      z.object({ kind: z.literal("invest"), amount: z.number().int().positive(), payout: payoutSchema, insufficient: insufficientSchema }),
      z.object({ kind: z.literal("save"), amount: z.number().int().positive(), payout: z.number().int().nonnegative(), turns: z.number().int().positive(), insufficient: insufficientSchema }),
      z.object({ kind: z.literal("clear_effects"), types: z.array(z.enum(EFFECT_TYPES)), liftHalt: z.boolean() }),
    ])
    // Une perte déclare TOUJOURS sa politique d'argent insuffisant : aucun comportement implicite.
    .refine((o) => o.kind !== "money" || o.amount >= 0 || o.insufficient !== undefined, { message: "une perte d'argent doit déclarer sa politique `insufficient`" }),
);

export const scenarioSchema = z.object({ id: z.string().min(1), cellType: z.enum(CELL_TYPES), outcomes: z.array(outcomeSchema) });

/* Défis famille (données) ------------------------------------------------ */

export const challengeSettingsSchema = z.object(Object.fromEntries(CHALLENGE_TOGGLES.map((t) => [t, z.boolean()])) as Record<(typeof CHALLENGE_TOGGLES)[number], z.ZodBoolean>);

export const challengeDefinitionSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  category: z.enum(CHALLENGE_CATEGORIES),
  minAge: z.number().int().min(0),
  reward: z.number().int().nonnegative(),
  text: z.string().min(1),
  adaptation: z.string().min(1).optional(),
  variants: z.array(z.object({ ageMin: z.number().int().min(0), ageMax: z.number().int().positive().optional(), text: z.string().min(1) })),
  ohNo: z.boolean(),
  boss: z.boolean(),
  consentRequired: z.boolean(),
  animationKey: z.string().min(1),
  contentRef: z
    .discriminatedUnion("kind", [
      z.object({ kind: z.literal("validated_question"), categoryId: z.string().min(1), difficultyDelta: z.number().int() }),
      z.object({ kind: z.literal("validated_recitation"), count: z.number().int().positive(), surahId: z.string().min(1).optional() }),
    ])
    .optional(),
  onSuccess: z.array(outcomeSchema).optional(),
});

/** Référence de récitation : strictement nom, numéro, niveau — aucun champ de texte coranique n'est admis. */
export const recitationRefSchema = z.strictObject({ id: z.string().min(1), surahNumber: z.number().int().min(1).max(114), nameFr: z.string().min(1).max(40), nameAr: z.string().min(1).max(40), level: z.number().int().min(1).max(5) });

export const challengesConfigSchema: z.ZodType<ChallengesConfig> = z
  .object({
    definitions: z.array(challengeDefinitionSchema),
    toggles: z.object(Object.fromEntries(CHALLENGE_TOGGLES.map((t) => [t, z.array(z.enum(CHALLENGE_CATEGORIES))])) as Record<(typeof CHALLENGE_TOGGLES)[number], z.ZodArray<z.ZodEnum<{ [K in (typeof CHALLENGE_CATEGORIES)[number]]: K }>>>),
    settings: challengeSettingsSchema,
    contentAvailable: z.array(z.string()),
    recitations: z.array(recitationRefSchema),
  })
  .superRefine((c, ctx) => {
    if (new Set(c.definitions.map((d) => d.id)).size !== c.definitions.length) ctx.addIssue({ code: "custom", message: "identifiants de défi dupliqués" });
    // Un défi religieux ne porte aucun texte religieux : il DOIT référencer du contenu validé.
    for (const d of c.definitions) if (d.category === "religion" && !d.contentRef) ctx.addIssue({ code: "custom", message: `${d.id} : un défi religieux doit référencer du contenu validé` });
    if (new Set(c.recitations.map((r) => r.surahNumber)).size !== c.recitations.length) ctx.addIssue({ code: "custom", message: "numéros de sourate dupliqués" });
    const covered = new Set(Object.values(c.toggles).flat());
    for (const d of c.definitions) if (!covered.has(d.category)) ctx.addIssue({ code: "custom", message: `${d.id} : catégorie ${d.category} sans interrupteur parent` });
  });

/* Règles ----------------------------------------------------------------- */

export const endConditionSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("active_time"), targetSeconds: z.number().int().positive() }),
  z.object({ kind: z.literal("free") }),
  z.object({ kind: z.literal("turns_per_player"), turns: z.number().int().positive() }),
]);

/** Zakat al-Māl : données validées ; le taux et le nissab ne sont jamais codés en dur. */
export const zakatConfigSchema = z.object({
  enabled: z.boolean(),
  rate: z.number().min(0).max(1),
  nisabKounouz: z.number().int().nonnegative(),
  cycleRounds: z.number().int().positive(),
  eligibleAssetTypes: z.array(z.enum(ZAKAT_ASSET_TYPES)).min(1),
});

export const rulesConfigSchema = z.object({
  id: z.string().min(1),
  version: z.number().int().positive(),
  startingMoney: z.number().int().nonnegative(),
  passStartBonus: z.number().int().nonnegative(),
  treasure: z.object({ amount: z.number().int().nonnegative() }),
  donation: z.object({ amounts: z.array(z.number().int().positive()) }),
  zakat: zakatConfigSchema,
  rewards: z.object({ correct: z.number().int().nonnegative(), partial: z.number().int().nonnegative(), incorrect: z.number().int().nonnegative(), masteryMultiplier: z.number().positive() }),
  scoring: z.object({ moneyWeight: z.number().nonnegative(), heritageWeight: z.number().nonnegative() }),
  allowNegativeBalance: z.boolean(),
  endCondition: endConditionSchema,
  duel: z.object({ winBonus: z.number().int().nonnegative(), drawBonus: z.number().int().nonnegative(), loseBonus: z.number().int().nonnegative() }),
  heritageVisit: z.object({ contribution: payoutSchema, insufficient: insufficientSchema }),
});

/* Équilibrage familial — modèle seulement ---------------------------------- */

export const familyAssistConfigSchema = z.object({
  enabled: z.boolean(),
  assistedPlayers: z.array(z.object({ playerId: z.string().min(1), level: z.enum(FAMILY_ASSIST_LEVELS) })),
});
