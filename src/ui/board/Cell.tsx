"use client";

import { motion } from "motion/react";
import type { CellType } from "@/core/game";
import { DEFAULT_LOCALE, t } from "@/i18n";
import { CellIcon } from "./CellIcon";
import { CELL_STYLE } from "./cellStyles";
import type { GridPosition } from "./layout";

export interface CellProps {
  readonly position: number;
  readonly type: CellType;
  readonly grid: GridPosition;
  readonly highlighted: boolean;
  readonly arrival: boolean;
  readonly preview: boolean;
}

/** Une case du plateau. Seuls `transform` et `opacity` sont animés. */
export function Cell({ position, type, grid, highlighted, arrival, preview }: CellProps) {
  const style = CELL_STYLE[type];
  const label = t(DEFAULT_LOCALE, `cell.${type}`);
  return (
    <motion.div
      data-cell={position}
      data-type={type}
      className="relative flex flex-col items-center justify-center rounded-xl border text-center leading-none"
      style={{
        gridRow: grid.row + 1,
        gridColumn: grid.col + 1,
        backgroundColor: style.bg,
        color: style.fg,
        borderColor: highlighted || arrival ? style.accent : preview ? style.accent : "rgba(0,0,0,0.06)",
        boxShadow: arrival ? `0 0 0 3px ${style.accent}` : preview ? `inset 0 0 0 2px ${style.accent}55` : "none",
      }}
      animate={{ scale: arrival ? 1.08 : highlighted ? 1.04 : 1, opacity: 1 }}
      transition={{ type: "tween", duration: 0.18 }}
      aria-label={`${label} ${position}`}
    >
      <CellIcon type={type} className="size-[38%] max-h-6" />
      <span className="mt-0.5 text-[clamp(0.45rem,1.1vw,0.7rem)] font-semibold tracking-wide uppercase">{label}</span>
      <span className="absolute top-0.5 end-1 text-[0.55rem] opacity-50">{position}</span>
    </motion.div>
  );
}
