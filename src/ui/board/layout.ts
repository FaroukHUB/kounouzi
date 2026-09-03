export interface GridPosition {
  readonly row: number;
  readonly col: number;
  readonly side: "bottom" | "start" | "top" | "end";
}

/** Taille de la grille carrée pour un plateau en anneau de `cellCount` cases (multiple de 4). */
export function gridSize(cellCount: number): number {
  if (cellCount % 4 !== 0 || cellCount < 8) throw new RangeError(`plateau en anneau : ${cellCount} cases n'est pas un multiple de 4 ≥ 8`);
  return cellCount / 4 + 1;
}

/**
 * Position sur le périmètre : la case 0 est au coin inférieur droit (côté
 * « fin » en LTR), puis le parcours suit le bas vers la gauche, monte, traverse
 * le haut et redescend. Lignes et colonnes sont indexées de 0 (haut/gauche).
 */
export function perimeterPosition(position: number, cellCount: number): GridPosition {
  const side = cellCount / 4;
  const last = side;
  if (position < 0 || position >= cellCount) throw new RangeError(`position ${position} hors plateau`);
  if (position <= side) return { row: last, col: last - position, side: "bottom" };
  if (position <= 2 * side) return { row: last - (position - side), col: 0, side: "start" };
  if (position <= 3 * side) return { row: 0, col: position - 2 * side, side: "top" };
  return { row: position - 3 * side, col: last, side: "end" };
}

/** Centre d'une case en pourcentage du plateau, pour positionner un pion en `transform`. */
export function cellCenterPercent(position: number, cellCount: number): { readonly x: number; readonly y: number } {
  const g = gridSize(cellCount);
  const { row, col } = perimeterPosition(position, cellCount);
  return { x: ((col + 0.5) / g) * 100, y: ((row + 0.5) / g) * 100 };
}

/** Décalage en UNITÉS DE CASE pour étaler plusieurs pions sur une même case. */
export function clusterOffset(index: number, count: number): { readonly dx: number; readonly dy: number } {
  if (count <= 1) return { dx: 0, dy: 0 };
  const radius = 0.24;
  const angle = (index / count) * Math.PI * 2 - Math.PI / 2;
  return { dx: Math.cos(angle) * radius, dy: Math.sin(angle) * radius };
}
