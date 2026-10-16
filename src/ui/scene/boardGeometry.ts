import { clusterOffset, gridDims, perimeterPosition } from "@/ui/board/layout";

/**
 * GÉOMÉTRIE DU PLATEAU 3D — des nombres vers des nombres, rien de plus.
 *
 * Aucun import de `three` ici, c'est la règle (ADR 0059) : ce fichier est la
 * seule partie de la couche 3D qui soit testable, puisque les tests tournent
 * dans Node, sans DOM et donc sans WebGL. Tout ce qui mérite un test vit ici ;
 * `boardMesh.ts` et `GameCanvas.tsx` ne font que traduire ces nombres en objets.
 *
 * L'anneau n'est pas réécrit : `gridDims` et `perimeterPosition` sont déjà la
 * source unique du placement des cases en 2D. Deux implémentations de l'anneau
 * divergeraient, et la divergence resterait invisible jusqu'au jour où un pion
 * s'arrête sur la mauvaise case.
 *
 * REPÈRE : une case fait exactement 1 unité. Le plateau est à plat dans le plan
 * XZ, centré sur l'origine ; Y est la hauteur. `x` croît vers la droite, `z`
 * croît vers l'avant (vers le spectateur) — donc la ligne 0 de la grille, qui
 * est en haut de l'écran en 2D, est du côté des `z` négatifs.
 */

export interface Point3 {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export interface BoardExtent {
  /** Largeur et profondeur du plateau, en unités de case. */
  readonly width: number;
  readonly depth: number;
  readonly cols: number;
  readonly rows: number;
}

export function boardExtent(cellCount: number): BoardExtent {
  const { cols, rows } = gridDims(cellCount);
  return { width: cols, depth: rows, cols, rows };
}

/** Centre d'une case, au niveau du plateau (`y = 0`). */
export function cellCenter(position: number, cellCount: number): Point3 {
  const { cols, rows } = gridDims(cellCount);
  const { row, col } = perimeterPosition(position, cellCount);
  return { x: col + 0.5 - cols / 2, y: 0, z: row + 0.5 - rows / 2 };
}

/**
 * Place plusieurs pions sur une même case sans qu'ils se superposent. Le
 * décalage est celui du plateau 2D (`clusterOffset`, en unités de case) : les
 * deux vues étalent la grappe de la même façon, dans le même ordre.
 */
export function clusterPoint(position: number, cellCount: number, index: number, count: number): Point3 {
  const center = cellCenter(position, cellCount);
  const { dx, dy } = clusterOffset(index, count);
  return { x: center.x + dx, y: 0, z: center.z + dy };
}

/**
 * Zone CENTRALE du plateau — le grand rectangle intérieur, hors anneau de
 * cases. C'est là que se pose l'illustration en mode « plan central », et c'est
 * exactement la zone que le panneau du Chemin occupe déjà en 2D (lignes 2 à
 * `rows - 1`, colonnes 2 à `cols - 1`).
 */
export interface CenterArea {
  readonly width: number;
  readonly depth: number;
  readonly center: Point3;
}

export function centerArea(cellCount: number): CenterArea {
  const { cols, rows } = gridDims(cellCount);
  return { width: cols - 2, depth: rows - 2, center: { x: 0, y: 0, z: 0 } };
}

/* ---------------------------------------------------------------------------
 * Texture : quelle portion de l'illustration va sur quelle surface
 * ------------------------------------------------------------------------- */

/** Sous-rectangle d'une texture, en coordonnées UV (0..1, origine en bas à gauche). */
export interface UvRect {
  readonly u: number;
  readonly v: number;
  readonly du: number;
  readonly dv: number;
}

/**
 * Portion de l'illustration qui tombe sur une surface donnée du plateau.
 *
 * En 2D l'image garnit toute la grille (`background-size: cover`) : chaque case
 * montre donc déjà le morceau d'image qui lui correspond. En 3D on veut la même
 * chose, pour que l'illustration continue d'une tuile à l'autre au lieu d'être
 * répétée sur chacune. La surface est décrite en unités de case, centrée sur
 * l'origine comme tout le reste.
 *
 * L'image est carrée et le plateau peut ne pas l'être (26 cases → 8 × 7) : la
 * portion est donc calculée sur le côté le plus long, puis recentrée — c'est
 * exactement ce que `cover` fait en CSS.
 */
export function uvForSurface(args: { readonly cellCount: number; readonly centerX: number; readonly centerZ: number; readonly width: number; readonly depth: number }): UvRect {
  const { cellCount, centerX, centerZ, width, depth } = args;
  const extent = boardExtent(cellCount);
  // `cover` : l'image couvre le côté le plus long et dépasse sur l'autre.
  const cover = Math.max(extent.width, extent.depth);
  const du = width / cover;
  const dv = depth / cover;
  // Du repère du plateau (origine au centre, z vers l'avant) vers UV (origine en bas à gauche, v vers le haut).
  const u = (centerX - width / 2) / cover + 0.5;
  const v = 0.5 - (centerZ + depth / 2) / cover;
  return { u, v, du, dv };
}

/** Portion de l'illustration qui tombe sur une case. */
export function uvForCell(position: number, cellCount: number): UvRect {
  const c = cellCenter(position, cellCount);
  return uvForSurface({ cellCount, centerX: c.x, centerZ: c.z, width: 1, depth: 1 });
}

/** Portion de l'illustration qui tombe sur la zone centrale. */
export function uvForCenter(cellCount: number): UvRect {
  const area = centerArea(cellCount);
  return uvForSurface({ cellCount, centerX: area.center.x, centerZ: area.center.z, width: area.width, depth: area.depth });
}

/* ---------------------------------------------------------------------------
 * Caméra
 * ------------------------------------------------------------------------- */

const RAD = Math.PI / 180;

/** Les quatre coins du plateau, au niveau du plateau. */
export function boardCorners(cellCount: number): readonly Point3[] {
  const { width, depth } = boardExtent(cellCount);
  return [
    { x: -width / 2, y: 0, z: -depth / 2 },
    { x: width / 2, y: 0, z: -depth / 2 },
    { x: -width / 2, y: 0, z: depth / 2 },
    { x: width / 2, y: 0, z: depth / 2 },
  ];
}

/**
 * Position de la caméra : elle regarde `target` depuis une inclinaison donnée.
 *
 * `tiltDegrees` est l'angle entre le plateau et la direction du regard : 90°
 * c'est la vue du dessus (le plateau à plat, sans perspective), 0° c'est au ras
 * de la table. Entre 45 et 70 on retrouve la vue d'un vrai jeu de plateau posé
 * devant soi. La caméra reste TOUJOURS dans le même axe au-dessus et devant sa
 * cible : suivre un joueur la fait glisser, jamais tourner autour du plateau —
 * une vue qui pivote oblige la tablée à se réorienter à chaque tour.
 */
export function cameraPosition(args: { readonly distance: number; readonly tiltDegrees: number; readonly target?: Point3 }): Point3 {
  const { distance, tiltDegrees, target } = args;
  if (!(tiltDegrees > 0 && tiltDegrees <= 90)) throw new RangeError(`inclinaison hors plage : ${tiltDegrees}`);
  const tilt = tiltDegrees * RAD;
  const t = target ?? { x: 0, y: 0, z: 0 };
  return { x: t.x, y: t.y + distance * Math.sin(tilt), z: t.z + distance * Math.cos(tilt) };
}

/**
 * Ces points tiennent-ils réellement dans l'image ? Sert aux tests : « est-ce
 * que le cadrage est juste » doit avoir une réponse vérifiable, pas une
 * impression.
 */
export function pointsFitInView(args: {
  readonly points: readonly Point3[];
  readonly target?: Point3;
  readonly distance: number;
  readonly tiltDegrees: number;
  readonly fovDegrees: number;
  readonly aspect: number;
}): boolean {
  const { points, target, distance, tiltDegrees, fovDegrees, aspect } = args;
  const look = target ?? { x: 0, y: 0, z: 0 };
  const eye = cameraPosition({ distance, tiltDegrees, target: look });
  const halfV = (fovDegrees * RAD) / 2;
  const halfH = Math.atan(Math.tan(halfV) * aspect);
  // La caméra n'a aucun roulis et son décalage n'a pas de composante en X :
  // l'axe X du monde reste donc son axe horizontal.
  const forward = normalize({ x: look.x - eye.x, y: look.y - eye.y, z: look.z - eye.z });
  const right = { x: 1, y: 0, z: 0 };
  const up = cross(right, forward);
  return points.every((point) => {
    const v = { x: point.x - eye.x, y: point.y - eye.y, z: point.z - eye.z };
    const depth = dot(v, forward);
    if (depth <= 0) return false;
    return Math.abs(dot(v, right)) <= Math.tan(halfH) * depth && Math.abs(dot(v, up)) <= Math.tan(halfV) * depth;
  });
}

/**
 * Plus petite distance à laquelle tous ces points tiennent dans l'image.
 *
 * La sphère englobante donnerait une formule d'une ligne, mais elle est trop
 * généreuse pour servir telle quelle : la sphère d'un plateau de 8 × 8 a un
 * rayon de 5,66 là où sa demi-largeur n'est que de 4, donc elle recule la
 * caméra de plus de 40 % et le plateau n'occupe plus que les deux tiers de
 * l'écran d'un téléphone. On s'en sert quand même — mais seulement comme borne
 * haute SÛRE d'une recherche par dichotomie sur le vrai critère : les points
 * réellement projetés, inclinaison comprise.
 *
 * Reculer la caméra ne peut que rétrécir la projection : le critère est donc
 * monotone, et la dichotomie converge vers la plus petite distance qui convient.
 * Le résultat reste vérifiable — `pointsFitInView` est exactement ce que la
 * recherche optimise, et les tests l'exigent à toutes les inclinaisons et à
 * tous les rapports d'image.
 */
export function fitDistanceFor(args: {
  readonly points: readonly Point3[];
  readonly target?: Point3;
  readonly fovDegrees: number;
  readonly aspect: number;
  readonly tiltDegrees: number;
  readonly margin: number;
  readonly minDistance: number;
  readonly maxDistance: number;
}): number {
  const { points, target, fovDegrees, aspect, tiltDegrees, margin, minDistance, maxDistance } = args;
  if (!(aspect > 0)) throw new RangeError(`rapport d'image invalide : ${aspect}`);
  if (!(fovDegrees > 0 && fovDegrees < 180)) throw new RangeError(`champ de vision invalide : ${fovDegrees}`);
  const look = target ?? { x: 0, y: 0, z: 0 };
  const halfV = (fovDegrees * RAD) / 2;
  const halfH = Math.atan(Math.tan(halfV) * aspect);
  const radius = points.reduce((max, p) => Math.max(max, Math.hypot(p.x - look.x, p.y - look.y, p.z - look.z)), 0);
  // Borne haute sûre : à cette distance, la SPHÈRE englobante tient déjà, donc
  // les points aussi, quelle que soit l'inclinaison.
  let high = radius / Math.sin(Math.min(halfV, halfH));
  let low = 0;
  for (let i = 0; i < 48; i += 1) {
    const mid = (low + high) / 2;
    if (pointsFitInView({ points, target: look, distance: mid, tiltDegrees, fovDegrees, aspect })) high = mid;
    else low = mid;
  }
  return Math.min(maxDistance, Math.max(minDistance, high * margin));
}

/** Distance à laquelle TOUT le plateau tient dans l'image, au plus juste. */
export function fitDistance(args: { readonly cellCount: number; readonly fovDegrees: number; readonly aspect: number; readonly tiltDegrees: number; readonly margin: number; readonly minDistance: number; readonly maxDistance: number }): number {
  const { cellCount, ...rest } = args;
  return fitDistanceFor({ points: boardCorners(cellCount), ...rest });
}

/** Le plateau entier tient-il dans l'image à cette distance ? */
export function boardFitsInView(args: { readonly cellCount: number; readonly distance: number; readonly tiltDegrees: number; readonly fovDegrees: number; readonly aspect: number }): boolean {
  const { cellCount, ...rest } = args;
  return pointsFitInView({ points: boardCorners(cellCount), ...rest });
}

const dot = (a: Point3, b: Point3): number => a.x * b.x + a.y * b.y + a.z * b.z;
const cross = (a: Point3, b: Point3): Point3 => ({ x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x });
function normalize(v: Point3): Point3 {
  const n = Math.hypot(v.x, v.y, v.z);
  if (n === 0) throw new RangeError("vecteur nul");
  return { x: v.x / n, y: v.y / n, z: v.z / n };
}
