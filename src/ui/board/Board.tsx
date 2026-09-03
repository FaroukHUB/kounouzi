"use client";

import type { ReactNode } from "react";
import type { ResolvedBoard } from "@/core/game";
import { Cell } from "./Cell";
import { gridSize, perimeterPosition } from "./layout";

export interface BoardProps {
  readonly board: ResolvedBoard;
  readonly highlightedCell: number | null;
  readonly arrivalCell: number | null;
  readonly previewPath: readonly number[];
  /** Couche des pions (superposée) et contenu central. */
  readonly pawns: ReactNode;
  readonly center: ReactNode;
}

/** Grille CSS statique : elle ne se recalcule jamais pendant un déplacement. */
export function Board({ board, highlightedCell, arrivalCell, previewPath, pawns, center }: BoardProps) {
  const g = gridSize(board.cellCount);
  const preview = new Set(previewPath);
  return (
    <div className="relative aspect-square w-full max-w-[min(92vw,78vh)] select-none rounded-[1.75rem] bg-[var(--k-board)] p-[1.5%] shadow-[0_24px_60px_-30px_rgba(15,23,42,0.55)]">
      <div className="grid size-full gap-[1.2%]" style={{ gridTemplateColumns: `repeat(${g}, minmax(0, 1fr))`, gridTemplateRows: `repeat(${g}, minmax(0, 1fr))` }}>
        {board.cells.map((cell) => (
          <Cell
            key={cell.position}
            position={cell.position}
            type={cell.type}
            grid={perimeterPosition(cell.position, board.cellCount)}
            highlighted={highlightedCell === cell.position}
            arrival={arrivalCell === cell.position}
            preview={preview.has(cell.position)}
          />
        ))}
        <div className="flex items-center justify-center" style={{ gridRow: `2 / ${g}`, gridColumn: `2 / ${g}` }}>
          {center}
        </div>
      </div>
      <div className="pointer-events-none absolute inset-[1.5%]">{pawns}</div>
    </div>
  );
}
