import type { EstablishmentFamily, Holding, PurchasableSite, ResolvedBoard } from "@/core/game";
import { deckFor } from "@/config/cards";
import { pieceForPlayer } from "@/config/pawns/pieces";
import { perimeterPosition } from "@/ui/board/layout";
import { cellCenter, type Point3 } from "./boardGeometry";

/**
 * LES ÉTABLISSEMENTS — où ils se posent, de quelle couleur, comment ils sortent
 * du sol. Des données vers des données (ADR 0059).
 *
 * Aucun import de `three` : c'est ici que se prennent les décisions, donc c'est
 * ici qu'elles se testent. `establishmentMesh.ts` ne fera que les traduire en
 * volumes.
 *
 * LA SCÈNE NE LIT PAS LES ÉVÉNEMENTS. Elle compare deux listes de bâtiments :
 * ce qui apparaît depuis la dernière fois sort du sol, le reste est déjà
 * construit. C'est ce qui fait qu'une partie reprise affiche les établissements
 * posés, sans rejouer une seule animation — exactement comme le veut la règle de
 * reprise du jeu, et sans avoir eu besoin de la réécrire ici.
 */

export interface BuiltSite {
  readonly siteId: string;
  /** Case du plateau qui porte ce site. */
  readonly position: number;
  readonly family: EstablishmentFamily;
  /** Couleur du PROPRIÉTAIRE — celle de son pion, la seule clé de lecture du plateau. */
  readonly color: string;
  /**
   * L'ILLUSTRATION DE L'ÉTABLISSEMENT, celle de sa propre carte.
   *
   * Chaque établissement du plateau a déjà sa carte dessinée, avec son nom peint
   * dessus (ADR 0050) — et le plateau 2D s'en sert déjà pour habiller la case.
   * La 3D dresse la même image sur la case : un panneau illustré se reconnaît du
   * premier coup d'œil là où un volume géométrique, à la taille d'une demi-case
   * et vu de haut, n'est qu'une boîte colorée. Absente, il reste le volume.
   */
  readonly art: string | null;
  /** Proportions de cette illustration, pour ne jamais la déformer. */
  readonly artWidth: number;
  readonly artHeight: number;
}

export interface BuiltSitesInput {
  readonly board: ResolvedBoard;
  readonly sites: Readonly<Record<string, PurchasableSite>>;
  readonly holdings: readonly Holding[];
  readonly players: readonly { readonly id: string }[];
}

/**
 * Les établissements à montrer, dans l'ordre des cases.
 *
 * Un site sans établissement déclaré ne donne aucun bâtiment : rien n'est
 * inventé pour combler un trou dans les données. Un patrimoine dont la case
 * n'existe pas sur ce plateau est ignoré de la même façon — une partie figée
 * avec une autre configuration ne doit pas faire planter l'affichage.
 */
export function builtSites({ board, sites, holdings, players }: BuiltSitesInput): readonly BuiltSite[] {
  const cellOf = new Map<string, number>();
  for (const cell of board.cells) if (cell.type === "heritage") cellOf.set(cell.siteId, cell.position);
  const out: BuiltSite[] = [];
  for (const holding of holdings) {
    const position = cellOf.get(holding.siteId);
    const family = sites[holding.siteId]?.establishment?.family;
    if (position === undefined || family === undefined) continue;
    const deck = deckFor({ siteId: holding.siteId });
    out.push({
      siteId: holding.siteId,
      position,
      family,
      color: pieceForPlayer(players, holding.ownerId).color,
      art: deck?.back ?? null,
      artWidth: deck?.width ?? 1,
      artHeight: deck?.height ?? 1,
    });
  }
  return out.sort((a, b) => a.position - b.position);
}

/**
 * Direction « vers l'extérieur du plateau » pour une case, en unités de case.
 *
 * Le bâtiment se pose du côté INTÉRIEUR de sa tuile et le pion passe du côté
 * extérieur : sans cette séparation, un pion seul sur une case construite se
 * retrouve au milieu du bâtiment. Les deux restent sur leur tuile.
 */
export function outwardOffset(position: number, cellCount: number, amount: number): Point3 {
  const { side } = perimeterPosition(position, cellCount);
  // La grille a la ligne 0 en haut (z négatif) et la colonne 0 à gauche (x négatif).
  switch (side) {
    case "bottom":
      return { x: 0, y: 0, z: amount };
    case "top":
      return { x: 0, y: 0, z: -amount };
    case "start":
      return { x: -amount, y: 0, z: 0 };
    case "end":
      return { x: amount, y: 0, z: 0 };
  }
}

/** Centre du bâtiment d'une case : le centre de la tuile, décalé vers l'intérieur du plateau. */
export function buildingPoint(position: number, cellCount: number, inset: number): Point3 {
  const center = cellCenter(position, cellCount);
  const away = outwardOffset(position, cellCount, inset);
  return { x: center.x - away.x, y: 0, z: center.z - away.z };
}

/**
 * Sortie de terre : le panneau se déplie, dépasse un peu, et se pose.
 *
 * Nul au départ, exactement 1 à l'arrivée, et le petit dépassement au milieu est
 * ce qui fait lire « il surgit » plutôt que « il grandit ». La valeur ne descend
 * jamais sous zéro : un bâtiment ne s'enfonce pas sous le plateau avant de
 * sortir.
 */
export function riseAt(progress: number, overshoot = 0.12): number {
  const p = Math.min(1, Math.max(0, progress));
  if (p >= 1) return 1;
  // Montée amortie : rapide au départ, dépassement, puis retour au repos.
  const base = 1 - Math.pow(1 - p, 3);
  return Math.max(0, base + Math.sin(p * Math.PI) * overshoot);
}

/** Les deux listes décrivent-elles le même bâtiment ? Sert à savoir ce qui vient d'apparaître ou de changer de main. */
export function sameBuilding(a: BuiltSite, b: BuiltSite): boolean {
  return a.siteId === b.siteId && a.position === b.position && a.family === b.family && a.color === b.color && a.art === b.art;
}
