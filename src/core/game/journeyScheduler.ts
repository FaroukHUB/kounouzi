import type { JourneyCycle } from "./types";

/**
 * LE CHEMIN — attribution déterministe du déplacement.
 *
 * Contraintes absolues :
 *  - aucune fonction aléatoire, aucun générateur, aucune graine ;
 *  - aucun choix du joueur ;
 *  - aucune lecture de l'état économique, du patrimoine, du score, de l'âge,
 *    de FamilyAssist ni du contenu des cases : cette fonction ne reçoit PAS le
 *    `GameState`, seulement le cycle versionné, le siège et le compteur de
 *    voyages du joueur. Elle ne PEUT donc pas favoriser ou défavoriser qui que
 *    ce soit.
 *
 * Algorithme (ADR 0013) : le cycle est une suite de blocs, chacun une
 * permutation de 1..stepMax. Le joueur du siège `s` commence au bloc `s` ;
 * son `k`-ième voyage lit la position `s·stepMax + k` du cycle aplati (modulo
 * sa longueur). Conséquences : chaque joueur parcourt exactement la même
 * multiplicité de valeurs par bloc ; après tout multiple de `stepMax`
 * voyages, tous les sièges ont parcouru la même distance totale ; deux
 * voyages consécutifs d'un même joueur ne sont jamais identiques (cycle
 * validé) ; la suite n'est pas la répétition naïve 1,2,3,4,5.
 */
export function assignJourneySteps(cycle: JourneyCycle, seat: number, journeyIndex: number): number {
  if (!Number.isInteger(seat) || seat < 0) throw new RangeError(`siège invalide : ${seat}`);
  if (!Number.isInteger(journeyIndex) || journeyIndex < 0) throw new RangeError(`index de voyage invalide : ${journeyIndex}`);
  const sequence = flattenCycle(cycle);
  const offset = (seat % cycle.blocks.length) * cycle.stepMax;
  const steps = sequence[(offset + journeyIndex) % sequence.length];
  if (steps === undefined) throw new Error("cycle de voyage vide (invariant)");
  return steps;
}

export function flattenCycle(cycle: JourneyCycle): readonly number[] {
  return cycle.blocks.flat();
}

/** Vérifications structurelles du cycle (utilisées par le schéma et les tests). */
export function journeyCycleIssues(cycle: JourneyCycle): readonly string[] {
  const issues: string[] = [];
  if (!Number.isInteger(cycle.stepMax) || cycle.stepMax < 1) issues.push("stepMax doit être un entier ≥ 1");
  if (cycle.blocks.length === 0) issues.push("au moins un bloc requis");
  const expected = Array.from({ length: cycle.stepMax }, (_, i) => i + 1).join(",");
  cycle.blocks.forEach((block, i) => {
    if ([...block].sort((a, b) => a - b).join(",") !== expected) issues.push(`bloc ${i} n'est pas une permutation de 1..${cycle.stepMax}`);
  });
  if (cycle.stepMax >= 2) {
    const flat = flattenCycle(cycle);
    for (let i = 0; i < flat.length; i += 1) {
      const next = flat[(i + 1) % flat.length];
      if (flat.length > 1 && flat[i] === next) issues.push(`valeurs identiques consécutives à la position ${i}`);
    }
  }
  return issues;
}
