import { z } from "zod";
import { questionInstanceSchema } from "@/core/content/schema";
import { ANSWER_OUTCOMES, PROFILE_TYPES, err, ok, type Result } from "@/core/shared";
import { challengesConfigSchema, effectSpecSchema, familyAssistConfigSchema, journeyCycleSchema, outcomeSchema, rulesConfigSchema, scenarioSchema } from "./config.schema";
import { CELL_TYPES, CHALLENGE_STAGES, DUEL_STAGES, FUNDS, FUND_TRANSACTION_REASONS, GAME_SCHEMA_VERSION, INSUFFICIENT_POLICIES, NO_CHALLENGES, TRANSACTION_REASONS, TRANSFER_REASONS, type GameState } from "./types";

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

const challengeStateSchema = z.object({ challengeId: z.string(), playerId: z.string(), requestId: z.string(), stage: z.enum(CHALLENGE_STAGES), served: questionInstanceSchema.optional(), surahIds: z.array(z.string()).optional() });

/** Forme sérialisée de l'état — version 7 (v6 + caisses collectives, calendrier annuel de Zakat, case Don, règles trésor/don/zakat). */
export const gameStateSchemaV7 = z.object({
  schemaVersion: z.literal(GAME_SCHEMA_VERSION),
  gameId: z.string(),
  config: z.object({
    board: z.object({ id: z.string(), version: z.number().int(), cellCount: z.number().int(), startPosition: z.number().int(), cells: z.array(resolvedCellSchema) }),
    sites: z.record(z.string(), z.object({ id: z.string(), price: z.number().int(), heritageValue: z.number().int() })),
    scenarios: z.array(scenarioSchema),
    rules: rulesConfigSchema,
    journey: journeyCycleSchema,
    familyAssist: familyAssistConfigSchema,
    challenges: challengesConfigSchema,
    scenarioOffset: z.number().int().nonnegative(),
  }),
  players: z.array(
    z.object({
      id: z.string(),
      displayName: z.string(),
      profileType: z.enum(PROFILE_TYPES),
      age: z.number().int().nonnegative().optional(),
      seat: z.number().int(),
      position: z.number().int(),
      money: z.number().int(),
      turnsPlayed: z.number().int(),
      journeysTaken: z.number().int(),
      halted: z.boolean(),
      solidarityActions: z.number().int().nonnegative(),
      solidarityGiven: z.number().int().nonnegative(),
      lastDuelOpponentId: z.string().optional(),
      masteredSurahs: z.array(z.string()),
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
    z.object({ kind: z.literal("awaiting_challenge"), challenge: challengeStateSchema, queue: z.array(outcomeSchema) }),
    z.object({ kind: z.literal("awaiting_recipient"), amount: z.number().int(), reason: z.enum(TRANSFER_REASONS), insufficient: z.enum(INSUFFICIENT_POLICIES), candidates: z.array(z.string()), queue: z.array(outcomeSchema) }),
    z.object({ kind: z.literal("awaiting_donation"), amounts: z.array(z.number().int().positive()), candidates: z.array(z.string()), queue: z.array(outcomeSchema) }),
    z.object({ kind: z.literal("finished") }),
  ]),
  ledger: z.array(
    z.object({ id: z.number().int(), turnNumber: z.number().int(), playerId: z.string(), amount: z.number().int(), reason: z.enum(TRANSACTION_REASONS), balanceAfter: z.number().int(), ref: z.string().optional() }),
  ),
  funds: z.object(Object.fromEntries(FUNDS.map((f) => [f, z.number().int().nonnegative()])) as Record<(typeof FUNDS)[number], z.ZodNumber>),
  fundLedger: z.array(z.object({ id: z.number().int(), turnNumber: z.number().int(), fund: z.enum(FUNDS), fromPlayerId: z.string(), amount: z.number().int(), reason: z.enum(FUND_TRANSACTION_REASONS), balanceAfter: z.number().int(), ref: z.string() })),
  calendar: z.object({ year: z.number().int().min(1), roundsInYear: z.number().int().nonnegative() }),
  holdings: z.array(z.object({ siteId: z.string(), ownerId: z.string(), price: z.number().int(), heritageValue: z.number().int(), acquiredTurn: z.number().int() })),
  effects: z.array(z.object({ id: z.string(), playerId: z.string(), spec: effectSpecSchema, queuedAtTurn: z.number().int(), expiresAtTurn: z.number().int().optional() })),
  cellVisits: z.record(z.string(), z.number().int().nonnegative()),
  challengeServed: z.record(z.string(), z.record(z.string(), z.number().int().nonnegative())),
  recitationServed: z.record(z.string(), z.record(z.string(), z.number().int().nonnegative())),
  clock: z.object({ activePlaySeconds: z.number().nonnegative(), timeTargetReached: z.boolean() }),
  endRequested: z.boolean(),
  counters: z.object({ transaction: z.number().int(), request: z.number().int(), effect: z.number().int(), transfer: z.number().int(), challenge: z.number().int() }),
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
  // v4 → v5 : Défis famille. Une partie v4 n'a pas de banque figée : aucune case Défi ne proposera de défi famille (le Duel continue).
  4: (data) => {
    const config = asRec(data["config"]);
    const counters = asRec(data["counters"]);
    return { ...data, schemaVersion: 5, config: { ...config, challenges: config["challenges"] ?? NO_CHALLENGES }, challengeServed: data["challengeServed"] ?? {}, counters: { challenge: 0, ...counters } };
  },
  // v5 → v6 : récitation. Aucune sourate de référence dans une partie v5 (les défis de récitation y restent inéligibles) ; aucune maîtrise connue.
  5: (data) => {
    const config = asRec(data["config"]);
    const challenges = asRec(config["challenges"]);
    return {
      ...data,
      schemaVersion: 6,
      config: { ...config, challenges: { recitations: [], ...challenges } },
      players: (Array.isArray(data["players"]) ? data["players"] : []).map((p) => ({ masteredSurahs: [], ...asRec(p) })),
      recitationServed: data["recitationServed"] ?? {},
    };
  },
  // v6 → v7 : caisses collectives, calendrier annuel, règles trésor / don / zakat. Une partie v6 garde son plateau (32 cases) et ses scénarios :
  // trésor à 0 (la case sert ses scénarios), aucun montant de don, Zakat désactivée — aucune économie inventée dans une partie en cours.
  6: (data) => {
    const config = asRec(data["config"]);
    const rules = asRec(config["rules"]);
    return {
      ...data,
      schemaVersion: 7,
      config: {
        ...config,
        rules: {
          ...rules,
          treasure: rules["treasure"] ?? { amount: 0 },
          donation: rules["donation"] ?? { amounts: [] },
          zakat: rules["zakat"] ?? { enabled: false, rate: 0.025, nisabKounouz: 0, cycleRounds: 1, eligibleAssetTypes: ["money"] },
        },
      },
      funds: data["funds"] ?? { masakin: 0 },
      fundLedger: data["fundLedger"] ?? [],
      calendar: data["calendar"] ?? { year: 1, roundsInYear: 0 },
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

  const parsed = gameStateSchemaV7.safeParse(record);
  if (!parsed.success) return err({ code: "INVALID_STATE", issues: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`) });
  return ok(parsed.data as unknown as GameState);
}
