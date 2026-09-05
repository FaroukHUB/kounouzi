import { err, ok, type AnswerOutcome, type PlayerId, type Result } from "@/core/shared";
import { cellAt } from "./board";
import { resolveCell } from "./cells";
import { isPlayerCommand, type Command, type PlayerCommand, type SessionCommand } from "./commands";
import { applyTransaction, transferMoney } from "./economy";
import { duelWinner } from "./duel";
import { takeEffect } from "./effects";
import type { GameError } from "./errors";
import { purchaseSite } from "./holdings";
import { assignJourneySteps } from "./journeyScheduler";
import { applyMove, computePath } from "./movement";
import { assignChallenge, processQueue, transferWithSolidarity } from "./outcomes";
import { challengeById } from "./challenges";
import { computeReward } from "./rewards";
import { activePlayer, chain, playerById, step, updatePlayer, type Step } from "./step";
import { closeTurn } from "./turn";
import type { AnsweredQuestion, AnswerRecord, DuelState, GameState, TurnPhase } from "./types";
import type { ServedQuestion } from "@/core/content/types";

/**
 * Le contrat du moteur : `(état, commande) → (nouvel état, événements)`.
 * Pur, synchrone, entièrement déterministe : aucun hasard, aucune horloge
 * système, aucun réseau. Une commande invalide est refusée sans modifier l'état.
 */
export function reduce(state: GameState, command: Command): Result<Step, GameError> {
  if (state.status === "finished") return err({ code: "GAME_FINISHED" });
  if (!isPlayerCommand(command)) return reduceSession(state, command);

  const expected = expectedResponder(state, command);
  if (command.playerId !== expected) return err({ code: "NOT_ACTIVE_PLAYER", expected, received: command.playerId });
  const player = activePlayer(state);

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

    case "SubmitAnswer":
      return state.phase.kind === "awaiting_duel" ? submitDuelAnswer(state, state.phase, command) : submitAnswer(state, command);

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
      // Une option exigeant le montant complet est refusée si le joueur ne peut pas payer (jamais de solde négatif involontaire).
      for (const o of option.outcomes) {
        const required = requiredFullAmount(o);
        if (required !== null && player.money < required) return err({ code: "INSUFFICIENT_FUNDS", required, available: player.money });
      }
      const result = step(state, [{ type: "ChoiceMade", playerId: player.id, choiceId: command.choiceId, optionId: option.id }]);
      const queue = [...option.outcomes, ...phase.value.queue];
      return ok(chain(result, (s) => processQueue(s, queue)));
    }

    case "ChooseOpponent": {
      const phase = expectPhase(state, "awaiting_duel_opponent");
      if (!phase.ok) return phase;
      if (!phase.value.candidates.includes(command.opponentId)) return err({ code: "INVALID_OPPONENT", opponentId: command.opponentId });
      const challengerRequestId = `q${state.counters.request + 1}`;
      const opponentRequestId = `q${state.counters.request + 2}`;
      const duel: DuelState = { challengerId: player.id, opponentId: command.opponentId, categoryId: null, challengerRequestId, opponentRequestId, stage: "challenger" };
      const remembered = updatePlayer(state, player.id, { lastDuelOpponentId: command.opponentId });
      const next: GameState = { ...remembered, counters: { ...state.counters, request: state.counters.request + 2 }, phase: { kind: "awaiting_duel", duel, queue: phase.value.queue } };
      return ok(
        step(next, [
          { type: "DuelStarted", challengerId: player.id, opponentId: command.opponentId },
          { type: "DuelTurn", duelistId: player.id, requestId: challengerRequestId, categoryId: null },
          { type: "QuestionRequested", requestId: challengerRequestId, playerId: player.id, position: player.position, purpose: "duel" },
        ]),
      );
    }

    case "ChooseRecipient": {
      const phase = expectPhase(state, "awaiting_recipient");
      if (!phase.ok) return phase;
      if (!phase.value.candidates.includes(command.recipientId)) return err({ code: "INVALID_RECIPIENT", recipientId: command.recipientId });
      const { amount, reason, insufficient, queue } = phase.value;
      const result = reason === "gift" ? transferMoney(state, player.id, command.recipientId, amount, reason, insufficient) : transferWithSolidarity(state, player.id, command.recipientId, amount, reason, insufficient);
      return ok(chain(result, (s) => processQueue(s, queue)));
    }

    case "AcceptChallenge": {
      const phase = expectPhase(state, "awaiting_challenge");
      if (!phase.ok) return phase;
      const challenge = phase.value.challenge;
      if (challenge.stage !== "assigned") return err({ code: "CHALLENGE_STAGE", expected: "assigned", actual: challenge.stage });
      return ok(step({ ...state, phase: { ...phase.value, challenge: { ...challenge, stage: "accepted" } } }, [{ type: "FamilyChallengeAccepted", playerId: player.id, challengeId: challenge.challengeId }]));
    }

    case "CompleteChallenge": {
      const phase = expectPhase(state, "awaiting_challenge");
      if (!phase.ok) return phase;
      const challenge = phase.value.challenge;
      if (challenge.stage !== "accepted") return err({ code: "CHALLENGE_STAGE", expected: "accepted", actual: challenge.stage });
      const definition = challengeById(state, challenge.challengeId);
      if (!definition) throw new Error(`défi ${challenge.challengeId} inconnu (invariant)`);
      let result = step(state, [{ type: "FamilyChallengeCompleted", playerId: player.id, challengeId: definition.id, success: command.success, ...(challenge.served ? { requestId: challenge.requestId, question: summary(challenge.served) } : {}) }]);
      // Réussi : le gain est crédité EXACTEMENT une fois (jamais de multiplicateur de question) ; raté : rien.
      if (command.success && definition.reward > 0) {
        result = chain(result, (s) => step(s, [{ type: "ChallengeRewardGranted", playerId: player.id, challengeId: definition.id, amount: definition.reward }]));
        result = chain(result, (s) => applyTransaction(s, player.id, definition.reward, "challenge_reward", definition.id));
      }
      // Récitation réussie : chaque sourate pas encore maîtrisée le devient (état de récitation du joueur, jamais un texte).
      if (command.success && challenge.surahIds) {
        for (const surahId of challenge.surahIds) {
          if (playerById(result.state, player.id).masteredSurahs.includes(surahId)) continue;
          result = chain(result, (s) => step(updatePlayer(s, player.id, { masteredSurahs: [...playerById(s, player.id).masteredSurahs, surahId] }), [{ type: "RecitationMastered", playerId: player.id, surahId }]));
        }
      }
      const queue = command.success ? [...(definition.onSuccess ?? []), ...phase.value.queue] : phase.value.queue;
      return ok(chain(result, (s) => processQueue(s, queue)));
    }

    case "SkipChallenge": {
      const phase = expectPhase(state, "awaiting_challenge");
      if (!phase.ok) return phase;
      const challenge = phase.value.challenge;
      // Refus : 0 Kounouz, aucune autre pénalité.
      const result = step(state, [{ type: "FamilyChallengeSkipped", playerId: player.id, challengeId: challenge.challengeId, reason: command.reason }]);
      if (command.reason === "consent_refused") {
        // L'autre personne refuse : aucun échec, le défi éligible suivant est proposé (déterministe).
        const next = assignChallenge(result.state, player.id, [challenge.challengeId]);
        if (next) return ok(chain(result, () => next(phase.value.queue)));
      }
      return ok(chain(result, (s) => processQueue(s, phase.value.queue)));
    }
  }
}

/** Qui doit répondre : le joueur actif, sauf pendant un Duel où c'est le dueliste en cours. */
function expectedResponder(state: GameState, command: PlayerCommand): PlayerId {
  if (command.type === "SubmitAnswer" && state.phase.kind === "awaiting_duel") {
    return state.phase.duel.stage === "challenger" ? state.phase.duel.challengerId : state.phase.duel.opponentId;
  }
  return activePlayer(state).id;
}

function requiredFullAmount(outcome: { readonly kind: string; readonly amount?: number; readonly insufficient?: string | undefined }): number | null {
  if (outcome.insufficient !== "require_full_amount" || typeof outcome.amount !== "number") return null;
  return outcome.kind === "money" ? Math.max(0, -outcome.amount) : outcome.amount;
}

const summary = (q: ServedQuestion): AnsweredQuestion => ({ ref: q.ref, knowledgeNodeId: q.knowledgeNodeId, categoryId: q.categoryId, difficulty: q.difficulty });

/**
 * Récompense d'une réponse : montant de base (règles) × multiplicateur en
 * attente + bonus fixe en attente ; puis un investissement en attente est
 * réglé par le résultat. Rien n'est versé sans événement.
 */
function rewardAnswer(state: GameState, playerId: PlayerId, requestId: string, answer: AnswerRecord): Step {
  const boost = takeEffect(state, playerId, "reward_multiplier");
  const reward = computeReward(state.config.rules, answer, boost.effect?.multiplier ?? 1);
  let result = step(state);
  if (reward.amount > 0) {
    if (boost.effect?.consumeOn === "reward_granted") result = chain(result, () => boost.step);
    const bonusEffect = takeEffect(result.state, playerId, "next_reward_bonus");
    const bonus = bonusEffect.effect?.amount ?? 0;
    if (bonusEffect.effect) result = chain(result, () => bonusEffect.step);
    const amount = reward.amount + bonus;
    result = chain(result, (s) => step(s, [{ type: "RewardGranted", requestId, playerId, base: reward.base, multiplier: reward.multiplier, bonus, amount }]));
    result = chain(result, (s) => applyTransaction(s, playerId, amount, "question_reward", requestId));
  }
  const investment = takeEffect(result.state, playerId, "investment_pending");
  if (investment.effect && investment.effectId !== undefined) {
    const effectId = investment.effectId;
    const payout = investment.effect.payout[answer.outcome];
    result = chain(result, () => investment.step);
    result = chain(result, (s) => step(s, [{ type: "InvestmentSettled", playerId, effectId, outcome: answer.outcome, payout }]));
    if (payout > 0) result = chain(result, (s) => applyTransaction(s, playerId, payout, "investment_payout", effectId));
  }
  return result;
}

function submitAnswer(state: GameState, command: Extract<PlayerCommand, { type: "SubmitAnswer" }>): Result<Step, GameError> {
  const phase = expectPhase(state, "awaiting_answer");
  if (!phase.ok) return phase;
  if (phase.value.requestId !== command.requestId) return err({ code: "REQUEST_MISMATCH", expected: phase.value.requestId, received: command.requestId });
  const player = activePlayer(state);
  const { answer } = command;
  const served = phase.value.served;
  const purpose = phase.value.purpose;
  let result = step(state, [
    { type: "AnswerRecorded", requestId: command.requestId, playerId: player.id, outcome: answer.outcome, explanationMastery: answer.explanationMastery, validationMode: answer.validationMode, purpose: purpose.kind, question: served ? summary(served) : undefined },
  ]);
  const queue = phase.value.queue;
  switch (purpose.kind) {
    case "standard":
      result = chain(result, (s) => rewardAnswer(s, player.id, command.requestId, answer));
      return ok(chain(result, (s) => processQueue(s, queue)));
    case "halt": {
      result = chain(result, (s) => rewardAnswer(s, player.id, command.requestId, answer));
      if (answer.outcome === "incorrect") {
        // Pas de déplacement ce tour ; la Halte est levée pour le tour suivant : personne ne reste bloqué plusieurs tours.
        result = chain(result, (s) => step(updatePlayer(s, player.id, { halted: false }), [{ type: "HaltTurnLost", playerId: player.id }]));
        return ok(chain(result, closeTurn));
      }
      result = chain(result, (s) => step({ ...updatePlayer(s, player.id, { halted: false }), phase: { kind: "awaiting_journey" } }, [{ type: "HaltLifted", playerId: player.id, outcome: answer.outcome }]));
      return ok(result);
    }
    case "heritage_visit": {
      // « Réponds bien, sinon tu dois me payer » : la contribution dépend du résultat, jamais de la vitesse.
      const { contribution, insufficient } = state.config.rules.heritageVisit;
      const due = contribution[answer.outcome];
      if (due > 0) result = chain(result, (s) => transferMoney(s, player.id, purpose.ownerId, due, "heritage_contribution", insufficient));
      return ok(chain(result, (s) => processQueue(s, queue)));
    }
  }
}

function submitDuelAnswer(state: GameState, phase: Extract<TurnPhase, { kind: "awaiting_duel" }>, command: Extract<PlayerCommand, { type: "SubmitAnswer" }>): Result<Step, GameError> {
  const duel = phase.duel;
  const isChallenger = duel.stage === "challenger";
  const expectedRequest = isChallenger ? duel.challengerRequestId : duel.opponentRequestId;
  if (expectedRequest !== command.requestId) return err({ code: "REQUEST_MISMATCH", expected: expectedRequest, received: command.requestId });
  const duelist = command.playerId;
  const served = isChallenger ? duel.challengerServed : duel.opponentServed;
  const { answer } = command;
  let result = step(state, [
    { type: "AnswerRecorded", requestId: command.requestId, playerId: duelist, outcome: answer.outcome, explanationMastery: answer.explanationMastery, validationMode: answer.validationMode, purpose: "duel", question: served ? summary(served) : undefined },
  ]);
  // Chaque dueliste garde sa récompense individuelle (y compris le ×2 de maîtrise) : elle ne départage jamais le Duel.
  result = chain(result, (s) => rewardAnswer(s, duelist, command.requestId, answer));

  if (isChallenger) {
    const next: DuelState = { ...duel, challengerOutcome: answer.outcome, stage: "opponent" };
    const opponent = playerById(state, duel.opponentId);
    return ok(
      chain(result, (s) =>
        step({ ...s, phase: { kind: "awaiting_duel", duel: next, queue: phase.queue } }, [
          { type: "DuelTurn", duelistId: duel.opponentId, requestId: duel.opponentRequestId, categoryId: duel.categoryId },
          { type: "QuestionRequested", requestId: duel.opponentRequestId, playerId: duel.opponentId, position: opponent.position, purpose: "duel" },
        ]),
      ),
    );
  }

  const challengerOutcome: AnswerOutcome = duel.challengerOutcome ?? "incorrect";
  const winnerId = duelWinner(duel.challengerId, challengerOutcome, duel.opponentId, answer.outcome);
  result = chain(result, (s) =>
    step(s, [{ type: "DuelResolved", challengerId: duel.challengerId, opponentId: duel.opponentId, categoryId: duel.categoryId, challengerOutcome, opponentOutcome: answer.outcome, winnerId }]),
  );
  const { winBonus, drawBonus, loseBonus } = state.config.rules.duel;
  for (const id of [duel.challengerId, duel.opponentId]) {
    const bonus = winnerId === null ? drawBonus : winnerId === id ? winBonus : loseBonus;
    if (bonus > 0) result = chain(result, (s) => applyTransaction(s, id, bonus, "duel_reward", `${duel.challengerRequestId}+${duel.opponentRequestId}`));
  }
  return ok(chain(result, (s) => processQueue(s, phase.queue)));
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
    case "ServeQuestion":
      return serveQuestion(state, command.requestId, command.question);
    case "SetChallengeSettings": {
      const next: GameState = { ...state, config: { ...state.config, challenges: { ...state.config.challenges, settings: command.settings } } };
      return ok(step(next, [{ type: "ChallengeSettingsChanged", settings: command.settings }]));
    }
  }
}

function serveQuestion(state: GameState, requestId: string, q: ServedQuestion): Result<Step, GameError> {
  if (state.phase.kind === "awaiting_answer" && state.phase.requestId === requestId) {
    if (state.phase.served) return err({ code: "QUESTION_ALREADY_SERVED", requestId });
    const player = activePlayer(state);
    return ok(step({ ...state, phase: { ...state.phase, served: q } }, [{ type: "QuestionServed", requestId, playerId: player.id, question: summary(q) }]));
  }
  if (state.phase.kind === "awaiting_challenge" && state.phase.challenge.requestId === requestId) {
    // Défi à contenu validé : la question est figée sur la demande du défi (reprise exacte).
    if (state.phase.challenge.served) return err({ code: "QUESTION_ALREADY_SERVED", requestId });
    const definition = challengeById(state, state.phase.challenge.challengeId);
    const ref = definition?.contentRef;
    if (!ref || ref.kind !== "validated_question") return err({ code: "NO_PENDING_QUESTION", requestId });
    if (ref.categoryId !== "any" && q.categoryId !== ref.categoryId) return err({ code: "DUEL_CATEGORY_MISMATCH", expected: ref.categoryId, received: q.categoryId });
    const challenge = { ...state.phase.challenge, served: q };
    return ok(step({ ...state, phase: { ...state.phase, challenge } }, [{ type: "QuestionServed", requestId, playerId: challenge.playerId, question: summary(q) }]));
  }
  if (state.phase.kind === "awaiting_duel") {
    const duel = state.phase.duel;
    if (requestId === duel.challengerRequestId) {
      if (duel.challengerServed) return err({ code: "QUESTION_ALREADY_SERVED", requestId });
      // La catégorie commune du Duel est fixée par la première question servie.
      const next: DuelState = { ...duel, challengerServed: q, categoryId: q.categoryId };
      return ok(step({ ...state, phase: { ...state.phase, duel: next } }, [{ type: "QuestionServed", requestId, playerId: duel.challengerId, question: summary(q) }]));
    }
    if (requestId === duel.opponentRequestId) {
      if (duel.opponentServed) return err({ code: "QUESTION_ALREADY_SERVED", requestId });
      if (duel.categoryId !== null && q.categoryId !== duel.categoryId) return err({ code: "DUEL_CATEGORY_MISMATCH", expected: duel.categoryId, received: q.categoryId });
      const next: DuelState = { ...duel, opponentServed: q, categoryId: duel.categoryId ?? q.categoryId };
      return ok(step({ ...state, phase: { ...state.phase, duel: next } }, [{ type: "QuestionServed", requestId, playerId: duel.opponentId, question: summary(q) }]));
    }
  }
  return err({ code: "NO_PENDING_QUESTION", requestId });
}

function expectPhase<K extends TurnPhase["kind"]>(state: GameState, kind: K): Result<Extract<TurnPhase, { kind: K }>, GameError> {
  if (state.phase.kind !== kind) return err({ code: "INVALID_PHASE", expected: kind, actual: state.phase.kind });
  return ok(state.phase as Extract<TurnPhase, { kind: K }>);
}
