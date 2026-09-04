import { z } from "zod";
import { questionInstanceSchema } from "@/core/content/schema";
import { ANSWER_OUTCOMES, PROFILE_TYPES, err, ok, type Result } from "@/core/shared";
import { effectSpecSchema, familyAssistConfigSchema, journeyCycleSchema, outcomeSchema, rulesConfigSchema, scenarioSchema } from "./config.schema";
import { CELL_TYPES, DUEL_STAGES, GAME_SCHEMA_VERSION, INSUFFICIENT_POLICIES, TRANSACTION_REASONS, TRANSFER_REASONS, type GameState } from "./types";

const choiceOptionSchema = z.object({ id: z.string(), outcomes: z.array(outcomeSchema) });

const resolvedCellSchema = z.union([
  z.object({ position: z.number().int(), type: z.enum(CELL_TYPES.filter((t) => t !== "heritage") as [string, ...string[]]) }),
  z.object({ position: z.number().int(), type: z.literal("heritage"), siteId: z.string() }),
]);

const purposeSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("standard") }),
  z.object({ kind: z.literal("halt") }),
  z.object({ kind: z.literal("heritage_visit"), siteId: z.string(), ownerId: z.string() }),
]);

const duelSchema = z.object({
  challengerId: z.string(),
  opponentId: z.string(),
  categoryId: z.string().nullable(),
  challengerRequestId: z.string(),
  opponentRequestId: z.string(),
  challengerServed: questionInstanceSchema.optional(),
  opponentServed: questionInstanceSchema.optional(),
  challengerOutcome: z.enum(ANSWER_OUTCOMES).optional(),
  opponentOutcome: z.enum(ANSWER_OUTCOMES).optional(),
  stage: z.enum(DUEL_STAGES),
});

/** Forme sérialisée de l'état — version 4 (v3 + Duel, Halte, visites, transferts, effets étendus). */
export const gameStateSchemaV4 = z.object({
  schemaVersion: z.literal(GAME_SCHEMA_VERSION),
  gameId: z.string(),
  config: z.object({
    board: z.object({ id: z.string(), version: z.number().int(), cellCount: z.number().int(), startPosition: z.number().int(), cells: z.array(resolvedCellSchema) }),
    sites: z.record(z.string(), z.object({ id: z.string(), price: z.number().int(), heritageValue: z.number().int() })),
    scenarios: z.array(scenarioSchema),
    rules: rulesConfigSchema,
    journey: journeyCycleSchema,
    familyAssist: familyAssistConfigSchema,
    scenarioOffset: z.number().int().nonnegative(),
  }),
  players: z.array(
    z.object({
      id: z.string(),
      displayName: z.string(),
      profileType: z.enum(PROFILE_TYPES),
      seat: z.number().int(),
      position: z.number().int(),
      money: z.number().int(),
      turnsPlayed: z.number().int(),
      journeysTaken: z.number().int(),
      halted: z.boolean(),
      solidarityActions: z.number().int().nonnegative(),
      solidarityGiven: z.number().int().nonnegative(),
      lastDuelOpponentId: z.string().optional(),
    }),
  ),
  activePlayerIndex: z.number().int(),
  turnNumber: z.number().int(),
  phase: z.discriminatedUnion("kind", [
    z.object({ kind: z.literal("awaiting_journey") }),
    z.object({ kind: z.literal("awaiting_answer"), requestId: z.string(), position: z.number().int(), purpose: purposeSchema, queue: z.array(outcomeSchema), served: questionInstanceSchema.optional() }),
    z.object({ kind: z.literal("awaiting_purchase"), siteId: z.string(), price: z.number().int(), queue: z.array(outcomeSchema) }),
    z.object({ kind: z.literal("awaiting_choice"), choiceId: z.string(), options: z.array(choiceOptionSchema), queue: z.array(outcomeSchema) }),
    z.object({ kind: z.literal("awaiting_duel_opponent"), candidates: z.array(z.string()), queue: z.array(outcomeSchema) }),
    z.object({ kind: z.literal("awaiting_duel"), duel: duelSchema, queue: z.array(outcomeSchema) }),
    z.object({ kind: z.literal("awaiting_recipient"), amount: z.number().int(), reason: z.enum(TRANSFER_REASONS), insufficient: z.enum(INSUFFICIENT_POLICIES), candidates: z.array(z.string()), queue: z.array(outcomeSchema) }),
    z.object({ kind: z.literal("finished") }),
  ]),
  ledger: z.array(
    z.object({ id: z.number().int(), turnNumber: z.number().int(), playerId: z.string(), amount: z.number().int(), reason: z.enum(TRANSACTION_REASONS), balanceAfter: z.number().int(), ref: z.string().optional() }),
  ),
  holdings: z.array(z.object({ siteId: z.string(), ownerId: z.string(), price: z.number().int(), heritageValue: z.number().int(), acquiredTurn: z.number().int() })),
  effects: z.array(z.object({ id: z.string(), playerId: z.string(), spec: effectSpecSchema, queuedAtTurn: z.number().int(), expiresAtTurn: z.number().int().optional() })),
  cellVisits: z.record(z.string(), z.number().int().nonnegative()),
  clock: z.object({ activePlaySeconds: z.number().nonnegative(), timeTargetReached: z.boolean() }),
  endRequested: z.boolean(),
  counters: z.object({ transaction: z.number().int(), request: z.number().int(), effect: z.number().int(), transfer: z.number().int() }),
  status: z.enum(["in_progress", "finished"]),
  ranking: z.array(z.object({ rank: z.number().int(), playerId: z.string(), score: z.number(), money: z.number().int(), heritageValue: z.number().int() })).optional(),
});

export type SerializationError =
  | { readonly code: "INVALID_JSON"; readonly message: string }
  | { readonly code: "UNSUPPORTED_VERSION"; readonly version: unknown }
  | { readonly code: "INVALID_STATE"; readonly issues: readonly string[] };

type Rec = Record<string, unknown>;
const asRec = (v: unknown): Rec => (typeof v === "object" && v !== null ? (v as Rec) : {});

/** Migrations n → n+1. Chaque changement de forme de `GameState` en ajoute une, testée sur des fixtures. */
const MIGRATIONS: Readonly<Record<number, (data: Rec) => Rec>> = {
  // v2 → v3 : la phase `awaiting_answer` gagne un champ optionnel `served` ; une partie v2 en attente de réponse reprend sans question figée (l'interface la résout à nouveau).
  2: (data) => ({ ...data, schemaVersion: 3 }),
  // v3 → v4 : Halte, solidarité, décalage de scénarios, règles Duel / visite (montants nuls : aucune économie inventée), effets datés, motif des questions.
  3: (data) => {
    const config = asRec(data["config"]);
    const rules = asRec(config["rules"]);
    const phase = asRec(data["phase"]);
    const counters = asRec(data["counters"]);
    return {
      ...data,
      schemaVersion: 4,
      config: {
        ...config,
        scenarioOffset: 0,
        rules: {
          ...rules,
          duel: rules["duel"] ?? { winBonus: 0, drawBonus: 0, loseBonus: 0 },
          heritageVisit: rules["heritageVisit"] ?? { contribution: { correct: 0, partial: 0, incorrect: 0 }, insufficient: "cap_to_balance" },
        },
      },
      players: (Array.isArray(data["players"]) ? data["players"] : []).map((p) => ({ halted: false, solidarityActions: 0, solidarityGiven: 0, ...asRec(p) })),
      effects: (Array.isArray(data["effects"]) ? data["effects"] : []).map((e) => ({ queuedAtTurn: 0, ...asRec(e) })),
      phase: phase["kind"] === "awaiting_answer" ? { purpose: { kind: "standard" }, ...phase } : phase,
      counters: { transfer: 0, ...counters },
    };
  },
};

export function serializeGameState(state: GameState): string {
  return JSON.stringify(state);
}

export function deserializeGameState(json: string): Result<GameState, SerializationError> {
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch (e) {
    return err({ code: "INVALID_JSON", message: e instanceof Error ? e.message : String(e) });
  }
  if (typeof data !== "object" || data === null) return err({ code: "INVALID_STATE", issues: ["objet attendu"] });

  let record = data as Rec;
  let version = record["schemaVersion"];
  while (typeof version === "number" && version < GAME_SCHEMA_VERSION) {
    const migrate = MIGRATIONS[version];
    if (!migrate) return err({ code: "UNSUPPORTED_VERSION", version });
    record = migrate(record);
    version = record["schemaVersion"];
  }
  if (version !== GAME_SCHEMA_VERSION) return err({ code: "UNSUPPORTED_VERSION", version });

  const parsed = gameStateSchemaV4.safeParse(record);
  if (!parsed.success) return err({ code: "INVALID_STATE", issues: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`) });
  return ok(parsed.data as unknown as GameState);
}
