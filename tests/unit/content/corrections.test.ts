import { describe, expect, it } from "vitest";
import { RELIGION_BANKS } from "@/config/content";
import corrections from "@/content/questions/religion/corrections.v1.json";

const ALL = RELIGION_BANKS.flatMap((b) => b.questions);
const byId = new Map(ALL.map((q) => [q.id, q]));

/** Les 23 cartes dont l'arabe a été vérifié directement contre le PDF de contrôle original (2026-09-04). */
const VERIFIED = corrections.sourceVerified.ids;
type Correction = { id: string; set?: Record<string, string>; clearReviewNotes?: boolean; reviewNotes?: string; reason: string };
const ENTRIES: readonly Correction[] = corrections.corrections;

describe("corrections humaines (revue du 2026-09-04) : données appliquées par-dessus l'import, jamais perdues", () => {
  it("chaque correction vise une carte existante et ses valeurs sont exactement celles de la banque (réimport idempotent)", () => {
    expect(corrections.corrections).toHaveLength(34);
    for (const c of ENTRIES) {
      const q = byId.get(c.id);
      expect(q, c.id).toBeDefined();
      for (const [path, value] of Object.entries(c.set ?? {})) {
        const [field, lang] = path.split(".");
        const actual = lang ? (q![field as "prompt" | "answer" | "explanation"] as unknown as Record<string, string>)[lang] : q![field as "title"];
        expect(actual, `${c.id} ${path}`).toBe(value);
      }
      if (c.clearReviewNotes && !c.reviewNotes) expect(q!.reviewNotes, c.id).toBeUndefined();
      if (c.reviewNotes) expect(q!.reviewNotes, c.id).toBe(c.reviewNotes);
    }
  });

  it("aucune réponse n'est plus une lettre seule ni ne porte un préfixe de lettre, dans aucune banque", () => {
    for (const q of ALL) expect(q.answer.fr, q.id).not.toMatch(/^[A-D]\.(\s|$)/);
  });

  it("chaque arabe posé par une correction vient d'une carte vérifiée dans la source ; les 23 cartes vérifiées ont un arabe complet, sans note, et tout reste en brouillon", () => {
    expect(VERIFIED).toHaveLength(23);
    for (const c of ENTRIES) {
      if (c.set && "explanation.ar" in c.set) expect(VERIFIED, `${c.id} : arabe corrigé hors vérification de source`).toContain(c.id);
    }
    for (const id of VERIFIED) {
      const q = byId.get(id);
      expect(q, id).toBeDefined();
      expect(/[؀-ۿ]/.test(q!.explanation.ar), id).toBe(true);
      expect(q!.reviewNotes, id).toBeUndefined();
      expect(q!.status, id).toBe("draft");
    }
    expect(ALL).toHaveLength(375);
    expect(ALL.some((q) => q.status === "validated")).toBe(false);
    // Plus aucune note d'import en attente dans les banques religieuses.
    expect(ALL.filter((q) => q.reviewNotes).map((q) => q.id)).toEqual([]);
  });
});
