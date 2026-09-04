import { contentRegistry } from "@/config/content";
import { LEARNING_CONFIG } from "@/config/learning";
import type { ContentRegistry } from "@/core/content";
import type { GameState } from "@/core/game";
import type { PlayerLearningMemory } from "@/core/learning";
import type { PlayerId } from "@/core/shared";
import type { PlayerProfileDraft } from "@/data/ports";
import { resolveQuestion } from "@/experience/questionResolver";

/** Horloge de test fixe (le noyau ne lit jamais l'heure). */
export const T0 = "2026-03-01T10:00:00.000Z";

/** Résolution avec mémoire vide par défaut : ce que voit un joueur inconnu. */
export function resolveFor(state: GameState, profiles: readonly PlayerProfileDraft[], registry: ContentRegistry = contentRegistry(), memories: Readonly<Record<string, PlayerLearningMemory>> = {}, now = T0) {
  return resolveQuestion({ state, profiles, registry, memoryOf: (id: PlayerId) => memories[id], config: LEARNING_CONFIG, now });
}
