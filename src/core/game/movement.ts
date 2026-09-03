import type { PlayerId } from "@/core/shared";
import { applyTransaction } from "./economy";
import { playerById, step, chain, updatePlayer, type Step } from "./step";
import type { GameState, ResolvedBoard } from "./types";

export interface MovePlan {
  readonly from: number;
  readonly to: number;
  readonly path: readonly number[];
  readonly passedStart: boolean;
}

/** Chemin case par case, en avant (steps > 0) ou en arrière (steps < 0), avec bouclage. */
export function computePath(from: number, steps: number, board: ResolvedBoard): MovePlan {
  const n = board.cellCount;
  const path: number[] = [];
  const direction = Math.sign(steps);
  for (let i = 1; i <= Math.abs(steps); i += 1) {
    path.push((((from + direction * i) % n) + n) % n);
  }
  const to = path.length > 0 ? path[path.length - 1]! : from;
  const passedStart = steps > 0 && path.includes(board.startPosition);
  return { from, to, path, passedStart };
}

/** Chemin en avant jusqu'à une position donnée (aucun déplacement si déjà dessus). */
export function computePathTo(from: number, target: number, board: ResolvedBoard): MovePlan {
  const n = board.cellCount;
  const steps = (((target - from) % n) + n) % n;
  return computePath(from, steps, board);
}

/** Applique un plan : position, événement de déplacement, bonus de passage par le départ. */
export function applyMove(state: GameState, playerId: PlayerId, plan: MovePlan): Step {
  if (plan.path.length === 0) return step(state);
  const moved = updatePlayer(state, playerId, { position: plan.to });
  let result = step(moved, [{ type: "PawnMoved", playerId, from: plan.from, to: plan.to, path: plan.path }]);
  const bonus = state.config.rules.passStartBonus;
  if (plan.passedStart && bonus > 0) {
    result = chain(result, (s) => step(s, [{ type: "PassedStart", playerId, bonus }]));
    result = chain(result, (s) => applyTransaction(s, playerId, bonus, "start_bonus"));
  }
  return result;
}

export function positionOf(state: GameState, playerId: PlayerId): number {
  return playerById(state, playerId).position;
}
