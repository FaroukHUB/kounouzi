import { expect } from "vitest";
import { BOARD_32_V1 } from "@/config/board";
import {
  checkInvariants,
  createGame,
  reduce,
  type AnswerRecord,
  type BoardConfig,
  type ChoiceOption,
  type Command,
  type GameEvent,
  type GameSetup,
  type GameState,
  type PlayerSetup,
} from "@/core/game";
import type { GameId, PlayerId } from "@/core/shared";
import { TEST_MONUMENTS } from "./heritage.fixture";
import { TEST_RULES_QUICK } from "./rules.fixture";
import { TEST_SCENARIOS } from "./scenarios.fixture";

export const pid = (s: string): PlayerId => s as PlayerId;

/** n joueurs en alternance enfant/adulte : le moteur ne doit faire aucune différence. */
export function players(n: number): readonly PlayerSetup[] {
  return Array.from({ length: n }, (_, i) => ({
    id: pid(`p${i + 1}`),
    displayName: `Joueur ${i + 1}`,
    profileType: i % 2 === 0 ? "child" : "adult",
  }));
}

/** Petit plateau linéaire pour les tests ciblés : la première roue `v` mène à la case `v`. */
export const TEST_BOARD_LINE: BoardConfig = {
  id: "board-test-line",
  version: 1,
  cellCount: 8,
  cells: [
    { position: 0, type: "start" },
    { position: 1, type: "question" },
    { position: 2, type: "heritage" },
    { position: 3, type: "event" },
    { position: 4, type: "management" },
    { position: 5, type: "treasure" },
    { position: 6, type: "challenge" },
    { position: 7, type: "solidarity" },
  ],
};

export function makeSetup(overrides: Partial<GameSetup> = {}): GameSetup {
  return {
    gameId: "game-test" as GameId,
    seed: 42,
    players: players(3),
    board: BOARD_32_V1,
    heritageSites: TEST_MONUMENTS,
    scenarios: TEST_SCENARIOS,
    rules: TEST_RULES_QUICK,
    ...overrides,
  };
}

/** Plateau de test + un seul monument (une seule case heritage). */
export function makeLineSetup(overrides: Partial<GameSetup> = {}): GameSetup {
  return makeSetup({ board: TEST_BOARD_LINE, heritageSites: [TEST_MONUMENTS[0]!], scenarios: [], ...overrides });
}

export function create(setup: GameSetup = makeSetup()): { state: GameState; events: readonly GameEvent[] } {
  const result = createGame(setup);
  if (!result.ok) throw new Error(`createGame: ${JSON.stringify(result.error)}`);
  expect(checkInvariants(result.value.state)).toEqual([]);
  return result.value;
}

/** Applique une commande attendue valide et vérifie les invariants. */
export function run(state: GameState, command: Command): { state: GameState; events: readonly GameEvent[] } {
  const result = reduce(state, command);
  if (!result.ok) throw new Error(`reduce(${command.type}): ${JSON.stringify(result.error)}`);
  expect(checkInvariants(result.value.state)).toEqual([]);
  return result.value;
}

export function active(state: GameState): PlayerId {
  return state.players[state.activePlayerIndex]!.id;
}

export const answer = (outcome: AnswerRecord["outcome"], explanationMastery: AnswerRecord["explanationMastery"] = "none"): AnswerRecord => ({
  outcome,
  explanationMastery,
  validationMode: "collective",
});

export interface Policy {
  answer(index: number): AnswerRecord;
  buy(affordable: boolean, index: number): boolean;
  choose(options: readonly ChoiceOption[], index: number): string;
}

const ANSWER_CYCLE: readonly AnswerRecord[] = [
  answer("correct"),
  answer("correct", "fr"),
  answer("partial"),
  answer("incorrect"),
  answer("correct", "both"),
  { outcome: "correct", explanationMastery: "ar", validationMode: "self" },
];

export const DEFAULT_POLICY: Policy = {
  answer: (i) => ANSWER_CYCLE[i % ANSWER_CYCLE.length]!,
  buy: (affordable) => affordable,
  choose: (options, i) => options[i % options.length]!.id,
};

export interface Simulation {
  readonly state: GameState;
  readonly events: readonly GameEvent[];
  readonly commands: readonly Command[];
}

/** Joue une partie complète sans React ni navigateur, en vérifiant les invariants à chaque pas. */
export function simulate(setup: GameSetup, policy: Policy = DEFAULT_POLICY, maxCommands = 5000): Simulation {
  const created = create(setup);
  let state = created.state;
  const events: GameEvent[] = [...created.events];
  const commands: Command[] = [];
  let answers = 0;
  let purchases = 0;
  let choices = 0;

  while (state.status === "in_progress") {
    if (commands.length >= maxCommands) throw new Error("simulation: trop de commandes (boucle ?)");
    const playerId = active(state);
    let command: Command;
    switch (state.phase.kind) {
      case "awaiting_spin":
        command = { type: "SpinWheel", playerId };
        break;
      case "awaiting_answer":
        command = { type: "SubmitAnswer", playerId, requestId: state.phase.requestId, answer: policy.answer(answers++) };
        break;
      case "awaiting_purchase": {
        const affordable = state.players[state.activePlayerIndex]!.money >= state.phase.price;
        command = { type: "DecidePurchase", playerId, siteId: state.phase.siteId, buy: policy.buy(affordable, purchases++) };
        break;
      }
      case "awaiting_choice":
        command = { type: "Choose", playerId, choiceId: state.phase.choiceId, optionId: policy.choose(state.phase.options, choices++) };
        break;
      case "finished":
        throw new Error("phase finished avec status in_progress (invariant)");
    }
    const next = run(state, command);
    state = next.state;
    events.push(...next.events);
    commands.push(command);
  }
  return { state, events, commands };
}

export const eventsOf = <T extends GameEvent["type"]>(events: readonly GameEvent[], type: T): readonly Extract<GameEvent, { type: T }>[] =>
  events.filter((e): e is Extract<GameEvent, { type: T }> => e.type === type);

/** Cherche une graine dont la partie satisfait un prédicat (déterministe : premier seed trouvé). */
export function findSeed(predicate: (seed: number) => boolean, max = 5000): number {
  for (let seed = 1; seed <= max; seed += 1) if (predicate(seed)) return seed;
  throw new Error("findSeed: aucune graine trouvée");
}

/** Graine dont la première roue vaut `value` pour un setup donné (sans scénario consommant le RNG avant). */
export function seedForFirstSpin(value: number, setup: GameSetup = makeLineSetup()): number {
  return findSeed((seed) => {
    const { state } = create({ ...setup, seed });
    const spun = run(state, { type: "SpinWheel", playerId: active(state) });
    return eventsOf(spun.events, "WheelSpun")[0]?.value === value;
  });
}

/** Joue avec la politique par défaut jusqu'à ce que le prédicat soit vrai (ou la partie finie). */
export function advanceUntil(
  start: GameState,
  stop: (state: GameState, events: readonly GameEvent[]) => boolean,
  policy: Policy = DEFAULT_POLICY,
  maxCommands = 500,
): { state: GameState; events: readonly GameEvent[] } {
  let state = start;
  const events: GameEvent[] = [];
  let i = 0;
  while (state.status === "in_progress" && !stop(state, events)) {
    if (i++ >= maxCommands) throw new Error("advanceUntil: limite atteinte");
    const playerId = active(state);
    let command: Command;
    switch (state.phase.kind) {
      case "awaiting_spin":
        command = { type: "SpinWheel", playerId };
        break;
      case "awaiting_answer":
        command = { type: "SubmitAnswer", playerId, requestId: state.phase.requestId, answer: policy.answer(i) };
        break;
      case "awaiting_purchase":
        command = { type: "DecidePurchase", playerId, siteId: state.phase.siteId, buy: false };
        break;
      case "awaiting_choice":
        command = { type: "Choose", playerId, choiceId: state.phase.choiceId, optionId: policy.choose(state.phase.options, i) };
        break;
      case "finished":
        throw new Error("finished");
    }
    const next = run(state, command);
    state = next.state;
    events.push(...next.events);
  }
  return { state, events };
}
