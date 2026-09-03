import { boardConfigSchema } from "@/core/game/config.schema";
import type { BoardConfig } from "@/core/game/types";
import board32v1 from "./board-32.v1.json";

/** Charge et valide une configuration de plateau (données JSON → type sûr). */
export function loadBoardConfig(data: unknown): BoardConfig {
  return boardConfigSchema.parse(data);
}

/** Plateau 32 cases — configuration V1 de travail. */
export const BOARD_32_V1: BoardConfig = loadBoardConfig(board32v1);
