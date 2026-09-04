import {
  createIndexedDbGameRepository,
  createIndexedDbLearningRepository,
  createIndexedDbPlayerProfileRepository,
  createIndexedDbPlaytestRepository,
  createMemoryGameRepository,
  createMemoryLearningRepository,
  createMemoryPlayerProfileRepository,
  createMemoryPlaytestRepository,
} from "@/data/local";
import { LEARNING_CONFIG, learnerContextFor } from "@/config/learning";
import { NullNarrator, WebSpeechNarrator, type NarrationService } from "@/experience/narration";
import { createGameStore, useGameStoreOf, type GameStoreState } from "./gameStore";
import { createLearningStore, useLearningStoreOf, type LearningStoreState } from "./learningStore";
import { createPlaytestStore } from "./playtestStore";
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

/** Diagnostic de playtest LOCAL (développement) : observation passive, rien n'est envoyé nulle part. */
export const playtestStore = createPlaytestStore({
  repository: hasIndexedDb ? createIndexedDbPlaytestRepository() : createMemoryPlaytestRepository(),
  now: () => Date.now(),
  onError: (error) => console.error("[kounouzi] playtest", error),
});

export const gameStore = createGameStore({
  repository,
  now,
  onEvents: (events, state) => {
    useUiStore.getState().enqueueBatch(events, state);
    // Mémoire pédagogique : chaque réponse à une question servie est enregistrée pour son joueur (enfant ou adulte).
    const learners = gameStore.getState().profiles.map((p) => learnerContextFor({ id: p.id, profileType: p.profileType, schoolGrade: p.child?.schoolGrade, initialLevel: p.adult?.initialLevel }));
    learningStore.getState().record(state.gameId, events, learners);
    playtestStore.getState().record(state.gameId, events, state);
    // Récitation : une sourate maîtrisée suit le profil du joueur (références seulement, jamais un texte).
    for (const e of events) {
      if (e.type !== "RecitationMastered") continue;
      const profile = gameStore.getState().profiles.find((p) => p.id === e.playerId);
      const mastered = state.players.find((p) => p.id === e.playerId)?.masteredSurahs ?? [];
      if (profile) void playerProfileRepository.save({ ...profile, recitation: { mastered: [...mastered] }, savedAt: now() }).catch((error: unknown) => console.error("[kounouzi] récitation", error));
    }
  },
  onError: (error) => console.error("[kounouzi] persistance", error),
});

export const useGameStore = <T>(selector: (s: GameStoreState) => T): T => useGameStoreOf(gameStore, selector);
export const useLearningStore = <T>(selector: (s: LearningStoreState) => T): T => useLearningStoreOf(learningStore, selector);
