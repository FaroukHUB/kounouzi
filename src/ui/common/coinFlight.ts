/**
 * LES PIÈCES QUI VOLENT — des rectangles vers des trajectoires (ADR 0059).
 *
 * Fonctions pures : aucune mesure du navigateur ici, les rectangles entrent en
 * paramètre. C'est ce qui rend la chose testable, et ce qui garantit qu'un
 * paiement reste lisible même quand l'un des deux joueurs n'est pas à l'écran.
 */

export interface Rect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface CoinPathStep {
  /** Position de départ et d'arrivée, en pixels de la fenêtre. */
  readonly fromX: number;
  readonly fromY: number;
  readonly toX: number;
  readonly toY: number;
  /**
   * Sommet de l'arc, en pixels de la fenêtre. Les pièces ne glissent pas en
   * ligne droite, elles sont lancées — mais le sommet est CALCULÉ, pas imposé.
   */
  readonly apexY: number;
  /** Décalage de départ : les pièces partent en gerbe, pas toutes ensemble. */
  readonly delayMs: number;
}

export interface CoinPlanConfig {
  readonly minCoins: number;
  readonly maxCoins: number;
  /** Montant à partir duquel on atteint le nombre maximal de pièces. */
  readonly amountForMax: number;
  readonly staggerMs: number;
  /** Hauteur de l'arc, en fraction de la distance parcourue. */
  readonly arcShare: number;
  /** Hauteur maximale de l'arc, en pixels : un lancer, pas une fusée. */
  readonly maxArc: number;
  /**
   * Hauteur minimale, en pixels, à laquelle le CENTRE d'une pièce peut monter.
   * Elle doit laisser passer le rayon de la pièce, sinon la pièce sort par le
   * haut alors que son centre, lui, est encore dans l'écran.
   */
  readonly minApexY: number;
  /** Dispersion des points de départ et d'arrivée, en fraction du rectangle. */
  readonly spread: number;
}

const centre = (r: Rect) => ({ x: r.x + r.width / 2, y: r.y + r.height / 2 });

/**
 * Combien de pièces pour un montant.
 *
 * BORNÉ, et c'est tout l'intérêt : un paiement de deux mille Kounouz ne fait pas
 * voler deux mille pièces. La quantité suggère l'ordre de grandeur — un petit
 * versement, une grosse somme — sans jamais devenir un comptage, ni un coût.
 * La racine carrée donne une progression qui se voit tout de suite sur les
 * petits montants et se tasse sur les gros, ce qui est exactement la perception
 * recherchée.
 */
export function coinCount(amount: number, config: CoinPlanConfig): number {
  const { minCoins, maxCoins, amountForMax } = config;
  if (!(amount > 0)) return 0;
  const part = Math.min(1, Math.sqrt(amount / Math.max(1, amountForMax)));
  return Math.round(minCoins + (maxCoins - minCoins) * part);
}

/**
 * Déterministe, sans hasard : les positions sont réparties régulièrement autour
 * du centre de chaque repère. Deux paiements identiques donnent la même gerbe —
 * ce n'est pas une exigence de jeu, mais c'est une exigence de test, et le
 * projet n'a de toute façon aucun tirage nulle part.
 */
export function coinPlan(from: Rect, to: Rect, amount: number, config: CoinPlanConfig): readonly CoinPathStep[] {
  const count = coinCount(amount, config);
  if (count === 0) return [];
  const a = centre(from);
  const b = centre(to);
  /**
   * L'ARC SUIT LA DISTANCE, et il reste dans l'écran.
   *
   * Une hauteur fixe paraît juste sur un grand écran et devient absurde sur un
   * téléphone, où les deux repères d'un joueur sont deux pastilles voisines dans
   * le coin : les pièces partaient alors CENT PIXELS AU-DESSUS du bord, donc
   * nulle part. Constaté à l'écran — le compte des pièces était bon, l'effet
   * était invisible.
   */
  const distance = Math.hypot(b.x - a.x, b.y - a.y);
  // On borne l'ARC, pas le sommet. Borner le sommet laissait l'arc réclamer
  // plus de hauteur qu'il n'y en avait : les pièces se plaquaient contre le
  // bord supérieur et y passaient à moitié dehors — mesuré dans le navigateur,
  // leur centre était à douze pixels du haut. Ici, s'il n'y a pas de place
  // au-dessus, la trajectoire s'aplatit au lieu de sortir de l'écran.
  const place = Math.max(0, Math.min(a.y, b.y) - config.minApexY);
  const arc = Math.min(config.maxArc, distance * config.arcShare, place);
  const apexY = Math.min(a.y, b.y) - arc;
  return Array.from({ length: count }, (_, i) => {
    // Réparties sur un tour complet : la gerbe s'ouvre au départ et se resserre à l'arrivée.
    const angle = (i / count) * Math.PI * 2;
    const dx = Math.cos(angle) * config.spread;
    const dy = Math.sin(angle) * config.spread;
    return {
      fromX: a.x + dx * from.width,
      fromY: a.y + dy * from.height,
      toX: b.x + dx * to.width * 0.4,
      toY: b.y + dy * to.height * 0.4,
      apexY,
      delayMs: i * config.staggerMs,
    };
  });
}

/** Durée totale d'un vol, dernière pièce comprise. Sert à savoir quand tout effacer. */
export function coinFlightDuration(plan: readonly CoinPathStep[], travelMs: number): number {
  return plan.reduce((max, step) => Math.max(max, step.delayMs), 0) + travelMs;
}
