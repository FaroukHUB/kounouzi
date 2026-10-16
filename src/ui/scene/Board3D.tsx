"use client";

import dynamic from "next/dynamic";
import type { ReactNode } from "react";
import type { ResolvedBoard } from "@/core/game";
import type { BoardTextureMode } from "@/config/scene3d";
import type { QualityTier } from "@/config/scene3d/tiers";
import type { PawnLayerProps } from "@/ui/board/PawnLayer";
import type { BuiltSite } from "./establishments";
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
  /** Les pions, exactement les propriétés de la couche 2D : les deux vues lisent la même chose. */
  readonly pawns: PawnLayerProps;
  /** Plan de caméra : suivre le joueur actif, ou prendre du recul (carte ouverte, partie finie). */
  readonly shot: "follow" | "wide";
  /** Les établissements acquis, résolus hors de la scène : case, famille, couleur du propriétaire. */
  readonly buildings: readonly BuiltSite[];
  /** Animations réduites : la caméra se place au lieu de glisser. */
  readonly reduced: boolean;
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
 * Pions et établissements vivent DANS la scène : ils ne peuvent pas être
 * empruntés au plateau 2D, qui les place en pourcentages d'une surface plate et
 * les poserait à côté de leur case.
 */
export function Board3D({ board, textureMode, quality, onTooSlow, pawns, shot, buildings, reduced, center }: Board3DProps) {
  const { cols, rows } = gridDims(board.cellCount);
  return (
    /* Ni coins arrondis ni ombre portée, contrairement au cadre 2D : la toile est
       transparente et le plateau est dessiné À L'INTÉRIEUR, donc ce cadre ne se
       voit pas — il ne ferait que rogner la place disponible. Le plateau peut
       ainsi occuper toute la largeur de l'écran. */
    <div
      className="relative w-full max-w-[min(100vw,88dvh)] select-none max-sm:max-w-[min(100vw,86dvh)] lg:h-full lg:w-auto lg:max-w-none"
      style={{ aspectRatio: `${cols} / ${rows}` }}
      data-testid="board-3d"
      data-grid={`${cols}x${rows}`}
      data-texture={textureMode}
    >
      <GameCanvas board={board} textureMode={textureMode} quality={quality} pawns={pawns} shot={shot} buildings={buildings} reduced={reduced} onTooSlow={onTooSlow} />
      {/* Le panneau du Chemin flotte au centre, comme une carte posée sur le plateau. */}
      <div className="pointer-events-none absolute inset-[14%] flex items-center justify-center">
        <div className="pointer-events-auto flex max-h-full w-full items-center justify-center">{center}</div>
      </div>
    </div>
  );
}
