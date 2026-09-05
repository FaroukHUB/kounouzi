import { createStore, type StoreApi } from "zustand/vanilla";
import { useStore } from "zustand";
import type { GameEvent } from "@/core/game";
import { applyAttempt, attemptId, emptyMemory, type Attempt, type LearnerContext, type LearningConfig, type PlayerLearningMemory } from "@/core/learning";
import type { GameId, PlayerId } from "@/core/shared";
import type { LearningRepository } from "@/data/ports";

export interface LearningStoreDeps {
  readonly repository: LearningRepository;
  readonly config: LearningConfig;
  /** Horloge de la couche session (jamais lue par le noyau). */
  readonly now: () => string;
  readonly onError?: (error: unknown) => void;
}

/** Mémoires pédagogiques chargées pour la session courante (une par joueur). */
export interface LearningStoreState {
  readonly memories: Readonly<Record<string, PlayerLearningMemory>>;
  readonly loaded: readonly PlayerId[];
  /** Charge (ou initialise) la mémoire de chaque joueur ; idempotent. */
  ensureLoaded(playerIds: readonly PlayerId[]): Promise<void>;
  isLoaded(playerId: PlayerId): boolean;
  memoryOf(playerId: PlayerId): PlayerLearningMemory | undefined;
  /**
   * Enregistre les réponses d'un lot d'événements du moteur : uniquement
   * `AnswerRecorded` portant une question servie (jamais une carte « Passer »).
   * Le montant de la récompense n'est jamais lu, seulement son existence.
   */
  record(gameId: GameId, events: readonly GameEvent[], learners: readonly LearnerContext[]): readonly Attempt[];
  reset(): void;
}

export function createLearningStore(deps: LearningStoreDeps): StoreApi<LearningStoreState> {
  return createStore<LearningStoreState>()((set, get) => ({
    memories: {},
    loaded: [],

    ensureLoaded: async (playerIds) => {
      const missing = playerIds.filter((id) => !get().loaded.includes(id));
      if (missing.length === 0) return;
      const entries = await Promise.all(
        missing.map(async (id) => {
          const memory = await deps.repository.load(id).catch((error: unknown) => {
            deps.onError?.(error);
            return undefined;
          });
          return [id, memory ?? emptyMemory(id)] as const;
        }),
      );
      set((s) => ({
        memories: { ...s.memories, ...Object.fromEntries(entries.filter(([id]) => !s.loaded.includes(id))) },
        loaded: [...s.loaded, ...entries.map(([id]) => id).filter((id) => !s.loaded.includes(id))],
      }));
    },

    isLoaded: (playerId) => get().loaded.includes(playerId),
    memoryOf: (playerId) => get().memories[playerId],

    record: (gameId, events, learners) => {
      const recorded: Attempt[] = [];
      for (const e of events) {
        // Une réponse à une question servie, ou un Défi famille dont la question validée a été jouée : même essai pour la mémoire.
        const played =
          e.type === "AnswerRecorded" && e.question
            ? { playerId: e.playerId, requestId: e.requestId, question: e.question, outcome: e.outcome, validationMode: e.validationMode, explanationMastery: e.explanationMastery, challenge: false }
            : e.type === "FamilyChallengeCompleted" && e.question && e.requestId
              ? { playerId: e.playerId, requestId: e.requestId, question: e.question, outcome: e.success ? ("correct" as const) : ("incorrect" as const), validationMode: "collective" as const, explanationMastery: "none" as const, challenge: true }
              : null;
        if (!played) continue;
        const learner = learners.find((l) => l.playerId === played.playerId);
        if (!learner) continue;
        const attempt: Attempt = {
          id: attemptId(gameId, played.requestId),
          playerId: played.playerId,
          gameId,
          knowledgeNodeId: played.question.knowledgeNodeId,
          ref: played.question.ref,
          categoryId: played.question.categoryId,
          difficulty: played.question.difficulty,
          outcome: played.outcome,
          validationMode: played.validationMode,
          explanationKnown: played.explanationMastery,
          rewardGranted: events.some((r) => (r.type === "RewardGranted" && r.requestId === played.requestId && r.playerId === played.playerId) || (played.challenge && r.type === "ChallengeRewardGranted" && r.playerId === played.playerId)),
          answeredAt: deps.now(),
        };
        const before = get().memories[played.playerId] ?? emptyMemory(played.playerId);
        const after = applyAttempt(before, attempt, learner, deps.config);
        if (after === before) continue;
        set((s) => ({ memories: { ...s.memories, [played.playerId]: after }, loaded: s.loaded.includes(played.playerId) ? s.loaded : [...s.loaded, played.playerId] }));
        deps.repository.save(after).catch((error: unknown) => deps.onError?.(error));
        recorded.push(attempt);
      }
      return recorded;
    },

    reset: () => set({ memories: {}, loaded: [] }),
  }));
}

export function useLearningStoreOf<T>(store: StoreApi<LearningStoreState>, selector: (s: LearningStoreState) => T): T {
  return useStore(store, selector);
}
