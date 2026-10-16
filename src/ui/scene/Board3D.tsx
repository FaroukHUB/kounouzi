"use client";

import dynamic from "next/dynamic";
import type { ReactNode } from "react";
import type { ResolvedBoard } from "@/core/game";
import type { BoardTextureMode } from "@/config/scene3d";
import type { QualityTier } from "@/config/scene3d/tiers";
import { gridDims } from "@/ui/board/layout";

/**
 * `three` ne doit pas entrer dans le bundle initial : il n'est téléchargé que
 * si la 3D est réellement servie (ADR 0059). `ssr: false` parce qu'une toile
 * WebGL n'existe pas sur le serveur — le cadre, lui, est bien rendu des deux
 * côtés, donc la mise en page ne saute pas à l'hydratation.
 */
const GameCanvas = dynamic(() => import("./GameCanvas").then((m) => m.GameCanvas), { ssr: false });

export interface Board3DProps {
  readonly board: ResolvedBoard;
  readonly textureMode: BoardTextureMode;
  readonly quality: QualityTier;
  readonly onTooSlow: () => void;
  /** Panneau du Chemin : il reste en DOM, au-dessus de la toile — il est interactif et lu par les lecteurs d'écran. */
  readonly center: ReactNode;
}

/**
 * LE PLATEAU 3D, à la place du plateau 2D.
 *
 * Le cadre est volontairement le même que celui de `Board` : mêmes largeurs
 * maximales, même rapport d'image calculé à partir du nombre de cases. La mise
 * en page ne change donc pas d'un mode à l'autre, et basculer 3D ↔ 2D ne fait
 * pas sauter l'écran.
 *
 * CE QUI MANQUE À CETTE ÉTAPE, et c'est assumé : ni pions, ni établissements,
 * ni rubans de propriétaire. Les pions 2D sont placés en pourcentages du
 * plateau plat ; posés sur un plateau incliné ils tomberaient à côté de leur
 * case, ce qui ressemblerait à une panne. Ils arrivent à l'étape 2, dans la
 * scène. En attendant, la vue complète reste le plateau 2D.
 */
export function Board3D({ board, textureMode, quality, onTooSlow, center }: Board3DProps) {
  const { cols, rows } = gridDims(board.cellCount);
  return (
    <div
      className="relative w-full max-w-[min(94vw,80dvh)] select-none overflow-hidden rounded-[1.6rem] shadow-[0_30px_70px_-30px_rgba(0,0,0,0.8)] max-sm:max-w-[min(96vw,78dvh)] lg:h-full lg:w-auto lg:max-w-none"
      style={{ aspectRatio: `${cols} / ${rows}` }}
      data-testid="board-3d"
      data-grid={`${cols}x${rows}`}
      data-texture={textureMode}
    >
      <GameCanvas board={board} textureMode={textureMode} quality={quality} onTooSlow={onTooSlow} />
      {/* Le panneau du Chemin flotte au centre, comme une carte posée sur le plateau. */}
      <div className="pointer-events-none absolute inset-[14%] flex items-center justify-center">
        <div className="pointer-events-auto flex max-h-full w-full items-center justify-center">{center}</div>
      </div>
    </div>
  );
}
