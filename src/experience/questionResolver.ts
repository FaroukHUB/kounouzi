import type { ContentRegistry, QuestionInstance } from "@/core/content";
import type { GameState } from "@/core/game";
import { emptyMemory, selectQuestion, type LearningConfig, type PlayerLearningMemory } from "@/core/learning";
import type { PlayerId } from "@/core/shared";
import type { PlayerProfileDraft } from "@/data/ports";
import { learnerContextFor } from "@/config/learning";

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

/** La demande de question en attente de distribution (question simple, Défi de reprise, Défi Patrimoine ou tour de Duel). */
export function pendingRequest(state: GameState): { readonly requestId: string; readonly playerId: PlayerId } | null {
  if (state.phase.kind === "awaiting_answer") return state.phase.served ? null : { requestId: state.phase.requestId, playerId: state.players[state.activePlayerIndex]!.id };
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
 * Duel : la catégorie commune est choisie déterministement à la première
 * question (meilleur créneau du défieur parmi les catégories où l'adversaire
 * possède aussi du contenu autorisé pour SON audience) ; l'adversaire reçoit
 * ensuite SA meilleure question dans cette catégorie.
 */
export function resolveQuestion({ state, profiles, registry, memoryOf, config, now }: ResolveInput): QuestionInstance | null {
  const pending = pendingRequest(state);
  if (!pending) return null;
  const player = state.players.find((p) => p.id === pending.playerId);
  if (!player) return null;
  const profile = profiles.find((p) => p.id === player.id);
  const learner = learnerContextFor({ id: player.id, profileType: player.profileType, schoolGrade: profile?.child?.schoolGrade, initialLevel: profile?.adult?.initialLevel });
  const memory = memoryOf(player.id) ?? emptyMemory(player.id);
  let slots = registry.slots(player.profileType);

  if (state.phase.kind === "awaiting_duel") {
    const d = state.phase.duel;
    if (d.categoryId) {
      slots = slots.filter((s) => s.categoryId === d.categoryId);
    } else {
      const otherId = player.id === d.challengerId ? d.opponentId : d.challengerId;
      const other = state.players.find((p) => p.id === otherId);
      const shared = new Set(other ? registry.slots(other.profileType).map((s) => s.categoryId) : []);
      slots = slots.filter((s) => shared.has(s.categoryId));
    }
  }
  return selectQuestion({ memory, learner, slots, config, now })?.question ?? null;
}
