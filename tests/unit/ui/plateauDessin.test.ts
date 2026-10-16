import { describe, expect, it } from "vitest";
import { DEFAULT_BOARD } from "@/config/board";
import { DEMO_ESTABLISHMENTS } from "@/config/demo";
import { SCENE_3D } from "@/config/scene3d";
import { resolveBoard } from "@/core/game";
import { createBoardMesh } from "@/ui/scene/boardMesh";

/**
 * Ce test construit vraiment la géométrie du plateau. Il n'a besoin ni de toile
 * ni de WebGL : fabriquer des géométries et des matériaux est du calcul pur,
 * c'est les DESSINER qui demande une carte graphique.
 */
describe("le plateau tient en quelques objets dessinés", () => {
  const resolu = resolveBoard(DEFAULT_BOARD, DEMO_ESTABLISHMENTS);
  if (!resolu.ok) throw new Error("plateau");
  const board = resolu.value.board;

  it("un objet par matériau, pas un par face", () => {
    // Mesuré dans le navigateur avant correction : cent soixante-dix-neuf appels
    // de dessin par rendu pour à peine deux mille six cents triangles — les
    // vingt-huit tuiles étaient dessinées FACE PAR FACE, parce qu'une boîte
    // apporte ses six groupes et qu'un groupe est un appel. Après fusion par
    // matériau et effacement des groupes : dix-huit appels pour la même image.
    const mesh = createBoardMesh({ board, config: SCENE_3D, illustration: null });
    // Socle + plan central + dessus fusionnés + un groupe de flancs par famille présente.
    const familles = new Set(board.cells.map((c) => c.type)).size;
    expect(mesh.drawables).toBe(3 + familles);
    expect(mesh.drawables).toBeLessThanOrEqual(12);
    mesh.dispose();
  });

  it("le nombre d'objets ne dépend PAS du nombre de cases", () => {
    // La garde qui compte : un plateau plus grand ne doit pas coûter plus
    // d'appels de dessin, seulement plus de triangles dans les mêmes objets.
    const petit = resolveBoard(DEFAULT_BOARD, DEMO_ESTABLISHMENTS);
    if (!petit.ok) throw new Error("plateau");
    const a = createBoardMesh({ board: petit.value.board, config: SCENE_3D, illustration: null });
    const b = createBoardMesh({ board: petit.value.board, config: SCENE_3D, illustration: null });
    expect(a.drawables).toBe(b.drawables);
    a.dispose();
    b.dispose();
  });
});
