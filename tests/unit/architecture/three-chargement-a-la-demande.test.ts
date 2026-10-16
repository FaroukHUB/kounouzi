import { readdirSync, readFileSync, statSync } from "node:fs";
import { basename, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = fileURLToPath(new URL("../../../", import.meta.url));

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return walk(full);
    return /\.tsx?$/.test(full) ? [full] : [];
  });
}

const sources = walk(join(root, "src")).map((path) => ({ rel: path.replace(root, ""), code: readFileSync(path, "utf8") }));

/** Les modules qui embarquent three.js. Ils pèsent lourd : où ils sont importés décide du poids de la page. */
const THREE_MODULES = sources.filter((f) => /from ["']three["']/.test(f.code));

/** Un import statique de ce module, par opposition à `dynamic(() => import(...))` ou `await import(...)`. */
function staticallyImports(code: string, moduleName: string): boolean {
  const lines = code.split("\n");
  return lines.some((line) => {
    if (!line.includes(moduleName)) return false;
    if (/\bimport\s*\(/.test(line)) return false;
    return /^\s*import\s/.test(line);
  });
}

describe("three.js se charge à la demande, jamais dans le bundle initial (ADR 0059)", () => {
  it("les modules qui embarquent three sont bien ceux qu'on croit", () => {
    // Si cette liste grandit sans qu'on l'ait voulu, c'est le signal qu'un
    // fichier vient de faire entrer une bibliothèque de 600 Ko quelque part.
    expect(THREE_MODULES.map((f) => basename(f.rel)).sort()).toEqual(["GameCanvas.tsx", "boardMesh.ts", "establishmentMesh.ts", "journeyMesh.ts", "pawnMesh.ts"]);
  });

  it.each(THREE_MODULES.map((f) => basename(f.rel, ".tsx").replace(/\.ts$/, "")))(
    "%s n'est importé statiquement par aucun module qui, lui, n'embarque pas three",
    (moduleName) => {
      // UN SEUL import statique suffit à annuler tous les imports dynamiques :
      // la bibliothèque part alors dans le paquet de la page pour tous les
      // joueurs, même ceux qui ne verront jamais de 3D. C'est exactement ce qui
      // se passait avec l'essai de pions 3D, importé statiquement par l'écran de
      // jeu : un demi-mégaoctet téléchargé pour du code jamais exécuté.
      const fautifs = sources
        .filter((f) => !THREE_MODULES.includes(f))
        .filter((f) => staticallyImports(f.code, moduleName))
        .map((f) => f.rel);
      expect(fautifs, `${moduleName} doit passer par dynamic(() => import(...))`).toEqual([]);
    },
  );

  it("la scène passe par un import dynamique sans rendu serveur", () => {
    const board3d = sources.find((f) => f.rel.endsWith("src/ui/scene/Board3D.tsx"));
    expect(board3d?.code).toMatch(/dynamic\(\(\) => import\("\.\/GameCanvas"\)/);
    // Une toile WebGL n'existe pas sur le serveur : la demander y provoquerait une erreur de rendu.
    expect(board3d?.code).toContain("ssr: false");
  });

  it("l'essai de pions 3D et son drapeau ont bien disparu : une seule scène, un seul réglage", () => {
    expect(sources.find((f) => f.rel.endsWith("PawnLayer3D.tsx"))).toBeUndefined();
    const flagged = sources.filter((f) => f.code.includes("PAWNS_3D_ENABLED") || f.code.includes("NEXT_PUBLIC_PIONS_3D")).map((f) => f.rel);
    expect(flagged).toEqual([]);
  });
});
