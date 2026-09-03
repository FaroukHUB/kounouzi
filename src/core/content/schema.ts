import { z } from "zod";
import { AUDIENCE_SCOPES } from "@/core/shared";
import type { QuestionInstance, QuestionRef } from "@/core/content/types";

export const bilingualSchema = z.object({ fr: z.string(), ar: z.string() });
export const sourceRefSchema = z.object({ title: z.string().min(1), url: z.string().url().optional(), author: z.string().optional(), retrievedAt: z.string().optional() });

export const questionRefSchema: z.ZodType<QuestionRef> = z.discriminatedUnion("origin", [
  z.object({ origin: z.literal("curated"), questionId: z.string().min(1), contentVersion: z.number().int().positive() }),
  z.object({
    origin: z.literal("algorithmic"),
    generatorId: z.string().min(1),
    generatorVersion: z.number().int().positive(),
    knowledgeNodeId: z.string().min(1),
    difficulty: z.number().int().min(1).max(5),
    params: z.record(z.string(), z.union([z.number(), z.string()])),
  }),
  z.object({ origin: z.literal("factual"), factId: z.string().min(1), factVersion: z.number().int().positive(), templateId: z.string().min(1), templateVersion: z.number().int().positive() }),
]);

export const questionInstanceSchema: z.ZodType<QuestionInstance> = z.object({
  ref: questionRefSchema,
  categoryId: z.string().min(1),
  knowledgeNodeId: z.string().min(1),
  difficulty: z.number().int().min(1).max(5),
  audienceScope: z.enum(AUDIENCE_SCOPES),
  prompt: bilingualSchema,
  answer: bilingualSchema,
  explanation: bilingualSchema,
  sources: z.array(sourceRefSchema),
  review: z.object({ ar: z.enum(["provisional", "reviewed"]) }),
});
