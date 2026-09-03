import type { ContentRegistry, QuestionInstance } from "@/core/content";
import { midDifficulty, rotateCategory } from "@/core/content";
import type { GameState } from "@/core/game";
import type { PlayerProfileDraft } from "@/data/ports";
import { difficultyBandFor } from "@/config/content";

/**
 * Traduit une demande du moteur (`awaiting_answer`, requestId) en question
 * à distribuer. Le résultat est ensuite FIGÉ dans l'état par `ServeQuestion` :
 * la reprise ne dépend jamais d'une nouvelle résolution ni du contenu courant.
 * ⚠️ Sélection provisoire (rotation des catégories disponibles, milieu de la
 * bande du profil) : remplacée par le Learning Engine en Phase 5.
 */
export function resolveQuestion(state: GameState, profiles: readonly PlayerProfileDraft[], registry: ContentRegistry): QuestionInstance | null {
  if (state.phase.kind !== "awaiting_answer") return null;
  const player = state.players[state.activePlayerIndex];
  if (!player) return null;
  const profile = profiles.find((p) => p.id === player.id);
  const variation = Number(state.phase.requestId.replace(/^\D+/, "")) || 0;
  const available = registry.availableCategories(player.profileType);
  const categoryId = rotateCategory(available, variation);
  if (!categoryId) return null;
  const band = difficultyBandFor({ profileType: player.profileType, schoolGrade: profile?.child?.schoolGrade, initialLevel: profile?.adult?.initialLevel });
  return registry.resolve({ categoryId, difficulty: midDifficulty(band), profileType: player.profileType, variation: Math.floor(variation / Math.max(1, available.length)) });
}
