import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { CATEGORIES, RELIGION_BANKS, categoryById, contentRegistry, curatedBankSchema } from "@/config/content";
import validation from "@/content/questions/religion/validation.v1.json";
import { isPlayable, playabilityIssues } from "@/core/content";

const root = fileURLToPath(new URL("../../../", import.meta.url));
const APPLY = join(root, "scripts/content/apply-corrections.mjs");
const CORRECTIONS = join(root, "src/content/questions/religion/corrections.v1.json");
const VALIDATION = join(root, "src/content/questions/religion/validation.v1.json");
const religion = categoryById("religion");
const ALL = RELIGION_BANKS.flatMap((b) => b.questions);

/** Applique corrections + validation humaine à une banque écrite dans un dossier temporaire ; renvoie la banque relue (ou l'erreur). */
function reapply(bank: unknown): { questions: readonly { id: string; status: string }[] } {
  const dir = mkdtempSync(join(tmpdir(), "kounouzi-validation-"));
  const path = join(dir, "banque.json");
  writeFileSync(path, JSON.stringify(bank, null, 2));
  execFileSync("node", [APPLY, path, CORRECTIONS, VALIDATION], { encoding: "utf8" });
  return JSON.parse(readFileSync(path, "utf8")) as { questions: readonly { id: string; status: string }[] };
}

describe("validation humaine des six banques Religion (décision du 2026-09-04) : donnée pure, jamais perdue au réimport", () => {
  it("la liste validée est exactement l'ensemble des 375 cartes des six banques auditées, ni plus ni moins", () => {
    const ids = ALL.map((q) => q.id);
    expect(validation.ids).toHaveLength(375);
    expect(new Set(validation.ids).size).toBe(375);
    expect([...validation.ids].sort()).toEqual([...ids].sort());
    expect(validation.banks).toEqual(Object.fromEntries(RELIGION_BANKS.map((b) => [b.id, b.questions.length])));
    expect(validation.validatedAt).toBe("2026-09-04");
  });

  it("375 validées / 0 brouillon : chaque carte a une explication FR et AR, au moins une source, aucune note de relecture, et passe la garde de jouabilité", () => {
    expect(ALL.filter((q) => q.status === "validated")).toHaveLength(375);
    expect(ALL.filter((q) => q.status !== "validated")).toHaveLength(0);
    expect(ALL.filter((q) => q.explanation.fr.trim() === "")).toHaveLength(0);
    expect(ALL.filter((q) => q.explanation.ar.trim() === "")).toHaveLength(0);
    expect(ALL.filter((q) => q.sources.length === 0 || q.sources.some((s) => s.title.trim() === ""))).toHaveLength(0);
    expect(ALL.filter((q) => q.reviewNotes)).toHaveLength(0);
    expect(religion?.requiresSource).toBe(true);
    for (const q of ALL) expect(playabilityIssues(q, religion), q.id).toEqual([]);
  });

  it("les cartes Religion sont désormais servies par le registre pour les deux audiences, sur les cinq niveaux", () => {
    const registry = contentRegistry();
    for (const profileType of ["child", "adult"] as const) {
      const slots = registry.slots(profileType).filter((s) => s.categoryId === "religion");
      expect(slots).toHaveLength(375);
      for (const level of [1, 2, 3, 4, 5]) expect(slots.filter((s) => s.difficulty === level).length).toBeGreaterThan(0);
      expect(registry.resolve({ categoryId: "religion", difficulty: 3, profileType, variation: 0 })?.categoryId).toBe("religion");
    }
  });

  it("réimport simulé : une banque remise entièrement en `draft` retrouve ses 375 validations ; une carte hors liste reste en brouillon", () => {
    for (const bank of RELIGION_BANKS) {
      const reset = { version: 1, questions: bank.questions.map((q) => ({ ...q, status: "draft" as const })) };
      const again = reapply(reset);
      expect(again.questions.every((q) => q.status === "validated"), bank.id).toBe(true);
      expect(again.questions.map((q) => q.id)).toEqual(bank.questions.map((q) => q.id));
    }
    const stranger = { ...RELIGION_BANKS[0]!.questions[0]!, id: "REL-NEW-000", status: "draft" as const };
    const withStranger = reapply({ version: 1, questions: [{ ...RELIGION_BANKS[0]!.questions[0]!, status: "draft" as const }, stranger] });
    expect(withStranger.questions.map((q) => q.status)).toEqual(["validated", "draft"]);
  });

  it("la validation humaine ne contourne jamais la garde : une carte listée sans arabe, sans source ou annotée fait ÉCHOUER l'application", () => {
    const base = { ...RELIGION_BANKS[0]!.questions[0]!, status: "draft" as const };
    const broken = [
      { ...base, explanation: { ...base.explanation, ar: "" } },
      { ...base, sources: [] },
      { ...base, reviewNotes: "à relire" },
    ];
    for (const q of broken) expect(() => reapply({ version: 1, questions: [q] }), q.id).toThrow(/ne franchit pas la garde/);
    // Et le schéma lui-même refuse une carte validée sans explication arabe.
    expect(curatedBankSchema.safeParse({ version: 1, questions: [{ ...base, status: "validated", explanation: { ...base.explanation, ar: "" } }] }).success).toBe(false);
  });

  it("aucune autre catégorie ni la banque de sourates n'est touchée par la validation religieuse", () => {
    const registry = contentRegistry();
    const others = CATEGORIES.filter((c) => c.id !== "religion").map((c) => c.id);
    expect(registry.availableCategories("child").filter((c) => others.includes(c))).toEqual(registry.availableCategories("child").filter((c) => c !== "religion"));
    expect(validation.ids.every((id) => id.startsWith("REL-"))).toBe(true);
    expect(ALL.every((q) => isPlayable(q, religion))).toBe(true);
  });
});
