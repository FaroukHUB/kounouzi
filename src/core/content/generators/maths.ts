import type { KnowledgeSlot, QuestionInstance, QuestionRef, QuestionRequest } from "@/core/content/types";
import { MATHS_MODELS, mathsModelById, mathsModelsAt, type MathsModel, type MathsParams } from "./mathsModels";

export const MATHS_CATEGORY_ID = "maths";
/** v1 : anciennes opérations nues (4 × 5 = ?). v2 : les 30 modèles pédagogiques validés, situations contextualisées. */
export const MATHS_GENERATOR_VERSION = 2;
/** Les formulations arabes sont correctes mathématiquement mais linguistiquement PROVISOIRES jusqu'à relecture humaine. */
export const MATHS_ARABIC_REVIEW = "provisional" as const;

export { MATHS_MODELS, MATHS_BOUNDS, mathsModelById, mathsModelsAt, MATHS_MODEL_KINDS, type MathsModel, type MathsModelKind, type MathsParams, type MathsText } from "./mathsModels";

/** Identifiant de générateur d'un modèle : stable, versionné par `MATHS_GENERATOR_VERSION`. */
export const mathsGeneratorId = (modelId: string): string => `maths.${modelId}`;
const modelIdOf = (generatorId: string): string => (generatorId.startsWith("maths.") ? generatorId.slice("maths.".length) : "");

const clampDifficulty = (d: number) => Math.min(5, Math.max(1, Math.round(d)));

/** Difficulté réellement servie : celle demandée si des modèles existent, sinon la plus proche qui en a. */
function servedDifficulty(requested: number): number {
  const wanted = clampDifficulty(requested);
  if (mathsModelsAt(wanted).length > 0) return wanted;
  for (let step = 1; step <= 4; step += 1) {
    for (const candidate of [wanted - step, wanted + step]) {
      if (candidate >= 1 && candidate <= 5 && mathsModelsAt(candidate).length > 0) return candidate;
    }
  }
  return wanted;
}

function toInstance(model: MathsModel, params: MathsParams): QuestionInstance {
  const text = model.render(params);
  return {
    ref: { origin: "algorithmic", generatorId: mathsGeneratorId(model.id), generatorVersion: MATHS_GENERATOR_VERSION, knowledgeNodeId: model.knowledgeNodeId, difficulty: model.difficulty, params },
    categoryId: MATHS_CATEGORY_ID,
    knowledgeNodeId: model.knowledgeNodeId,
    difficulty: model.difficulty,
    // Audience `all` : ces situations conviennent à tout profil ; la difficulté et le Learning Engine font le reste.
    audienceScope: "all",
    prompt: text.prompt,
    answer: text.answer,
    explanation: text.explanation,
    sources: [],
    review: { ar: MATHS_ARABIC_REVIEW },
  };
}

/** Instancie un modèle pour une variation donnée (compteur déterministe, jamais un tirage). */
export function instantiateMathsModel(model: MathsModel, variation: number): QuestionInstance {
  const safe = Number.isInteger(variation) && variation >= 0 ? variation : 0;
  return toInstance(model, model.values(safe));
}

/**
 * Une question de mathématiques pour la difficulté demandée. Le Learning
 * Engine décide de la difficulté ; le générateur choisit ici un modèle de
 * cette difficulté et une variante numérique compatible. Aucun hasard : la
 * même demande donne toujours la même question.
 */
export function generateMaths(request: QuestionRequest): QuestionInstance {
  const difficulty = servedDifficulty(request.difficulty);
  const candidates = mathsModelsAt(difficulty);
  const safe = Number.isInteger(request.variation) && request.variation >= 0 ? request.variation : 0;
  const model = candidates[safe % candidates.length] ?? MATHS_MODELS[0]!;
  return instantiateMathsModel(model, Math.floor(safe / candidates.length));
}

/**
 * Créneaux de connaissance pour le Learning Engine : un modèle validé = un
 * créneau. Plusieurs modèles peuvent viser la même compétence
 * (`knowledgeNodeId`), ce qui permet de la travailler sous plusieurs formes.
 */
export function mathsSlots(): readonly KnowledgeSlot[] {
  return MATHS_MODELS.map((model) => ({
    slotId: `maths.model.${model.id}`,
    categoryId: MATHS_CATEGORY_ID,
    knowledgeNodeId: model.knowledgeNodeId,
    difficulty: model.difficulty,
    audienceScope: "all" as const,
    instantiate: (variation: number) => instantiateMathsModel(model, variation),
  }));
}

/** Reconstruit EXACTEMENT la question d'une référence algorithmique (identité, mémoire, vérification). */
export function rebuildMaths(ref: Extract<QuestionRef, { origin: "algorithmic" }>): QuestionInstance | null {
  if (ref.generatorVersion !== MATHS_GENERATOR_VERSION) return null;
  const model = mathsModelById(modelIdOf(ref.generatorId));
  if (!model) return null;
  const params: Record<string, number> = {};
  for (const [key, value] of Object.entries(ref.params)) {
    const n = typeof value === "number" ? value : Number(value);
    if (!Number.isFinite(n)) return null;
    params[key] = n;
  }
  return toInstance(model, params);
}
