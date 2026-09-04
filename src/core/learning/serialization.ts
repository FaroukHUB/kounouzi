import { z } from "zod";
import { questionRefSchema } from "@/core/content/schema";
import { ANSWER_OUTCOMES, EXPLANATION_MASTERIES, VALIDATION_MODES, err, ok, type PlayerId, type Result } from "@/core/shared";
import { LEARNING_SCHEMA_VERSION, type PlayerLearningMemory } from "./types";

const knowledgeStateSchema = z.object({
  knowledgeNodeId: z.string().min(1),
  categoryId: z.string().min(1),
  mastery: z.number().min(0).max(1),
  attempts: z.number().int().min(0),
  successes: z.number().int().min(0),
  partials: z.number().int().min(0),
  failures: z.number().int().min(0),
  box: z.number().int().min(0),
  lastSeenAt: z.string().nullable(),
  nextDueAt: z.string().nullable(),
  lastDifficulty: z.number().nullable(),
});

const categoryProgressSchema = z.object({
  categoryId: z.string().min(1),
  estimatedLevel: z.number(),
  seedLevel: z.number(),
  attempts: z.number().int().min(0),
  successes: z.number().int().min(0),
  partials: z.number().int().min(0),
  failures: z.number().int().min(0),
  window: z.array(z.number()),
  lastAdjustedAt: z.string().nullable(),
});

/** Aucun champ économique n'existe dans un essai : le schéma est strict. */
const attemptSchema = z.strictObject({
  id: z.string().min(1),
  playerId: z.string().min(1),
  gameId: z.string().min(1),
  knowledgeNodeId: z.string().min(1),
  ref: questionRefSchema,
  categoryId: z.string().min(1),
  difficulty: z.number(),
  outcome: z.enum(ANSWER_OUTCOMES),
  validationMode: z.enum(VALIDATION_MODES),
  explanationKnown: z.enum(EXPLANATION_MASTERIES),
  rewardGranted: z.boolean(),
  answeredAt: z.string().min(1),
});

export const learningMemorySchemaV1 = z.object({
  schemaVersion: z.literal(LEARNING_SCHEMA_VERSION),
  playerId: z.string().min(1),
  knowledge: z.record(z.string(), knowledgeStateSchema),
  categories: z.record(z.string(), categoryProgressSchema),
  attempts: z.array(attemptSchema),
  updatedAt: z.string().nullable(),
});

export type LearningSerializationError = { readonly code: "INVALID_JSON" } | { readonly code: "UNSUPPORTED_VERSION"; readonly received: unknown } | { readonly code: "INVALID_MEMORY"; readonly issues: readonly string[] };

export function serializeMemory(memory: PlayerLearningMemory): string {
  return JSON.stringify(memory);
}

export function deserializeMemory(raw: string): Result<PlayerLearningMemory, LearningSerializationError> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return err({ code: "INVALID_JSON" });
  }
  const version = typeof parsed === "object" && parsed !== null && "schemaVersion" in parsed ? (parsed as { schemaVersion: unknown }).schemaVersion : undefined;
  if (version !== LEARNING_SCHEMA_VERSION) return err({ code: "UNSUPPORTED_VERSION", received: version });
  const result = learningMemorySchemaV1.safeParse(parsed);
  if (!result.success) return err({ code: "INVALID_MEMORY", issues: result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`) });
  const v = result.data;
  return ok({ ...v, playerId: v.playerId as PlayerId, attempts: v.attempts.map((a) => ({ ...a, playerId: a.playerId as PlayerId, gameId: a.gameId as PlayerLearningMemory["attempts"][number]["gameId"] })) });
}
