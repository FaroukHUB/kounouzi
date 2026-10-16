import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DEFAULT_BOARD } from "@/config/board";
import { DEMO_ESTABLISHMENTS } from "@/config/demo";
import { BOARD_TEXTURE_MODES, DEFAULT_BOARD_TEXTURE_MODE, SCENE_3D, scene3dConfigSchema } from "@/config/scene3d";
import { QUALITY_TIERS } from "@/config/scene3d/tiers";
import { resolveBoard } from "@/core/game";
import { useSessionStore } from "@/state/sessionStore";
import { gridDims } from "@/ui/board/layout";
import { Board3D } from "@/ui/scene/Board3D";
import {
  averageFps,
  decideRenderMode,
  qualityFor,
  SLOW_WATCH_START,
  watchSlowness,
  type DeviceReport,
} from "@/ui/scene/capability";
import { boardExtent, boardFitsInView, cameraPosition, cellCenter, centerArea, clusterPoint, fitDistance, uvForCell, uvForCenter } from "@/ui/scene/boardGeometry";
import { easeStep, facing, hopHeight, pawnPoint, stepProgress, turnToward } from "@/ui/scene/pawnMotion";
import { approach, approachShot, clampTarget, followShot, shotSettled, wideShot, type ShotInput } from "@/ui/scene/cameraFraming";
import { buildingPoint, builtSites, outwardOffset, riseAt, sameBuilding } from "@/ui/scene/establishments";
import { markerFade, markerProgress, markerScale, pathMatchesSteps, revealSchedule, walkedIndex } from "@/ui/scene/journeyReveal";
import { ESTABLISHMENT_FOOTPRINT, establishmentHeight } from "@/ui/scene/establishmentMesh";
import { ESTABLISHMENT_FAMILIES } from "@/core/game";
import { pieceForSeat } from "@/config/pawns/pieces";
import { boardCorners, pointsFitInView } from "@/ui/scene/boardGeometry";
import { TEST_MONUMENTS } from "../../fixtures/game/heritage.fixture";

const root = fileURLToPath(new URL("../../../", import.meta.url));

/** Les deux plateaux versionnés, plus celui réellement servi : la géométrie ne doit dépendre d'aucune constante. */
const PLATEAUX = [26, 28] as const;

describe("géométrie du plateau 3D", () => {
  it("le plateau mesure exactement la grille de cases, pour chaque plateau versionné", () => {
    for (const cellCount of PLATEAUX) {
      const { cols, rows } = gridDims(cellCount);
      expect(boardExtent(cellCount), `${cellCount} cases`).toEqual({ width: cols, depth: rows, cols, rows });
    }
  });

  it("chaque case a sa place, aucune ne se superpose à une autre", () => {
    for (const cellCount of PLATEAUX) {
      const points = Array.from({ length: cellCount }, (_, position) => cellCenter(position, cellCount));
      const uniques = new Set(points.map((p) => `${p.x}|${p.z}`));
      expect(uniques.size, `${cellCount} cases`).toBe(cellCount);
      // Toutes au niveau du plateau, et toutes dans son emprise.
      const extent = boardExtent(cellCount);
      for (const p of points) {
        expect(p.y).toBe(0);
        expect(Math.abs(p.x)).toBeLessThanOrEqual(extent.width / 2);
        expect(Math.abs(p.z)).toBeLessThanOrEqual(extent.depth / 2);
      }
    }
  });

  it("l'anneau se referme : la dernière case est voisine de la première", () => {
    for (const cellCount of PLATEAUX) {
      const first = cellCenter(0, cellCount);
      const last = cellCenter(cellCount - 1, cellCount);
      expect(Math.hypot(first.x - last.x, first.z - last.z), `${cellCount} cases`).toBeCloseTo(1, 10);
    }
  });

  it("deux cases consécutives sont toujours voisines : aucun saut dans le parcours", () => {
    for (const cellCount of PLATEAUX) {
      for (let position = 0; position < cellCount - 1; position += 1) {
        const a = cellCenter(position, cellCount);
        const b = cellCenter(position + 1, cellCount);
        expect(Math.hypot(a.x - b.x, a.z - b.z), `${cellCount} cases, ${position} → ${position + 1}`).toBeCloseTo(1, 10);
      }
    }
  });

  it("six pions sur une même case ne se superposent pas et restent dans la case", () => {
    const points = Array.from({ length: 6 }, (_, i) => clusterPoint(3, 28, i, 6));
    expect(new Set(points.map((p) => `${p.x.toFixed(6)}|${p.z.toFixed(6)}`)).size).toBe(6);
    const center = cellCenter(3, 28);
    for (const p of points) {
      expect(Math.hypot(p.x - center.x, p.z - center.z)).toBeLessThan(0.5);
    }
    // Un pion seul reste exactement au centre de sa case.
    expect(clusterPoint(3, 28, 0, 1)).toEqual(center);
  });

  it("la zone centrale est l'intérieur de l'anneau, et aucune case n'y entre", () => {
    for (const cellCount of PLATEAUX) {
      const { cols, rows } = gridDims(cellCount);
      const area = centerArea(cellCount);
      expect(area.width, `${cellCount} cases`).toBe(cols - 2);
      expect(area.depth, `${cellCount} cases`).toBe(rows - 2);
      for (let position = 0; position < cellCount; position += 1) {
        const p = cellCenter(position, cellCount);
        const inside = Math.abs(p.x) < area.width / 2 && Math.abs(p.z) < area.depth / 2;
        expect(inside, `case ${position} tombe dans la zone centrale`).toBe(false);
      }
    }
  });
});

describe("illustration posée sur le plateau", () => {
  it("chaque case reçoit une portion DIFFÉRENTE de l'illustration : l'image continue au lieu de se répéter", () => {
    const rects = Array.from({ length: 28 }, (_, position) => uvForCell(position, 28));
    expect(new Set(rects.map((r) => `${r.u.toFixed(6)}|${r.v.toFixed(6)}`)).size).toBe(28);
    for (const rect of rects) {
      expect(rect.u).toBeGreaterThanOrEqual(0);
      expect(rect.v).toBeGreaterThanOrEqual(0);
      expect(rect.u + rect.du).toBeLessThanOrEqual(1.000001);
      expect(rect.v + rect.dv).toBeLessThanOrEqual(1.000001);
    }
  });

  it("sur un plateau carré, les portions des cases pavent exactement l'image", () => {
    // 28 cases → 8 × 8 : une case fait donc un huitième de l'image.
    const rect = uvForCell(0, 28);
    expect(rect.du).toBeCloseTo(1 / 8, 10);
    expect(rect.dv).toBeCloseTo(1 / 8, 10);
  });

  it("la portion centrale est centrée sur l'image et plus petite qu'elle", () => {
    for (const cellCount of PLATEAUX) {
      const rect = uvForCenter(cellCount);
      expect(rect.u + rect.du / 2, `${cellCount} cases`).toBeCloseTo(0.5, 10);
      expect(rect.v + rect.dv / 2, `${cellCount} cases`).toBeCloseTo(0.5, 10);
      expect(rect.du).toBeLessThan(1);
      expect(rect.dv).toBeLessThan(1);
    }
  });
});

describe("cadrage de la caméra", () => {
  const FOV = SCENE_3D.camera.fovDegrees;
  const TILT = SCENE_3D.board.tiltDegrees;
  /** Du téléphone debout au grand écran : le cadrage doit tenir partout. */
  const RAPPORTS = [0.46, 0.56, 0.75, 1, 1.33, 1.78, 2.2] as const;
  const INCLINAISONS = [20, 35, 50, 56, 70, 90] as const;
  const distance = (cellCount: number, aspect: number, tiltDegrees: number, margin = SCENE_3D.camera.margin) =>
    fitDistance({ cellCount, fovDegrees: FOV, aspect, tiltDegrees, margin, minDistance: SCENE_3D.camera.minDistance, maxDistance: SCENE_3D.camera.maxDistance });

  it("à la distance calculée, TOUT le plateau tient dans l'image — téléphone étroit compris", () => {
    for (const cellCount of PLATEAUX) {
      for (const aspect of RAPPORTS) {
        for (const tiltDegrees of INCLINAISONS) {
          expect(boardFitsInView({ cellCount, distance: distance(cellCount, aspect, tiltDegrees), tiltDegrees, fovDegrees: FOV, aspect }), `${cellCount} cases, rapport ${aspect}, inclinaison ${tiltDegrees}`).toBe(true);
        }
      }
    }
  });

  it("le cadrage est SERRÉ : reculer la caméra de 10 % de moins coupe déjà le plateau", () => {
    // Le premier calcul passait par la sphère englobante du plateau. Il tenait
    // — mais il reculait la caméra de plus de 40 % de trop, et sur un téléphone
    // le plateau n'occupait plus que les deux tiers de l'écran. Un cadrage qui
    // « tient » n'est pas un cadrage juste : il faut aussi qu'il soit au plus près.
    for (const cellCount of PLATEAUX) {
      for (const aspect of [0.46, 1, 1.78] as const) {
        const juste = distance(cellCount, aspect, TILT, 1);
        expect(boardFitsInView({ cellCount, distance: juste * 0.9, tiltDegrees: TILT, fovDegrees: FOV, aspect }), `${cellCount} cases, rapport ${aspect}`).toBe(false);
      }
    }
  });

  it("un écran plus étroit éloigne la caméra ; au-delà du carré, c'est la hauteur qui borne", () => {
    const at = (aspect: number) => fitDistance({ cellCount: 28, fovDegrees: FOV, aspect, tiltDegrees: TILT, margin: 1, minDistance: 0.01, maxDistance: 1000 });
    // Écran debout : le champ horizontal est le plus étroit, c'est lui qui décide.
    expect(at(0.4)).toBeGreaterThan(at(0.7));
    expect(at(0.7)).toBeGreaterThan(at(1));
    // Écran couché : le champ vertical devient le plus étroit et ne change plus
    // avec la largeur. La distance se stabilise donc au-delà du carré — élargir
    // encore l'écran n'éloigne pas la caméra, il ajoute du vide sur les côtés.
    expect(at(8)).toBeLessThanOrEqual(at(2) + 1e-9);
  });

  it("la distance reste dans les bornes de la configuration", () => {
    const serre = fitDistance({ cellCount: 28, fovDegrees: FOV, aspect: 1, tiltDegrees: TILT, margin: 1, minDistance: 40, maxDistance: 80 });
    expect(serre).toBe(40);
    const large = fitDistance({ cellCount: 28, fovDegrees: FOV, aspect: 0.2, tiltDegrees: TILT, margin: 1, minDistance: 1, maxDistance: 12 });
    expect(large).toBe(12);
  });

  it("la caméra est devant et au-dessus du plateau, et la vue du dessus est bien à la verticale", () => {
    const oblique = cameraPosition({ distance: 20, tiltDegrees: 56 });
    expect(oblique.y).toBeGreaterThan(0);
    expect(oblique.z).toBeGreaterThan(0);
    expect(Math.hypot(oblique.x, oblique.y, oblique.z)).toBeCloseTo(20, 10);
    const dessus = cameraPosition({ distance: 20, tiltDegrees: 90 });
    expect(dessus.z).toBeCloseTo(0, 10);
    expect(dessus.y).toBeCloseTo(20, 10);
  });

  it("une entrée absurde est refusée au lieu de produire un cadrage silencieusement faux", () => {
    expect(() => fitDistance({ cellCount: 28, fovDegrees: FOV, aspect: 0, tiltDegrees: TILT, margin: 1, minDistance: 1, maxDistance: 10 })).toThrow(RangeError);
    expect(() => fitDistance({ cellCount: 28, fovDegrees: 0, aspect: 1, tiltDegrees: TILT, margin: 1, minDistance: 1, maxDistance: 10 })).toThrow(RangeError);
    expect(() => cameraPosition({ distance: 10, tiltDegrees: 0 })).toThrow(RangeError);
    expect(() => cameraPosition({ distance: 10, tiltDegrees: 120 })).toThrow(RangeError);
  });
});

describe("le pas d'un pion : case par case, jamais une téléportation", () => {
  it("l'avancement va de 0 à 1 et ne déborde jamais", () => {
    expect(stepProgress(0, 280)).toBe(0);
    expect(stepProgress(140, 280)).toBeCloseTo(0.5, 10);
    expect(stepProgress(280, 280)).toBe(1);
    expect(stepProgress(5000, 280)).toBe(1);
    expect(stepProgress(-50, 280)).toBe(0);
  });

  it("en mode « animations réduites », le pion se pose immédiatement", () => {
    // REDUCED_TIMINGS met TOUTES les durées à zéro sans changer la séquence :
    // une durée nulle doit donc rendre un pas déjà terminé, pas une division par zéro.
    expect(stepProgress(0, 0)).toBe(1);
    expect(stepProgress(0, -1)).toBe(1);
    expect(Number.isFinite(stepProgress(10, 0))).toBe(true);
  });

  it("le lissage part de zéro, arrive à un, et ne recule jamais", () => {
    expect(easeStep(0)).toBe(0);
    expect(easeStep(1)).toBe(1);
    let precedent = -1;
    for (let i = 0; i <= 20; i += 1) {
      const valeur = easeStep(i / 20);
      expect(valeur).toBeGreaterThanOrEqual(precedent);
      precedent = valeur;
    }
  });

  it("le saut est nul aux deux bouts et maximal au milieu : le pion est POSÉ sur ses cases", () => {
    expect(hopHeight(0, 0.34)).toBeCloseTo(0, 10);
    expect(hopHeight(1, 0.34)).toBeCloseTo(0, 10);
    expect(hopHeight(0.5, 0.34)).toBeCloseTo(0.34, 10);
    for (let i = 0; i <= 20; i += 1) expect(hopHeight(i / 20, 0.34)).toBeGreaterThanOrEqual(0);
    // Mode réduit : pas de saut du tout.
    expect(hopHeight(0.5, 0)).toBe(0);
  });

  it("le pion part de sa case et arrive EXACTEMENT sur la suivante", () => {
    const from = cellCenter(0, 28);
    const to = cellCenter(1, 28);
    const depart = pawnPoint({ from, to, progress: 0, groundY: 0.16, hop: 0.34 });
    const arrivee = pawnPoint({ from, to, progress: 1, groundY: 0.16, hop: 0.34 });
    expect(depart.x).toBeCloseTo(from.x, 10);
    expect(depart.z).toBeCloseTo(from.z, 10);
    expect(depart.y).toBeCloseTo(0.16, 10);
    expect(arrivee.x).toBeCloseTo(to.x, 10);
    expect(arrivee.z).toBeCloseTo(to.z, 10);
    // Posé sur la tuile à l'arrivée, pas en suspension.
    expect(arrivee.y).toBeCloseTo(0.16, 10);
  });

  it("le pion ne quitte jamais le segment entre les deux cases", () => {
    const from = cellCenter(5, 28);
    const to = cellCenter(6, 28);
    for (let i = 0; i <= 20; i += 1) {
      const p = pawnPoint({ from, to, progress: i / 20, groundY: 0, hop: 0.34 });
      expect(Math.min(from.x, to.x) - 1e-9).toBeLessThanOrEqual(p.x);
      expect(p.x).toBeLessThanOrEqual(Math.max(from.x, to.x) + 1e-9);
      expect(Math.min(from.z, to.z) - 1e-9).toBeLessThanOrEqual(p.z);
      expect(p.z).toBeLessThanOrEqual(Math.max(from.z, to.z) + 1e-9);
    }
  });

  it("le pion regarde là où il va, et garde sa direction quand il ne bouge pas", () => {
    expect(facing({ x: 0, z: 0 }, { x: 0, z: 1 }, 0)).toBeCloseTo(0, 10);
    expect(facing({ x: 0, z: 0 }, { x: 1, z: 0 }, 0)).toBeCloseTo(Math.PI / 2, 10);
    expect(facing({ x: 0, z: 0 }, { x: 0, z: -1 }, 0)).toBeCloseTo(Math.PI, 10);
    // Immobile : il conserve son orientation au lieu de pivoter vers un défaut.
    expect(facing({ x: 2, z: 2 }, { x: 2, z: 2 }, 1.23)).toBe(1.23);
  });

  it("un pion qui tourne prend le plus court chemin : jamais un tour complet pour cinq degrés", () => {
    const presqueDemiTour = Math.PI - 0.05;
    const autreCote = -Math.PI + 0.05;
    const apres = turnToward(presqueDemiTour, autreCote, 1);
    // 0,1 radian à parcourir, pas 6,2.
    expect(Math.abs(apres - presqueDemiTour)).toBeLessThan(0.2);
    // Un facteur de 1 atteint la cible (au tour près) ; un facteur nul ne bouge pas.
    expect(turnToward(0, 1, 1)).toBeCloseTo(1, 10);
    expect(turnToward(0.7, 2, 0)).toBe(0.7);
  });
});

describe("la caméra qui suit le joueur actif", () => {
  const plan = (aspect: number, cellCount = 28): ShotInput => ({
    cellCount,
    fovDegrees: SCENE_3D.camera.fovDegrees,
    aspect,
    tiltDegrees: SCENE_3D.board.tiltDegrees,
    margin: SCENE_3D.camera.margin,
    minDistance: SCENE_3D.camera.minDistance,
    maxDistance: SCENE_3D.camera.maxDistance,
    followSpan: SCENE_3D.camera.followSpan,
  });
  const RAPPORTS = [0.46, 0.56, 1, 1.78] as const;

  it("le plan large montre tout le plateau, centré — c'est le plan de repos et celui des cartes", () => {
    for (const aspect of RAPPORTS) {
      const shot = wideShot(plan(aspect));
      expect(shot.target).toEqual({ x: 0, y: 0, z: 0 });
      expect(pointsFitInView({ points: boardCorners(28), distance: shot.distance, tiltDegrees: SCENE_3D.board.tiltDegrees, fovDegrees: SCENE_3D.camera.fovDegrees, aspect }), `rapport ${aspect}`).toBe(true);
    }
  });

  it("suivre un joueur RAPPROCHE la caméra, sans jamais reculer plus loin que le plateau entier", () => {
    for (const aspect of RAPPORTS) {
      const input = plan(aspect);
      const large = wideShot(input);
      const suivi = followShot(cellCenter(3, 28), input);
      expect(suivi.distance, `rapport ${aspect}`).toBeLessThanOrEqual(large.distance);
      expect(suivi.distance).toBeGreaterThan(0);
    }
  });

  it("la zone suivie tient toujours dans l'image, où que soit le joueur", () => {
    const aspect = 0.46;
    const input = plan(aspect);
    const half = input.followSpan / 2;
    for (let position = 0; position < 28; position += 1) {
      const shot = followShot(cellCenter(position, 28), input);
      const region = [
        { x: shot.target.x - half, y: 0, z: shot.target.z - half },
        { x: shot.target.x + half, y: 0, z: shot.target.z - half },
        { x: shot.target.x - half, y: 0, z: shot.target.z + half },
        { x: shot.target.x + half, y: 0, z: shot.target.z + half },
      ];
      expect(pointsFitInView({ points: region, target: shot.target, distance: shot.distance, tiltDegrees: input.tiltDegrees, fovDegrees: input.fovDegrees, aspect }), `case ${position}`).toBe(true);
    }
  });

  it("la caméra PENCHE vers le joueur, elle ne sort jamais du plateau", () => {
    // Suivre un pion posté dans un coin sans borner la cible montrerait la
    // moitié du fond de page, et le joueur suivi finirait au bord de l'image.
    const extent = boardExtent(28);
    const span = SCENE_3D.camera.followSpan;
    for (let position = 0; position < 28; position += 1) {
      const t = clampTarget(cellCenter(position, 28), 28, span);
      expect(Math.abs(t.x) + span / 2, `case ${position}`).toBeLessThanOrEqual(extent.width / 2 + 1e-9);
      expect(Math.abs(t.z) + span / 2, `case ${position}`).toBeLessThanOrEqual(extent.depth / 2 + 1e-9);
    }
    // Un point déjà au centre n'est pas déplacé.
    expect(clampTarget({ x: 0, y: 0, z: 0 }, 28, span)).toEqual({ x: 0, y: 0, z: 0 });
  });

  it("une zone plus large que le plateau ramène simplement la caméra au centre", () => {
    expect(clampTarget(cellCenter(0, 28), 28, 99)).toEqual({ x: 0, y: 0, z: 0 });
  });

  it("le glissement ne dépend PAS du nombre d'images par seconde", () => {
    // Une avance « d'un dixième par image » rendrait la caméra deux fois plus
    // rapide sur un écran à 120 Hz que sur un téléphone à 60 : le réglage
    // cesserait d'être un réglage. Deux cadences doivent donner le même état
    // après la même DURÉE.
    const tau = 420;
    let a = 0;
    for (let i = 0; i < 60; i += 1) a = approach(a, 10, 1000 / 60, tau);
    let b = 0;
    for (let i = 0; i < 120; i += 1) b = approach(b, 10, 1000 / 120, tau);
    expect(a).toBeCloseTo(b, 6);
  });

  it("au bout d'une constante de temps, les deux tiers du chemin sont faits — et jamais de dépassement", () => {
    expect(approach(0, 1, 420, 420)).toBeCloseTo(1 - Math.exp(-1), 10);
    let v = 0;
    for (let i = 0; i < 500; i += 1) {
      v = approach(v, 1, 16, 420);
      expect(v).toBeLessThanOrEqual(1);
    }
    expect(v).toBeCloseTo(1, 4);
  });

  it("une durée nulle ne bouge rien, une constante nulle pose la valeur d'un coup", () => {
    expect(approach(3, 9, 0, 420)).toBe(3);
    // Mode « animations réduites » : la caméra se place au lieu de glisser.
    expect(approach(3, 9, 16, 0)).toBe(9);
  });

  it("le plan entier glisse ensemble : cible et distance", () => {
    const depart = { target: { x: 0, y: 0, z: 0 }, distance: 20 };
    const arrivee = { target: { x: 2, y: 0, z: -1 }, distance: 14 };
    expect(shotSettled(depart, arrivee)).toBe(false);
    let shot = depart;
    for (let i = 0; i < 400; i += 1) shot = approachShot(shot, arrivee, 16, 420);
    expect(shotSettled(shot, arrivee)).toBe(true);
    expect(shot.target.x).toBeCloseTo(2, 3);
    expect(shot.distance).toBeCloseTo(14, 3);
  });
});

describe("qui décide du mode de rendu (ADR 0059)", () => {
  const capable: DeviceReport = { webgl: true, memoryGb: 8, cores: 8 };
  const faible: DeviceReport = { webgl: true, memoryGb: 1, cores: 2 };
  const muet: DeviceReport = { webgl: true, memoryGb: null, cores: null };
  const sansWebgl: DeviceReport = { webgl: false, memoryGb: 8, cores: 8 };
  const seuils = SCENE_3D.quality;

  it("sans WebGL, aucun réglage ne fabrique la capacité absente", () => {
    for (const preference of ["3d", "2d", "auto"] as const) {
      expect(decideRenderMode(preference, sansWebgl, seuils), preference).toEqual({ mode: "2d", reason: "no-webgl" });
    }
  });

  it("le réglage explicite de l'utilisateur a le dernier mot", () => {
    expect(decideRenderMode("3d", faible, seuils)).toEqual({ mode: "3d", reason: "none" });
    expect(decideRenderMode("2d", capable, seuils)).toEqual({ mode: "2d", reason: "user" });
  });

  it("en automatique, un appareil faible donne la 2D et le dit", () => {
    expect(decideRenderMode("auto", faible, seuils)).toEqual({ mode: "2d", reason: "weak-device" });
    expect(decideRenderMode("auto", capable, seuils)).toEqual({ mode: "3d", reason: "none" });
  });

  it("une information manquante n'est pas un défaut : le doute profite à la 3D", () => {
    // Beaucoup de navigateurs ne publient ni mémoire ni nombre de cœurs. Les
    // traiter comme des appareils faibles priverait de 3D une majorité de
    // téléphones parfaitement capables.
    expect(decideRenderMode("auto", muet, seuils)).toEqual({ mode: "3d", reason: "none" });
    expect(qualityFor(muet, seuils)).toBe("high");
  });

  it("le palier de qualité suit l'appareil", () => {
    expect(qualityFor(faible, seuils)).toBe("low");
    expect(qualityFor({ webgl: true, memoryGb: 3, cores: 6 }, seuils)).toBe("medium");
    expect(qualityFor(capable, seuils)).toBe("high");
  });
});

describe("surveillance des images par seconde", () => {
  const config = { fallbackFps: 24, fallbackSeconds: 3 };

  it("une seule seconde lente ne replie pas : un à-coup n'est pas une panne", () => {
    const apres = watchSlowness(SLOW_WATCH_START, 10, config);
    expect(apres).toEqual({ lowSeconds: 1, tooSlow: false });
  });

  it("il faut des secondes lentes CONSÉCUTIVES, et une seconde correcte remet le compteur à zéro", () => {
    let state = SLOW_WATCH_START;
    state = watchSlowness(state, 10, config);
    state = watchSlowness(state, 12, config);
    expect(state.tooSlow).toBe(false);
    state = watchSlowness(state, 60, config);
    expect(state).toEqual(SLOW_WATCH_START);
    state = watchSlowness(state, 8, config);
    state = watchSlowness(state, 8, config);
    state = watchSlowness(state, 8, config);
    expect(state.tooSlow).toBe(true);
  });

  it("une fois replié, on n'oscille pas : la décision ne se défait pas en cours de partie", () => {
    let state = SLOW_WATCH_START;
    for (let i = 0; i < 3; i += 1) state = watchSlowness(state, 5, config);
    expect(state.tooSlow).toBe(true);
    expect(watchSlowness(state, 60, config)).toBe(state);
  });

  it("les images par seconde se calculent sur les durées, et un échantillon vide ne divise pas par zéro", () => {
    expect(averageFps([16, 16, 16, 16])).toBeCloseTo(62.5, 6);
    expect(averageFps([])).toBe(0);
    expect(averageFps([0, 0])).toBe(0);
  });
});

describe("les établissements qui sortent du sol", () => {
  // Les établissements réellement servis par le jeu : c'est leur famille qui
  // décide de la silhouette, donc c'est eux qu'il faut éprouver, pas des
  // monuments de test qui n'en portent aucune.
  const resolu = resolveBoard(DEFAULT_BOARD, DEMO_ESTABLISHMENTS);
  if (!resolu.ok) throw new Error("plateau");
  const plateau = resolu.value.board;
  const sites = resolu.value.sites;
  const joueurs = [{ id: "p1" }, { id: "p2" }] as const;
  const casePatrimoine = plateau.cells.find((c) => c.type === "heritage");
  if (!casePatrimoine || casePatrimoine.type !== "heritage") throw new Error("aucune case patrimoine");

  const detenu = (siteId: string, ownerId: string) => ({ siteId, ownerId: ownerId as never, price: 100, heritageValue: 50, acquiredTurn: 1 });

  it("un établissement acquis se pose sur SA case, à la couleur de son propriétaire", () => {
    const batiments = builtSites({ board: plateau, sites, holdings: [detenu(casePatrimoine.siteId, "p2")], players: joueurs });
    expect(batiments).toHaveLength(1);
    expect(batiments[0]!.position).toBe(casePatrimoine.position);
    // La couleur vient du PION du propriétaire, la seule clé de lecture du plateau.
    expect(batiments[0]!.color).toBe(pieceForSeat(1).color);
  });

  it("rien n'est inventé : un patrimoine sans établissement déclaré ne fabrique aucun bâtiment", () => {
    const sansEtablissement = Object.fromEntries(Object.entries(sites).map(([id, site]) => [id, { ...site, establishment: undefined }]));
    expect(builtSites({ board: plateau, sites: sansEtablissement, holdings: [detenu(casePatrimoine.siteId, "p1")], players: joueurs })).toEqual([]);
    // Et un site qui n'est sur aucune case de CE plateau est ignoré, pas planté.
    expect(builtSites({ board: plateau, sites, holdings: [detenu("site-qui-nexiste-pas", "p1")], players: joueurs })).toEqual([]);
  });

  it("TOUS les établissements du jeu ont leur illustration : aucun ne retombe sur un volume", () => {
    // C'est la raison d'être du panneau. Si un établissement arrivait sans
    // carte, il redeviendrait une boîte colorée — exactement ce qui ne marchait
    // pas à l'écran — et ce test est là pour qu'on l'apprenne ici, pas en partie.
    const tous = Object.keys(sites).map((siteId) => ({ siteId, ownerId: "p1", price: 1, heritageValue: 1, acquiredTurn: 1 }));
    const batiments = builtSites({ board: plateau, sites, holdings: tous as never, players: joueurs });
    expect(batiments.length).toBe(Object.keys(sites).length);
    for (const b of batiments) {
      expect(b.art, `${b.siteId} n'a pas d'illustration`).not.toBeNull();
      expect(b.artWidth, b.siteId).toBeGreaterThan(0);
      expect(b.artHeight, b.siteId).toBeGreaterThan(0);
    }
  });

  it("un établissement illustré se dresse plus haut qu'un pion : on le voit par-dessus", () => {
    const illustre = { art: "/x.webp", family: "maktaba" as const };
    expect(establishmentHeight(illustre)).toBeGreaterThan(SCENE_3D.board.pawnHeight);
    // Sans illustration, le volume de repli reste debout et distinct par famille.
    for (const family of ESTABLISHMENT_FAMILIES) expect(establishmentHeight({ art: null, family }), family).toBeGreaterThan(0.2);
    expect(establishmentHeight({ art: null, family: "makkah_hotel" })).toBeGreaterThan(establishmentHeight({ art: null, family: "madinah_hotel" }));
  });

  it("le bâtiment et le pion ne se posent pas au même endroit, et restent tous deux sur leur tuile", () => {
    // Un pion seul sur une case construite se retrouverait sinon au milieu du bâtiment.
    const inset = SCENE_3D.establishments.inset;
    const shift = SCENE_3D.establishments.pawnShift;
    const demiTuile = (1 - SCENE_3D.board.cellGap) / 2;
    for (let position = 0; position < plateau.cellCount; position += 1) {
      const centre = cellCenter(position, plateau.cellCount);
      const batiment = buildingPoint(position, plateau.cellCount, inset);
      const away = outwardOffset(position, plateau.cellCount, shift);
      const pion = { x: centre.x + away.x, z: centre.z + away.z };
      // Ils sont bien séparés…
      expect(Math.hypot(batiment.x - pion.x, batiment.z - pion.z), `case ${position}`).toBeCloseTo(inset + shift, 10);
      // …et le bâtiment, emprise comprise, ne déborde pas de sa tuile.
      expect(Math.abs(batiment.x - centre.x) + ESTABLISHMENT_FOOTPRINT / 2, `case ${position}`).toBeLessThanOrEqual(demiTuile + 1e-9);
      expect(Math.abs(batiment.z - centre.z) + ESTABLISHMENT_FOOTPRINT / 2, `case ${position}`).toBeLessThanOrEqual(demiTuile + 1e-9);
    }
  });

  it("le décalage va bien vers l'extérieur du plateau, sur les quatre côtés", () => {
    // Case 0 : coin inférieur droit, donc vers l'avant et vers la droite selon le côté parcouru.
    const extent = boardExtent(28);
    for (let position = 0; position < 28; position += 1) {
      const centre = cellCenter(position, 28);
      const dehors = outwardOffset(position, 28, 0.2);
      const deplace = { x: centre.x + dehors.x, z: centre.z + dehors.z };
      // S'éloigner du centre du plateau, c'est bien aller vers l'extérieur.
      expect(Math.hypot(deplace.x, deplace.z), `case ${position}`).toBeGreaterThan(Math.hypot(centre.x, centre.z));
      expect(Math.abs(deplace.x)).toBeLessThanOrEqual(extent.width / 2);
      expect(Math.abs(deplace.z)).toBeLessThanOrEqual(extent.depth / 2);
    }
  });

  it("la sortie de terre part de zéro, dépasse un peu, et se pose exactement à sa hauteur", () => {
    expect(riseAt(0)).toBe(0);
    expect(riseAt(1)).toBe(1);
    let maximum = 0;
    for (let i = 0; i <= 50; i += 1) {
      const v = riseAt(i / 50);
      expect(v).toBeGreaterThanOrEqual(0);
      maximum = Math.max(maximum, v);
    }
    // Un vrai dépassement, mais borné : un bâtiment qui double de hauteur fait peur, pas plaisir.
    expect(maximum).toBeGreaterThan(1);
    expect(maximum).toBeLessThan(1.25);
  });

  it("un bâtiment qui change de main n'est pas le même bâtiment : il change de couleur, il ne resurgit pas", () => {
    const a = { siteId: "s", position: 3, family: "museum" as const, color: "#aaaaaa", art: "/x.webp", artWidth: 645, artHeight: 1048 };
    expect(sameBuilding(a, { ...a })).toBe(true);
    expect(sameBuilding(a, { ...a, color: "#bbbbbb" })).toBe(false);
    expect(sameBuilding(a, { ...a, position: 4 })).toBe(false);
  });
});

describe("la surveillance ne doit pas confondre « au repos » et « trop lent »", () => {
  it("trois redessins espacés ne doivent PAS faire replier en 2D", () => {
    // Le défaut : la boucle s'arrête au repos, et le dessin suivant pouvait
    // arriver dix secondes plus tard. Compté tel quel, c'était une image de dix
    // secondes — un dixième d'image par seconde. Trois tours posés et la
    // surveillance déclarait trop lent un plateau qui n'avait jamais ramé.
    const config = { fallbackFps: SCENE_3D.quality.fallbackFps, fallbackSeconds: SCENE_3D.quality.fallbackSeconds };
    const naif = averageFps([10_000]);
    expect(naif).toBeLessThan(config.fallbackFps);
    let state = SLOW_WATCH_START;
    for (let i = 0; i < config.fallbackSeconds; i += 1) state = watchSlowness(state, naif, config);
    expect(state.tooSlow, "trois mesures basses suffisent : c'est pourquoi elles ne doivent jamais être prises au repos").toBe(true);
    // La scène remet donc l'échantillonnage à zéro à CHAQUE redémarrage de la boucle.
    const source = readFileSync(root + "src/ui/scene/GameCanvas.tsx", "utf8");
    expect(source).toContain("resetSampler");
    const ensure = source.slice(source.indexOf("const ensureLoop"), source.indexOf("const placeCamera") === -1 ? undefined : source.indexOf("const placeCamera"));
    expect(ensure).toContain("resetSampler()");
  });
});

describe("la révélation du Chemin : ce que le moteur a décidé, rien d'autre", () => {
  it("le chemin montré est EXACTEMENT celui du moteur, dans l'ordre, sans rien ajouter", () => {
    // Le chemin vient de `PawnMoved.path` et le nombre d'étapes de
    // `MovementAssigned.steps`. La scène ne calcule ni l'un ni l'autre : elle
    // ne saurait même pas comment. Kounouzi n'a ni dé ni tirage (ADR 0013).
    const chemin = [7, 8, 9, 10];
    const plan = revealSchedule(chemin, 1600);
    expect(plan.map((p) => p.position)).toEqual(chemin);
    expect(plan).toHaveLength(chemin.length);
  });

  it("les cases s'allument dans l'ordre du parcours, jamais toutes ensemble", () => {
    const plan = revealSchedule([3, 4, 5, 6, 7], 1600);
    for (let i = 1; i < plan.length; i += 1) expect(plan[i]!.startMs).toBeGreaterThan(plan[i - 1]!.startMs);
    expect(plan[0]!.startMs).toBe(0);
  });

  it("tout est allumé AVANT la fin de la révélation : le pion ne part pas sur un chemin qui se dessine encore", () => {
    const total = 1600;
    const plan = revealSchedule([3, 4, 5, 6, 7], total, 0.7);
    const dernier = plan[plan.length - 1]!;
    expect(dernier.startMs).toBeLessThanOrEqual(total * 0.7 + 1e-9);
    // Et il reste du temps, le chemin complet à l'écran, pour compter les cases.
    expect(total - dernier.startMs).toBeGreaterThan(total * 0.25);
  });

  it("un seul pas s'allume tout de suite, et un chemin vide ne produit rien", () => {
    expect(revealSchedule([5], 1600)).toEqual([{ position: 5, startMs: 0 }]);
    expect(revealSchedule([], 1600)).toEqual([]);
  });

  it("en mode « animations réduites », tout le chemin est là immédiatement", () => {
    const plan = revealSchedule([1, 2, 3], 0);
    for (const step of plan) expect(step.startMs).toBe(0);
    expect(markerProgress(0, 0, 0)).toBe(1);
  });

  it("une case n'est jamais allumée À MOITIÉ avant son tour", () => {
    const plan = revealSchedule([1, 2, 3, 4], 1600);
    const troisieme = plan[2]!;
    expect(markerProgress(troisieme.startMs - 1, troisieme.startMs, 260)).toBe(0);
    expect(markerProgress(troisieme.startMs, troisieme.startMs, 260)).toBe(0);
    expect(markerProgress(troisieme.startMs + 130, troisieme.startMs, 260)).toBeCloseTo(0.5, 10);
    expect(markerProgress(troisieme.startMs + 9999, troisieme.startMs, 260)).toBe(1);
  });

  it("un marqueur part de zéro, dépasse un peu, et se pose exactement", () => {
    expect(markerScale(0)).toBe(0);
    expect(markerScale(1)).toBe(1);
    let maximum = 0;
    for (let i = 0; i <= 40; i += 1) {
      const v = markerScale(i / 40);
      expect(v).toBeGreaterThanOrEqual(0);
      maximum = Math.max(maximum, v);
    }
    expect(maximum).toBeGreaterThan(1);
    expect(maximum).toBeLessThan(1.35);
  });

  it("le nombre d'étapes annoncé et les cases allumées décrivent le MÊME déplacement", () => {
    // Si les deux divergeaient, c'est que quelqu'un aurait recalculé un chemin
    // quelque part — et mieux vaut le savoir ici qu'en partie.
    expect(pathMatchesSteps([4, 5, 6], 3)).toBe(true);
    expect(pathMatchesSteps([4, 5, 6], 4)).toBe(false);
    expect(pathMatchesSteps([], 0)).toBe(true);
  });

  it("les cases s'éteignent SOUS le pion, pas toutes au moment où il s'ébranle", () => {
    // C'était la faute de la première version : les anneaux disparaissaient au
    // départ du pion, c'est-à-dire au moment précis où ils servaient le plus.
    const chemin = [11, 12, 13, 14];
    expect(walkedIndex(chemin, 11)).toBe(0);
    expect(walkedIndex(chemin, 13)).toBe(2);
    // Pas encore parti : rien d'éteint.
    expect(walkedIndex(chemin, 99)).toBe(-1);
  });

  it("en mode réduit, le pion se pose sur la dernière case et AUCUN anneau ne reste derrière lui", () => {
    const chemin = [11, 12, 13, 14];
    // Le pion saute directement à l'arrivée : tout le chemin compte comme franchi.
    expect(walkedIndex(chemin, 14)).toBe(chemin.length - 1);
    expect(markerFade(0, 0)).toBe(0);
  });

  it("un chemin qui repasse par la même case éteint la bonne étape, pas la première", () => {
    // Le parcours est un anneau : rien n'interdit d'y revenir.
    const boucle = [26, 27, 0, 1];
    expect(walkedIndex(boucle, 0)).toBe(2);
  });

  it("l'extinction va de 1 à 0 et ne redevient jamais visible", () => {
    expect(markerFade(0, 320)).toBe(1);
    expect(markerFade(160, 320)).toBeCloseTo(0.5, 10);
    expect(markerFade(320, 320)).toBe(0);
    expect(markerFade(10_000, 320)).toBe(0);
  });

  it("la scène ne contient aucun vocabulaire de dé, de roue ni de tirage", () => {
    // L'ADR 0013 interdit le hasard dans le noyau ; la mise en scène ne doit pas
    // le réintroduire en image, ni même en mot.
    for (const fichier of ["src/ui/scene/journeyReveal.ts", "src/ui/scene/journeyMesh.ts", "src/ui/scene/GameCanvas.tsx"]) {
      const source = readFileSync(root + fichier, "utf8");
      expect(source, fichier).not.toMatch(/\b(dice|wheel|spin|roll|rng|seed)\b/i);
      expect(source, fichier).not.toMatch(/Math\.random/);
    }
  });
});

describe("configuration de la scène : des données, pas du code", () => {
  it("la configuration servie est valide et complète", () => {
    expect(() => scene3dConfigSchema.parse(SCENE_3D)).not.toThrow();
    for (const tier of QUALITY_TIERS) {
      expect(SCENE_3D.quality.pixelRatioCap[tier], tier).toBeGreaterThan(0);
      expect(typeof SCENE_3D.quality.antialias[tier], tier).toBe("boolean");
    }
    expect(SCENE_3D.camera.minDistance).toBeLessThan(SCENE_3D.camera.maxDistance);
  });

  it("une configuration invalide est refusée au chargement, pas découverte en partie", () => {
    const base = structuredClone(SCENE_3D) as Record<string, unknown>;
    expect(() => scene3dConfigSchema.parse({ ...base, board: { ...SCENE_3D.board, tiltDegrees: 0 } })).toThrow();
    expect(() => scene3dConfigSchema.parse({ ...base, camera: { ...SCENE_3D.camera, margin: 0.5 } })).toThrow();
    expect(() => scene3dConfigSchema.parse({ ...base, lighting: { ...SCENE_3D.lighting, skyColor: "doré" } })).toThrow();
  });
});

describe("les préférences de plateau survivent à une mise à jour", () => {
  it("un joueur qui avait déjà des réglages les garde, et reçoit le plateau en automatique", () => {
    const options = useSessionStore.persist.getOptions();
    const migre = options.migrate!({ narrationEnabled: false, narrationRate: "slow", preciseTimer: true, voiceTone: "chaleureux" }, 3) as Record<string, unknown>;
    expect(migre["boardRender"]).toBe("auto");
    expect(migre["boardTexture"]).toBe(DEFAULT_BOARD_TEXTURE_MODE);
    // Rien de ce qu'il avait réglé ne doit disparaître au passage.
    expect(migre["narrationRate"]).toBe("slow");
    expect(migre["preciseTimer"]).toBe(true);
    expect(migre["voiceTone"]).toBe("chaleureux");
  });

  it("le réglage est bien persisté : sinon il serait oublié à chaque partie", () => {
    const options = useSessionStore.persist.getOptions();
    const kept = options.partialize!({ ...useSessionStore.getState(), boardRender: "3d", boardTexture: "full" }) as Record<string, unknown>;
    expect(kept["boardRender"]).toBe("3d");
    expect(kept["boardTexture"]).toBe("full");
  });
});

describe("le plateau 3D à l'écran", () => {
  const resolved = resolveBoard(DEFAULT_BOARD, TEST_MONUMENTS);
  if (!resolved.ok) throw new Error("plateau");
  const board = resolved.value.board;

  const pions = { players: [], profiles: [], visuals: {}, activePlayerId: "", cellCount: board.cellCount, stepMs: 280 };
  const render = (textureMode: (typeof BOARD_TEXTURE_MODES)[number]) =>
    renderToStaticMarkup(
      <Board3D board={board} textureMode={textureMode} quality="high" pawns={pions} shot="follow" buildings={[]} path={[]} pathColor="#0f766e" reduced={false} onTooSlow={() => {}} center={<p>panneau du chemin</p>} />,
    );

  it("le cadre garde le rapport d'image du plateau : basculer 3D ↔ 2D ne fait pas sauter l'écran", () => {
    const { cols, rows } = gridDims(board.cellCount);
    const html = render("center");
    expect(html).toContain('data-testid="board-3d"');
    expect(html).toContain(`data-grid="${cols}x${rows}"`);
    expect(html).toContain(`aspect-ratio:${cols} / ${rows}`);
  });

  it("le panneau du Chemin reste en DOM : il est interactif et lu par les lecteurs d'écran", () => {
    expect(render("center")).toContain("panneau du chemin");
    expect(render("full")).toContain("panneau du chemin");
  });

  it("le mode d'illustration est visible dans le rendu, pour pouvoir comparer les deux", () => {
    expect(render("center")).toContain('data-texture="center"');
    expect(render("full")).toContain('data-texture="full"');
  });

  it("aucune toile WebGL côté serveur, et surtout aucun trou : le cadre est bien rendu", () => {
    // `three` n'est pas chargé au rendu serveur (import dynamique) — c'est ce
    // qui garantit qu'il n'entre pas dans le bundle initial.
    const html = render("center");
    expect(html).not.toContain("<canvas");
    expect(html).toContain('data-testid="board-3d"');
  });

  it("le cadre 3D ne porte ni coins arrondis ni ombre : ils ne se verraient pas et coûteraient de la place", () => {
    // La toile est transparente et le plateau est dessiné À L'INTÉRIEUR : un
    // cadre de carte ne s'y voit pas, il ne ferait que rogner la largeur
    // disponible — et sur un téléphone, la largeur est tout ce qu'on a.
    const html = render("full");
    expect(html).not.toContain("rounded-[1.6rem]");
    expect(html).not.toContain("shadow-[0_30px_70px");
    expect(html).toContain("max-w-[min(100vw,88dvh)]");
  });
});
