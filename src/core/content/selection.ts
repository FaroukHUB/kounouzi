import type { CategoryId } from "./types";

/**
 * ⚠️ SÉLECTION PROVISOIRE — Phase 4. Le Learning Engine (Phase 5) choisira
 * la meilleure question selon le joueur, la catégorie, le niveau réel, les
 * révisions et l'historique, avec un départage déterministe. En attendant :
 * rotation déterministe des catégories disponibles et milieu de la bande de
 * difficulté du profil. Aucun hasard.
 */
export function rotateCategory(available: readonly CategoryId[], variation: number): CategoryId | null {
  if (available.length === 0) return null;
  return available[variation % available.length] ?? null;
}

export interface DifficultyBand {
  readonly min: number;
  readonly max: number;
}

export function midDifficulty(band: DifficultyBand): number {
  return Math.round((band.min + band.max) / 2);
}
