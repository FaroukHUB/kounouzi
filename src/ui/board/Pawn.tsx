"use client";

import { motion } from "motion/react";
import { avatarById } from "@/config/avatars";
import { AvatarGlyph } from "@/ui/primitives/AvatarGlyph";
import { clusterOffset, gridDims, perimeterPosition } from "./layout";

export interface PawnProps {
  readonly playerId: string;
  readonly displayName: string;
  readonly avatarId: string;
  readonly position: number;
  readonly cellCount: number;
  readonly clusterIndex: number;
  readonly clusterCount: number;
  readonly active: boolean;
  readonly stepMs: number;
}

/**
 * Pion de jeu : socle, corps coloré avec avatar, halo animé pour le joueur
 * actif. Déplacé uniquement par `transform` (translate en % de sa propre
 * taille = en cases). Le trajet vient du moteur.
 */
export function Pawn({ playerId, displayName, avatarId, position, cellCount, clusterIndex, clusterCount, active, stepMs }: PawnProps) {
  const { cols, rows } = gridDims(cellCount);
  const { row, col } = perimeterPosition(position, cellCount);
  const { dx, dy } = clusterOffset(clusterIndex, clusterCount);
  const avatar = avatarById(avatarId);
  // Cases carrées : largeur en % des colonnes, hauteur en % des lignes (grille rectangulaire).
  const size = { width: `${100 / cols}%`, height: `${100 / rows}%` };
  const scale = clusterCount > 1 ? 0.82 : 1;
  return (
    <motion.div
      data-pawn={playerId}
      data-active={active}
      className="pointer-events-none absolute start-0 top-0 flex items-center justify-center"
      style={{ ...size, willChange: "transform" }}
      initial={false}
      animate={{ x: `${(col + dx) * 100}%`, y: `${(row + dy) * 100}%`, scale: active ? scale * 1.1 : scale }}
      transition={{ type: "tween", duration: Math.max(stepMs * 0.8, 0) / 1000, ease: "easeInOut" }}
      aria-label={displayName}
    >
      <span className="relative flex size-[64%] items-center justify-center">
        {/* Halo du joueur actif */}
        {active ? <span className="k-halo absolute inset-[-18%] rounded-full" style={{ backgroundColor: avatar.color }} aria-hidden="true" /> : null}
        {/* Socle */}
        <span className="absolute bottom-[-6%] h-[26%] w-[86%] rounded-[50%] bg-[rgba(40,25,10,0.35)] blur-[1px]" aria-hidden="true" />
        <span className="absolute bottom-[2%] h-[22%] w-[78%] rounded-[50%]" style={{ background: `linear-gradient(180deg, ${avatar.color} 0%, rgba(0,0,0,0.35) 100%)` }} aria-hidden="true" />
        {/* Corps */}
        <span
          className="relative flex size-[82%] items-center justify-center rounded-full border-[2.5px] border-white text-white"
          style={{ background: `radial-gradient(circle at 35% 30%, rgba(255,255,255,0.55) 0%, ${avatar.color} 45%, ${avatar.color} 100%)`, boxShadow: "0 5px 10px -4px rgba(0,0,0,0.55), inset 0 -3px 6px rgba(0,0,0,0.25)" }}
        >
          <AvatarGlyph shape={avatar.shape} className="size-[60%] drop-shadow" />
        </span>
      </span>
    </motion.div>
  );
}
