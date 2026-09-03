import { MATHS_CATEGORY_ID, generateMaths } from "@/core/content/generators/maths";
import type { ContentProvider, QuestionInstance, QuestionRequest } from "@/core/content/types";

/** Mathématiques : volume illimité, stockage nul, explications FR + AR produites par le générateur. */
export function createAlgorithmicProvider(): ContentProvider {
  return {
    mode: "algorithmic",
    supports: (categoryId) => categoryId === MATHS_CATEGORY_ID,
    resolve: (request: QuestionRequest): QuestionInstance | null => (request.categoryId === MATHS_CATEGORY_ID ? generateMaths(request) : null),
  };
}
