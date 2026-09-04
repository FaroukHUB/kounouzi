import { err, ok, type GameId, type PlayerId, type ProfileType, type Result } from "@/core/shared";
import { resolveBoard, type BoardError } from "./board";
import { boardConfigSchema, challengesConfigSchema, familyAssistConfigSchema, heritageSiteSchema, journeyCycleSchema, rulesConfigSchema, scenarioSchema } from "./config.schema";
import { applyTransaction } from "./economy";
import { chain, step, type Step } from "./step";
import { startTurn } from "./turn";
import {
  FAMILY_ASSIST_OFF,
  GAME_SCHEMA_VERSION,
  MAX_PLAYERS,
  MIN_PLAYERS,
  NO_CHALLENGES,
  type BoardConfig,
  type ChallengesConfig,
  type FamilyAssistConfig,
  type GameState,
  type HeritageSite,
  type JourneyCycle,
  type PlayerState,
  type RulesConfig,
  type Scenario,
} from "./types";

export interface PlayerSetup {
  readonly id: PlayerId;
  readonly displayName: string;
  readonly profileType: ProfileType;
  /** Âge (années) d'un enfant à la création : éligibilité des Défis famille uniquement. */
  readonly age?: number | undefined;
}

/** Tout ce qu'il faut pour créer une partie. Les configurations sont figées dans l'état. Aucune graine. */
export interface GameSetup {
  readonly gameId: GameId;
  readonly players: readonly PlayerSetup[];
  readonly board: BoardConfig;
  readonly heritageSites: readonly HeritageSite[];
  readonly scenarios: readonly Scenario[];
  readonly rules: RulesConfig;
  readonly journey: JourneyCycle;
  readonly familyAssist?: FamilyAssistConfig | undefined;
  /** Défis famille (banque figée dans la partie, réglages parents) ; absent = aucun défi famille. */
  readonly challenges?: ChallengesConfig | undefined;
  /** Décalage de la séquence de scénarios (numéro de partie familiale − 1) : rotation inter-parties sans tirage. */
  readonly scenarioOffset?: number | undefined;
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
  const familyAssist = setup.familyAssist ?? FAMILY_ASSIST_OFF;
  const challenges = setup.challenges ?? NO_CHALLENGES;

  const issues = [
    ...(boardConfigSchema.safeParse(setup.board).error?.issues.map((i) => `board: ${i.message}`) ?? []),
    ...(rulesConfigSchema.safeParse(setup.rules).error?.issues.map((i) => `rules: ${i.message}`) ?? []),
    ...(journeyCycleSchema.safeParse(setup.journey).error?.issues.map((i) => `journey: ${i.message}`) ?? []),
    ...(familyAssistConfigSchema.safeParse(familyAssist).error?.issues.map((i) => `familyAssist: ${i.message}`) ?? []),
    ...(challengesConfigSchema.safeParse(challenges).error?.issues.map((i) => `challenges: ${i.message}`) ?? []),
    ...setup.heritageSites.flatMap((s) => heritageSiteSchema.safeParse(s).error?.issues.map((i) => `site: ${i.message}`) ?? []),
    ...setup.scenarios.flatMap((s) => scenarioSchema.safeParse(s).error?.issues.map((i) => `scenario ${s.id}: ${i.message}`) ?? []),
    ...familyAssist.assistedPlayers.filter((a) => !seen.has(a.playerId)).map((a) => `familyAssist: joueur inconnu ${a.playerId}`),
  ];
  if (issues.length > 0) return err({ code: "INVALID_CONFIG", issues });

  const resolved = resolveBoard(setup.board, setup.heritageSites);
  if (!resolved.ok) return err({ code: "BOARD", error: resolved.error });

  const players: PlayerState[] = setup.players.map((p, seat) => ({
    id: p.id,
    displayName: p.displayName,
    profileType: p.profileType,
    ...(p.profileType === "child" && p.age !== undefined ? { age: p.age } : {}),
    seat,
    position: resolved.value.board.startPosition,
    money: 0,
    turnsPlayed: 0,
    journeysTaken: 0,
    halted: false,
    solidarityActions: 0,
    solidarityGiven: 0,
  }));

  const initial: GameState = {
    schemaVersion: GAME_SCHEMA_VERSION,
    gameId: setup.gameId,
    config: { board: resolved.value.board, sites: resolved.value.sites, scenarios: setup.scenarios, rules: setup.rules, journey: setup.journey, familyAssist, challenges, scenarioOffset: Math.max(0, Math.trunc(setup.scenarioOffset ?? 0)) },
    players,
    activePlayerIndex: 0,
    turnNumber: 0,
    phase: { kind: "awaiting_journey" },
    ledger: [],
    holdings: [],
    effects: [],
    cellVisits: {},
    challengeServed: {},
    clock: { activePlaySeconds: 0, timeTargetReached: false },
    endRequested: false,
    counters: { transaction: 0, request: 0, effect: 0, transfer: 0, challenge: 0 },
    status: "in_progress",
  };

  let result = step(initial, [{ type: "GameCreated", gameId: setup.gameId, boardId: setup.board.id, rulesId: setup.rules.id, playerIds: players.map((p) => p.id) }]);
  for (const p of players) result = chain(result, (s) => applyTransaction(s, p.id, setup.rules.startingMoney, "starting_money"));
  return ok(chain(result, startTurn));
}
