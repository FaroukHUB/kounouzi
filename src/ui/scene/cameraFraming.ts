import { boardCorners, boardExtent, fitDistanceFor, type Point3 } from "./boardGeometry";

/**
 * LES PLANS DE CAMÉRA — des nombres vers des nombres (ADR 0059).
 *
 * Aucun import de `three` : c'est ici que se décide tout ce qui concerne le
 * cadrage, donc c'est ici que ça se teste. La scène ne fait qu'appliquer.
 *
 * Deux plans seulement, et c'est volontaire. Une caméra qui invente un angle
 * par situation donne le mal de mer à une tablée penchée sur une tablette :
 * chacun doit pouvoir lever les yeux et retrouver le plateau là où il l'a
 * laissé. Donc jamais de rotation autour du plateau, jamais de changement
 * d'inclinaison — seulement un glissement et un léger rapprochement.
 */

/** Ce que la caméra regarde, et de quelle distance. L'inclinaison, elle, ne change jamais. */
export interface Shot {
  readonly target: Point3;
  readonly distance: number;
}

export interface ShotInput {
  readonly cellCount: number;
  readonly fovDegrees: number;
  readonly aspect: number;
  readonly tiltDegrees: number;
  readonly margin: number;
  readonly minDistance: number;
  readonly maxDistance: number;
  /** Côté, en cases, de la zone cadrée quand la caméra suit un joueur. */
  readonly followSpan: number;
}

const ORIGIN: Point3 = { x: 0, y: 0, z: 0 };

/** Plan large : tout le plateau, centré. C'est le plan de repos et celui des cartes. */
export function wideShot(input: ShotInput): Shot {
  return {
    target: ORIGIN,
    distance: fitDistanceFor({ points: boardCorners(input.cellCount), target: ORIGIN, fovDegrees: input.fovDegrees, aspect: input.aspect, tiltDegrees: input.tiltDegrees, margin: input.margin, minDistance: input.minDistance, maxDistance: input.maxDistance }),
  };
}

/**
 * Recentre une cible pour que la zone cadrée reste DANS le plateau.
 *
 * Sans cette borne, suivre un pion posté dans un coin pointerait la caméra à
 * moitié hors du plateau : la moitié de l'écran montrerait le fond de page, et
 * le joueur suivi se retrouverait au bord de l'image au lieu d'être au centre
 * de l'attention. La caméra se contente donc de PENCHER vers le joueur actif.
 */
export function clampTarget(point: Point3, cellCount: number, span: number): Point3 {
  const extent = boardExtent(cellCount);
  const limitX = Math.max(0, (extent.width - span) / 2);
  const limitZ = Math.max(0, (extent.depth - span) / 2);
  return {
    x: Math.min(limitX, Math.max(-limitX, point.x)),
    y: 0,
    z: Math.min(limitZ, Math.max(-limitZ, point.z)),
  };
}

/**
 * Plan rapproché sur un point du plateau — le pion du joueur actif.
 *
 * La zone cadrée est un carré de `followSpan` cases autour de lui : assez large
 * pour qu'on voie d'où il vient et où il va, assez serré pour qu'on sache de
 * qui c'est le tour sans lire un panneau. La distance ne dépasse JAMAIS celle du
 * plan large : suivre quelqu'un ne doit pas pouvoir reculer la caméra plus loin
 * que le plateau entier.
 */
export function followShot(focus: Point3, input: ShotInput): Shot {
  const target = clampTarget(focus, input.cellCount, input.followSpan);
  const half = input.followSpan / 2;
  const region: readonly Point3[] = [
    { x: target.x - half, y: 0, z: target.z - half },
    { x: target.x + half, y: 0, z: target.z - half },
    { x: target.x - half, y: 0, z: target.z + half },
    { x: target.x + half, y: 0, z: target.z + half },
  ];
  const wide = wideShot(input);
  const distance = fitDistanceFor({ points: region, target, fovDegrees: input.fovDegrees, aspect: input.aspect, tiltDegrees: input.tiltDegrees, margin: input.margin, minDistance: input.minDistance, maxDistance: input.maxDistance });
  return { target, distance: Math.min(distance, wide.distance) };
}

/**
 * Rapprochement amorti d'une valeur vers une autre, INDÉPENDANT du nombre
 * d'images par seconde.
 *
 * Un simple « avance d'un dixième à chaque image » donne une caméra deux fois
 * plus rapide sur un écran à 120 Hz que sur un téléphone à 60 : le réglage
 * cesse d'être un réglage. Ici la constante de temps est une durée réelle — au
 * bout d'elle, les deux tiers du chemin sont faits — et le résultat ne dépend
 * que du temps écoulé.
 *
 * Une constante nulle pose la valeur immédiatement : c'est le mode « animations
 * réduites », où la caméra ne glisse pas mais se place.
 */
export function approach(current: number, target: number, elapsedMs: number, timeConstantMs: number): number {
  if (!(timeConstantMs > 0)) return target;
  if (!(elapsedMs > 0)) return current;
  const k = 1 - Math.exp(-elapsedMs / timeConstantMs);
  return current + (target - current) * k;
}

/** Le même rapprochement, appliqué à un plan entier. */
export function approachShot(current: Shot, target: Shot, elapsedMs: number, timeConstantMs: number): Shot {
  return {
    target: {
      x: approach(current.target.x, target.target.x, elapsedMs, timeConstantMs),
      y: approach(current.target.y, target.target.y, elapsedMs, timeConstantMs),
      z: approach(current.target.z, target.target.z, elapsedMs, timeConstantMs),
    },
    distance: approach(current.distance, target.distance, elapsedMs, timeConstantMs),
  };
}

/** Deux plans sont-ils assez proches pour qu'on puisse arrêter de dessiner ? */
export function shotSettled(current: Shot, target: Shot, epsilon = 0.004): boolean {
  return (
    Math.abs(current.target.x - target.target.x) < epsilon &&
    Math.abs(current.target.z - target.target.z) < epsilon &&
    Math.abs(current.distance - target.distance) < epsilon
  );
}
