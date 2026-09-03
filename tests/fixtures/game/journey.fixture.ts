import type { JourneyCycle } from "@/core/game";

/** Cycle de test : chaque Chemin fait exactement 1 étape (contrôle total des cases atteintes). */
export const ONE_STEP_CYCLE: JourneyCycle = { id: "journey-test-1", version: 1, stepMax: 1, blocks: [[1]] };

/** Cycle de test à deux valeurs, sans répétition consécutive au bouclage. */
export const TWO_STEP_CYCLE: JourneyCycle = { id: "journey-test-2", version: 1, stepMax: 2, blocks: [[1, 2]] };
