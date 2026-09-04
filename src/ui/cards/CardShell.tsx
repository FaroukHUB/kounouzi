"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";
import { CellIcon } from "@/ui/board/CellIcon";
import { CELL_STYLE } from "@/ui/board/cellStyles";
import { ASSETS } from "@/ui/theme/assets";
import type { CellType } from "@/core/game";

export interface CardShellProps {
  readonly cellType: CellType;
  readonly title: string;
  readonly subtitle?: string | undefined;
  readonly children: ReactNode;
  readonly testId?: string | undefined;
  /** Bandeau illustré plus haut (Duel, Trésor, Halte). */
  readonly tall?: boolean | undefined;
}

/**
 * Coque commune des cartes : parchemin, bandeau illustré par famille de case
 * (asset remplaçable), médaillon d'icône, coins ornés. Contenu scrollable, tactile.
 */
export function CardShell({ cellType, title, subtitle, children, testId, tall }: CardShellProps) {
  const style = CELL_STYLE[cellType];
  return (
    <motion.section
      data-testid={testId ?? "card"}
      data-card-type={cellType}
      initial={{ opacity: 0, scale: 0.9, y: 24 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 12 }}
      transition={{ type: "tween", duration: 0.25 }}
      className="bg-parchment relative flex max-h-[min(90dvh,760px)] w-[min(94vw,580px)] flex-col overflow-hidden rounded-[1.8rem] shadow-[0_34px_80px_-30px_rgba(40,25,10,0.7),0_0_0_1px_rgba(120,80,30,0.25)]"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      {/* Liseré doré */}
      <span className="pointer-events-none absolute inset-[6px] z-20 rounded-[1.5rem] border border-[rgba(212,160,23,0.45)]" aria-hidden="true" />
      <header className={`relative flex items-end gap-3 px-6 ${tall ? "min-h-28 pb-4 pt-8" : "min-h-20 py-4"}`} style={{ backgroundColor: style.bg, color: style.fg, backgroundImage: `url(${ASSETS.cardBanner[cellType]})`, backgroundSize: "cover", backgroundPosition: "center" }}>
        <span className="flex size-12 shrink-0 items-center justify-center rounded-full border-2 border-white/80 shadow-md" style={{ backgroundColor: style.accent, color: "#fff" }}>
          <CellIcon type={cellType} className="size-6" />
        </span>
        <span className="min-w-0">
          <span className="block text-xs font-bold uppercase tracking-[0.18em] opacity-75">{subtitle}</span>
          <span className="font-display block truncate text-xl font-black">{title}</span>
        </span>
      </header>
      <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-6 py-5">{children}</div>
    </motion.section>
  );
}
