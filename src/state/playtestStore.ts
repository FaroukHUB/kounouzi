import { createStore, type StoreApi } from "zustand/vanilla";
import type { GameEvent, GameState } from "@/core/game";
import type { GameId } from "@/core/shared";
import type { PlaytestRepository } from "@/data/ports";
import type { PlaytestLog } from "@/experience/playtest";

export interface PlaytestStoreDeps {
  readonly repository: PlaytestRepository;
  /** Horloge murale (ms). Diagnostic uniquement : jamais lue par le moteur. */
  readonly now: () => number;
  readonly onError?: (error: unknown) => void;
}

/**
 * Enregistreur de playtest : observe passivement les lots d'événements du
 * moteur et les horodate. N'émet aucune commande, ne modifie aucun état de
 * jeu, n'envoie rien sur le réseau.
 */
export interface PlaytestStoreState {
  readonly logs: Readonly<Record<string, PlaytestLog>>;
  record(gameId: GameId, events: readonly GameEvent[], state: GameState): void;
  load(gameId: GameId): Promise<PlaytestLog | undefined>;
}

export function createPlaytestStore(deps: PlaytestStoreDeps): StoreApi<PlaytestStoreState> {
  return createStore<PlaytestStoreState>()((set, get) => ({
    logs: {},
    record: (gameId, events, state) => {
      if (events.length === 0) return;
      const current = get().logs[gameId] ?? { gameId, entries: [] };
      const next: PlaytestLog = { gameId, entries: [...current.entries, { at: deps.now(), active: state.clock.activePlaySeconds, events }] };
      set((s) => ({ logs: { ...s.logs, [gameId]: next } }));
      deps.repository.save(next).catch((error: unknown) => deps.onError?.(error));
    },
    load: async (gameId) => {
      const cached = get().logs[gameId];
      if (cached) return cached;
      const stored = await deps.repository.load(gameId).catch((error: unknown) => {
        deps.onError?.(error);
        return undefined;
      });
      if (stored) set((s) => ({ logs: { ...s.logs, [gameId]: stored } }));
      return stored;
    },
  }));
}
