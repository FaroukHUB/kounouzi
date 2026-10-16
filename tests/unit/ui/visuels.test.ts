import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { ESTABLISHMENT_FAMILIES } from "@/core/game";
import { PAWN_PIECES } from "@/config/pawns/pieces";
import { declaredModelPaths, pawnModelFor, VISUALS, visualsConfigSchema } from "@/config/visuals";

const root = fileURLToPath(new URL("../../../", import.meta.url));
const servedPath = (url: string) => join(root, "public", url.replace(/^\//, ""));

/** Budgets d'un téléphone, en octets. Documentés dans public/kounouzi/README.md. */
const BUDGET = { pawn: 300 * 1024, establishment: 600 * 1024 } as const;

describe("les emplacements des visuels 3D fournis", () => {
  it("le manifeste est valide", () => {
    expect(() => visualsConfigSchema.parse(VISUALS)).not.toThrow();
  });

  it("TOUT chemin déclaré pointe vers un fichier qui existe", () => {
    // La garde essentielle : une illustration manquante doit être une erreur de
    // construction, pas un trou découvert en pleine partie par la famille.
    for (const url of declaredModelPaths()) {
      expect(existsSync(servedPath(url)), `${url} est déclaré mais absent de public/`).toBe(true);
    }
  });

  it("un modèle déclaré tient dans le budget d'un téléphone", () => {
    for (const [seat] of PAWN_PIECES.entries()) {
      const url = pawnModelFor(seat);
      if (!url) continue;
      expect(statSync(servedPath(url)).size, `${url} dépasse le budget d'un pion`).toBeLessThanOrEqual(BUDGET.pawn);
    }
    for (const family of ESTABLISHMENT_FAMILIES) {
      const url = VISUALS.establishments.byFamily[family];
      if (!url) continue;
      expect(statSync(servedPath(url)).size, `${url} dépasse le budget d'un établissement`).toBeLessThanOrEqual(BUDGET.establishment);
    }
  });

  it("un modèle déclaré porte des NORMALES et des coordonnées de texture", () => {
    // Le cas type à éviter : `pion-fille.glb` ne contenait que des positions.
    // Sans normales il n'y a rien à éclairer, sans UV rien à texturer, et le
    // modèle ne peut être qu'une silhouette en aplat — quel que soit le réglage.
    for (const url of declaredModelPaths()) {
      const attributs = gltfAttributes(servedPath(url));
      expect(attributs, `${url} : aucun maillage lisible`).not.toEqual([]);
      for (const liste of attributs) {
        expect(liste, `${url} : maillage sans NORMAL`).toContain("NORMAL");
        expect(liste.some((a) => a.startsWith("TEXCOORD")), `${url} : maillage sans coordonnées de texture`).toBe(true);
      }
    }
  });

  it("aucun fichier n'est fourni pour l'instant : le jeu sert donc ses visuels provisoires", () => {
    // Ce test documente l'état actuel. Le jour où des modèles arrivent, il
    // tombe — et c'est le signal qu'il faut le remplacer par la liste attendue,
    // pas une régression.
    expect(declaredModelPaths()).toEqual([]);
    for (const [seat] of PAWN_PIECES.entries()) expect(pawnModelFor(seat)).toBeNull();
  });

  it("le manifeste refuse un chemin qui n'est pas un .glb servi depuis /kounouzi/", () => {
    const base = structuredClone(VISUALS) as Record<string, unknown>;
    expect(() => visualsConfigSchema.parse({ ...base, pawns: { ...VISUALS.pawns, shared: "/ailleurs/pion.glb" } })).toThrow();
    expect(() => visualsConfigSchema.parse({ ...base, pawns: { ...VISUALS.pawns, shared: "/kounouzi/models/pion.fbx" } })).toThrow();
    expect(() => visualsConfigSchema.parse({ ...base, pawns: { ...VISUALS.pawns, shared: "/kounouzi/models/pion.glb" } })).not.toThrow();
  });

  it("le format attendu est écrit là où l'auteur le cherchera", () => {
    const readme = readFileSync(join(root, "public/kounouzi/README.md"), "utf8");
    for (const attendu of [".glb", "Normales", "Origine", "+Y Up", "4 000", "8 000"]) {
      expect(readme, `le README ne dit rien de « ${attendu} »`).toContain(attendu);
    }
  });
});

/** Attributs de chaque maillage d'un `.glb`, lus sans dépendance : l'en-tête JSON suffit. */
function gltfAttributes(path: string): readonly (readonly string[])[] {
  const buffer = readFileSync(path);
  if (buffer.length < 20 || buffer.readUInt32LE(0) !== 0x46546c67) return [];
  const length = buffer.readUInt32LE(8);
  let offset = 12;
  while (offset < length) {
    const chunkLength = buffer.readUInt32LE(offset);
    const chunkType = buffer.readUInt32LE(offset + 4);
    if (chunkType === 0x4e4f534a) {
      const json = JSON.parse(buffer.subarray(offset + 8, offset + 8 + chunkLength).toString("utf8")) as {
        meshes?: { primitives?: { attributes?: Record<string, number> }[] }[];
      };
      return (json.meshes ?? []).flatMap((m) => (m.primitives ?? []).map((p) => Object.keys(p.attributes ?? {})));
    }
    offset += 8 + chunkLength;
  }
  return [];
}
