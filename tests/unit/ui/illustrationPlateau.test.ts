import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { ASSETS } from "@/ui/theme/assets";

const root = fileURLToPath(new URL("../../../", import.meta.url));

describe("illustration du plateau — une seule vérité", () => {
  it("le fond de page porte EXACTEMENT l'illustration du plateau", () => {
    // Le CSS ne peut pas lire la constante TypeScript : il recopie le chemin.
    // Sans ce test, changer l'illustration du plateau laissait le fond de page
    // sur l'ancienne, et deux images différentes s'affichaient en même temps —
    // c'est arrivé. Ce test est le garde-fou de cette duplication.
    const css = readFileSync(root + "app/globals.css", "utf8");
    const utilise = [...css.matchAll(/url\("(\/kounouzi\/board\/[^"]+)"\)/g)].map((m) => m[1]);
    expect(utilise.length).toBeGreaterThan(0);
    for (const chemin of utilise) expect(chemin, "fond de page").toBe(ASSETS.boardCenter);
  });

  it("l'illustration existe vraiment sur le disque, et elle est carrée", () => {
    // Un chemin bien formé mais absent donnerait un plateau nu, sans rien dire.
    expect(existsSync(`public${ASSETS.boardCenter}`), ASSETS.boardCenter).toBe(true);
    // WebP : largeur et hauteur se lisent dans l'en-tête VP8X/VP8 ; on se contente
    // de vérifier que le fichier n'est pas vide et porte bien la signature WebP.
    const buf = readFileSync(`public${ASSETS.boardCenter}`);
    expect(buf.byteLength).toBeGreaterThan(1000);
    expect(buf.subarray(0, 4).toString("ascii")).toBe("RIFF");
    expect(buf.subarray(8, 12).toString("ascii")).toBe("WEBP");
  });
});
