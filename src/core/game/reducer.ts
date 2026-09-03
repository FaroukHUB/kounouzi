import { err, ok, type Result } from "@/core/shared";
import { cellAt } from "./board";
import { resolveCell } from "./cells";
import { isPlayerCommand, type Command, type SessionCommand } from "./commands";
import { applyTransaction } from "./economy";
import { takeEffect } from "./effects";
import type { GameError } from "./errors";
import { purchaseSite } from "./holdings";
import { assignJourneySteps } from "./journeyScheduler";
import { applyMove, computePath } from "./movement";
import { processQueue } from "./outcomes";
import { computeReward } from "./rewards";
import { activePlayer, chain, step, updatePlayer, type Step } from "./step";
import type { AnsweredQuestion, GameState, TurnPhase } from "./types";

/**
 * Le contrat du moteur : `(état, commande) → (nouvel état, événements)`.
 * Pur, synchrone, entièrement déterministe : aucun hasard, aucune horloge
 * système, aucun réseau. Une commande invalide est refusée sans modifier l'état.
 */
export function reduce(state: GameState, command: Command): Result<Step, GameError> {
  if (state.status === "finished") return err({ code: "GAME_FINISHED" });
  if (!isPlayerCommand(command)) return reduceSession(state, command);

  const player = activePlayer(state);
  if (command.playerId !== player.id) return err({ code: "NOT_ACTIVE_PLAYER", expected: player.id, received: command.playerId });

  switch (command.type) {
    case "StartJourney": {
      const phase = expectPhase(state, "awaiting_journey");
      if (!phase.ok) return phase;
      // Le Chemin : attribué par le cycle versionné, à partir du siège et du compteur de voyages uniquement.
      const steps = assignJourneySteps(state.config.journey, player.seat, player.journeysTaken);
      let result = step(updatePlayer(state, player.id, { journeysTaken: player.journeysTaken + 1 }), [
        { type: "MovementAssigned", playerId: player.id, steps, journeyIndex: player.journeysTaken },
      ]);
      const plan = computePath(player.position, steps, state.config.board);
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
      if (phase.value.requestId !== command.requestId) return err({ code: "REQUEST_MISMATCH", expected: phase.value.requestId, received: command.requestId });
      const { answer } = command;
      const served = phase.value.served;
      const question: AnsweredQuestion | undefined = served ? { ref: served.ref, knowledgeNodeId: served.knowledgeNodeId, categoryId: served.categoryId, difficulty: served.difficulty } : undefined;
      let result = step(state, [
        { type: "AnswerRecorded", requestId: command.requestId, playerId: player.id, outcome: answer.outcome, explanationMastery: answer.explanationMastery, validationMode: answer.validationMode, question },
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

function reduceSession(state: GameState, command: SessionCommand): Result<Step, GameError> {
  switch (command.type) {
    case "AdvanceClock": {
      if (!Number.isFinite(command.seconds) || command.seconds < 0) return err({ code: "INVALID_CLOCK_DELTA", seconds: command.seconds });
      const activePlaySeconds = state.clock.activePlaySeconds + command.seconds;
      const condition = state.config.rules.endCondition;
      const reachedNow = condition.kind === "active_time" && !state.clock.timeTargetReached && activePlaySeconds >= condition.targetSeconds;
      const next: GameState = { ...state, clock: { activePlaySeconds, timeTargetReached: state.clock.timeTargetReached || reachedNow } };
      return ok(step(next, reachedNow ? [{ type: "TimeTargetReached", activePlaySeconds }] : []));
    }
    case "RequestGameEnd": {
      if (state.endRequested) return ok(step(state));
      return ok(step({ ...state, endRequested: true }, [{ type: "GameEndRequested" }]));
    }
    case "ServeQuestion": {
      if (state.phase.kind !== "awaiting_answer" || state.phase.requestId !== command.requestId) return err({ code: "NO_PENDING_QUESTION", requestId: command.requestId });
      if (state.phase.served) return err({ code: "QUESTION_ALREADY_SERVED", requestId: command.requestId });
      const player = activePlayer(state);
      const q = command.question;
      const question: AnsweredQuestion = { ref: q.ref, knowledgeNodeId: q.knowledgeNodeId, categoryId: q.categoryId, difficulty: q.difficulty };
      return ok(step({ ...state, phase: { ...state.phase, served: q } }, [{ type: "QuestionServed", requestId: command.requestId, playerId: player.id, question }]));
    }
  }
}

function expectPhase<K extends TurnPhase["kind"]>(state: GameState, kind: K): Result<Extract<TurnPhase, { kind: K }>, GameError> {
  if (state.phase.kind !== kind) return err({ code: "INVALID_PHASE", expected: kind, actual: state.phase.kind });
  return ok(state.phase as Extract<TurnPhase, { kind: K }>);
}
