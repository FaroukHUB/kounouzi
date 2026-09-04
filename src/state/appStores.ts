import { createIndexedDbGameRepository, createIndexedDbLearningRepository, createIndexedDbPlayerProfileRepository, createMemoryGameRepository, createMemoryLearningRepository, createMemoryPlayerProfileRepository } from "@/data/local";
import { LEARNING_CONFIG, learnerContextFor } from "@/config/learning";
import { NullNarrator, WebSpeechNarrator, type NarrationService } from "@/experience/narration";
import { createGameStore, useGameStoreOf, type GameStoreState } from "./gameStore";
import { createLearningStore, useLearningStoreOf, type LearningStoreState } from "./learningStore";
import { useUiStore } from "./uiStore";

const isBrowser = typeof window !== "undefined";
const hasIndexedDb = isBrowser && "indexedDB" in window;

/** IndexedDB dans le navigateur ; mémoire au rendu serveur (jamais utilisée pour jouer). */
const repository = hasIndexedDb ? createIndexedDbGameRepository() : createMemoryGameRepository();
const learningRepository = hasIndexedDb ? createIndexedDbLearningRepository() : createMemoryLearningRepository();
export const playerProfileRepository = hasIndexedDb ? createIndexedDbPlayerProfileRepository() : createMemoryPlayerProfileRepository();

export const narrator: NarrationService = isBrowser ? new WebSpeechNarrator() : new NullNarrator();

const now = () => new Date().toISOString();

export const learningStore = createLearningStore({
  repository: learningRepository,
  config: LEARNING_CONFIG,
  now,
  onError: (error) => console.error("[kounouzi] mémoire pédagogique", error),
});

export const gameStore = createGameStore({
  repository,
  now,
  onEvents: (events, state) => {
    useUiStore.getState().enqueueBatch(events, state);
    // Mémoire pédagogique : chaque réponse à une question servie est enregistrée pour son joueur (enfant ou adulte).
    const learners = gameStore.getState().profiles.map((p) => learnerContextFor({ id: p.id, profileType: p.profileType, schoolGrade: p.child?.schoolGrade, initialLevel: p.adult?.initialLevel }));
    learningStore.getState().record(state.gameId, events, learners);
  },
  onError: (error) => console.error("[kounouzi] persistance", error),
});

export const useGameStore = <T>(selector: (s: GameStoreState) => T): T => useGameStoreOf(gameStore, selector);
export const useLearningStore = <T>(selector: (s: LearningStoreState) => T): T => useLearningStoreOf(learningStore, selector);
