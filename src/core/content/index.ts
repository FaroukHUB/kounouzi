/**
 * Moteur de contenu Kounouzi — TypeScript pur, déterministe.
 * Trois régimes derrière un contrat unique : algorithmique (mathématiques),
 * factuel (géographie), curé (banque validée et sourcée).
 */
export * from "./types";
export { playabilityIssues, isPlayable } from "./guards";
export { createContentRegistry, type ContentRegistry } from "./registry";
export { createAlgorithmicProvider } from "./providers/algorithmic";
export { createFactualProvider, factPlayabilityIssues, FACT_STATUSES, GEO_TEMPLATES, GEO_TEMPLATE_VERSION, GEOGRAPHY_CATEGORY_ID, type FactStatus, type GeoFact, type FactualProviderOptions } from "./providers/factual";
export { createCuratedProvider } from "./providers/curated";
export { generateMaths, rebuildMaths, mathsSlots, MATHS_CATEGORY_ID, MATHS_GENERATOR_VERSION, MATHS_ARABIC_REVIEW, addition, subtraction, multiplication, division } from "./generators/maths";
export { questionRefKey } from "./types";
export { questionRefSchema, questionInstanceSchema } from "./schema";
export { pickInRange, strideFor } from "./generators/sequence";
