import { z } from "zod";
import { endConditionSchema } from "@/core/game/config.schema";
import type { EndCondition } from "@/core/game/types";
import modesJson from "./game-modes.v1.json";

export const GAME_MODE_IDS = ["quick", "classic", "long", "free"] as const;
export type GameModeId = (typeof GAME_MODE_IDS)[number];

const schema = z.object({
  modes: z.array(z.object({ id: z.enum(GAME_MODE_IDS), endCondition: endConditionSchema })).min(1),
  defaultMode: z.enum(GAME_MODE_IDS),
});

const parsed = schema.parse(modesJson);

export const GAME_MODES: readonly { readonly id: GameModeId; readonly endCondition: EndCondition }[] = parsed.modes;
export const DEFAULT_GAME_MODE: GameModeId = parsed.defaultMode;

export function endConditionOf(mode: GameModeId): EndCondition {
  const found = GAME_MODES.find((m) => m.id === mode);
  if (!found) throw new Error(`mode inconnu : ${mode}`);
  return found.endCondition;
}
