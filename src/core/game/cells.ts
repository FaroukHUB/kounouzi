import { nextInt } from "./rng";
import { activePlayer, type Step } from "./step";
import type { GameState, Outcome, ResolvedCell } from "./types";

export interface CellResolution extends Step {
  readonly outcomes: readonly Outcome[];
}

/**
 * Traduit une case en séquence de résultats. Aucun contenu ici : une case
 * question demande une question, une case monument propose son site, les
 * autres tirent un scénario configuré pour leur type (ou rien s'il n'y en a pas).
 */
export function resolveCell(state: GameState, cell: ResolvedCell): CellResolution {
  switch (cell.type) {
    case "start":
      return { state, events: [], outcomes: [] };
    case "question":
      return { state, events: [], outcomes: [{ kind: "question" }] };
    case "heritage":
      return { state, events: [], outcomes: [{ kind: "heritage_offer", siteId: cell.siteId }] };
    case "event":
    case "management":
    case "challenge":
    case "solidarity":
    case "treasure":
      return pickScenario(state, cell);
  }
}

function pickScenario(state: GameState, cell: ResolvedCell): CellResolution {
  const candidates = state.config.scenarios.filter((s) => s.cellType === cell.type);
  if (candidates.length === 0) return { state, events: [], outcomes: [] };
  const [index, rng] = nextInt(state.rng, 0, candidates.length - 1);
  const scenario = candidates[index]!;
  const player = activePlayer(state);
  return {
    state: { ...state, rng },
    events: [{ type: "ScenarioTriggered", playerId: player.id, scenarioId: scenario.id, cellType: cell.type }],
    outcomes: scenario.outcomes,
  };
}
