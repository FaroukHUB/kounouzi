"use client";

import { motion } from "motion/react";
import type { CellType, EstablishmentFamily } from "@/core/game";
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
  /** Case Établissement : identifiant du site (illustration), établissement (icône, nom) et propriétaire éventuel. */
  readonly siteId?: string | undefined;
  readonly establishment?: { readonly icon?: string | undefined; readonly name: string; readonly family: EstablishmentFamily } | undefined;
  readonly owner?: CellOwner | undefined;
}

/**
 * Une tuile du plateau : cadre, médaillon d'icône, petit titre, illustration
 * ou icône pour les établissements et ruban de propriétaire. Seuls `transform` et `opacity`
 * sont animés ; la structure reste une grille CSS statique.
 */
export function Cell({ position, type, grid, highlighted, arrival, preview, siteId, establishment, owner }: CellProps) {
  const style = CELL_STYLE[type];
  const label = t(DEFAULT_LOCALE, `cell.${type}`);
  // Case Établissement : le ruban porte la famille (court), lisible sur une petite tuile ; le nom complet reste dans l'infobulle et l'étiquette accessible.
  const ribbon = establishment ? t(DEFAULT_LOCALE, `cell.family.${establishment.family}`) : label;
  const isStart = type === "start";
  const isMonument = type === "heritage";
  // Halte : « grosse case » — médaillon plus grand, liseré marqué, légère mise en avant (structure de grille inchangée).
  const isHalt = type === "halt";
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
        borderColor: isStart ? "rgba(255,255,255,0.35)" : isHalt ? style.accent : "rgba(120, 80, 30, 0.22)",
        borderWidth: isHalt ? 3 : undefined,
        boxShadow: isHalt && !arrival && !highlighted ? `0 0 0 2px ${style.accent}55, 0 10px 18px -10px rgba(0,0,0,0.55)` : ring,
        zIndex: isHalt ? 1 : undefined,
      }}
      animate={{ scale: arrival ? 1.08 : highlighted ? 1.04 : isHalt ? 1.05 : 1, opacity: 1 }}
      data-big={isHalt ? "true" : undefined}
      transition={{ type: "tween", duration: 0.18 }}
      aria-label={`${label} ${position}${establishment ? ` ${establishment.name}` : ""}${owner ? ` — ${owner.name}` : ""}`}
      title={establishment?.name}
    >
      {/* Icône de l'établissement, illustration (ancien site) ou médaillon d'icône */}
      {isMonument && establishment?.icon ? (
        <span className="absolute top-[8%] flex size-[46%] items-center justify-center rounded-full text-[clamp(0.9rem,2.6vw,1.6rem)] leading-none" style={{ backgroundColor: "rgba(255,255,255,0.8)", boxShadow: `inset 0 0 0 1.5px ${style.accent}66` }} aria-hidden="true" data-testid={`establishment-${position}`}>
          {establishment.icon}
        </span>
      ) : isMonument ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={monumentImage(siteId ?? "")} alt="" aria-hidden="true" className="absolute inset-x-[8%] top-[6%] h-[46%] w-auto max-w-[84%] rounded-[10%] object-cover opacity-90" loading="lazy" decoding="async" />
      ) : (
        <span className={`absolute top-[9%] flex ${isHalt ? "size-[52%]" : "size-[42%]"} items-center justify-center rounded-full`} style={{ backgroundColor: isStart ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.75)", boxShadow: `inset 0 0 0 1.5px ${style.accent}66` }}>
          <CellIcon type={type} className="size-[62%]" />
        </span>
      )}
      {/* Petit titre sur ruban */}
      {/* Petit titre : masqué sur les très petits écrans (icône seule), jamais tronqué ailleurs */}
      <span className="relative z-10 mb-[7%] hidden w-full overflow-hidden rounded-full px-0.5 py-[3%] text-[clamp(0.38rem,0.7vw,0.62rem)] font-bold leading-none tracking-[-0.01em] sm:block" style={{ backgroundColor: isStart ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.72)" }}>
        {ribbon}
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
