import { z } from "zod";

/**
 * Réglages du Learning Engine : DONNÉES versionnées (`src/config/learning`),
 * jamais codées en dur. Tout coefficient ajustable après de vraies parties
 * vit ici.
 */
export const learningConfigSchema = z.object({
  id: z.string().min(1),
  version: z.number().int().positive(),
  /** Représentation interne provisoire d'un résultat (correct = 1, presque = 0.5, incorrect = 0). */
  outcomeWeights: z.object({ correct: z.number().min(0).max(1), partial: z.number().min(0).max(1), incorrect: z.number().min(0).max(1) }),
  mastery: z.object({
    /** Maîtrise supposée d'une notion jamais rencontrée (0..1) : une seule bonne réponse ne « maîtrise » pas une notion. */
    prior: z.number().min(0).max(1),
    /** Vitesse d'oubli de la moyenne mobile (0..1). */
    alpha: z.number().gt(0).lte(1),
    masteredThreshold: z.number().min(0).max(1),
    weakThreshold: z.number().min(0).max(1),
  }),
  level: z.object({
    min: z.number().int().min(1),
    max: z.number().int().max(5),
    step: z.number().gt(0),
    /** Essais informatifs minimaux avant tout ajustement de niveau (jamais +1 sur une seule bonne réponse). */
    minAttempts: z.number().int().positive(),
    windowSize: z.number().int().positive(),
    upThreshold: z.number().min(0).max(1),
    downThreshold: z.number().min(0).max(1),
    /** Un essai n'informe le niveau de la catégorie que si sa difficulté est à cette distance du niveau estimé. */
    informativeDistance: z.number().min(0),
  }),
  spacing: z.object({
    /** Intervalle (jours) avant révision, par boîte ; la dernière valeur borne la boîte maximale. */
    intervalsDays: z.array(z.number().min(0)).min(1),
    /** Une réponse « presque » conserve la boîte (sinon elle recule d'une). */
    partialKeepsBox: z.boolean(),
  }),
  antiRepetition: z.object({
    /** Fenêtre (nombre d'essais récents) pendant laquelle une même formulation est pénalisée. */
    questionCooldownAttempts: z.number().int().min(0),
    /** Idem pour une même notion non due. */
    nodeCooldownAttempts: z.number().int().min(0),
    /** Idem pour la catégorie des derniers essais (alternance). */
    categoryCooldownAttempts: z.number().int().min(0),
  }),
  selectionWeights: z.object({
    due: z.number().min(0),
    overdueDayBonus: z.number().min(0),
    overdueDayCap: z.number().min(0),
    weakness: z.number().min(0),
    distance: z.number().min(0),
    rarelySeen: z.number().min(0),
    novelty: z.number().min(0),
    repeatQuestion: z.number().min(0),
    repeatNode: z.number().min(0),
    sameCategory: z.number().min(0),
    mastered: z.number().min(0),
  }),
});

export type LearningConfig = z.infer<typeof learningConfigSchema>;
