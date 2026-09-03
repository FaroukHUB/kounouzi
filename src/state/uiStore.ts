import { create } from "zustand";
import type { Banner } from "@/animation/player";
import type { GameEvent, GameState } from "@/core/game";
import type { PlayerId } from "@/core/shared";
import { projectEvent } from "./presentation";

/** Un élément de la file : un événement à rejouer, et/ou un état réel à « poser » comme présenté une fois rejoué. */
export interface QueueItem {
  readonly event: GameEvent | null;
  readonly settle?: GameState | undefined;
}

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
  readonly queue: readonly QueueItem[];
  readonly isAnimating: boolean;
  /** État affiché par les panneaux (retard des animations). `null` avant chargement. */
  readonly presentedState: GameState | null;

  syncFromGame(state: GameState): void;
  /** Dépose les événements d'une commande ; l'état réel est posé comme présenté après le dernier. */
  enqueueBatch(events: readonly GameEvent[], stateAfter: GameState): void;
  takeNext(): QueueItem | undefined;
  /** Projette un événement rejoué sur l'état présenté (joueur actif, solde, patrimoine). */
  presentEvent(event: GameEvent): void;
  setPresented(state: GameState): void;
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
  presentedState: null,
} as const;

export const useUiStore = create<UiState>()((set, get) => ({
  ...EMPTY,
  /** Positions visuelles depuis l'état ; la file est conservée (une création vient d'y déposer ses événements). */
  syncFromGame: (state) =>
    set((s) => ({ ...EMPTY, queue: s.queue, presentedState: s.queue.length > 0 && s.presentedState ? s.presentedState : state, pawnVisuals: Object.fromEntries(state.players.map((p) => [p.id, p.position])) })),
  enqueueBatch: (events, stateAfter) =>
    set((s) => {
      if (events.length === 0) {
        // Aucun rendu à attendre (ex. horloge) : poser tout de suite si rien n'est en cours, sinon en fin de file.
        return s.queue.length === 0 && !s.isAnimating ? { presentedState: stateAfter } : { queue: [...s.queue, { event: null, settle: stateAfter }] };
      }
      const items: QueueItem[] = events.map((event, i) => (i === events.length - 1 ? { event, settle: stateAfter } : { event }));
      return { queue: [...s.queue, ...items], presentedState: s.presentedState ?? stateAfter };
    }),
  takeNext: () => {
    const [next, ...rest] = get().queue;
    if (next) set({ queue: rest });
    return next;
  },
  presentEvent: (event) => set((s) => (s.presentedState ? { presentedState: projectEvent(s.presentedState, event) } : {})),
  setPresented: (presentedState) => set({ presentedState }),
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
