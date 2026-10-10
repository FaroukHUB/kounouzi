import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { CATEGORIES, CURATED_BANK, curatedBankSchema } from "@/config/content";
import { parseAgeBand, playabilityIssues } from "@/core/content";

const root = fileURLToPath(new URL("../../../", import.meta.url));
const dossier = join(root, "src/content/questions");

/** Les fichiers « à écrire » : une banque par catégorie et par tranche d'âge. */
function fichiersAEcrire(): readonly { readonly chemin: string; readonly doc: ReturnType<typeof curatedBankSchema.parse> }[] {
  const noms = readdirSync(dossier, { recursive: true, encoding: "utf8" }).filter((f) => /-(56|78|910|1112|13p)\.v1\.json$/.test(f));
  return noms.map((chemin) => ({ chemin, doc: curatedBankSchema.parse(JSON.parse(readFileSync(join(dossier, chemin), "utf8"))) }));
}

/** La tranche visée par un fichier, lue dans son nom. */
const BANDE_DU_NOM: Readonly<Record<string, string>> = { "56": "5-6", "78": "7-8", "910": "9-10", "1112": "11-12", "13p": "13+" };

describe("banques à écrire — le terrain est prêt, les questions restent à écrire par un humain", () => {
  const fichiers = fichiersAEcrire();

  it("une banque par catégorie et par tranche d'âge, déjà chargée par le jeu", () => {
    // Trois catégories à court de contenu × cinq tranches : géographie, logique, gestion.
    expect(fichiers.length).toBe(15);
    for (const { chemin, doc } of fichiers) {
      expect(doc.version, chemin).toBe(1);
      // Le gabarit dit quoi remplir ; il n'est pas une question et n'est jamais servi.
      expect(JSON.parse(readFileSync(join(dossier, chemin), "utf8"))["$gabarit"], chemin).toBeDefined();
    }
  });

  it("toute question ajoutée porte la tranche et une difficulté cohérentes avec SON fichier", () => {
    // Le garde-fou qui évite de refaire le défaut corrigé par l'ADR 0055 : une
    // question rangée dans « 5-6 » mais étiquetée « 11-12 » repartirait au mauvais enfant.
    for (const { chemin, doc } of fichiers) {
      const jeton = /-(56|78|910|1112|13p)\.v1\.json$/.exec(chemin)![1]!;
      const attendue = BANDE_DU_NOM[jeton]!;
      for (const q of doc.questions) {
        expect(q.ageBand, `${chemin} → ${q.id}`).toBe(attendue);
        expect(parseAgeBand(q.ageBand), `${chemin} → ${q.id}`).not.toBeNull();
        expect(q.difficulty, `${chemin} → ${q.id}`).toBeGreaterThanOrEqual(1);
        expect(q.difficulty, `${chemin} → ${q.id}`).toBeLessThanOrEqual(5);
      }
    }
  });

  it("aucun identifiant en double dans toute la banque curée, fichiers à écrire compris", () => {
    const vus = new Map<string, number>();
    for (const q of CURATED_BANK) vus.set(q.id, (vus.get(q.id) ?? 0) + 1);
    expect([...vus].filter(([, n]) => n > 1).map(([id]) => id)).toEqual([]);
  });

  it("les cartes écrites ne manquent QUE la relecture : passées en « validated », elles franchissent la garde", () => {
    // Le jour où l'auteur relit et valide, rien d'autre ne doit bloquer : ni source
    // manquante (la géographie en exige une), ni explication absente, ni arabe vide.
    // Mieux vaut le savoir maintenant que le découvrir après la relecture.
    const categories = CATEGORIES;
    // Les identifiants portent le jeton de tranche, « 13p » compris : un motif
    // purement numérique laissait les cartes 13+ hors du contrôle.
    const brouillons = CURATED_BANK.filter((q) => q.status === "draft" && /-(56|78|910|1112|13p)-\d{3}$/.test(q.id));
    expect(brouillons.length).toBeGreaterThan(0);
    // Toutes les tranches sont représentées, 13+ comprise.
    for (const jeton of ["56", "78", "910", "1112", "13p"]) {
      expect(brouillons.some((q) => q.id.includes(`-${jeton}-`)), jeton).toBe(true);
    }
    for (const q of brouillons) {
      const categorie = categories.find((c) => c.id === q.categoryId);
      expect(playabilityIssues({ ...q, status: "validated" }, categorie), q.id).toEqual([]);
    }
  });

  it("une question se sert dès qu'elle est validée, sans toucher au code", () => {
    // Les fichiers vides sont DÉJÀ chargés : c'est tout l'intérêt. On le prouve
    // en parsant une question modèle avec le schéma réel de la banque.
    const modele = { version: 1, sources: [], questions: [{ id: "TEST-56-001", version: 1, categoryId: "logic", knowledgeNodeId: "logique.test", difficulty: 1, ageBand: "5-6", audienceScope: "all", status: "validated", prompt: { fr: "?" }, answer: { fr: "." }, explanation: { fr: "parce que", ar: "لأن" }, sources: [] }] };
    expect(curatedBankSchema.parse(modele).questions[0]!.status).toBe("validated");
    // Sans explication arabe, la garde de jouabilité refuse : l'ADR 0004 ne se contourne pas.
    const sansAr = { ...modele, questions: [{ ...modele.questions[0]!, explanation: { fr: "parce que", ar: "" } }] };
    expect(() => curatedBankSchema.parse(sansAr)).toThrow();
  });
});
