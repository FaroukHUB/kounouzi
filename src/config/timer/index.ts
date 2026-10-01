import { z } from "zod";
import { PROFILE_TYPES, type ProfileType } from "@/core/shared";
import timerJson from "./question-timer.v1.json";

/**
 * CHRONOMÈTRE PAR QUESTION (données, jamais codé en dur).
 *
 * Les durées dépendent du type de profil de CELUI QUI RÉPOND : un enfant lit et
 * formule plus lentement qu'un adulte. `atZero` ne connaît qu'une valeur,
 * `signal` : le chronomètre s'arrête et l'affiche, la réponse reste possible.
 * Les autres règles imaginables — compter faux, retirer la récompense, passer
 * le tour — n'ont pas été décidées par l'auteur, donc elles n'existent pas ici
 * (règle du projet : rendre configurable plutôt qu'inventer).
 *
 * Le chronomètre vit dans l'interface : il n'émet aucune commande, n'entre pas
 * dans l'état de la partie et ne change donc rien au déterminisme du moteur.
 */
export const questionTimerSchema = z.object({
  version: z.number().int().positive(),
  enabled: z.boolean(),
  /** Secondes accordées, par type de profil du répondant. */
  seconds: z.record(z.enum(PROFILE_TYPES), z.number().int().min(5).max(600)),
  /** En dessous de ce seuil, le chronomètre alerte (couleur et mot). */
  warnAtSeconds: z.number().int().min(0).max(600),
  /** À zéro : « signal » seulement (voir ci-dessus). */
  atZero: z.literal("signal"),
});

export type QuestionTimerConfig = z.infer<typeof questionTimerSchema>;

export const QUESTION_TIMER: QuestionTimerConfig = questionTimerSchema.parse(timerJson);

/** Secondes accordées à ce répondant ; `null` quand le chronomètre est éteint. */
export function timerSecondsFor(profileType: ProfileType, config: QuestionTimerConfig = QUESTION_TIMER): number | null {
  if (!config.enabled) return null;
  return config.seconds[profileType] ?? null;
}
