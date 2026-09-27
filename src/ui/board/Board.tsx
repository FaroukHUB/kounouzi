"use client";

import type { ReactNode } from "react";
import type { Holding, PurchasableSite, ResolvedBoard } from "@/core/game";
import { avatarById } from "@/config/avatars";
import { ASSETS } from "@/ui/theme/assets";
import type { PlayerProfileDraft } from "@/data/ports";
import { Cell, type CellOwner } from "./Cell";
import { gridDims, perimeterPosition } from "./layout";

export interface BoardProps {
  readonly board: ResolvedBoard;
  readonly highlightedCell: number | null;
  readonly arrivalCell: number | null;
  readonly previewPath: readonly number[];
  /** Couche des pions (superposée) et contenu central. */
  readonly pawns: ReactNode;
  readonly center: ReactNode;
  /** Propriétés et profils : uniquement pour afficher le propriétaire d'un établissement (visuel). */
  readonly holdings?: readonly Holding[] | undefined;
  /** Sites (établissements) : icône et nom affichés sur la case. */
  readonly sites?: Readonly<Record<string, PurchasableSite>> | undefined;
  readonly players?: readonly { readonly id: string; readonly displayName: string }[] | undefined;
  readonly profiles?: readonly PlayerProfileDraft[] | undefined;
}

/**
 * Plateau : cadre bois, tapis texturé, grille CSS statique (elle ne se
 * recalcule jamais pendant un déplacement), cœur central décoré.
 */
export function Board({ board, highlightedCell, arrivalCell, previewPath, pawns, center, holdings = [], sites = {}, players = [], profiles = [] }: BoardProps) {
  const { cols, rows } = gridDims(board.cellCount);
  const preview = new Set(previewPath);
  const ownerOf = (siteId: string): CellOwner | undefined => {
    const h = holdings.find((x) => x.siteId === siteId);
    if (!h) return undefined;
    const avatar = avatarById(profiles.find((p) => p.id === h.ownerId)?.avatarId ?? "amber");
    return { name: players.find((p) => p.id === h.ownerId)?.displayName ?? String(h.ownerId), color: avatar.color, shape: avatar.shape };
  };
  return (
    <div className="bg-wood relative w-full max-w-[min(94vw,80dvh)] select-none rounded-[2.2rem] p-[2.2%] lg:h-[min(84dvh,calc(100vw-26rem))] lg:w-auto lg:max-w-none shadow-[0_30px_70px_-30px_rgba(60,35,10,0.75),inset_0_2px_0_rgba(255,255,255,0.25)]" style={{ aspectRatio: `${cols} / ${rows}` }} data-testid="board" data-grid={`${cols}x${rows}`}>
      <div className="pointer-events-none absolute inset-[1.1%] rounded-[1.9rem] border border-[rgba(255,220,160,0.35)]" aria-hidden="true" />
      <div
        className="relative grid size-full gap-[1.1%] rounded-[1.4rem] p-[1.4%]"
        style={{
          gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
          backgroundColor: "var(--k-board)",
          // ESSAI : la carte illustrée sert de tapis à TOUT le plateau ; les cases se posent dessus.
          backgroundImage: `url(${ASSETS.boardCenter})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          boxShadow: "inset 0 0 40px rgba(90, 60, 20, 0.25)",
        }}
      >
        {board.cells.map((cell) => (
          <Cell
            key={cell.position}
            position={cell.position}
            type={cell.type}
            grid={perimeterPosition(cell.position, board.cellCount)}
            highlighted={highlightedCell === cell.position}
            arrival={arrivalCell === cell.position}
            preview={preview.has(cell.position)}
            siteId={cell.type === "heritage" ? cell.siteId : undefined}
            establishment={cell.type === "heritage" && sites[cell.siteId]?.establishment ? { icon: sites[cell.siteId]!.establishment!.icon, name: sites[cell.siteId]!.establishment!.name.fr, family: sites[cell.siteId]!.establishment!.family } : undefined}
            owner={cell.type === "heritage" ? ownerOf(cell.siteId) : undefined}
          />
        ))}
        <div className="relative flex items-center justify-center" style={{ gridRow: `2 / ${rows}`, gridColumn: `2 / ${cols}` }}>
          {center}
        </div>
      </div>
      <div className="pointer-events-none absolute inset-[3.6%]">{pawns}</div>
    </div>
  );
}
