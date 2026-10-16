import type { GameEvent } from "@/core/game";

/**
 * LA VIBRATION — un retour physique, court, et jamais le seul.
 *
 * Fonctions pures : un événement du moteur entre, un motif de vibration sort.
 * Rien du navigateur n'est touché ici, donc tout est testable.
 *
 * TROIS RÈGLES, et la troisième est la plus importante.
 *
 * 1. **Court.** Quelques dizaines de millisecondes. Une vibration longue sur un
 *    jeu familial devient une nuisance au troisième tour.
 * 2. **Rare.** Seuls les moments qui comptent : arriver sur une case, bien
 *    répondre, acquérir un établissement, payer ou recevoir. Vibrer à chaque
 *    événement reviendrait à ne plus rien signaler du tout.
 * 3. **Jamais la seule information.** iOS ne propose pas cette interface du
 *    tout, et beaucoup d'appareils l'ont désactivée. Tout ce qu'une vibration
 *    souligne doit donc être déjà lisible à l'écran et déjà dit par la voix.
 *    Elle accompagne, elle n'annonce pas.
 */

/** Motifs, en millisecondes. Un seul nombre = une vibration ; plusieurs = vibration/pause alternées. */
export const HAPTIC_PATTERNS = {
  /** Le pion se pose sur sa case. */
  arrival: [18],
  /** Bonne réponse : deux battements courts, nettement plus gais qu'un seul. */
  correct: [22, 60, 22],
  /** Presque : un seul battement, plus doux. */
  partial: [16],
  /** Un établissement entre au patrimoine. */
  acquired: [30, 50, 30],
  /** De l'argent change de mains. */
  money: [14],
} as const;

export type HapticKind = keyof typeof HAPTIC_PATTERNS;

/**
 * Le motif d'un événement, ou `null` s'il n'en déclenche aucun.
 *
 * UNE RÉPONSE FAUSSE NE VIBRE PAS, et c'est délibéré : faire vibrer l'appareil
 * d'un enfant qui vient de se tromper ajoute une punition physique à une erreur
 * qui n'en demande pas. Le jeu dit « presque » ou « on réessaiera », il ne
 * tape pas sur les doigts.
 */
export function hapticFor(event: GameEvent): readonly number[] | null {
  switch (event.type) {
    case "CellArrived":
      return HAPTIC_PATTERNS.arrival;
    case "SiteAcquired":
      return HAPTIC_PATTERNS.acquired;
    case "MoneyTransferred":
      return HAPTIC_PATTERNS.money;
    case "AnswerRecorded":
      return event.outcome === "correct" ? HAPTIC_PATTERNS.correct : event.outcome === "partial" ? HAPTIC_PATTERNS.partial : null;
    default:
      return null;
  }
}

export interface HapticSupport {
  /** L'appareil propose-t-il la vibration ? (iOS, par exemple, ne la propose pas.) */
  readonly supported: boolean;
  /** Réglage de l'utilisateur. */
  readonly enabled: boolean;
  /** Animations réduites : on ne fait pas vibrer non plus. */
  readonly reduced: boolean;
}

/** Faut-il vibrer ? Trois conditions, toutes nécessaires. */
export function shouldVibrate({ supported, enabled, reduced }: HapticSupport): boolean {
  return supported && enabled && !reduced;
}
