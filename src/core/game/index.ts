/**
 * Moteur de jeu Kounouzi — TypeScript pur, entièrement déterministe.
 * Contrat : `reduce(state, command) → { state, events }`. Aucun hasard.
 */
export * from "./types";
export type { Command, PlayerCommand, SessionCommand } from "./commands";
export { isPlayerCommand } from "./commands";
export type { GameEvent, GameEventType, QuestionPurposeKind } from "./events";
export type { GameError } from "./errors";
export type { Step } from "./step";
export { createGame, type GameSetup, type PlayerSetup, type SetupError } from "./create";
export { reduce } from "./reducer";
export { resolveBoard, cellAt, countCellsByType, type BoardError } from "./board";
export { computePath, computePathTo, type MovePlan } from "./movement";
export { assignJourneySteps, flattenCycle, journeyCycleIssues } from "./journeyScheduler";
export { computeReward, type RewardComputation } from "./rewards";
export { holdingOf, holdingsOf, effectivePrice } from "./holdings";
export { ledgerBalance, transferMoney, affordableAmount, poorestPlayer, richestPlayer } from "./economy";
export { duelWinner } from "./duel";
export { duelCandidates } from "./outcomes";
export { effectsOf } from "./effects";
export { computeRanking, heritageValueOf, shouldEndAfterTurn, scoreOf } from "./scoring";
export { checkInvariants } from "./invariants";
export { serializeGameState, deserializeGameState, gameStateSchemaV4, type SerializationError } from "./serialization";
export {
  boardConfigSchema,
  heritageSiteSchema,
  rulesConfigSchema,
  scenarioSchema,
  outcomeSchema,
  effectSpecSchema,
  endConditionSchema,
  journeyCycleSchema,
  familyAssistConfigSchema,
} from "./config.schema";
