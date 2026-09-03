import { journeyCycleSchema } from "@/core/game/config.schema";
import type { JourneyCycle } from "@/core/game/types";
import cycleV1 from "./journey-cycle.v1.json";

export function loadJourneyCycle(data: unknown): JourneyCycle {
  return journeyCycleSchema.parse(data);
}

/** Cycle du Chemin V1 (données versionnées, jamais exposées au joueur). */
export const JOURNEY_CYCLE_V1: JourneyCycle = loadJourneyCycle(cycleV1);
