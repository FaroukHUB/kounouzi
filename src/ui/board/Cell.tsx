"use client";

import { motion } from "motion/react";
import type { CellType } from "@/core/game";
import { DEFAULT_LOCALE, t } from "@/i18n";
import { AvatarGlyph } from "@/ui/primitives/AvatarGlyph";
import type { AvatarShape } from "@/config/avatars";
import { monumentImage } from "@/ui/theme/assets";
import { CellIcon } from "./CellIcon";
import { CELL_STYLE } from "./cellStyles";
import type { GridPosition } from "./layout";

export interface CellOwner {
  readonly name: string;
  readonly color: string;
  readonly shape: AvatarShape;
}

export interface CellProps {
  readonly position: number;
  readonly type: CellType;
  readonly grid: GridPosition;
  readonly highlighted: boolean;
  readonly arrival: boolean;
  readonly preview: boolean;
  /** Case Monument : identifiant du site (illustration) et propriétaire éventuel. */
  readonly siteId?: string | undefined;
  readonly owner?: CellOwner | undefined;
}

/**
 * Une tuile du plateau : cadre, médaillon d'icône, petit titre, illustration
 * pour les monuments et ruban de propriétaire. Seuls `transform` et `opacity`
 * sont animés ; la structure reste une grille CSS statique.
 */
export function Cell({ position, type, grid, highlighted, arrival, preview, siteId, owner }: CellProps) {
  const style = CELL_STYLE[type];
  const label = t(DEFAULT_LOCALE, `cell.${type}`);
  const isStart = type === "start";
  const isMonument = type === "heritage";
  const ring = arrival ? `0 0 0 3px ${style.accent}, 0 10px 18px -10px rgba(0,0,0,0.55)` : highlighted || preview ? `0 0 0 2px ${style.accent}aa, 0 6px 14px -10px rgba(0,0,0,0.5)` : "0 4px 10px -8px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.7)";
  return (
    <motion.div
      data-cell={position}
      data-type={type}
      data-owner={owner ? owner.name : undefined}
      className="relative flex flex-col items-center justify-end overflow-hidden rounded-[14%] border text-center leading-none"
      style={{
        gridRow: grid.row + 1,
        gridColumn: grid.col + 1,
        background: `linear-gradient(160deg, ${style.bg} 0%, ${style.bg2} 100%)`,
        color: style.fg,
        borderColor: isStart ? "rgba(255,255,255,0.35)" : "rgba(120, 80, 30, 0.22)",
        boxShadow: ring,
      }}
      animate={{ scale: arrival ? 1.08 : highlighted ? 1.04 : 1, opacity: 1 }}
      transition={{ type: "tween", duration: 0.18 }}
      aria-label={`${label} ${position}${owner ? ` — ${owner.name}` : ""}`}
    >
      {/* Illustration (monument) ou médaillon d'icône */}
      {isMonument ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={monumentImage(siteId ?? "")} alt="" aria-hidden="true" className="absolute inset-x-[8%] top-[6%] h-[46%] w-auto max-w-[84%] rounded-[10%] object-cover opacity-90" loading="lazy" decoding="async" />
      ) : (
        <span className="absolute top-[9%] flex size-[42%] items-center justify-center rounded-full" style={{ backgroundColor: isStart ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.75)", boxShadow: `inset 0 0 0 1.5px ${style.accent}66` }}>
          <CellIcon type={type} className="size-[62%]" />
        </span>
      )}
      {/* Petit titre sur ruban */}
      {/* Petit titre : masqué sur les très petits écrans (icône seule), jamais tronqué ailleurs */}
      <span className="relative z-10 mb-[7%] hidden w-full overflow-hidden rounded-full px-0.5 py-[3%] text-[clamp(0.4rem,0.78vw,0.66rem)] font-bold leading-none tracking-[-0.01em] sm:block" style={{ backgroundColor: isStart ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.72)" }}>
        {label}
      </span>
      {/* Ruban de propriétaire (monument possédé) */}
      {owner ? (
        <span className="absolute end-[6%] top-[6%] z-10 flex size-[26%] items-center justify-center rounded-full border-2 border-white text-white shadow-md" style={{ backgroundColor: owner.color }} title={owner.name} data-testid={`owner-${position}`}>
          <AvatarGlyph shape={owner.shape} className="size-[62%]" />
        </span>
      ) : null}
      <span className="absolute start-[7%] top-[5%] text-[0.5rem] font-semibold opacity-45">{position}</span>
      {/* Coins décoratifs */}
      <span className="pointer-events-none absolute inset-[4%] rounded-[12%] border" style={{ borderColor: isStart ? "rgba(255,255,255,0.25)" : `${style.accent}33` }} aria-hidden="true" />
    </motion.div>
  );
}
