/**
 * Learning Engine Kounouzi — TypeScript pur, déterministe, horloge injectée.
 * Mémoire pédagogique générique par joueur (enfant ou adulte), sélection sans
 * hasard, révision espacée simplifiée, niveau par catégorie à évolution lente.
 * Aucune donnée économique n'entre ici : l'équilibrage familial ne peut rien y changer.
 */
export * from "./types";
export { learningConfigSchema, type LearningConfig } from "./config";
export { applyAttempt, categoryProgressOf, initialCategoryProgress, outcomeWeight } from "./update";
export { selectQuestion, rankSlots, compareScored, targetLevel, type SelectionInput, type SelectionResult, type ScoredSlot } from "./select";
export { summarizeMemory, type LearningSummary, type CategoryStats } from "./stats";
export { serializeMemory, deserializeMemory, learningMemorySchemaV1, type LearningSerializationError } from "./serialization";
export { addDays, daysBetween, isDue, parseIso } from "./time";
