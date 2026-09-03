import { err, ok, type Result } from "@/core/shared";
import { cellAt } from "./board";
import { resolveCell } from "./cells";
import type { Command } from "./commands";
import { applyTransaction } from "./economy";
import { takeEffect } from "./effects";
import type { GameError } from "./errors";
import { purchaseSite } from "./holdings";
import { applyMove, computePath } from "./movement";
import { processQueue } from "./outcomes";
import { computeReward } from "./rewards";
import { nextInt } from "./rng";
import { activePlayer, step, chain, type Step } from "./step";
import type { GameState, TurnPhase } from "./types";

/**
 * Le contrat du moteur : `(état, commande) → (nouvel état, événements)`.
 * Pur, synchrone, déterministe. Une commande invalide est refusée sans
 * modifier l'état. Aucune animation, aucune horloge, aucun réseau.
 */
export function reduce(state: GameState, command: Command): Result<Step, GameError> {
  if (state.status === "finished") return err({ code: "GAME_FINISHED" });
  const player = activePlayer(state);
  if (command.playerId !== player.id) return err({ code: "NOT_ACTIVE_PLAYER", expected: player.id, received: command.playerId });

  switch (command.type) {
    case "SpinWheel": {
      const phase = expectPhase(state, "awaiting_spin");
      if (!phase.ok) return phase;
      const { min, max } = state.config.rules.wheel;
      const [value, rng] = nextInt(state.rng, min, max);
      let result = step({ ...state, rng }, [{ type: "WheelSpun", playerId: player.id, value }]);
      const plan = computePath(player.position, value, state.config.board);
      result = chain(result, (s) => applyMove(s, player.id, plan));
      const cell = cellAt(state.config.board, plan.to);
      result = chain(result, (s) => step(s, [{ type: "CellArrived", playerId: player.id, position: cell.position, cellType: cell.type }]));
      const resolution = resolveCell(result.state, cell);
      result = chain(result, () => step(resolution.state, resolution.events));
      return ok(chain(result, (s) => processQueue(s, resolution.outcomes)));
    }

    case "SubmitAnswer": {
      const phase = expectPhase(state, "awaiting_answer");
      if (!phase.ok) return phase;
      if (phase.value.requestId !== command.requestId) {
        return err({ code: "REQUEST_MISMATCH", expected: phase.value.requestId, received: command.requestId });
      }
      const { answer } = command;
      let result = step(state, [
        { type: "AnswerRecorded", requestId: command.requestId, playerId: player.id, outcome: answer.outcome, explanationMastery: answer.explanationMastery, validationMode: answer.validationMode },
      ]);
      const boost = takeEffect(state, player.id, "reward_multiplier");
      const reward = computeReward(state.config.rules, answer, boost.effect?.multiplier ?? 1);
      if (reward.amount > 0) {
        // `consumeOn: "reward_granted"` — l'effet n'est consommé que si une récompense est versée.
        if (boost.effect?.consumeOn === "reward_granted") result = chain(result, () => boost.step);
        result = chain(result, (s) => step(s, [{ type: "RewardGranted", requestId: command.requestId, playerId: player.id, base: reward.base, multiplier: reward.multiplier, amount: reward.amount }]));
        result = chain(result, (s) => applyTransaction(s, player.id, reward.amount, "question_reward", command.requestId));
      }
      const queue = phase.value.queue;
      return ok(chain(result, (s) => processQueue(s, queue)));
    }

    case "DecidePurchase": {
      const phase = expectPhase(state, "awaiting_purchase");
      if (!phase.ok) return phase;
      if (phase.value.siteId !== command.siteId) return err({ code: "SITE_MISMATCH", expected: phase.value.siteId, received: command.siteId });
      let result: Step;
      if (command.buy) {
        const purchase = purchaseSite(state, player.id, command.siteId);
        if (!purchase.ok) return purchase;
        result = purchase.value;
      } else {
        result = step(state, [{ type: "PurchaseDeclined", playerId: player.id, siteId: command.siteId }]);
      }
      const queue = phase.value.queue;
      return ok(chain(result, (s) => processQueue(s, queue)));
    }

    case "Choose": {
      const phase = expectPhase(state, "awaiting_choice");
      if (!phase.ok) return phase;
      if (phase.value.choiceId !== command.choiceId) return err({ code: "CHOICE_MISMATCH", expected: phase.value.choiceId, received: command.choiceId });
      const option = phase.value.options.find((o) => o.id === command.optionId);
      if (!option) return err({ code: "UNKNOWN_OPTION", choiceId: command.choiceId, optionId: command.optionId });
      const result = step(state, [{ type: "ChoiceMade", playerId: player.id, choiceId: command.choiceId, optionId: option.id }]);
      const queue = [...option.outcomes, ...phase.value.queue];
      return ok(chain(result, (s) => processQueue(s, queue)));
    }
  }
}

function expectPhase<K extends TurnPhase["kind"]>(state: GameState, kind: K): Result<Extract<TurnPhase, { kind: K }>, GameError> {
  if (state.phase.kind !== kind) return err({ code: "INVALID_PHASE", expected: kind, actual: state.phase.kind });
  return ok(state.phase as Extract<TurnPhase, { kind: K }>);
}
