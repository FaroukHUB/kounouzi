import { createStore, type StoreApi } from "zustand/vanilla";
import { useStore } from "zustand";
import { createGame, deserializeGameState, reduce, serializeGameState, type Command, type GameError, type GameEvent, type GameSetup, type GameState, type SetupError } from "@/core/game";
import type { GameId } from "@/core/shared";
import type { GameRepository, GameSummary, PlayerProfileDraft, SavedGame } from "@/data/ports";

export interface GameStoreDeps {
  readonly repository: GameRepository;
  /** Horloge de la couche session (jamais utilisée par le moteur). */
  readonly now: () => string;
  /** Appelé après chaque changement d'état avec les événements produits (file d'animation, narration). */
  readonly onEvents?: (events: readonly GameEvent[], state: GameState) => void;
  readonly onError?: (error: unknown) => void;
}

export type LoadStatus = "idle" | "loading" | "ready" | "missing" | "corrupted";

/** Miroir de l'état PERSISTANT du moteur. Aucune donnée d'animation ici. */
export interface GameStoreState {
  readonly status: LoadStatus;
  readonly state: GameState | null;
  readonly profiles: readonly PlayerProfileDraft[];
  readonly lastError: GameError | SetupError | null;
  create(setup: GameSetup, profiles: readonly PlayerProfileDraft[]): boolean;
  dispatch(command: Command): boolean;
  load(gameId: GameId): Promise<LoadStatus>;
  listSaved(): Promise<readonly GameSummary[]>;
  remove(gameId: GameId): Promise<void>;
  reset(): void;
}

export function createGameStore(deps: GameStoreDeps): StoreApi<GameStoreState> {
  const persist = (state: GameState, profiles: readonly PlayerProfileDraft[]) => {
    const saved: SavedGame = {
      gameId: state.gameId,
      savedAt: deps.now(),
      status: state.status,
      turnNumber: state.turnNumber,
      players: state.players.map((p) => ({ displayName: p.displayName, avatarId: profiles.find((d) => d.id === p.id)?.avatarId ?? "" })),
      profiles,
      state: serializeGameState(state),
    };
    deps.repository.save(saved).catch((error: unknown) => deps.onError?.(error));
  };

  return createStore<GameStoreState>()((set, get) => ({
    status: "idle",
    state: null,
    profiles: [],
    lastError: null,

    create: (setup, profiles) => {
      const result = createGame(setup);
      if (!result.ok) {
        set({ lastError: result.error });
        return false;
      }
      set({ status: "ready", state: result.value.state, profiles, lastError: null });
      persist(result.value.state, profiles);
      deps.onEvents?.(result.value.events, result.value.state);
      return true;
    },

    dispatch: (command) => {
      const current = get().state;
      if (!current) return false;
      const result = reduce(current, command);
      if (!result.ok) {
        set({ lastError: result.error });
        return false;
      }
      set({ state: result.value.state, lastError: null });
      persist(result.value.state, get().profiles);
      if (result.value.events.length > 0) deps.onEvents?.(result.value.events, result.value.state);
      return true;
    },

    load: async (gameId) => {
      set({ status: "loading" });
      const saved = await deps.repository.load(gameId).catch((error: unknown) => {
        deps.onError?.(error);
        return undefined;
      });
      if (!saved) {
        set({ status: "missing", state: null, profiles: [] });
        return "missing";
      }
      const restored = deserializeGameState(saved.state);
      if (!restored.ok) {
        deps.onError?.(restored.error);
        set({ status: "corrupted", state: null, profiles: [] });
        return "corrupted";
      }
      // Reprise : l'état est affiché tel quel, aucune animation n'est rejouée (pas d'appel à onEvents).
      set({ status: "ready", state: restored.value, profiles: saved.profiles, lastError: null });
      return "ready";
    },

    listSaved: () => deps.repository.list(),
    remove: (gameId) => deps.repository.remove(gameId),
    reset: () => set({ status: "idle", state: null, profiles: [], lastError: null }),
  }));
}

export function useGameStoreOf<T>(store: StoreApi<GameStoreState>, selector: (s: GameStoreState) => T): T {
  return useStore(store, selector);
}
