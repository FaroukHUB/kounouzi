"use client";

import { motion } from "motion/react";
import { avatarById } from "@/config/avatars";
import { AvatarGlyph } from "@/ui/primitives/AvatarGlyph";
import { clusterOffset, gridSize, perimeterPosition } from "./layout";

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
 * Pion : un carré de la taille d'une case, déplacé uniquement par `transform`
 * (translate en % de sa propre taille = en cases). Le trajet vient du moteur.
 */
export function Pawn({ playerId, displayName, avatarId, position, cellCount, clusterIndex, clusterCount, active, stepMs }: PawnProps) {
  const g = gridSize(cellCount);
  const { row, col } = perimeterPosition(position, cellCount);
  const { dx, dy } = clusterOffset(clusterIndex, clusterCount);
  const avatar = avatarById(avatarId);
  const size = `${100 / g}%`;
  return (
    <motion.div
      data-pawn={playerId}
      className="pointer-events-none absolute start-0 top-0 flex items-center justify-center"
      style={{ width: size, height: size, willChange: "transform" }}
      initial={false}
      animate={{ x: `${(col + dx) * 100}%`, y: `${(row + dy) * 100}%`, scale: active ? 1.12 : 1 }}
      transition={{ type: "tween", duration: Math.max(stepMs * 0.8, 0) / 1000, ease: "easeInOut" }}
      aria-label={displayName}
    >
      <span
        className="flex size-[58%] items-center justify-center rounded-full border-2 border-white text-white shadow-md"
        style={{ backgroundColor: avatar.color, boxShadow: active ? `0 0 0 4px ${avatar.color}55, 0 6px 14px -4px rgba(0,0,0,0.5)` : "0 4px 10px -4px rgba(0,0,0,0.45)" }}
      >
        <AvatarGlyph shape={avatar.shape} className="size-[62%]" />
      </span>
    </motion.div>
  );
}
