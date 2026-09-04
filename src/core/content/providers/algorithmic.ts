import { MATHS_CATEGORY_ID, generateMaths, mathsSlots } from "@/core/content/generators/maths";
import type { ContentProvider, QuestionInstance, QuestionRequest } from "@/core/content/types";

/** Mathématiques : volume illimité, stockage nul, explications FR + AR produites par le générateur. */
export function createAlgorithmicProvider(): ContentProvider {
  const slots = mathsSlots();
  return {
    mode: "algorithmic",
    supports: (categoryId) => categoryId === MATHS_CATEGORY_ID,
    resolve: (request: QuestionRequest): QuestionInstance | null => (request.categoryId === MATHS_CATEGORY_ID ? generateMaths(request) : null),
    // Audience `all` : les mathématiques conviennent à tout profil ; la frontière est revérifiée par le registre et le Learning Engine.
    slots: () => slots,
  };
}
