"use client";

import type { CSSProperties } from "react";
import type { AvatarOutfit } from "@/config/avatars";

export interface FacelessCharacterProps {
  readonly color: string;
  readonly outfit: AvatarOutfit;
  readonly active?: boolean;
  readonly compact?: boolean;
  readonly className?: string;
}

/**
 * Figurine Kounouzi sans visage.
 * Construction CSS légère : aucune image, aucune donnée biométrique et aucun
 * détail facial. Le style de tenue vient uniquement de la configuration avatar.
 */
export function FacelessCharacter({ color, outfit, active = false, compact = false, className = "" }: FacelessCharacterProps) {
  const style = { color } as CSSProperties;
  return (
    <span
      className={`k-character k-character--${outfit} ${compact ? "k-character--compact" : ""} ${active ? "k-character--active" : ""} ${className}`}
      style={style}
      aria-hidden="true"
    >
      <span className="k-character__shadow" />
      <span className="k-character__body">
        <span className="k-character__robe" />
        <span className="k-character__arm k-character__arm--left" />
        <span className="k-character__arm k-character__arm--right" />
      </span>
      <span className="k-character__head">
        <span className="k-character__face" />
        <span className="k-character__headwear k-character__headwear--kufi" />
        <span className="k-character__headwear k-character__headwear--hijab" />
        <span className="k-character__headwear k-character__headwear--ghutra" />
        <span className="k-character__headwear k-character__headwear--jilbab" />
      </span>
      <span className="k-character__base" />
    </span>
  );
}
