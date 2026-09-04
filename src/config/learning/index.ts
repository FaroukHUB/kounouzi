import { learningConfigSchema, type LearnerContext, type LearningConfig } from "@/core/learning";
import type { AdultInitialLevel, PlayerId, ProfileType } from "@/core/shared";
import { difficultyBandFor } from "@/config/content";
import learningJson from "./learning.v1.json";

/** Réglages du Learning Engine, validés au chargement. */
export const LEARNING_CONFIG: LearningConfig = learningConfigSchema.parse(learningJson);

export interface SeedProfile {
  readonly profileType: ProfileType;
  /** Âge (années) d'un enfant ; la classe scolaire n'intervient plus (Phase 5.4). */
  readonly age?: number | undefined;
  readonly initialLevel?: AdultInitialLevel | undefined;
}

/** Âge d'un enfant à une date donnée (année civile), depuis son année de naissance ; `undefined` pour un adulte. */
export function ageOf(profile: { readonly profileType: ProfileType; readonly child?: { readonly birthYear: number } | undefined }, now: string): number | undefined {
  if (profile.profileType !== "child" || !profile.child) return undefined;
  return Math.max(0, new Date(now).getFullYear() - profile.child.birthYear);
}

/**
 * Niveau d'AMORÇAGE d'un joueur : milieu de la bande de son âge (enfant) ou
 * de son niveau initial (adulte, défaut `standard`). Ce n'est qu'un point de
 * départ commun à toutes les catégories ; le niveau réel diverge ensuite par
 * catégorie et n'est jamais plafonné par cette valeur.
 */
export function seedLevelFor(profile: SeedProfile): number {
  const band = difficultyBandFor(profile);
  return Math.round(((band.min + band.max) / 2) * 2) / 2;
}

export function learnerContextFor(profile: SeedProfile & { readonly id: PlayerId }): LearnerContext {
  return { playerId: profile.id, profileType: profile.profileType, seedLevel: seedLevelFor(profile) };
}
