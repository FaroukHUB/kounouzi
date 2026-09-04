import { resolveCell } from "./cells";
import { selectChallenge } from "./challenges";
import { affordableAmount, applyTransaction, poorestPlayer, richestPlayer, transferMoney } from "./economy";
import { queueEffect, clearEffects, takeEffect } from "./effects";
import { holdingOf, holdingsOf } from "./holdings";
import { applyMove, computePath, computePathTo } from "./movement";
import { cellAt } from "./board";
import { activePlayer, playerById, step, chain, updatePlayer, type Step } from "./step";
import { closeTurn } from "./turn";
import type { GameState, InsufficientPolicy, Outcome, TransferReason } from "./types";
import type { PlayerId } from "@/core/shared";

/**
 * Traite une file de résultats dans l'ordre. S'arrête sur le premier résultat
 * qui exige une décision humaine (en mémorisant le reste de la file dans la
 * phase) ; quand la file est vide, le tour se clôt.
 */
export function processQueue(state: GameState, initialQueue: readonly Outcome[]): Step {
  const queue = [...initialQueue];
  let result = step(state);
  const player = activePlayer(state);

  while (queue.length > 0) {
    const outcome = queue.shift()!;
    switch (outcome.kind) {
      case "money":
        result = chain(result, (s) => (outcome.amount >= 0 ? applyTransaction(s, player.id, outcome.amount, "scenario_gain") : applyPenalty(s, player.id, -outcome.amount, outcome.insufficient ?? "cap_to_balance", "money")));
        break;

      case "move":
      case "move_to": {
        result = chain(result, (s) => {
          const from = activePlayer(s).position;
          const plan = outcome.kind === "move" ? computePath(from, outcome.steps, s.config.board) : computePathTo(from, outcome.position, s.config.board);
          let moved = applyMove(s, player.id, plan);
          if (outcome.resolveDestination && plan.path.length > 0) {
            const cell = cellAt(moved.state.config.board, plan.to);
            moved = chain(moved, (m) => step(m, [{ type: "CellArrived", playerId: player.id, position: cell.position, cellType: cell.type }]));
            const resolution = resolveCell(moved.state, cell);
            moved = chain(moved, () => step(resolution.state, resolution.events));
            queue.unshift(...resolution.outcomes);
          }
          return moved;
        });
        break;
      }

      case "effect":
        result = chain(result, (s) => queueEffect(s, player.id, outcome.effect, outcome.expiresInTurns));
        break;

      case "halt":
        result = chain(result, (s) => step(updatePlayer(s, player.id, { halted: true }), [{ type: "JourneyHalted", playerId: player.id, position: activePlayer(s).position }]));
        break;

      case "question": {
        const s = result.state;
        const requestId = `q${s.counters.request + 1}`;
        const position = activePlayer(s).position;
        return chain(result, () =>
          step(
            { ...s, counters: { ...s.counters, request: s.counters.request + 1 }, phase: { kind: "awaiting_answer", requestId, position, purpose: { kind: "standard" }, queue: [...queue] } },
            [{ type: "QuestionRequested", requestId, playerId: player.id, position, purpose: "standard" }],
          ),
        );
      }

      case "heritage_offer": {
        const s = result.state;
        const owned = holdingOf(s, outcome.siteId);
        if (owned && owned.ownerId === player.id) {
          result = chain(result, () => step(s, [{ type: "HeritageRevisited", playerId: player.id, siteId: outcome.siteId }]));
          break;
        }
        if (owned) {
          // Visite de patrimoine : un Défi Patrimoine décide de la contribution due au propriétaire.
          const requestId = `q${s.counters.request + 1}`;
          const position = activePlayer(s).position;
          const contribution = s.config.rules.heritageVisit.contribution;
          return chain(result, () =>
            step(
              {
                ...s,
                counters: { ...s.counters, request: s.counters.request + 1 },
                phase: { kind: "awaiting_answer", requestId, position, purpose: { kind: "heritage_visit", siteId: outcome.siteId, ownerId: owned.ownerId }, queue: [...queue] },
              },
              [
                { type: "HeritageVisited", visitorId: player.id, ownerId: owned.ownerId, siteId: outcome.siteId, contribution },
                { type: "QuestionRequested", requestId, playerId: player.id, position, purpose: "heritage_visit" },
              ],
            ),
          );
        }
        const site = s.config.sites[outcome.siteId];
        if (!site) throw new Error(`site ${outcome.siteId} inconnu (invariant)`);
        const affordable = activePlayer(s).money >= site.price;
        return chain(result, () =>
          step({ ...s, phase: { kind: "awaiting_purchase", siteId: site.id, price: site.price, queue: [...queue] } }, [
            { type: "PurchaseOffered", playerId: player.id, siteId: site.id, price: site.price, affordable },
          ]),
        );
      }

      case "choice": {
        const s = result.state;
        return chain(result, () =>
          step({ ...s, phase: { kind: "awaiting_choice", choiceId: outcome.choiceId, options: outcome.options, queue: [...queue] } }, [
            { type: "ChoiceOffered", playerId: player.id, choiceId: outcome.choiceId, optionIds: outcome.options.map((o) => o.id) },
          ]),
        );
      }

      case "duel": {
        const s = result.state;
        const candidates = duelCandidates(s, player.id);
        if (candidates.length === 0) break;
        return chain(result, () => step({ ...s, phase: { kind: "awaiting_duel_opponent", candidates, queue: [...queue] } }, [{ type: "DuelOffered", challengerId: player.id, candidates }]));
      }

      case "family_challenge": {
        const s = result.state;
        const assigned = assignChallenge(s, player.id, []);
        if (!assigned) {
          result = chain(result, () => step(s, [{ type: "FamilyChallengeUnavailable", playerId: player.id }]));
          break;
        }
        return chain(result, () => assigned(queue));
      }

      case "transfer_choice": {
        const s = result.state;
        const candidates = s.players.filter((p) => p.id !== player.id).map((p) => p.id);
        const amount = affordableAmount(s, player.id, outcome.amount, outcome.insufficient);
        if (candidates.length === 0 || amount === null || amount === 0) {
          result = chain(result, () => step(s, [{ type: "OutcomeCancelled", playerId: player.id, kind: "transfer_choice", required: outcome.amount, available: activePlayer(s).money }]));
          break;
        }
        return chain(result, () =>
          step({ ...s, phase: { kind: "awaiting_recipient", amount: outcome.amount, reason: outcome.reason, insufficient: outcome.insufficient, candidates, queue: [...queue] } }, [
            { type: "RecipientChoiceOffered", playerId: player.id, amount: outcome.amount, reason: outcome.reason, candidates },
          ]),
        );
      }

      case "give_to_poorest":
        result = chain(result, (s) => {
          const to = poorestPlayer(s, player.id);
          return to ? transferWithSolidarity(s, player.id, to, outcome.amount, outcome.reason, outcome.insufficient) : step(s);
        });
        break;

      case "aid_from_richest":
        result = chain(result, (s) => {
          const from = richestPlayer(s);
          const to = poorestPlayer(s, from);
          return to && from !== to ? transferWithSolidarity(s, from, to, outcome.amount, "aid", outcome.insufficient) : step(s);
        });
        break;

      case "collective_fund":
        result = chain(result, (s) => {
          const to = poorestPlayer(s);
          if (!to) return step(s);
          let r = step(s);
          for (const p of s.players) if (p.id !== to) r = chain(r, (x) => transferWithSolidarity(x, p.id, to, outcome.amount, "collective_fund", outcome.insufficient));
          return r;
        });
        break;

      case "heritage_maintenance":
        result = chain(result, (s) => {
          const due = holdingsOf(s, player.id).length * outcome.amountPerSite;
          return due > 0 ? applyPenalty(s, player.id, due, outcome.insufficient, "heritage_maintenance") : step(s);
        });
        break;

      case "heritage_bonus":
        result = chain(result, (s) => {
          const gain = holdingsOf(s, player.id).length * outcome.amountPerSite;
          return gain > 0 ? applyTransaction(s, player.id, gain, "heritage_bonus") : step(s);
        });
        break;

      case "invest":
        result = chain(result, (s) => {
          const amount = affordableAmount(s, player.id, outcome.amount, outcome.insufficient);
          if (amount === null || amount === 0) return step(s, [{ type: "OutcomeCancelled", playerId: player.id, kind: "invest", required: outcome.amount, available: activePlayer(s).money }]);
          let r = applyTransaction(s, player.id, -amount, "investment");
          r = chain(r, (x) => queueEffect(x, player.id, { type: "investment_pending", payout: outcome.payout, consumeOn: "answer_recorded" }));
          return r;
        });
        break;

      case "save":
        result = chain(result, (s) => {
          const amount = affordableAmount(s, player.id, outcome.amount, outcome.insufficient);
          if (amount === null || amount === 0) return step(s, [{ type: "OutcomeCancelled", playerId: player.id, kind: "save", required: outcome.amount, available: activePlayer(s).money }]);
          let r = applyTransaction(s, player.id, -amount, "saving");
          r = chain(r, (x) => queueEffect(x, player.id, { type: "saving_pending", payout: outcome.payout, turnsRemaining: outcome.turns, consumeOn: "turn_end" }));
          return r;
        });
        break;

      case "clear_effects":
        result = chain(result, (s) => {
          let r = clearEffects(s, player.id, outcome.types);
          if (outcome.liftHalt && playerById(r.state, player.id).halted) r = chain(r, (x) => step(updatePlayer(x, player.id, { halted: false }), [{ type: "HaltLifted", playerId: player.id, outcome: "correct" }]));
          return r;
        });
        break;
    }
  }

  return chain(result, closeTurn);
}

/**
 * Propose un Défi famille au joueur : sélection déterministe cachée, compteur
 * de rotation avancé, défi compté comme proposé. Retourne `null` si aucun défi
 * n'est éligible ; sinon une fonction qui pose la phase avec la file restante.
 */
export function assignChallenge(state: GameState, playerId: PlayerId, exclude: readonly string[]): ((queue: readonly Outcome[]) => Step) | null {
  const definition = selectChallenge(state, playerId, exclude);
  if (!definition) return null;
  return (queue) => {
    const requestId = `q${state.counters.request + 1}`;
    const next: GameState = {
      ...state,
      counters: { ...state.counters, request: state.counters.request + 1, challenge: state.counters.challenge + 1 },
      challengeServed: { ...state.challengeServed, [playerId]: { ...(state.challengeServed[playerId] ?? {}), [definition.id]: ((state.challengeServed[playerId] ?? {})[definition.id] ?? 0) + 1 } },
      phase: { kind: "awaiting_challenge", challenge: { challengeId: definition.id, playerId, requestId, stage: "assigned" }, queue: [...queue] },
    };
    return step(next, [
      { type: "FamilyChallengeAssigned", playerId, challengeId: definition.id, requestId, category: definition.category, reward: definition.reward, ohNo: definition.ohNo, consentRequired: definition.consentRequired },
    ]);
  };
}

/**
 * Adversaires proposés : tous les autres joueurs, sauf l'adversaire du dernier
 * Duel déclenché par ce joueur quand un autre adversaire existe (à deux
 * joueurs, la règle ne s'applique pas). Il redevient disponible au Duel suivant.
 */
export function duelCandidates(state: GameState, challengerId: PlayerId): readonly PlayerId[] {
  const others = state.players.filter((p) => p.id !== challengerId).map((p) => p.id);
  const last = playerById(state, challengerId).lastDuelOpponentId;
  const available = last ? others.filter((id) => id !== last) : others;
  return available.length > 0 ? available : others;
}

/**
 * Perte de scénario : une protection (`penalty_shield`) couvrant le montant
 * l'annule ; sinon la politique déclarée décide de ce qui est réellement
 * débité. Jamais de solde négatif involontaire.
 */
export function applyPenalty(state: GameState, playerId: PlayerId, requested: number, policy: InsufficientPolicy, kind: string): Step {
  const shield = takeEffect(state, playerId, "penalty_shield", (spec) => spec.maxAmount >= requested);
  if (shield.effect && shield.effectId !== undefined) {
    const effectId = shield.effectId;
    return chain(shield.step, (s) => step(s, [{ type: "PenaltyShielded", playerId, effectId, amount: requested }]));
  }
  const amount = affordableAmount(state, playerId, requested, policy);
  if (amount === null) return step(state, [{ type: "OutcomeCancelled", playerId, kind, required: requested, available: playerById(state, playerId).money }]);
  if (amount === 0) return step(state);
  return applyTransaction(state, playerId, -amount, kind === "heritage_maintenance" ? "heritage_maintenance" : "scenario_loss");
}

/** Transfert tracé comme action de solidarité pour le donateur (dimension à part, sans formule de score). */
export function transferWithSolidarity(state: GameState, from: PlayerId, to: PlayerId, amount: number, reason: TransferReason, policy: InsufficientPolicy): Step {
  const before = state.counters.transfer;
  let result = transferMoney(state, from, to, amount, reason, policy);
  if (result.state.counters.transfer === before) return result;
  const moved = result.events.find((e) => e.type === "MoneyTransferred");
  const actual = moved?.type === "MoneyTransferred" ? moved.amount : 0;
  const giver = playerById(result.state, from);
  result = chain(result, (s) => step(updatePlayer(s, from, { solidarityActions: giver.solidarityActions + 1, solidarityGiven: giver.solidarityGiven + actual }), [{ type: "SolidarityActionRecorded", playerId: from, beneficiaryId: to, amount: actual, reason }]));
  return result;
}
