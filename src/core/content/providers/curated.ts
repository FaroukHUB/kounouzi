import { isAudienceAllowed } from "@/core/shared";
import { isPlayable } from "@/core/content/guards";
import type { CategoryDefinition, ContentProvider, CuratedQuestion, KnowledgeSlot, QuestionInstance, QuestionRequest } from "@/core/content/types";

/**
 * Banque curée (religion, histoire, arabe, culture…). Seules les questions
 * qui passent la garde (`validated`, FR+AR, source si exigée) sont servies.
 * Une catégorie sans question jouable ne fournit rien : jamais remplie
 * artificiellement.
 */
export function createCuratedProvider(bank: readonly CuratedQuestion[], categories: readonly CategoryDefinition[]): ContentProvider {
  const byId = new Map(categories.map((c) => [c.id, c]));
  const playable = bank.filter((q) => isPlayable(q, byId.get(q.categoryId)));
  const curatedCategories = new Set(categories.filter((c) => c.generationMode === "curated").map((c) => c.id));
  const toInstance = (q: CuratedQuestion): QuestionInstance => ({
    ref: { origin: "curated", questionId: q.id, contentVersion: q.version },
    categoryId: q.categoryId,
    knowledgeNodeId: q.knowledgeNodeId,
    difficulty: q.difficulty,
    audienceScope: q.audienceScope,
    prompt: q.prompt,
    answer: q.answer,
    explanation: q.explanation,
    sources: q.sources,
    review: { ar: "reviewed" },
  });
  return {
    mode: "curated",
    supports: (categoryId) => curatedCategories.has(categoryId) && playable.some((q) => q.categoryId === categoryId),
    resolve: (request: QuestionRequest): QuestionInstance | null => {
      const inCategory = playable.filter((q) => q.categoryId === request.categoryId && isAudienceAllowed(q.audienceScope, request.profileType));
      if (inCategory.length === 0) return null;
      const near = inCategory.filter((q) => Math.abs(q.difficulty - request.difficulty) <= 1);
      const pool = near.length > 0 ? near : inCategory;
      const q = pool[request.variation % pool.length]!;
      return toInstance(q);
    },
    slots: (profileType): readonly KnowledgeSlot[] =>
      playable
        .filter((q) => isAudienceAllowed(q.audienceScope, profileType))
        .map((q) => ({
          slotId: `curated:${q.id}`,
          categoryId: q.categoryId,
          knowledgeNodeId: q.knowledgeNodeId,
          difficulty: q.difficulty,
          audienceScope: q.audienceScope,
          instantiate: () => toInstance(q),
        })),
  };
}
