/**
 * Paliers de qualité — la liste vit ici, à l'écart du reste, parce que deux
 * modules en ont besoin et qu'ils ne doivent pas s'importer l'un l'autre : la
 * configuration les utilise pour construire son schéma, et `@/ui/scene` pour
 * choisir un palier. Un fichier sans dépendance coupe le cycle.
 */
export const QUALITY_TIERS = ["low", "medium", "high"] as const;
export type QualityTier = (typeof QUALITY_TIERS)[number];
