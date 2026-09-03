import { create } from "zustand";
import type { Banner } from "@/animation/player";
import type { GameEvent, GameState } from "@/core/game";
import type { PlayerId } from "@/core/shared";

/**
 * État TRANSITOIRE de l'interface : jamais sauvegardé, jamais lu par le
 * moteur, reconstruit depuis `GameState` à la reprise. Aucune règle de jeu.
 */
export interface UiState {
  readonly pawnVisuals: Readonly<Record<string, number>>;
  readonly highlightedCell: number | null;
  readonly arrivalCell: number | null;
  readonly journeyReveal: { readonly playerId: PlayerId; readonly steps: number } | null;
  /** Cases du trajet à venir, copiées de `PawnMoved.path` pour l'aperçu du Chemin. */
  readonly pathPreview: readonly number[];
  readonly banner: Banner | null;
  readonly queue: readonly GameEvent[];
  readonly isAnimating: boolean;

  syncFromGame(state: GameState): void;
  enqueue(events: readonly GameEvent[]): void;
  takeNext(): GameEvent | undefined;
  setAnimating(value: boolean): void;
  setPawn(playerId: PlayerId, position: number): void;
  setHighlight(position: number | null): void;
  setArrival(position: number | null): void;
  revealJourney(playerId: PlayerId, steps: number): void;
  hideJourney(): void;
  setPathPreview(path: readonly number[]): void;
  setBanner(banner: Banner | null): void;
  clear(): void;
}

const EMPTY = {
  pawnVisuals: {},
  highlightedCell: null,
  arrivalCell: null,
  journeyReveal: null,
  pathPreview: [],
  banner: null,
  queue: [],
  isAnimating: false,
} as const;

export const useUiStore = create<UiState>()((set, get) => ({
  ...EMPTY,
  /** Positions visuelles depuis l'état ; la file est conservée (une création vient d'y déposer ses événements). */
  syncFromGame: (state) => set((s) => ({ ...EMPTY, queue: s.queue, pawnVisuals: Object.fromEntries(state.players.map((p) => [p.id, p.position])) })),
  enqueue: (events) => set((s) => ({ queue: [...s.queue, ...events] })),
  takeNext: () => {
    const [next, ...rest] = get().queue;
    if (next) set({ queue: rest });
    return next;
  },
  setAnimating: (isAnimating) => set({ isAnimating }),
  setPawn: (playerId, position) => set((s) => ({ pawnVisuals: { ...s.pawnVisuals, [playerId]: position } })),
  setHighlight: (highlightedCell) => set({ highlightedCell }),
  setArrival: (arrivalCell) => set({ arrivalCell }),
  revealJourney: (playerId, steps) => set({ journeyReveal: { playerId, steps } }),
  hideJourney: () => set({ journeyReveal: null }),
  setPathPreview: (pathPreview) => set({ pathPreview }),
  setBanner: (banner) => set({ banner }),
  clear: () => set({ ...EMPTY }),
}));
