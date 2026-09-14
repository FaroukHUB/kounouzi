import { boardConfigSchema } from "@/core/game/config.schema";
import type { BoardConfig } from "@/core/game/types";
import board26v1 from "./board-26.v1.json";
import board28v1 from "./board-28.v1.json";

/** Charge et valide une configuration de plateau (données JSON → type sûr). */
export function loadBoardConfig(data: unknown): BoardConfig {
  return boardConfigSchema.parse(data);
}

/** Ancien plateau produit 26 cases — conservé pour compatibilité et références historiques. */
export const BOARD_26_V1: BoardConfig = loadBoardConfig(board26v1);
/** Plateau produit 28 cases : contour d'une grille 8×8, donc 28 cases de mêmes dimensions. */
export const BOARD_28_V1: BoardConfig = loadBoardConfig(board28v1);
/** Plateau courant des nouvelles parties. */
export const DEFAULT_BOARD: BoardConfig = BOARD_28_V1;
