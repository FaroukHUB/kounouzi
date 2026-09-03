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

export type DispatchResult = { readonly ok: true; readonly events: readonly GameEvent[] } | { readonly ok: false; readonly error: GameError };

/** Miroir de l'état PERSISTANT du moteur. Aucune donnée d'animation ici. */
export interface GameStoreState {
  readonly status: LoadStatus;
  readonly state: GameState | null;
  readonly profiles: readonly PlayerProfileDraft[];
  readonly familyGameOrdinal: number | null;
  readonly lastError: GameError | SetupError | null;
  /** Alloue un numéro de partie familiale (monotone, jamais réutilisé). */
  allocateFamilyGameOrdinal(): Promise<number>;
  create(setup: GameSetup, profiles: readonly PlayerProfileDraft[], familyGameOrdinal: number): boolean;
  dispatch(command: Command): DispatchResult;
  load(gameId: GameId): Promise<LoadStatus>;
  listSaved(): Promise<readonly GameSummary[]>;
  remove(gameId: GameId): Promise<void>;
  reset(): void;
}

export function createGameStore(deps: GameStoreDeps): StoreApi<GameStoreState> {
  const persist = (state: GameState, profiles: readonly PlayerProfileDraft[], familyGameOrdinal: number) => {
    const saved: SavedGame = {
      gameId: state.gameId,
      familyGameOrdinal,
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
    familyGameOrdinal: null,
    lastError: null,

    allocateFamilyGameOrdinal: () => deps.repository.nextFamilyGameOrdinal(),

    create: (setup, profiles, familyGameOrdinal) => {
      const result = createGame(setup);
      if (!result.ok) {
        set({ lastError: result.error });
        return false;
      }
      set({ status: "ready", state: result.value.state, profiles, familyGameOrdinal, lastError: null });
      persist(result.value.state, profiles, familyGameOrdinal);
      deps.onEvents?.(result.value.events, result.value.state);
      return true;
    },

    dispatch: (command) => {
      const current = get().state;
      if (!current) return { ok: false, error: { code: "GAME_FINISHED" } };
      const result = reduce(current, command);
      if (!result.ok) {
        set({ lastError: result.error });
        return { ok: false, error: result.error };
      }
      set({ state: result.value.state, lastError: null });
      persist(result.value.state, get().profiles, get().familyGameOrdinal ?? 0);
      deps.onEvents?.(result.value.events, result.value.state);
      return { ok: true, events: result.value.events };
    },

    load: async (gameId) => {
      set({ status: "loading" });
      const saved = await deps.repository.load(gameId).catch((error: unknown) => {
        deps.onError?.(error);
        return undefined;
      });
      if (!saved) {
        set({ status: "missing", state: null, profiles: [], familyGameOrdinal: null });
        return "missing";
      }
      const restored = deserializeGameState(saved.state);
      if (!restored.ok) {
        deps.onError?.(restored.error);
        set({ status: "corrupted", state: null, profiles: [], familyGameOrdinal: null });
        return "corrupted";
      }
      // Reprise : l'état est affiché tel quel, aucune animation n'est rejouée (pas d'appel à onEvents).
      set({ status: "ready", state: restored.value, profiles: saved.profiles, familyGameOrdinal: saved.familyGameOrdinal, lastError: null });
      return "ready";
    },

    listSaved: () => deps.repository.list(),
    remove: (gameId) => deps.repository.remove(gameId),
    reset: () => set({ status: "idle", state: null, profiles: [], familyGameOrdinal: null, lastError: null }),
  }));
}

export function useGameStoreOf<T>(store: StoreApi<GameStoreState>, selector: (s: GameStoreState) => T): T {
  return useStore(store, selector);
}
