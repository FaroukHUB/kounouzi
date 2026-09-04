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

/**
 * Traduit une demande du moteur (`awaiting_answer`) en question à distribuer,
 * choisie par le Learning Engine selon la mémoire du joueur actif. Le résultat
 * est ensuite FIGÉ dans l'état par `ServeQuestion` : la reprise ne dépend
 * jamais d'une nouvelle résolution.
 */
export function resolveQuestion({ state, profiles, registry, memoryOf, config, now }: ResolveInput): QuestionInstance | null {
  if (state.phase.kind !== "awaiting_answer") return null;
  const player = state.players[state.activePlayerIndex];
  if (!player) return null;
  const profile = profiles.find((p) => p.id === player.id);
  const learner = learnerContextFor({ id: player.id, profileType: player.profileType, schoolGrade: profile?.child?.schoolGrade, initialLevel: profile?.adult?.initialLevel });
  const memory = memoryOf(player.id) ?? emptyMemory(player.id);
  return selectQuestion({ memory, learner, slots: registry.slots(player.profileType), config, now })?.question ?? null;
}
