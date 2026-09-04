import { deserializeMemory, serializeMemory, type PlayerLearningMemory } from "@/core/learning";
import type { PlayerId } from "@/core/shared";
import type { LearningRepository, PlayerProfileRepository, SavedPlayerProfile } from "@/data/ports";

/**
 * Implémentation en mémoire (tests, rendu serveur). Les mémoires passent par
 * la sérialisation : ce qui est relu est exactement ce qui serait relu depuis
 * un stockage réel.
 */
export function createMemoryLearningRepository(): LearningRepository & { readonly size: () => number } {
  const store = new Map<PlayerId, string>();
  return {
    load: async (playerId) => {
      const raw = store.get(playerId);
      if (raw === undefined) return undefined;
      const result = deserializeMemory(raw);
      if (!result.ok) throw new Error(`mémoire illisible : ${JSON.stringify(result.error)}`);
      return result.value;
    },
    save: async (memory: PlayerLearningMemory) => {
      store.set(memory.playerId, serializeMemory(memory));
    },
    remove: async (playerId) => {
      store.delete(playerId);
    },
    size: () => store.size,
  };
}

export function createMemoryPlayerProfileRepository(): PlayerProfileRepository {
  const profiles = new Map<PlayerId, SavedPlayerProfile>();
  return {
    list: async () => sortProfiles([...profiles.values()]),
    save: async (profile) => {
      profiles.set(profile.id, profile);
    },
    remove: async (playerId) => {
      profiles.delete(playerId);
    },
  };
}

export function sortProfiles(profiles: readonly SavedPlayerProfile[]): readonly SavedPlayerProfile[] {
  return [...profiles].sort((a, b) => (a.savedAt < b.savedAt ? 1 : a.savedAt > b.savedAt ? -1 : a.id < b.id ? -1 : 1));
}
