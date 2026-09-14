"use client";

import { motion } from "motion/react";
import { avatarById } from "@/config/avatars";
import { FacelessCharacter } from "@/ui/primitives/FacelessCharacter";
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
 * Figurine joueur : personnage stylisé en volume, sans visage, habillé avec
 * une tenue modeste définie par l'avatar. Le déplacement reste strictement
 * piloté par le moteur et animé uniquement par translation.
 */
export function Pawn({ playerId, displayName, avatarId, position, cellCount, clusterIndex, clusterCount, active, stepMs }: PawnProps) {
  const { cols, rows } = gridDims(cellCount);
  const { row, col } = perimeterPosition(position, cellCount);
  const { dx, dy } = clusterOffset(clusterIndex, clusterCount);
  const avatar = avatarById(avatarId);
  const size = { width: `${100 / cols}%`, height: `${100 / rows}%` };
  const scale = clusterCount > 1 ? 0.78 : 1;

  return (
    <motion.div
      data-pawn={playerId}
      data-active={active}
      className="pointer-events-none absolute start-0 top-0 z-20 flex items-center justify-center"
      style={{ ...size, willChange: "transform" }}
      initial={false}
      animate={{ x: `${(col + dx) * 100}%`, y: `${(row + dy) * 100}%`, scale: active ? scale * 1.08 : scale }}
      transition={{ type: "tween", duration: Math.max(stepMs * 0.8, 0) / 1000, ease: "easeInOut" }}
      aria-label={displayName}
    >
      <span className="k-character-lift relative flex size-[92%] items-end justify-center">
        {active ? <span className="k-halo absolute inset-[12%] rounded-full" style={{ backgroundColor: avatar.color }} aria-hidden="true" /> : null}
        <FacelessCharacter color={avatar.color} outfit={avatar.outfit} active={active} />
      </span>
    </motion.div>
  );
}
