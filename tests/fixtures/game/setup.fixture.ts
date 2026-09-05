import { expect } from "vitest";
import { DEFAULT_BOARD } from "@/config/board";
import { JOURNEY_CYCLE_V1 } from "@/config/journey";
import {
  checkInvariants,
  createGame,
  reduce,
  type AnswerRecord,
  type BoardConfig,
  type CellType,
  type ChoiceOption,
  type Command,
  type GameEvent,
  type GameSetup,
  type GameState,
  type MoneyDestination,
  type PlayerSetup,
} from "@/core/game";
import type { GameId, PlayerId } from "@/core/shared";
import { TEST_MONUMENTS } from "./heritage.fixture";
import { ONE_STEP_CYCLE } from "./journey.fixture";
import { TEST_RULES_QUICK } from "./rules.fixture";
import { TEST_SCENARIOS } from "./scenarios.fixture";

export const pid = (s: string): PlayerId => s as PlayerId;

/** n joueurs en alternance enfant/adulte : le moteur ne doit faire aucune différence. */
export function players(n: number): readonly PlayerSetup[] {
  return Array.from({ length: n }, (_, i) => ({ id: pid(`p${i + 1}`), displayName: `Joueur ${i + 1}`, profileType: i % 2 === 0 ? "child" : "adult" }));
}

const LINE_DEFAULT: readonly CellType[] = ["start", "question", "heritage", "event", "management", "treasure", "challenge", "solidarity"];

/** Petit plateau linéaire de 8 cases ; `overrides` remplace le type de certaines positions. */
export function lineBoard(overrides: Readonly<Record<number, CellType>> = {}): BoardConfig {
  const cells = LINE_DEFAULT.map((type, position) => ({ position, type: overrides[position] ?? type }));
  return { id: "board-test-line", version: 1, cellCount: cells.length, cells };
}

export function makeSetup(overrides: Partial<GameSetup> = {}): GameSetup {
  return {
    gameId: "game-test" as GameId,
    players: players(3),
    board: DEFAULT_BOARD,
    heritageSites: TEST_MONUMENTS,
    scenarios: TEST_SCENARIOS,
    rules: TEST_RULES_QUICK,
    journey: JOURNEY_CYCLE_V1,
    ...overrides,
  };
}

/**
 * Plateau linéaire + cycle à 1 étape : le premier Chemin de chaque joueur mène
 * à la case 1, le deuxième à la case 2, etc. Sites affectés selon le nombre
 * de cases monument du plateau.
 */
export function makeLineSetup(overrides: Partial<GameSetup> & { readonly cells?: Readonly<Record<number, CellType>> } = {}): GameSetup {
  const { cells, ...rest } = overrides;
  const board = rest.board ?? lineBoard(cells ?? {});
  const heritageCount = board.cells.filter((c) => c.type === "heritage").length;
  return makeSetup({ board, heritageSites: TEST_MONUMENTS.slice(0, heritageCount), scenarios: [], journey: ONE_STEP_CYCLE, ...rest });
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

/** Le joueur actif découvre son Chemin. */
export const journey = (state: GameState) => run(state, { type: "StartJourney", playerId: active(state) });

export const answer = (outcome: AnswerRecord["outcome"], explanationMastery: AnswerRecord["explanationMastery"] = "none"): AnswerRecord => ({
  outcome,
  explanationMastery,
  validationMode: "collective",
});

export interface Policy {
  answer(index: number): AnswerRecord;
  buy(affordable: boolean, index: number): boolean;
  choose(options: readonly ChoiceOption[], index: number): string;
  /** Adversaire de Duel parmi les candidats (défaut : le premier). */
  opponent?(candidates: readonly PlayerId[], index: number): PlayerId;
  /** Destinataire d'un transfert parmi les candidats (défaut : le premier). */
  recipient?(candidates: readonly PlayerId[], index: number): PlayerId;
  /** Secondes de jeu actif à créditer avant chaque Chemin (0 = horloge immobile). */
  secondsPerTurn?: number;
  /** Décision face à un Défi famille proposé (défaut : accepter puis réussir). */
  challenge?(challengeId: string, index: number): "success" | "failure" | "skip" | "consent_refused";
  /** Case Don : montant parmi ceux proposés et destination (défaut : le plus petit, à la Caisse Masākīn). */
  donate?(amounts: readonly number[], candidates: readonly PlayerId[], index: number): { readonly amount: number; readonly to: MoneyDestination };
}

/** Qui doit répondre dans la phase courante (joueur actif, ou dueliste en cours). */
export function responder(state: GameState): PlayerId {
  if (state.phase.kind === "awaiting_duel") return state.phase.duel.stage === "challenger" ? state.phase.duel.challengerId : state.phase.duel.opponentId;
  return active(state);
}

/** Commande « par défaut » pour la phase courante ; `null` si la partie est finie. */
export function nextCommand(state: GameState, policy: Policy, counters: { answers: number; purchases: number; choices: number; duels: number; transfers: number; challenges?: number }): Command | null {
  const playerId = active(state);
  switch (state.phase.kind) {
    case "awaiting_journey":
      return { type: "StartJourney", playerId };
    case "awaiting_answer":
      return { type: "SubmitAnswer", playerId, requestId: state.phase.requestId, answer: policy.answer(counters.answers++) };
    case "awaiting_duel": {
      const duel = state.phase.duel;
      const who = responder(state);
      return { type: "SubmitAnswer", playerId: who, requestId: duel.stage === "challenger" ? duel.challengerRequestId : duel.opponentRequestId, answer: policy.answer(counters.answers++) };
    }
    case "awaiting_purchase": {
      const affordable = state.players[state.activePlayerIndex]!.money >= state.phase.price;
      return { type: "DecidePurchase", playerId, siteId: state.phase.siteId, buy: policy.buy(affordable, counters.purchases++) };
    }
    case "awaiting_choice":
      return { type: "Choose", playerId, choiceId: state.phase.choiceId, optionId: policy.choose(state.phase.options, counters.choices++) };
    case "awaiting_duel_opponent":
      return { type: "ChooseOpponent", playerId, opponentId: (policy.opponent ?? ((c) => c[0]!))(state.phase.candidates, counters.duels++) };
    case "awaiting_recipient":
      return { type: "ChooseRecipient", playerId, recipientId: (policy.recipient ?? ((c) => c[0]!))(state.phase.candidates, counters.transfers++) };
    case "awaiting_donation": {
      // Par défaut : le plus petit montant, à la Caisse Masākīn ; une politique peut choisir un joueur.
      const donate = (policy.donate ?? ((amounts) => ({ amount: amounts[0]!, to: { kind: "masakin" as const } })))(state.phase.amounts, state.phase.candidates, counters.transfers++);
      return { type: "Donate", playerId, amount: donate.amount, to: donate.to };
    }
    case "awaiting_challenge": {
      const c = state.phase.challenge;
      const decision = (policy.challenge ?? (() => "success"))(c.challengeId, (counters.challenges = (counters.challenges ?? 0) + 1) - 1);
      if (c.stage === "accepted") return { type: "CompleteChallenge", playerId, success: decision === "success" };
      if (decision === "skip" || decision === "consent_refused") return { type: "SkipChallenge", playerId, reason: decision === "skip" ? "declined" : "consent_refused" };
      return { type: "AcceptChallenge", playerId };
    }
    case "finished":
      return null;
  }
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
  const counters = { answers: 0, purchases: 0, choices: 0, duels: 0, transfers: 0, challenges: 0 };

  const apply = (command: Command) => {
    const next = run(state, command);
    state = next.state;
    events.push(...next.events);
    commands.push(command);
  };

  while (state.status === "in_progress") {
    if (commands.length >= maxCommands) throw new Error("simulation: trop de commandes (boucle ?)");
    if (state.phase.kind === "awaiting_journey" && policy.secondsPerTurn) {
      apply({ type: "AdvanceClock", seconds: policy.secondsPerTurn });
      if (state.status !== "in_progress") break;
    }
    const command = nextCommand(state, policy, counters);
    if (!command) throw new Error("phase finished avec status in_progress (invariant)");
    apply(command);
  }
  return { state, events, commands };
}

export const eventsOf = <T extends GameEvent["type"]>(events: readonly GameEvent[], type: T): readonly Extract<GameEvent, { type: T }>[] =>
  events.filter((e): e is Extract<GameEvent, { type: T }> => e.type === type);

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
    // Même politique que la simulation, mais sans achat (les tests contrôlent l'économie).
    const command = nextCommand(state, { ...policy, buy: () => false }, { answers: i, purchases: 0, choices: i, duels: i, transfers: i, challenges: i });
    if (!command) throw new Error("finished");
    const next = run(state, command);
    state = next.state;
    events.push(...next.events);
  }
  return { state, events };
}
