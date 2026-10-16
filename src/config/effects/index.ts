import { z } from "zod";
import effectsJson from "./effects.v1.json";

/**
 * RÉGLAGES DES EFFETS — des données, pas du code.
 *
 * Nombre de pièces, dispersion, durées : tout ce qui se juge à l'œil se règle
 * ici, sans toucher au code.
 */
export const effectsConfigSchema = z.object({
  version: z.number().int().positive(),
  coins: z.object({
    minCoins: z.number().int().min(1).max(50),
    maxCoins: z.number().int().min(1).max(60),
    /** Montant à partir duquel on atteint le nombre maximal de pièces. */
    amountForMax: z.number().positive(),
    staggerMs: z.number().min(0).max(1000),
    travelMs: z.number().min(0).max(5000),
    /** Hauteur de l'arc, en fraction de la distance : fixe, elle paraît absurde sur un téléphone. */
    arcShare: z.number().min(0).max(2),
    /** Hauteur maximale de l'arc, en pixels : un lancer, pas une fusée. */
    maxArc: z.number().min(0).max(600),
    /** Hauteur minimale du CENTRE d'une pièce : elle doit laisser passer son rayon. */
    minApexY: z.number().min(0).max(400),
    /** Dispersion autour du repère, en fraction de sa taille. */
    spread: z.number().min(0).max(1),
    /** Diamètre d'une pièce, en pixels. */
    size: z.number().min(6).max(120),
  }),
});

export type EffectsConfig = z.infer<typeof effectsConfigSchema>;

const parsed: EffectsConfig = effectsConfigSchema.parse(effectsJson);
if (parsed.coins.minCoins > parsed.coins.maxCoins) throw new RangeError("effets : minCoins doit rester sous maxCoins");

export const EFFECTS: EffectsConfig = parsed;
