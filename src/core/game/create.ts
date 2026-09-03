import { err, ok, type GameId, type PlayerId, type ProfileType, type Result } from "@/core/shared";
import { resolveBoard, type BoardError } from "./board";
import { boardConfigSchema, heritageSiteSchema, rulesConfigSchema, scenarioSchema } from "./config.schema";
import { applyTransaction } from "./economy";
import { createRng } from "./rng";
import { step, chain, type Step } from "./step";
import { startTurn } from "./turn";
import { GAME_SCHEMA_VERSION, MAX_PLAYERS, MIN_PLAYERS, type BoardConfig, type GameState, type HeritageSite, type PlayerState, type RulesConfig, type Scenario } from "./types";

export interface PlayerSetup {
  readonly id: PlayerId;
  readonly displayName: string;
  readonly profileType: ProfileType;
}

/** Tout ce qu'il faut pour créer une partie. Les configurations sont figées dans l'état. */
export interface GameSetup {
  readonly gameId: GameId;
  readonly seed: number;
  readonly players: readonly PlayerSetup[];
  readonly board: BoardConfig;
  readonly heritageSites: readonly HeritageSite[];
  readonly scenarios: readonly Scenario[];
  readonly rules: RulesConfig;
}

export type SetupError =
  | { readonly code: "PLAYER_COUNT"; readonly min: number; readonly max: number; readonly received: number }
  | { readonly code: "DUPLICATE_PLAYER"; readonly playerId: PlayerId }
  | { readonly code: "INVALID_CONFIG"; readonly issues: readonly string[] }
  | { readonly code: "BOARD"; readonly error: BoardError };

export function createGame(setup: GameSetup): Result<Step, SetupError> {
  if (setup.players.length < MIN_PLAYERS || setup.players.length > MAX_PLAYERS) {
    return err({ code: "PLAYER_COUNT", min: MIN_PLAYERS, max: MAX_PLAYERS, received: setup.players.length });
  }
  const seen = new Set<PlayerId>();
  for (const p of setup.players) {
    if (seen.has(p.id)) return err({ code: "DUPLICATE_PLAYER", playerId: p.id });
    seen.add(p.id);
  }

  const issues = [
    ...boardConfigSchema.safeParse(setup.board).error?.issues.map((i) => `board: ${i.message}`) ?? [],
    ...rulesConfigSchema.safeParse(setup.rules).error?.issues.map((i) => `rules: ${i.message}`) ?? [],
    ...setup.heritageSites.flatMap((s) => heritageSiteSchema.safeParse(s).error?.issues.map((i) => `site: ${i.message}`) ?? []),
    ...setup.scenarios.flatMap((s) => scenarioSchema.safeParse(s).error?.issues.map((i) => `scenario ${s.id}: ${i.message}`) ?? []),
  ];
  if (issues.length > 0) return err({ code: "INVALID_CONFIG", issues });

  const resolved = resolveBoard(setup.board, setup.heritageSites);
  if (!resolved.ok) return err({ code: "BOARD", error: resolved.error });

  const players: PlayerState[] = setup.players.map((p, seat) => ({
    id: p.id,
    displayName: p.displayName,
    profileType: p.profileType,
    seat,
    position: resolved.value.board.startPosition,
    money: 0,
    turnsPlayed: 0,
  }));

  const initial: GameState = {
    schemaVersion: GAME_SCHEMA_VERSION,
    gameId: setup.gameId,
    config: { board: resolved.value.board, sites: resolved.value.sites, scenarios: setup.scenarios, rules: setup.rules },
    rng: createRng(setup.seed),
    players,
    activePlayerIndex: 0,
    turnNumber: 0,
    phase: { kind: "awaiting_spin" },
    ledger: [],
    holdings: [],
    effects: [],
    counters: { transaction: 0, request: 0, effect: 0 },
    status: "in_progress",
  };

  let result = step(initial, [
    { type: "GameCreated", gameId: setup.gameId, boardId: setup.board.id, rulesId: setup.rules.id, playerIds: players.map((p) => p.id) },
  ]);
  for (const p of players) {
    result = chain(result, (s) => applyTransaction(s, p.id, setup.rules.startingMoney, "starting_money"));
  }
  return ok(chain(result, startTurn));
}
