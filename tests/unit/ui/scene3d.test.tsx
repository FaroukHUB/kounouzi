import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DEFAULT_BOARD } from "@/config/board";
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
import { TEST_MONUMENTS } from "../../fixtures/game/heritage.fixture";

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

  const render = (textureMode: (typeof BOARD_TEXTURE_MODES)[number]) =>
    renderToStaticMarkup(
      <Board3D board={board} textureMode={textureMode} quality="high" onTooSlow={() => {}} center={<p>panneau du chemin</p>} />,
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
    expect(html).toContain("rounded-[1.6rem]");
  });
});
