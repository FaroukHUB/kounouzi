import { createIndexedDbGameRepository, createMemoryGameRepository } from "@/data/local";
import { NullNarrator, WebSpeechNarrator, type NarrationService } from "@/experience/narration";
import { createGameStore, useGameStoreOf, type GameStoreState } from "./gameStore";
import { useUiStore } from "./uiStore";

const isBrowser = typeof window !== "undefined";

/** IndexedDB dans le navigateur ; mémoire au rendu serveur (jamais utilisée pour jouer). */
const repository = isBrowser && "indexedDB" in window ? createIndexedDbGameRepository() : createMemoryGameRepository();

export const narrator: NarrationService = isBrowser ? new WebSpeechNarrator() : new NullNarrator();

export const gameStore = createGameStore({
  repository,
  now: () => new Date().toISOString(),
  onEvents: (events, state) => useUiStore.getState().enqueueBatch(events, state),
  onError: (error) => console.error("[kounouzi] persistance", error),
});

export const useGameStore = <T>(selector: (s: GameStoreState) => T): T => useGameStoreOf(gameStore, selector);
