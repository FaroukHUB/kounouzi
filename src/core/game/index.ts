/**
 * Moteur de jeu Kounouzi — TypeScript pur.
 * Contrat : `reduce(state, command) → { state, events }`.
 */
export * from "./types";
export type { Command } from "./commands";
export type { GameEvent, GameEventType } from "./events";
export type { GameError } from "./errors";
export type { Step } from "./step";
export { createGame, type GameSetup, type PlayerSetup, type SetupError } from "./create";
export { reduce } from "./reducer";
export { resolveBoard, cellAt, countCellsByType, type BoardError } from "./board";
export { computePath, computePathTo, type MovePlan } from "./movement";
export { computeReward, type RewardComputation } from "./rewards";
export { holdingOf, holdingsOf } from "./holdings";
export { ledgerBalance } from "./economy";
export { computeRanking, heritageValueOf, isGameOver, scoreOf } from "./scoring";
export { checkInvariants } from "./invariants";
export { createRng, nextInt, nextUint32 } from "./rng";
export { serializeGameState, deserializeGameState, gameStateSchemaV1, type SerializationError } from "./serialization";
export {
  boardConfigSchema,
  heritageSiteSchema,
  rulesConfigSchema,
  scenarioSchema,
  outcomeSchema,
  effectSpecSchema,
  endConditionSchema,
} from "./config.schema";
