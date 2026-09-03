import { z } from "zod";
import { PROFILE_TYPES, err, ok, type Result } from "@/core/shared";
import { effectSpecSchema, outcomeSchema, rulesConfigSchema, scenarioSchema } from "./config.schema";
import { CELL_TYPES, GAME_SCHEMA_VERSION, TRANSACTION_REASONS, type GameState } from "./types";

const choiceOptionSchema = z.object({ id: z.string(), outcomes: z.array(outcomeSchema) });

const resolvedCellSchema = z.union([
  z.object({ position: z.number().int(), type: z.enum(CELL_TYPES.filter((t) => t !== "heritage") as [string, ...string[]]) }),
  z.object({ position: z.number().int(), type: z.literal("heritage"), siteId: z.string() }),
]);

/** Forme sérialisée de l'état — version 1. */
export const gameStateSchemaV1 = z.object({
  schemaVersion: z.literal(GAME_SCHEMA_VERSION),
  gameId: z.string(),
  config: z.object({
    board: z.object({ id: z.string(), version: z.number().int(), cellCount: z.number().int(), startPosition: z.number().int(), cells: z.array(resolvedCellSchema) }),
    sites: z.record(z.string(), z.object({ id: z.string(), price: z.number().int(), heritageValue: z.number().int() })),
    scenarios: z.array(scenarioSchema),
    rules: rulesConfigSchema,
  }),
  rng: z.object({ seed: z.number().int(), state: z.number().int(), calls: z.number().int() }),
  players: z.array(
    z.object({
      id: z.string(),
      displayName: z.string(),
      profileType: z.enum(PROFILE_TYPES),
      seat: z.number().int(),
      position: z.number().int(),
      money: z.number().int(),
      turnsPlayed: z.number().int(),
    }),
  ),
  activePlayerIndex: z.number().int(),
  turnNumber: z.number().int(),
  phase: z.discriminatedUnion("kind", [
    z.object({ kind: z.literal("awaiting_spin") }),
    z.object({ kind: z.literal("awaiting_answer"), requestId: z.string(), position: z.number().int(), queue: z.array(outcomeSchema) }),
    z.object({ kind: z.literal("awaiting_purchase"), siteId: z.string(), price: z.number().int(), queue: z.array(outcomeSchema) }),
    z.object({ kind: z.literal("awaiting_choice"), choiceId: z.string(), options: z.array(choiceOptionSchema), queue: z.array(outcomeSchema) }),
    z.object({ kind: z.literal("finished") }),
  ]),
  ledger: z.array(
    z.object({
      id: z.number().int(),
      turnNumber: z.number().int(),
      playerId: z.string(),
      amount: z.number().int(),
      reason: z.enum(TRANSACTION_REASONS),
      balanceAfter: z.number().int(),
      ref: z.string().optional(),
    }),
  ),
  holdings: z.array(z.object({ siteId: z.string(), ownerId: z.string(), price: z.number().int(), heritageValue: z.number().int(), acquiredTurn: z.number().int() })),
  effects: z.array(z.object({ id: z.string(), playerId: z.string(), spec: effectSpecSchema })),
  counters: z.object({ transaction: z.number().int(), request: z.number().int(), effect: z.number().int() }),
  status: z.enum(["in_progress", "finished"]),
  ranking: z
    .array(z.object({ rank: z.number().int(), playerId: z.string(), score: z.number(), money: z.number().int(), heritageValue: z.number().int() }))
    .optional(),
});

export type SerializationError =
  | { readonly code: "INVALID_JSON"; readonly message: string }
  | { readonly code: "UNSUPPORTED_VERSION"; readonly version: unknown }
  | { readonly code: "INVALID_STATE"; readonly issues: readonly string[] };

/**
 * Migrations : de la version n vers n+1. Vide tant qu'une seule version existe ;
 * chaque changement de forme de `GameState` en ajoute une, testée sur des
 * parties réelles figées en fixtures.
 */
const MIGRATIONS: Readonly<Record<number, (data: Record<string, unknown>) => Record<string, unknown>>> = {};

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

  let record = data as Record<string, unknown>;
  let version = record["schemaVersion"];
  while (typeof version === "number" && version < GAME_SCHEMA_VERSION) {
    const migrate = MIGRATIONS[version];
    if (!migrate) return err({ code: "UNSUPPORTED_VERSION", version });
    record = migrate(record);
    version = record["schemaVersion"];
  }
  if (version !== GAME_SCHEMA_VERSION) return err({ code: "UNSUPPORTED_VERSION", version });

  const parsed = gameStateSchemaV1.safeParse(record);
  if (!parsed.success) return err({ code: "INVALID_STATE", issues: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`) });
  // Les identifiants nominaux (PlayerId, GameId) sont des chaînes à l'exécution.
  return ok(parsed.data as unknown as GameState);
}
