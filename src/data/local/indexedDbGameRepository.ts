import { createStore, del, entries, get, set } from "idb-keyval";
import type { GameId } from "@/core/shared";
import type { GameRepository, SavedGame } from "@/data/ports";
import { toSummaries } from "./memoryGameRepository";

const DB_NAME = "kounouzi";
const STORE_NAME = "games";
const META_STORE = "meta";
const ORDINAL_KEY = "familyGameOrdinal";

/**
 * IndexedDB — source de vérité locale pendant la partie. Une entrée par
 * partie, écrasée à chaque sauvegarde. Aucune donnée n'est envoyée ailleurs.
 */
export function createIndexedDbGameRepository(): GameRepository {
  const store = createStore(DB_NAME, STORE_NAME);
  const meta = createStore(`${DB_NAME}-meta`, META_STORE);
  return {
    nextFamilyGameOrdinal: async () => {
      const current = (await get<number>(ORDINAL_KEY, meta)) ?? 0;
      const next = current + 1;
      await set(ORDINAL_KEY, next, meta);
      return next;
    },
    save: (game) => set(game.gameId, game, store),
    load: (gameId) => get<SavedGame>(gameId, store),
    list: async () => toSummaries((await entries<GameId, SavedGame>(store)).map(([, game]) => game)),
    remove: (gameId) => del(gameId, store),
  };
}
