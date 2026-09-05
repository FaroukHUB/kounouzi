import { boardConfigSchema } from "@/core/game/config.schema";
import type { BoardConfig } from "@/core/game/types";
import board26v1 from "./board-26.v1.json";

/** Charge et valide une configuration de plateau (données JSON → type sûr). */
export function loadBoardConfig(data: unknown): BoardConfig {
  return boardConfigSchema.parse(data);
}

/** Plateau 26 cases — configuration produit (ADR 0033). Le nombre de cases vient TOUJOURS de `board.cells.length`, jamais d'une constante. */
export const BOARD_26_V1: BoardConfig = loadBoardConfig(board26v1);
/** Plateau courant des nouvelles parties. */
export const DEFAULT_BOARD: BoardConfig = BOARD_26_V1;
