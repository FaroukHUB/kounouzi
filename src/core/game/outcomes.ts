import { resolveCell } from "./cells";
import { applyTransaction } from "./economy";
import { queueEffect } from "./effects";
import { holdingOf } from "./holdings";
import { applyMove, computePath, computePathTo } from "./movement";
import { cellAt } from "./board";
import { activePlayer, step, chain, type Step } from "./step";
import { closeTurn } from "./turn";
import type { Outcome } from "./types";
import type { GameState } from "./types";

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
        result = chain(result, (s) => applyTransaction(s, player.id, outcome.amount, outcome.amount >= 0 ? "scenario_gain" : "scenario_loss"));
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
        result = chain(result, (s) => queueEffect(s, player.id, outcome.effect));
        break;

      case "question": {
        const s = result.state;
        const requestId = `q${s.counters.request + 1}`;
        const position = activePlayer(s).position;
        return chain(result, () =>
          step(
            { ...s, counters: { ...s.counters, request: s.counters.request + 1 }, phase: { kind: "awaiting_answer", requestId, position, queue: [...queue] } },
            [{ type: "QuestionRequested", requestId, playerId: player.id, position }],
          ),
        );
      }

      case "heritage_offer": {
        const s = result.state;
        const owned = holdingOf(s, outcome.siteId);
        if (owned) {
          result = chain(result, () => step(s, [{ type: "SiteAlreadyOwned", playerId: player.id, siteId: outcome.siteId, ownerId: owned.ownerId }]));
          break;
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
    }
  }

  return chain(result, closeTurn);
}
