import type { PlayerId } from "@/core/shared";
import { step, type Step } from "./step";
import type { EffectSpec, GameState, QueuedEffect } from "./types";

export function queueEffect(state: GameState, playerId: PlayerId, spec: EffectSpec): Step {
  const id = `e${state.counters.effect + 1}`;
  const effect: QueuedEffect = { id, playerId, spec };
  const next: GameState = { ...state, effects: [...state.effects, effect], counters: { ...state.counters, effect: state.counters.effect + 1 } };
  return step(next, [{ type: "EffectQueued", effect }]);
}

/**
 * Consomme le premier effet du type demandé pour ce joueur, s'il existe.
 * Un `reward_multiplier` décrémente ses utilisations ; les autres disparaissent.
 */
export function takeEffect<T extends EffectSpec["type"]>(
  state: GameState,
  playerId: PlayerId,
  type: T,
): { readonly effect: Extract<EffectSpec, { type: T }> | undefined; readonly effectId: string | undefined; readonly step: Step } {
  const index = state.effects.findIndex((e) => e.playerId === playerId && e.spec.type === type);
  const found = index >= 0 ? state.effects[index] : undefined;
  if (!found) return { effect: undefined, effectId: undefined, step: step(state) };

  const spec = found.spec;
  const remaining =
    spec.type === "reward_multiplier" && spec.uses > 1
      ? state.effects.map((e, i) => (i === index ? { ...e, spec: { ...spec, uses: spec.uses - 1 } } : e))
      : state.effects.filter((_, i) => i !== index);

  return {
    effect: spec as Extract<EffectSpec, { type: T }>,
    effectId: found.id,
    step: step({ ...state, effects: remaining }, [{ type: "EffectConsumed", effectId: found.id, playerId, effectType: type }]),
  };
}
