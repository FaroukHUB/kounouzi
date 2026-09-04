import type { ContentRegistry, QuestionInstance } from "@/core/content";
import type { GameState } from "@/core/game";
import { challengeById } from "@/core/game";
import { emptyMemory, selectDuelCategory, selectQuestion, targetLevel, type DuelParticipant, type LearningConfig, type PlayerLearningMemory } from "@/core/learning";
import type { PlayerId } from "@/core/shared";
import type { PlayerProfileDraft } from "@/data/ports";
import { ageOf, learnerContextFor } from "@/config/learning";

export interface ResolveInput {
  readonly state: GameState;
  readonly profiles: readonly PlayerProfileDraft[];
  readonly registry: ContentRegistry;
  /** Mémoire pédagogique du joueur (chargée par la couche état) ; absente = joueur inconnu, mémoire vide. */
  readonly memoryOf: (playerId: PlayerId) => PlayerLearningMemory | undefined;
  readonly config: LearningConfig;
  /** Horloge injectée (ISO). */
  readonly now: string;
}

export interface PendingQuestion {
  readonly requestId: string;
  readonly playerId: PlayerId;
  /** Défi famille à contenu validé : catégorie imposée (`any` = toutes) et décalage de difficulté (« +1 niveau »). */
  readonly constraint?: { readonly categoryId: string; readonly difficultyDelta: number } | undefined;
}

/** La demande de question en attente de distribution (question simple, Défi de reprise, Défi Patrimoine, tour de Duel ou Défi famille à contenu). */
export function pendingRequest(state: GameState): PendingQuestion | null {
  if (state.phase.kind === "awaiting_answer") return state.phase.served ? null : { requestId: state.phase.requestId, playerId: state.players[state.activePlayerIndex]!.id };
  if (state.phase.kind === "awaiting_challenge") {
    const c = state.phase.challenge;
    const ref = challengeById(state, c.challengeId)?.contentRef;
    if (c.served || !ref || ref.kind !== "validated_question") return null;
    return { requestId: c.requestId, playerId: c.playerId, constraint: { categoryId: ref.categoryId, difficultyDelta: ref.difficultyDelta } };
  }
  if (state.phase.kind === "awaiting_duel") {
    const d = state.phase.duel;
    if (d.stage === "challenger") return d.challengerServed ? null : { requestId: d.challengerRequestId, playerId: d.challengerId };
    return d.opponentServed ? null : { requestId: d.opponentRequestId, playerId: d.opponentId };
  }
  return null;
}

/**
 * Traduit une demande du moteur en question à distribuer, choisie par le
 * Learning Engine selon la mémoire du joueur QUI RÉPOND. Le résultat est
 * ensuite FIGÉ dans l'état par `ServeQuestion`.
 *
 * Duel : la catégorie commune est choisie AVANT toute question, parmi les
 * catégories où les deux joueurs possèdent du contenu autorisé, par un score
 * combiné des DEUX mémoires (`selectDuelCategory`, symétrique). Chaque
 * dueliste reçoit ensuite SA question dans cette catégorie, à sa difficulté.
 */
export function resolveQuestion({ state, profiles, registry, memoryOf, config, now }: ResolveInput): QuestionInstance | null {
  const pending = pendingRequest(state);
  if (!pending) return null;
  const player = state.players.find((p) => p.id === pending.playerId);
  if (!player) return null;
  const participant = (id: PlayerId): DuelParticipant | null => {
    const p = state.players.find((x) => x.id === id);
    if (!p) return null;
    const profile = profiles.find((d) => d.id === id);
    return {
      memory: memoryOf(id) ?? emptyMemory(id),
      learner: learnerContextFor({ id, profileType: p.profileType, age: profile ? ageOf(profile, now) : undefined, initialLevel: profile?.adult?.initialLevel }),
      slots: registry.slots(p.profileType),
    };
  };
  const me = participant(player.id);
  if (!me) return null;
  let slots = me.slots;

  if (state.phase.kind === "awaiting_duel") {
    const d = state.phase.duel;
    const categoryId = d.categoryId ?? duelCategoryFor(state, participant, config, now);
    if (!categoryId) return null;
    slots = slots.filter((s) => s.categoryId === categoryId);
  }
  if (pending.constraint) {
    // Défi famille : seule la catégorie demandée ; « +1 niveau » = au-dessus du niveau estimé du joueur dans cette catégorie.
    const { categoryId, difficultyDelta } = pending.constraint;
    if (categoryId !== "any") slots = slots.filter((s) => s.categoryId === categoryId);
    if (difficultyDelta > 0) slots = slots.filter((s) => s.difficulty >= targetLevel(me.memory, s.categoryId, me.learner, config) + difficultyDelta);
  }
  return selectQuestion({ memory: me.memory, learner: me.learner, slots, config, now, gameId: state.gameId })?.question ?? null;
}

/** La catégorie du Duel en attente, calculée depuis les DEUX mémoires (identique quel que soit le sens du défi). */
export function duelCategoryFor(state: GameState, participant: (id: PlayerId) => DuelParticipant | null, config: LearningConfig, now: string): string | null {
  if (state.phase.kind !== "awaiting_duel") return null;
  const d = state.phase.duel;
  if (d.categoryId) return d.categoryId;
  const challenger = participant(d.challengerId);
  const opponent = participant(d.opponentId);
  if (!challenger || !opponent) return null;
  return selectDuelCategory({ challenger, opponent, config, now })?.categoryId ?? null;
}
