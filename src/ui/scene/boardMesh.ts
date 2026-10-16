import * as THREE from "three";
import type { ResolvedBoard } from "@/core/game";
import type { BoardTextureMode, Scene3dConfig } from "@/config/scene3d";
import { CELL_STYLE } from "@/ui/board/cellStyles";
import { boardExtent, cellCenter, centerArea, uvForCell, uvForCenter, type UvRect } from "./boardGeometry";

/**
 * LE PLATEAU EN OBJETS 3D.
 *
 * Ce fichier ne décide rien (ADR 0059) : toutes les positions, toutes les
 * portions de texture et toutes les dimensions viennent de `boardGeometry.ts`,
 * qui est pur et testé. Ici on ne fait que fabriquer de la géométrie et des
 * matériaux — ce qui n'est pas testable dans Node, sans DOM ni WebGL.
 *
 * Aucune ombre calculée : sur un téléphone, une carte d'ombres est le premier
 * poste de dépense, et pour un plateau vu d'un angle fixe elle n'apporte
 * presque rien. Le relief vient de l'éclairage et des flancs des tuiles.
 */

export interface BoardMeshInput {
  readonly board: ResolvedBoard;
  readonly config: Scene3dConfig;
  readonly textureMode: BoardTextureMode;
  /** Illustration du plateau. Absente, les surfaces restent unies — la scène ne doit jamais attendre une image. */
  readonly illustration: THREE.Texture | null;
}

export interface BoardMesh {
  readonly group: THREE.Group;
  /** Une tuile par case, dans l'ordre des positions : les étapes suivantes s'en serviront pour la surbrillance et les établissements. */
  readonly tiles: readonly THREE.Mesh[];
  dispose(): void;
}

/** Applique une portion de texture au groupe d'UV d'une géométrie. */
function remapUv(geometry: THREE.BufferGeometry, rect: UvRect): void {
  const uv = geometry.getAttribute("uv");
  if (!uv) return;
  for (let i = 0; i < uv.count; i += 1) {
    uv.setXY(i, rect.u + uv.getX(i) * rect.du, rect.v + uv.getY(i) * rect.dv);
  }
  uv.needsUpdate = true;
}

/**
 * Une tuile de case.
 *
 * `BoxGeometry` sépare ses six faces en groupes d'UV distincts : seules les UV
 * de la face du dessus (groupe 2 dans l'ordre de three.js) doivent recevoir la
 * portion d'illustration. Les remapper toutes étirerait l'image sur les flancs.
 */
function tileGeometry(size: number, height: number, rect: UvRect | null): THREE.BufferGeometry {
  const geometry = new THREE.BoxGeometry(size, height, size);
  if (rect) {
    const uv = geometry.getAttribute("uv");
    // Six faces × quatre sommets ; la face supérieure occupe les sommets 8 à 11.
    for (let i = 8; i < 12; i += 1) {
      uv.setXY(i, rect.u + uv.getX(i) * rect.du, rect.v + uv.getY(i) * rect.dv);
    }
    uv.needsUpdate = true;
  }
  return geometry;
}

export function createBoardMesh({ board, config, textureMode, illustration }: BoardMeshInput): BoardMesh {
  const { cellCount } = board;
  const extent = boardExtent(cellCount);
  const { cellGap, tileHeight, centerDrop, rimHeight } = config.board;
  const tileSize = 1 - cellGap;
  const group = new THREE.Group();
  const disposables: { dispose(): void }[] = [];
  const keep = <T extends { dispose(): void }>(value: T): T => {
    disposables.push(value);
    return value;
  };

  // Le socle : il ferme le plateau par-dessous et sur les côtés, pour qu'aucun
  // bord ne laisse voir le vide quand la caméra s'incline.
  //
  // IL PASSE SOUS LE PLAN CENTRAL, pas au même niveau. Deux surfaces exactement
  // à la même hauteur se disputent la profondeur, et le résultat n'est pas une
  // surface qui gagne : c'est un mélange sale des deux, qui changeait selon la
  // distance de la caméra — l'illustration apparaissait coupée en deux, moitié
  // image, moitié bois.
  const BASE_SOUS_LE_CENTRE = 0.02;
  const base = new THREE.Mesh(
    keep(new THREE.BoxGeometry(extent.width, rimHeight, extent.depth)),
    keep(new THREE.MeshStandardMaterial({ color: new THREE.Color("#7a5a2e"), roughness: 0.85, metalness: 0 })),
  );
  base.position.y = -rimHeight / 2 - centerDrop - BASE_SOUS_LE_CENTRE;
  group.add(base);

  // Le plan central : l'illustration en mode « plan central », sinon la portion
  // d'image qui lui revient (mode « plateau entier »), sinon une couleur unie.
  const area = centerArea(cellCount);
  if (area.width > 0 && area.depth > 0) {
    const centerGeometry = keep(new THREE.PlaneGeometry(area.width, area.depth));
    centerGeometry.rotateX(-Math.PI / 2);
    if (illustration) remapUv(centerGeometry, textureMode === "center" ? { u: 0, v: 0, du: 1, dv: 1 } : uvForCenter(cellCount));
    const centerMaterial = keep(
      illustration
        ? new THREE.MeshStandardMaterial({ map: illustration, roughness: 0.9, metalness: 0 })
        : new THREE.MeshStandardMaterial({ color: new THREE.Color("#d9c9a3"), roughness: 0.9, metalness: 0 }),
    );
    const center = new THREE.Mesh(centerGeometry, centerMaterial);
    center.position.y = -centerDrop;
    group.add(center);
  }

  // Les tuiles. En mode « plateau entier », chacune porte le morceau
  // d'illustration qui lui correspond, pour que l'image continue d'une case à
  // l'autre au lieu d'être répétée sur chacune. En mode « plan central », elles
  // portent la couleur de leur famille — la même qu'en 2D.
  const tiles: THREE.Mesh[] = [];
  for (const cell of board.cells) {
    const point = cellCenter(cell.position, cellCount);
    const style = CELL_STYLE[cell.type];
    const textured = textureMode === "full" && illustration !== null;
    const geometry = keep(tileGeometry(tileSize, tileHeight, textured ? uvForCell(cell.position, cellCount) : null));
    const top = keep(
      new THREE.MeshStandardMaterial({
        color: new THREE.Color(textured ? "#ffffff" : style.bg),
        ...(textured ? { map: illustration } : {}),
        roughness: 0.78,
        metalness: 0,
      }),
    );
    // LES FLANCS PORTENT LA COULEUR D'ACCENT de la famille. C'est ce qui rend
    // une case reconnaissable d'un coup d'œil sur un plateau incliné : les
    // fonds pastel du plateau 2D sont presque indistinguables vus de loin, et
    // en mode texturé le dessus ne porte plus aucune couleur de famille. Un
    // liseré posé par-dessus ne se voyait pas ; la tranche, elle, est
    // exactement la surface qu'une vue en perspective met en avant.
    const side = keep(new THREE.MeshStandardMaterial({ color: new THREE.Color(style.accent), roughness: 0.62, metalness: 0 }));
    // Ordre des faces d'un `BoxGeometry` : +x, -x, +y (le dessus), -y, +z, -z.
    const tile = new THREE.Mesh(geometry, [side, side, top, side, side, side]);
    tile.position.set(point.x, tileHeight / 2, point.z);
    tile.name = `cell-${cell.position}`;
    tile.userData["position"] = cell.position;
    tile.userData["type"] = cell.type;
    group.add(tile);
    tiles.push(tile);
  }

  return {
    group,
    tiles,
    dispose() {
      for (const item of disposables) item.dispose();
      group.clear();
    },
  };
}
