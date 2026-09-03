import { z } from "zod";
import {
  ADULT_INITIAL_LEVELS,
  ANSWER_OUTCOMES,
  AUDIENCE_SCOPES,
  EXPLANATION_MASTERIES,
  LOCALES,
  PROFILE_TYPES,
  VALIDATION_MODES,
} from "@/core/shared";
import type {
  AdultInitialLevel,
  AnswerOutcome,
  AudienceScope,
  ExplanationMastery,
  Locale,
  ProfileType,
  ValidationMode,
} from "@/core/shared";

/**
 * Schémas des énumérations partagées. Ils sont dérivés des constantes du
 * noyau : ajouter une valeur au noyau met automatiquement le schéma à jour,
 * et les assertions de type ci-dessous garantissent la parité dans l'autre
 * sens.
 */
export const localeSchema = z.enum(LOCALES);
export const profileTypeSchema = z.enum(PROFILE_TYPES);
export const adultInitialLevelSchema = z.enum(ADULT_INITIAL_LEVELS);
export const audienceScopeSchema = z.enum(AUDIENCE_SCOPES);
export const validationModeSchema = z.enum(VALIDATION_MODES);
export const answerOutcomeSchema = z.enum(ANSWER_OUTCOMES);
export const explanationMasterySchema = z.enum(EXPLANATION_MASTERIES);

type Equals<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
type Assert<T extends true> = T;

/** Parité type ⇄ schéma : échoue à la compilation en cas de divergence. */
export type SharedSchemaParity = [
  Assert<Equals<z.infer<typeof localeSchema>, Locale>>,
  Assert<Equals<z.infer<typeof profileTypeSchema>, ProfileType>>,
  Assert<Equals<z.infer<typeof adultInitialLevelSchema>, AdultInitialLevel>>,
  Assert<Equals<z.infer<typeof audienceScopeSchema>, AudienceScope>>,
  Assert<Equals<z.infer<typeof validationModeSchema>, ValidationMode>>,
  Assert<Equals<z.infer<typeof answerOutcomeSchema>, AnswerOutcome>>,
  Assert<Equals<z.infer<typeof explanationMasterySchema>, ExplanationMastery>>,
];
