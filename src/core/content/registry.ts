import { isAudienceAllowed, type ProfileType } from "@/core/shared";
import type { CategoryDefinition, CategoryId, ContentProvider, KnowledgeSlot, QuestionInstance, QuestionRequest } from "./types";

/** Registre des fournisseurs : une seule porte d'accès au contenu jouable. */
export interface ContentRegistry {
  readonly categories: readonly CategoryDefinition[];
  /** Catégories actives pour lesquelles au moins un fournisseur peut répondre. */
  availableCategories(profileType: ProfileType): readonly CategoryId[];
  resolve(request: QuestionRequest): QuestionInstance | null;
  /**
   * Créneaux jouables pour ce profil : catégories actives, fournisseur du
   * bon régime, audience respectée (vérifiée ici encore, quel que soit le
   * fournisseur), identifiants uniques, ordre stable.
   */
  slots(profileType: ProfileType): readonly KnowledgeSlot[];
}

export function createContentRegistry(categories: readonly CategoryDefinition[], providers: readonly ContentProvider[]): ContentRegistry {
  const active = categories.filter((c) => c.active);
  return {
    categories,
    availableCategories: (profileType) =>
      active.filter((c) => providers.some((p) => p.mode === c.generationMode && p.supports(c.id) && p.resolve({ categoryId: c.id, difficulty: 3, profileType, variation: 0 }) !== null)).map((c) => c.id),
    resolve: (request) => {
      const category = active.find((c) => c.id === request.categoryId);
      if (!category) return null;
      for (const p of providers) {
        if (p.mode !== category.generationMode || !p.supports(category.id)) continue;
        const q = p.resolve(request);
        if (q && q.explanation.fr.trim() !== "" && q.explanation.ar.trim() !== "") return q;
      }
      return null;
    },
    slots: (profileType) => {
      const seen = new Set<string>();
      const out: KnowledgeSlot[] = [];
      for (const category of active) {
        for (const p of providers) {
          if (p.mode !== category.generationMode || !p.supports(category.id)) continue;
          for (const slot of p.slots(profileType)) {
            if (slot.categoryId !== category.id || !isAudienceAllowed(slot.audienceScope, profileType) || seen.has(slot.slotId)) continue;
            seen.add(slot.slotId);
            out.push(slot);
          }
        }
      }
      return out;
    },
  };
}
