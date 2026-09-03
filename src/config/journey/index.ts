import { journeyCycleSchema } from "@/core/game/config.schema";
import type { JourneyCycle } from "@/core/game/types";
import cycleA from "./journey-cycle-A.v1.json";
import cycleB from "./journey-cycle-B.v1.json";
import cycleC from "./journey-cycle-C.v1.json";
import cycleD from "./journey-cycle-D.v1.json";
import cycleE from "./journey-cycle-E.v1.json";
import cycleF from "./journey-cycle-F.v1.json";

export function loadJourneyCycle(data: unknown): JourneyCycle {
  return journeyCycleSchema.parse(data);
}

/**
 * Variantes du Chemin (données versionnées, validées au chargement). Toutes
 * respectent les mêmes contraintes ; aucune n'est visible ni sélectionnable
 * par le joueur. La rotation entre parties est déterministe (ADR 0018).
 */
export const JOURNEY_VARIANTS: readonly JourneyCycle[] = [cycleA, cycleB, cycleC, cycleD, cycleE, cycleF].map(loadJourneyCycle);

/** Variante A (ancien cycle V1), conservée pour les tests ciblés. */
export const JOURNEY_CYCLE_V1: JourneyCycle = JOURNEY_VARIANTS[0]!;

/** Partie familiale n°1 → A, n°2 → B, … puis rotation. Le compteur est fourni par la persistance, jamais par le moteur. */
export function journeyCycleForOrdinal(familyGameOrdinal: number): JourneyCycle {
  if (!Number.isInteger(familyGameOrdinal) || familyGameOrdinal < 1) throw new RangeError(`numéro de partie invalide : ${familyGameOrdinal}`);
  return JOURNEY_VARIANTS[(familyGameOrdinal - 1) % JOURNEY_VARIANTS.length]!;
}
