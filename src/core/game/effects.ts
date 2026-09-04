import type { PlayerId } from "@/core/shared";
import { step, chain, type Step } from "./step";
import type { EffectSpec, GameState, QueuedEffect } from "./types";

export function queueEffect(state: GameState, playerId: PlayerId, spec: EffectSpec, expiresInTurns?: number): Step {
  const id = `e${state.counters.effect + 1}`;
  const effect: QueuedEffect = {
    id,
    playerId,
    spec,
    queuedAtTurn: state.turnNumber,
    ...(expiresInTurns === undefined ? {} : { expiresAtTurn: state.turnNumber + expiresInTurns }),
  };
  const next: GameState = { ...state, effects: [...state.effects, effect], counters: { ...state.counters, effect: state.counters.effect + 1 } };
  return step(next, [{ type: "EffectQueued", effect }]);
}

export function effectsOf<T extends EffectSpec["type"]>(state: GameState, playerId: PlayerId, type: T): readonly (QueuedEffect & { readonly spec: Extract<EffectSpec, { type: T }> })[] {
  return state.effects.filter((e): e is QueuedEffect & { spec: Extract<EffectSpec, { type: T }> } => e.playerId === playerId && e.spec.type === type);
}

/**
 * Consomme le premier effet du type demandé pour ce joueur, s'il existe.
 * Un `reward_multiplier` décrémente ses utilisations ; les autres disparaissent.
 */
export function takeEffect<T extends EffectSpec["type"]>(
  state: GameState,
  playerId: PlayerId,
  type: T,
  accept: (spec: Extract<EffectSpec, { type: T }>) => boolean = () => true,
): { readonly effect: Extract<EffectSpec, { type: T }> | undefined; readonly effectId: string | undefined; readonly step: Step } {
  const index = state.effects.findIndex((e) => e.playerId === playerId && e.spec.type === type && accept(e.spec as Extract<EffectSpec, { type: T }>));
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

/** Retire les effets listés d'un joueur (reprise). */
export function clearEffects(state: GameState, playerId: PlayerId, types: readonly EffectSpec["type"][]): Step {
  let result = step(state);
  for (const e of state.effects) {
    if (e.playerId !== playerId || !types.includes(e.spec.type)) continue;
    result = chain(result, (s) => step({ ...s, effects: s.effects.filter((x) => x.id !== e.id) }, [{ type: "EffectConsumed", effectId: e.id, playerId, effectType: e.spec.type }]));
  }
  return result;
}

/** Fait disparaître, au début du tour du joueur, les effets dont l'expiration est dépassée. */
export function expireEffects(state: GameState, playerId: PlayerId): Step {
  let result = step(state);
  for (const e of state.effects) {
    if (e.playerId !== playerId || e.expiresAtTurn === undefined || state.turnNumber <= e.expiresAtTurn) continue;
    result = chain(result, (s) => step({ ...s, effects: s.effects.filter((x) => x.id !== e.id) }, [{ type: "EffectExpired", effectId: e.id, playerId, effectType: e.spec.type }]));
  }
  return result;
}
