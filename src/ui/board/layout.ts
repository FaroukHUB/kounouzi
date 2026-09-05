export interface GridPosition {
  readonly row: number;
  readonly col: number;
  readonly side: "bottom" | "start" | "top" | "end";
}

export interface GridDims {
  readonly cols: number;
  readonly rows: number;
}

/**
 * Dimensions de la grille rectangulaire dont le périmètre porte exactement
 * `cellCount` cases (nombre pair ≥ 8) : 26 → 8 × 7, 32 → 9 × 9, 8 → 3 × 3.
 * Le nombre de cases vient du plateau, jamais d'une constante.
 */
export function gridDims(cellCount: number): GridDims {
  if (!Number.isInteger(cellCount) || cellCount < 8 || cellCount % 2 !== 0) throw new RangeError(`plateau en anneau : ${cellCount} cases n'est pas un nombre pair ≥ 8`);
  const cols = Math.ceil((cellCount + 4) / 4);
  const rows = (cellCount + 4) / 2 - cols;
  return { cols, rows };
}

/** Taille d'une grille carrée (plateaux multiples de 4) — conservée pour compatibilité. */
export function gridSize(cellCount: number): number {
  const { cols, rows } = gridDims(cellCount);
  if (cols !== rows) throw new RangeError(`plateau ${cellCount} cases : grille ${cols}×${rows}, pas carrée`);
  return cols;
}

/**
 * Position sur le périmètre : la case 0 est au coin inférieur droit (côté
 * « fin » en LTR), puis le parcours suit le bas vers la gauche, monte, traverse
 * le haut et redescend. Lignes et colonnes sont indexées de 0 (haut/gauche).
 */
export function perimeterPosition(position: number, cellCount: number): GridPosition {
  const { cols, rows } = gridDims(cellCount);
  if (!Number.isInteger(position) || position < 0 || position >= cellCount) throw new RangeError(`position ${position} hors plateau`);
  const lastRow = rows - 1;
  const lastCol = cols - 1;
  if (position <= lastCol) return { row: lastRow, col: lastCol - position, side: "bottom" };
  if (position <= lastCol + lastRow) return { row: lastRow - (position - lastCol), col: 0, side: "start" };
  if (position <= 2 * lastCol + lastRow) return { row: 0, col: position - (lastCol + lastRow), side: "top" };
  return { row: position - (2 * lastCol + lastRow), col: lastCol, side: "end" };
}

/** Centre d'une case en pourcentage du plateau, pour positionner un pion en `transform`. */
export function cellCenterPercent(position: number, cellCount: number): { readonly x: number; readonly y: number } {
  const { cols, rows } = gridDims(cellCount);
  const { row, col } = perimeterPosition(position, cellCount);
  return { x: ((col + 0.5) / cols) * 100, y: ((row + 0.5) / rows) * 100 };
}

/** Décalage en UNITÉS DE CASE pour étaler plusieurs pions sur une même case. */
export function clusterOffset(index: number, count: number): { readonly dx: number; readonly dy: number } {
  if (count <= 1) return { dx: 0, dy: 0 };
  const radius = 0.24;
  const angle = (index / count) * Math.PI * 2 - Math.PI / 2;
  return { dx: Math.cos(angle) * radius, dy: Math.sin(angle) * radius };
}
