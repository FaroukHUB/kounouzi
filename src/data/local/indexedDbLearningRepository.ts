import { createStore, del, get, set, values } from "idb-keyval";
import { deserializeMemory, serializeMemory } from "@/core/learning";
import type { PlayerId } from "@/core/shared";
import type { LearningRepository, PlayerProfileRepository, SavedPlayerProfile } from "@/data/ports";
import { sortProfiles } from "./memoryLearningRepository";

const DB_NAME = "kounouzi-learning";

/** Mémoire pédagogique locale : une entrée par joueur, sérialisée et versionnée. Rien n'est envoyé ailleurs. */
export function createIndexedDbLearningRepository(): LearningRepository {
  const store = createStore(DB_NAME, "memories");
  return {
    load: async (playerId) => {
      const raw = await get<string>(playerId, store);
      if (raw === undefined) return undefined;
      const result = deserializeMemory(raw);
      if (!result.ok) throw new Error(`mémoire pédagogique illisible pour ${playerId} : ${JSON.stringify(result.error)}`);
      return result.value;
    },
    save: (memory) => set(memory.playerId, serializeMemory(memory), store),
    remove: (playerId) => del(playerId, store),
  };
}

/** Profils joueurs persistants (identifiants stables d'une partie à l'autre). */
export function createIndexedDbPlayerProfileRepository(): PlayerProfileRepository {
  const store = createStore(`${DB_NAME}-players`, "profiles");
  return {
    list: async () => sortProfiles(await values<SavedPlayerProfile>(store)),
    save: (profile) => set(profile.id, profile, store),
    remove: (playerId: PlayerId) => del(playerId, store),
  };
}
