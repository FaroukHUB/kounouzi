import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { CellType, ResolvedBoard } from "@/core/game";
import type { Scene3dConfig } from "@/config/scene3d";
import { CELL_STYLE } from "@/ui/board/cellStyles";
import { boardExtent, cellCenter, centerArea, uvForCell, uvForCenter, type UvRect } from "./boardGeometry";

/**
 * LE PLATEAU EN OBJETS 3D.
 *
 * Ce fichier ne décide rien (ADR 0059) : toutes les positions et toutes les
 * portions de texture viennent de `boardGeometry.ts`, qui est pur et testé.
 *
 * L'ILLUSTRATION COUVRE TOUT LE PLATEAU, cases comprises : chaque tuile porte
 * le morceau d'image qui lui revient, donc le dessin continue d'une case à
 * l'autre au lieu d'être répété sur chacune. Les flancs portent la couleur
 * d'accent de leur famille — un plateau vu de loin ne distingue pas des fonds
 * pastel, mais il distingue des tranches colorées, et en mode illustré le
 * dessus ne porte plus aucune couleur de famille.
 *
 * GÉOMÉTRIES FUSIONNÉES PAR MATÉRIAU, et c'est une mesure, pas une précaution :
 * une tuile faite d'une boîte à six matériaux coûte SIX appels de dessin, soit
 * cent soixante-huit pour les vingt-huit cases. Compté dans le navigateur :
 * 133 appels par image pour moins de deux mille triangles. Les dessus partagent
 * tous la même illustration — ils tiennent donc en UN seul objet — et les flancs
 * se regroupent par famille de case, soit sept au plus.
 *
 * Aucune ombre calculée : sur un téléphone, une carte d'ombres est le premier
 * poste de dépense, et pour un plateau vu d'un angle fixe elle n'apporte presque
 * rien. Le relief vient de l'éclairage et des flancs des tuiles.
 */

export interface BoardMeshInput {
  readonly board: ResolvedBoard;
  readonly config: Scene3dConfig;
  /** Illustration du plateau. Absente, les surfaces restent unies — la scène ne doit jamais attendre une image. */
  readonly illustration: THREE.Texture | null;
}

export interface BoardMesh {
  readonly group: THREE.Group;
  /** Nombre d'objets dessinés : sert à vérifier que la fusion fait son travail. */
  readonly drawables: number;
  dispose(): void;
}

/** Applique une portion de texture à toutes les UV d'une géométrie. */
function remapUv(geometry: THREE.BufferGeometry, rect: UvRect): void {
  const uv = geometry.getAttribute("uv");
  if (!uv) return;
  for (let i = 0; i < uv.count; i += 1) uv.setXY(i, rect.u + uv.getX(i) * rect.du, rect.v + uv.getY(i) * rect.dv);
  uv.needsUpdate = true;
}

export function createBoardMesh({ board, config, illustration }: BoardMeshInput): BoardMesh {
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
  let drawables = 0;
  const add = (mesh: THREE.Mesh) => {
    group.add(mesh);
    drawables += 1;
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
  add(base);

  // Le plan central porte la portion d'illustration qui lui revient.
  const area = centerArea(cellCount);
  if (area.width > 0 && area.depth > 0) {
    const centerGeometry = keep(new THREE.PlaneGeometry(area.width, area.depth));
    centerGeometry.rotateX(-Math.PI / 2);
    if (illustration) remapUv(centerGeometry, uvForCenter(cellCount));
    const centerMaterial = keep(
      illustration
        ? new THREE.MeshStandardMaterial({ map: illustration, roughness: 0.9, metalness: 0 })
        : new THREE.MeshStandardMaterial({ color: new THREE.Color("#d9c9a3"), roughness: 0.9, metalness: 0 }),
    );
    const center = new THREE.Mesh(centerGeometry, centerMaterial);
    center.position.y = -centerDrop;
    add(center);
  }

  // Les DESSUS, tous ensemble : ils partagent l'illustration, donc un seul objet.
  const tops: THREE.BufferGeometry[] = [];
  // Les FLANCS, regroupés par famille : une couleur d'accent, un objet.
  const sidesByType = new Map<CellType, THREE.BufferGeometry[]>();

  for (const cell of board.cells) {
    const point = cellCenter(cell.position, cellCount);

    const top = new THREE.PlaneGeometry(tileSize, tileSize);
    top.rotateX(-Math.PI / 2);
    if (illustration) remapUv(top, uvForCell(cell.position, cellCount));
    // Juste au-dessus du flanc : deux surfaces au même niveau se disputeraient la profondeur.
    top.translate(point.x, tileHeight + 0.001, point.z);
    tops.push(top);

    const side = new THREE.BoxGeometry(tileSize, tileHeight, tileSize);
    side.translate(point.x, tileHeight / 2, point.z);
    sidesByType.set(cell.type, [...(sidesByType.get(cell.type) ?? []), side]);
  }

  const topGeometry = mergeGeometries(tops, false);
  for (const geometry of tops) geometry.dispose();
  // FUSIONNER NE SUFFIT PAS : une boîte apporte ses six groupes de faces, et un
  // groupe est un appel de dessin. Mesuré dans le navigateur, les vingt-huit
  // tuiles coûtaient cent soixante-huit appels d'une seule face chacun, fusion
  // comprise. Les groupes doivent être effacés pour qu'un objet redevienne un
  // objet.
  topGeometry?.clearGroups();
  if (topGeometry) {
    const topMaterial = keep(
      illustration
        ? new THREE.MeshStandardMaterial({ map: illustration, roughness: 0.78, metalness: 0 })
        : new THREE.MeshStandardMaterial({ color: new THREE.Color("#efe3c8"), roughness: 0.78, metalness: 0 }),
    );
    add(new THREE.Mesh(keep(topGeometry), topMaterial));
  }

  for (const [type, geometries] of sidesByType) {
    const merged = mergeGeometries(geometries, false);
    for (const geometry of geometries) geometry.dispose();
    if (!merged) continue;
    merged.clearGroups();
    const material = keep(new THREE.MeshStandardMaterial({ color: new THREE.Color(CELL_STYLE[type].accent), roughness: 0.62, metalness: 0 }));
    add(new THREE.Mesh(keep(merged), material));
  }

  return {
    group,
    drawables,
    dispose() {
      for (const item of disposables) item.dispose();
      group.clear();
    },
  };
}
