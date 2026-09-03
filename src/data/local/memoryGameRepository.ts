import type { GameId } from "@/core/shared";
import type { GameRepository, GameSummary, SavedGame } from "@/data/ports";

/** Implémentation en mémoire : tests et environnements sans IndexedDB. */
export function createMemoryGameRepository(): GameRepository & { readonly size: () => number } {
  const games = new Map<GameId, SavedGame>();
  let ordinal = 0;
  return {
    nextFamilyGameOrdinal: async () => {
      ordinal += 1;
      return ordinal;
    },
    save: async (game) => {
      games.set(game.gameId, game);
    },
    load: async (gameId) => games.get(gameId),
    list: async () => toSummaries([...games.values()]),
    remove: async (gameId) => {
      games.delete(gameId);
    },
    size: () => games.size,
  };
}

export function toSummaries(games: readonly SavedGame[]): readonly GameSummary[] {
  return [...games]
    .sort((a, b) => (a.savedAt < b.savedAt ? 1 : a.savedAt > b.savedAt ? -1 : 0))
    .map(({ gameId, savedAt, status, turnNumber, players }) => ({ gameId, savedAt, status, turnNumber, players }));
}
