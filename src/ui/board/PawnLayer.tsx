"use client";

import type { PlayerState } from "@/core/game";
import type { PlayerProfileDraft } from "@/data/ports";
import { pieceForSeat } from "@/config/pawns/pieces";
import { Pawn } from "./Pawn";

export interface PawnLayerProps {
  readonly players: readonly PlayerState[];
  /** Profils : inutiles au pion (il ne dépend que du siège), gardés pour la couche 3D qui partage ces propriétés. */
  readonly profiles: readonly PlayerProfileDraft[];
  readonly visuals: Readonly<Record<string, number>>;
  readonly activePlayerId: string;
  readonly cellCount: number;
  readonly stepMs: number;
}

export function PawnLayer({ players, visuals, activePlayerId, cellCount, stepMs }: PawnLayerProps) {
  const byCell = new Map<number, string[]>();
  for (const p of players) {
    const pos = visuals[p.id] ?? p.position;
    byCell.set(pos, [...(byCell.get(pos) ?? []), p.id]);
  }
  return (
    <>
      {players.map((p, seat) => {
        const pos = visuals[p.id] ?? p.position;
        const cluster = byCell.get(pos) ?? [p.id];
        return (
          <Pawn
            key={p.id}
            playerId={p.id}
            displayName={p.displayName}
            piece={pieceForSeat(seat)}
            position={pos}
            cellCount={cellCount}
            clusterIndex={cluster.indexOf(p.id)}
            clusterCount={cluster.length}
            active={p.id === activePlayerId}
            stepMs={stepMs}
          />
        );
      })}
    </>
  );
}
