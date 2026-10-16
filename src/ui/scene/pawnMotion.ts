/**
 * LE MOUVEMENT D'UN PION — des nombres vers des nombres (ADR 0059).
 *
 * Aucun import de `three` : c'est la partie testable du déplacement, et donc
 * celle qui porte toutes les décisions. La scène ne fait qu'appliquer ce qui est
 * calculé ici.
 *
 * LE PION NE DÉCIDE RIEN. Le chemin vient du moteur, la file d'animation pose
 * une case à la fois (`PawnMoved.path`, jamais recalculé), et ces fonctions ne
 * répondent qu'à une question : où se trouve le pion ENTRE deux cases déjà
 * décidées. Il n'y a ici ni règle, ni distance, ni direction choisie.
 */

/**
 * Avancement d'un pas, de 0 à 1.
 *
 * Une durée nulle — mode « animations réduites » — rend 1 tout de suite : le
 * pion se pose sur sa case sans transition, comme le veut `REDUCED_TIMINGS`,
 * qui met toutes les durées à zéro sans changer la séquence.
 */
export function stepProgress(elapsedMs: number, stepMs: number): number {
  if (!(stepMs > 0)) return 1;
  return Math.min(1, Math.max(0, elapsedMs / stepMs));
}

/**
 * Lissage du pas : départ et arrivée posés, milieu rapide.
 *
 * Un déplacement linéaire donne une impression de glissement, pas de marche —
 * et c'est exactement ce qu'on cherche à éviter : les pions doivent avancer
 * CASE PAR CASE, de façon lisible par un enfant qui compte les cases à voix
 * haute. Un pas marqué au départ et à l'arrivée rend chaque case perceptible.
 */
export function easeStep(progress: number): number {
  const p = Math.min(1, Math.max(0, progress));
  return p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
}

/**
 * Hauteur du petit saut pendant un pas, en unités de case.
 *
 * Nulle au départ et à l'arrivée — le pion est posé sur sa case, jamais en
 * suspension —, maximale à mi-chemin. C'est la courbe qui fait lire « un pas »
 * plutôt que « un glissement », et c'est aussi elle qui rend chaque case
 * comptable à l'œil.
 */
export function hopHeight(progress: number, height: number): number {
  const p = Math.min(1, Math.max(0, progress));
  return Math.sin(p * Math.PI) * Math.max(0, height);
}

/**
 * Orientation d'un pion qui avance, en radians autour de l'axe vertical.
 *
 * Quand le départ et l'arrivée coïncident — un pion immobile, ou deux pions de
 * la même grappe —, il n'y a pas de direction : le pion GARDE celle qu'il
 * avait, au lieu de pivoter brutalement vers une direction par défaut à chaque
 * fois qu'il s'arrête.
 */
export function facing(from: { readonly x: number; readonly z: number }, to: { readonly x: number; readonly z: number }, current: number): number {
  const dx = to.x - from.x;
  const dz = to.z - from.z;
  if (Math.hypot(dx, dz) < 1e-6) return current;
  return Math.atan2(dx, dz);
}

/**
 * Rapprochement d'un angle vers un autre PAR LE PLUS COURT CHEMIN.
 *
 * Sans ce repli, un pion qui passe de +175° à −175° — un simple coin de plateau
 * — fait presque un tour complet sur lui-même pour parcourir cinq degrés.
 */
export function turnToward(current: number, target: number, factor: number): number {
  const TAU = Math.PI * 2;
  let delta = (target - current) % TAU;
  if (delta > Math.PI) delta -= TAU;
  if (delta < -Math.PI) delta += TAU;
  return current + delta * Math.min(1, Math.max(0, factor));
}

/**
 * Position d'un pion entre deux cases.
 *
 * `from` et `to` sont deux centres de case déjà calculés par `boardGeometry` ;
 * la hauteur est celle du dessus d'une tuile, plus le saut.
 */
export function pawnPoint(args: {
  readonly from: { readonly x: number; readonly z: number };
  readonly to: { readonly x: number; readonly z: number };
  readonly progress: number;
  readonly groundY: number;
  readonly hop: number;
}): { readonly x: number; readonly y: number; readonly z: number } {
  const { from, to, progress, groundY, hop } = args;
  const eased = easeStep(progress);
  return {
    x: from.x + (to.x - from.x) * eased,
    y: groundY + hopHeight(progress, hop),
    z: from.z + (to.z - from.z) * eased,
  };
}
