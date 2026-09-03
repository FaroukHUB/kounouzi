import { z } from "zod";
import { CELL_TYPES, HERITAGE_KINDS, type Outcome } from "./types";

/* Plateau ---------------------------------------------------------------- */

export const boardCellConfigSchema = z.object({
  position: z.number().int().nonnegative(),
  type: z.enum(CELL_TYPES),
});

export const boardConfigSchema = z
  .object({
    id: z.string().min(1),
    version: z.number().int().positive(),
    cellCount: z.number().int().min(2),
    cells: z.array(boardCellConfigSchema).min(2),
  })
  .superRefine((board, ctx) => {
    if (board.cells.length !== board.cellCount) {
      ctx.addIssue({ code: "custom", message: `cellCount=${board.cellCount} mais ${board.cells.length} cases` });
    }
    const positions = new Set(board.cells.map((c) => c.position));
    if (positions.size !== board.cells.length) {
      ctx.addIssue({ code: "custom", message: "positions dupliquées" });
    }
    for (const c of board.cells) {
      if (c.position >= board.cellCount) {
        ctx.addIssue({ code: "custom", message: `position ${c.position} hors du plateau` });
      }
    }
    const starts = board.cells.filter((c) => c.type === "start");
    if (starts.length !== 1) {
      ctx.addIssue({ code: "custom", message: `exactement une case de départ attendue, ${starts.length} trouvée(s)` });
    }
  });

/* Sites ------------------------------------------------------------------ */

/** Miroir de la contrainte SQL : un prix existe si et seulement si le site est un monument achetable. */
export const heritageSiteSchema = z
  .object({
    id: z.string().min(1),
    kind: z.enum(HERITAGE_KINDS),
    price: z.number().int().nonnegative().optional(),
    heritageValue: z.number().int().nonnegative().optional(),
  })
  .superRefine((site, ctx) => {
    const purchasable = site.kind === "purchasable_monument";
    if (purchasable && (site.price === undefined || site.heritageValue === undefined)) {
      ctx.addIssue({ code: "custom", message: `${site.id} : un monument achetable exige price et heritageValue` });
    }
    if (!purchasable && (site.price !== undefined || site.heritageValue !== undefined)) {
      ctx.addIssue({ code: "custom", message: `${site.id} : un site de type ${site.kind} ne peut pas porter de prix` });
    }
  });

/* Effets, résultats, scénarios ------------------------------------------ */

export const effectSpecSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("skip_turn") }),
  z.object({ type: z.literal("extra_turn") }),
  z.object({ type: z.literal("reward_multiplier"), multiplier: z.number().positive(), uses: z.number().int().positive() }),
]);

export const outcomeSchema: z.ZodType<Outcome> = z.lazy(() =>
  z.discriminatedUnion("kind", [
    z.object({ kind: z.literal("money"), amount: z.number().int() }),
    z.object({ kind: z.literal("move"), steps: z.number().int(), resolveDestination: z.boolean().optional() }),
    z.object({ kind: z.literal("move_to"), position: z.number().int().nonnegative(), resolveDestination: z.boolean().optional() }),
    z.object({ kind: z.literal("effect"), effect: effectSpecSchema }),
    z.object({ kind: z.literal("question") }),
    z.object({ kind: z.literal("heritage_offer"), siteId: z.string().min(1) }),
    z.object({
      kind: z.literal("choice"),
      choiceId: z.string().min(1),
      options: z.array(z.object({ id: z.string().min(1), outcomes: z.array(outcomeSchema) })).min(1),
    }),
  ]),
);

export const scenarioSchema = z.object({
  id: z.string().min(1),
  cellType: z.enum(CELL_TYPES),
  outcomes: z.array(outcomeSchema),
});

/* Règles ----------------------------------------------------------------- */

export const endConditionSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("turns_per_player"), turns: z.number().int().positive() }),
]);

export const rulesConfigSchema = z
  .object({
    id: z.string().min(1),
    version: z.number().int().positive(),
    startingMoney: z.number().int().nonnegative(),
    passStartBonus: z.number().int().nonnegative(),
    wheel: z.object({ min: z.number().int().positive(), max: z.number().int().positive() }),
    rewards: z.object({
      correct: z.number().int().nonnegative(),
      partial: z.number().int().nonnegative(),
      incorrect: z.number().int().nonnegative(),
      masteryMultiplier: z.number().positive(),
    }),
    scoring: z.object({ moneyWeight: z.number().nonnegative(), heritageWeight: z.number().nonnegative() }),
    allowNegativeBalance: z.boolean(),
    endCondition: endConditionSchema,
  })
  .refine((r) => r.wheel.max >= r.wheel.min, { message: "wheel.max doit être ≥ wheel.min" });
