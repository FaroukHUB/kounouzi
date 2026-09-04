import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { curatedBankSchema } from "@/config/content";

const root = fileURLToPath(new URL("../../../", import.meta.url));

const MATHS = `NIVEAU 1
Public indicatif : 5-8 ans - 2 cartes
1.01 - Le compte des pommes
QUESTION : Combien font 3 pommes plus 2 pommes ?
A. 4
B. 5
RÉPONSE : B.
Explication FR : 3 + 2 = 5.
الشرح بالعربية: ثلاثة زائد اثنين يساوي خمسة.
Animation suggérée : Cinq pommes s'alignent une à une.

1.02 - Vrai ou faux ?
QUESTION : 10 est plus grand que 7.
Vrai
Faux
RÉPONSE : Vrai.
Explication FR : 10 vient après 7 quand on compte.
الشرح بالعربية: عشرة تأتي بعد سبعة عند العدّ.
`;

describe("modèle de banque de questions (docs/import/MODELE_QUESTIONS.md) : import d'une matière non religieuse", () => {
  it("la catégorie vient du nœud, la source et l'animation sont facultatives, tout reste en brouillon et valide pour le registre", () => {
    const dir = mkdtempSync(join(tmpdir(), "kounouzi-import-"));
    const input = join(dir, "maths.txt");
    const output = join(dir, "maths.json");
    writeFileSync(input, MATHS);
    execFileSync("node", [join(root, "scripts/content/import-durous.mjs"), input, output, "maths.compter", "MAT-DEMO"]);
    const bank = JSON.parse(readFileSync(output, "utf8")) as { category: string; questions: Record<string, unknown>[] };
    expect(bank.category).toBe("maths.compter");
    expect(bank.questions).toHaveLength(2);
    expect(bank.questions[0]).toMatchObject({ id: "MAT-DEMO-L1-01", categoryId: "maths", status: "draft", answer: { fr: "5." }, sources: [], animationKey: "arrow_path" });
    expect(bank.questions[1]).toMatchObject({ id: "MAT-DEMO-L1-02", prompt: { fr: "10 est plus grand que 7. Vrai / Faux" }, animationKey: "stars_spark" });
    expect(bank.questions[1]).not.toHaveProperty("animationHint");
    // Le schéma du registre accepte la banque telle quelle (brouillon, FR + AR présents).
    expect(curatedBankSchema.safeParse(bank).success).toBe(true);
  });

  it("une carte de religion sans ligne « Source : » est refusée à l'import", () => {
    const dir = mkdtempSync(join(tmpdir(), "kounouzi-import-"));
    const input = join(dir, "rel.txt");
    writeFileSync(input, MATHS);
    expect(() => execFileSync("node", [join(root, "scripts/content/import-durous.mjs"), input, join(dir, "rel.json"), "religion.test", "REL-T"], { stdio: "pipe" })).toThrow(/exige une ligne « Source : »/);
  });
});
