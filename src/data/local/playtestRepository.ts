import { createStore, del, get, set } from "idb-keyval";
import type { GameId } from "@/core/shared";
import type { PlaytestRepository } from "@/data/ports/playtestRepository";
import type { PlaytestLog } from "@/experience/playtest/types";

export function createMemoryPlaytestRepository(): PlaytestRepository {
  const logs = new Map<GameId, PlaytestLog>();
  return {
    load: async (gameId) => logs.get(gameId),
    save: async (log) => {
      logs.set(log.gameId, log);
    },
    remove: async (gameId) => {
      logs.delete(gameId);
    },
  };
}

/** IndexedDB locale : un journal par partie. Aucune donnée ne quitte l'appareil. */
export function createIndexedDbPlaytestRepository(): PlaytestRepository {
  const store = createStore("kounouzi-playtest", "logs");
  return {
    load: (gameId) => get<PlaytestLog>(gameId, store),
    save: (log) => set(log.gameId, log, store),
    remove: (gameId) => del(gameId, store),
  };
}
