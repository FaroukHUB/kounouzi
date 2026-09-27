import { z } from "zod";
import piecesJson from "./pieces.v1.json";

const pieceSchema = z.object({ id: z.string().min(1), color: z.string().regex(/^#[0-9a-f]{6}$/i), image: z.string().min(1) });
export type PawnPiece = z.infer<typeof pieceSchema>;

/** Les six pions du jeu, dans l'ordre d'attribution. */
export const PAWN_PIECES: readonly PawnPiece[] = z.object({ pieces: z.array(pieceSchema).min(6) }).parse(piecesJson).pieces;

/** Le pion d'un siège : le joueur assis en première position prend le premier pion. */
export function pieceForSeat(seat: number): PawnPiece {
  return PAWN_PIECES[((seat % PAWN_PIECES.length) + PAWN_PIECES.length) % PAWN_PIECES.length]!;
}

/**
 * La couleur d'un joueur, seule clé de lecture sur le plateau : elle vient de
 * son PION, jamais de son personnage — deux personnages peuvent porter le même
 * vêtement, deux pions n'ont jamais la même couleur.
 */
export function pieceForPlayer(players: readonly { readonly id: string }[], playerId: string): PawnPiece {
  const seat = players.findIndex((p) => p.id === playerId);
  return pieceForSeat(seat < 0 ? 0 : seat);
}
