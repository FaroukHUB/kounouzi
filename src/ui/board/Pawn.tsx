"use client";

import { motion } from "motion/react";
import type { PawnPiece } from "@/config/pawns/pieces";
import { clusterOffset, gridDims, perimeterPosition } from "./layout";

export interface PawnProps {
  readonly playerId: string;
  readonly displayName: string;
  /** Le pion du joueur : son illustration et sa couleur. */
  readonly piece: PawnPiece;
  readonly position: number;
  readonly cellCount: number;
  readonly clusterIndex: number;
  readonly clusterCount: number;
  readonly active: boolean;
  readonly stepMs: number;
}

/**
 * Pion de jeu : l'illustration du pion, son socle et le halo animé du joueur
 * actif. Le
 * plateau ne porte QUE des pions — l'avatar du joueur actif est montré sous le
 * plateau, dans la barre d'action. Déplacé uniquement par `transform`
 * (translate en % de sa propre taille = en cases). Le trajet vient du moteur.
 */
export function Pawn({ playerId, displayName, piece, position, cellCount, clusterIndex, clusterCount, active, stepMs }: PawnProps) {
  const { cols, rows } = gridDims(cellCount);
  const { row, col } = perimeterPosition(position, cellCount);
  const { dx, dy } = clusterOffset(clusterIndex, clusterCount);
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
        {active ? <span className="k-halo absolute inset-[-18%] rounded-full" style={{ backgroundColor: piece.color }} aria-hidden="true" /> : null}
        {/* Socle */}
        <span className="absolute bottom-[-6%] h-[26%] w-[86%] rounded-[50%] bg-[rgba(40,25,10,0.35)] blur-[1px]" aria-hidden="true" />
        <span className="absolute bottom-[2%] h-[22%] w-[78%] rounded-[50%]" style={{ background: `linear-gradient(180deg, ${piece.color} 0%, rgba(0,0,0,0.35) 100%)` }} aria-hidden="true" />
        {/* Corps : l'illustration du pion */}
        {/* eslint-disable-next-line @next/next/no-img-element -- pion de taille fixe, image déjà dimensionnée */}
        <img src={piece.image} alt="" aria-hidden="true" className="relative size-full object-contain drop-shadow-[0_4px_6px_rgba(40,25,10,0.45)]" decoding="async" />
      </span>
    </motion.div>
  );
}
