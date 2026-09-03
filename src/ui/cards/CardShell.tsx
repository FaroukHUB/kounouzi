"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";
import { CellIcon } from "@/ui/board/CellIcon";
import { CELL_STYLE } from "@/ui/board/cellStyles";
import type { CellType } from "@/core/game";

export interface CardShellProps {
  readonly cellType: CellType;
  readonly title: string;
  readonly subtitle?: string | undefined;
  readonly children: ReactNode;
  readonly testId?: string | undefined;
}

/** Coque commune des cartes : identité visuelle par type de case, contenu scrollable, tactile. */
export function CardShell({ cellType, title, subtitle, children, testId }: CardShellProps) {
  const style = CELL_STYLE[cellType];
  return (
    <motion.section
      data-testid={testId ?? "card"}
      data-card-type={cellType}
      initial={{ opacity: 0, scale: 0.9, y: 24 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 12 }}
      transition={{ type: "tween", duration: 0.25 }}
      className="flex max-h-[min(88dvh,720px)] w-[min(92vw,560px)] flex-col overflow-hidden rounded-[2rem] bg-white shadow-[0_30px_80px_-30px_rgba(15,23,42,0.6)]"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <header className="flex items-center gap-3 px-6 py-4" style={{ backgroundColor: style.bg, color: style.fg }}>
        <span className="flex size-10 items-center justify-center rounded-full bg-white/70">
          <CellIcon type={cellType} className="size-6" />
        </span>
        <span className="min-w-0">
          <span className="block text-xs font-bold uppercase tracking-wider opacity-70">{subtitle}</span>
          <span className="block truncate text-lg font-black">{title}</span>
        </span>
      </header>
      <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-6 py-5">{children}</div>
    </motion.section>
  );
}
