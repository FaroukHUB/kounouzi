/**
 * LA RÉVÉLATION DU CHEMIN — des nombres vers des nombres (ADR 0059).
 *
 * Aucun import de `three` : c'est ici que tout se décide, donc ici que tout se
 * teste.
 *
 * LA RÈGLE QUI COMPTE, et elle est plus importante que le rendu : le nombre
 * d'étapes et les cases parcourues viennent du MOTEUR. `MovementAssigned.steps`
 * donne le nombre, `PawnMoved.path` donne les cases, et la file d'animation les
 * dépose dans l'interface sans jamais les recalculer. Cette couche les montre,
 * elle ne les produit pas — elle ne sait même pas comment on les produirait.
 * Kounouzi n'a ni dé, ni roue, ni tirage (ADR 0013) : il n'y a donc rien à
 * lancer, rien à faire tomber sur une face, et aucune mise en scène ne doit
 * laisser croire le contraire.
 */

/** Une case du chemin et le moment où elle s'allume, depuis le début de la révélation. */
export interface RevealStep {
  readonly position: number;
  readonly startMs: number;
}

/**
 * Quand chaque case du chemin s'allume.
 *
 * Les cases s'allument DANS L'ORDRE DU PARCOURS, une par une, et la dernière
 * s'allume avant la fin de la révélation — sinon le pion partirait pendant que
 * le chemin se dessine encore. L'étalement occupe une fraction de la durée
 * totale, le reste laissant le chemin complet à l'écran un instant : c'est ce
 * moment-là qui permet à un enfant de compter les cases avant que le pion ne
 * bouge.
 *
 * Une durée nulle — mode « animations réduites » — allume tout à l'instant zéro.
 */
export function revealSchedule(path: readonly number[], totalMs: number, spreadShare = 0.7): readonly RevealStep[] {
  if (path.length === 0) return [];
  const spread = Math.max(0, totalMs) * Math.min(1, Math.max(0, spreadShare));
  // Un seul pas : pas d'étalement à répartir, il s'allume tout de suite.
  const gap = path.length > 1 ? spread / (path.length - 1) : 0;
  return path.map((position, index) => ({ position, startMs: gap * index }));
}

/**
 * Avancement de l'allumage d'une case, de 0 à 1.
 *
 * Avant son tour, elle vaut 0 : la case n'est pas encore allumée, et elle ne
 * doit pas l'être à moitié.
 */
export function markerProgress(elapsedMs: number, startMs: number, riseMs: number): number {
  if (elapsedMs < startMs) return 0;
  if (!(riseMs > 0)) return 1;
  return Math.min(1, (elapsedMs - startMs) / riseMs);
}

/**
 * Échelle d'un marqueur qui s'allume : il grandit, dépasse, et se pose.
 *
 * Le petit dépassement est ce qui fait lire « une case s'allume » plutôt que
 * « une case grandit ». Nul au départ, exactement 1 à l'arrivée.
 */
export function markerScale(progress: number, overshoot = 0.18): number {
  const p = Math.min(1, Math.max(0, progress));
  if (p >= 1) return 1;
  const base = 1 - Math.pow(1 - p, 3);
  return Math.max(0, base + Math.sin(p * Math.PI) * overshoot);
}

/**
 * Le chemin montré est-il bien celui que le moteur a décidé ?
 *
 * Garde-fou explicite : la révélation annonce `steps` étapes (valeur de
 * `MovementAssigned`) et allume les cases de `PawnMoved.path`. Les deux viennent
 * du même déplacement, donc ils doivent coïncider. S'ils divergent, c'est que
 * quelqu'un a recalculé quelque chose quelque part, et il vaut mieux ne rien
 * montrer que montrer un chemin inventé.
 */
export function pathMatchesSteps(path: readonly number[], steps: number): boolean {
  return path.length === steps;
}

/**
 * Extinction d'un marqueur, de 1 à 0.
 *
 * Les cases du chemin ne s'effacent pas quand le pion s'ébranle : elles
 * s'éteignent SOUS LUI, une par une, à mesure qu'il les franchit. C'est le
 * moment où elles servent le plus — un enfant qui compte à voix haute voit
 * disparaître exactement la case qu'il vient de compter — et c'était la faute
 * de la première version, qui les effaçait toutes au départ du pion.
 */
export function markerFade(elapsedMs: number, fadeMs: number): number {
  if (!(fadeMs > 0)) return 0;
  return Math.max(0, 1 - Math.min(1, elapsedMs / fadeMs));
}

/**
 * Jusqu'où le pion est-il allé sur son chemin ? Rend l'indice de la dernière
 * case franchie, ou -1 s'il n'a pas commencé.
 *
 * Passer par l'indice plutôt que par la seule case courante règle aussi le mode
 * « animations réduites », où le pion se pose directement sur la dernière case :
 * toutes les cases d'avant comptent alors comme franchies, et aucun anneau ne
 * reste allumé derrière lui.
 */
export function walkedIndex(path: readonly number[], pawnCell: number): number {
  return path.lastIndexOf(pawnCell);
}
