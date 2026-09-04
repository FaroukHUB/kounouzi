import { describe, expect, it } from "vitest";
import { RELIGION_BANKS } from "@/config/content";
import corrections from "@/content/questions/religion/corrections.v1.json";

const ALL = RELIGION_BANKS.flatMap((b) => b.questions);
const byId = new Map(ALL.map((q) => [q.id, q]));

/** Cartes dont l'arabe reste bloqué en attente de vérification dans la source : aucune correction ne doit y toucher l'arabe (sauf l'espace certain de L5-20). */
const BLOCKED_AR = ["REL-OSS-SAS-L1-03", "REL-OSS-SAS-L2-05", "REL-OSS-SAS-L2-06", "REL-OSS-SAS-L2-17", "REL-OSS-SAS-L4-18", "REL-OSS-SAS-L5-01", "REL-OSS-SAS-L5-06", "REL-OSS-SAS-L5-07", "REL-RAM-ARB-L1-02", "REL-RAM-ARB-L1-04", "REL-RAM-ARB-L2-03", "REL-RAM-ARB-L4-02", "REL-RAM-ARB-L4-04", "REL-RAM-ARB-L4-05", "REL-RAM-ARB-L5-02", "REL-RAM-ARB-L5-04", "REL-RAM-ARB-L5-01", "REL-QAW-ARB-L2-02", "REL-QAW-ARB-L2-04", "REL-QAW-ARB-L3-02", "REL-QAW-ARB-L5-01", "REL-QAW-ARB-L5-03"];

describe("corrections humaines (revue du 2026-09-04) : données appliquées par-dessus l'import, jamais perdues", () => {
  it("chaque correction vise une carte existante et ses valeurs sont exactement celles de la banque (réimport idempotent)", () => {
    expect(corrections.corrections).toHaveLength(29);
    for (const c of corrections.corrections) {
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

  it("aucun arabe abîmé n'est reconstruit par les corrections : les cartes bloquées gardent leur arabe d'import et restent en brouillon", () => {
    for (const c of corrections.corrections) {
      if (BLOCKED_AR.includes(c.id)) expect(c.set && "explanation.ar" in c.set, c.id).toBeFalsy();
    }
    for (const id of BLOCKED_AR) expect(byId.get(id)?.status, id).toBe("draft");
    expect(ALL.some((q) => q.status === "validated")).toBe(false);
  });
});
