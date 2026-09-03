import { activePlayer, type Step } from "./step";
import type { GameState, Outcome, ResolvedCell } from "./types";

export interface CellResolution extends Step {
  readonly outcomes: readonly Outcome[];
}

/**
 * Traduit une arrivée sur une case en séquence de résultats et enregistre la
 * visite. Aucun contenu ici : une case question demande une question, une
 * case monument propose son site, les autres servent leurs scénarios
 * configurés DANS L'ORDRE, selon le nombre de visites de la case
 * (visite 1 → premier scénario, visite 2 → second, …). Aucun tirage au sort.
 */
export function resolveCell(state: GameState, cell: ResolvedCell): CellResolution {
  const key = String(cell.position);
  const visit = (state.cellVisits[key] ?? 0) + 1;
  const visited: GameState = { ...state, cellVisits: { ...state.cellVisits, [key]: visit } };

  switch (cell.type) {
    case "start":
      return { state: visited, events: [], outcomes: [] };
    case "question":
      return { state: visited, events: [], outcomes: [{ kind: "question" }] };
    case "heritage":
      return { state: visited, events: [], outcomes: [{ kind: "heritage_offer", siteId: cell.siteId }] };
    case "event":
    case "management":
    case "challenge":
    case "solidarity":
    case "treasure": {
      const candidates = visited.config.scenarios.filter((s) => s.cellType === cell.type);
      if (candidates.length === 0) return { state: visited, events: [], outcomes: [] };
      const scenario = candidates[(visit - 1) % candidates.length]!;
      const player = activePlayer(visited);
      return {
        state: visited,
        events: [{ type: "ScenarioTriggered", playerId: player.id, scenarioId: scenario.id, cellType: cell.type, visit }],
        outcomes: scenario.outcomes,
      };
    }
  }
}
