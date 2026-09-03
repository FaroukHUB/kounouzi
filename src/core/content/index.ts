/**
 * Moteur de contenu Kounouzi — TypeScript pur, déterministe.
 * Trois régimes derrière un contrat unique : algorithmique (mathématiques),
 * factuel (géographie), curé (banque validée et sourcée).
 */
export * from "./types";
export { playabilityIssues, isPlayable } from "./guards";
export { createContentRegistry, type ContentRegistry } from "./registry";
export { createAlgorithmicProvider } from "./providers/algorithmic";
export { createFactualProvider, GEO_TEMPLATES, GEOGRAPHY_CATEGORY_ID, type GeoFact } from "./providers/factual";
export { createCuratedProvider } from "./providers/curated";
export { generateMaths, MATHS_CATEGORY_ID, addition, subtraction, multiplication, division } from "./generators/maths";
export { pickInRange, strideFor } from "./generators/sequence";
export { rotateCategory, midDifficulty, type DifficultyBand } from "./selection";
