import { describe, expect, it } from "vitest";
import {
  MATHS_BOUNDS,
  MATHS_CATEGORY_ID,
  MATHS_GENERATOR_VERSION,
  MATHS_MODELS,
  generateMaths,
  instantiateMathsModel,
  mathsModelById,
  mathsModelsAt,
  mathsSlots,
  pickInRange,
  rebuildMaths,
  strideFor,
  type MathsParams,
} from "@/core/content";

/** Premier nombre d'un texte (réponse « 8 Kounouz », « 16 h 15 », « 5 tours »). */
const firstNumber = (text: string): number => {
  const m = text.replace(",", ".").match(/-?\d+(?:\.\d+)?/);
  return m ? Number(m[0]) : Number.NaN;
};
const numbersIn = (text: string): readonly number[] => (text.replace(/,(\d)/g, ".$1").match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
const p = (params: MathsParams, key: string): number => {
  const v = params[key];
  if (v === undefined) throw new Error(`paramètre ${key} absent`);
  return v;
};

/**
 * Attente INDÉPENDANTE du rendu : le test recalcule la réponse à partir des
 * paramètres, il ne relit pas ce que le générateur a écrit. `null` : la
 * réponse n'est pas un nombre, elle est vérifiée séparément.
 */
const EXPECTED: Readonly<Record<string, (params: MathsParams) => number | null>> = {
  "MATH-001": (x) => p(x, "a") + p(x, "b"),
  "MATH-002": (x) => p(x, "total") - p(x, "depense"),
  "MATH-003": () => null,
  "MATH-004": (x) => p(x, "joueurs"),
  "MATH-005": (x) => p(x, "besoin") - p(x, "possede"),
  "MATH-006": (x) => p(x, "pieces") * 2,
  "MATH-007": (x) => p(x, "total") - p(x, "achat"),
  "MATH-008": (x) => p(x, "joueurs") * p(x, "montant"),
  "MATH-009": (x) => p(x, "total") / p(x, "enfants"),
  "MATH-010": (x) => p(x, "heure") + p(x, "ajout"),
  "MATH-011": (x) => p(x, "total") - (p(x, "d1") + p(x, "d2")),
  "MATH-012": (x) => p(x, "objets") * p(x, "prix"),
  "MATH-013": (x) => p(x, "total") - p(x, "depense"),
  "MATH-014": (x) => p(x, "objets") * p(x, "prix"),
  "MATH-015": (x) => p(x, "budget") - (p(x, "livre") + p(x, "repas")),
  "MATH-016": (x) => p(x, "finHeure"),
  "MATH-017": (x) => p(x, "total") / p(x, "objets"),
  "MATH-018": (x) => p(x, "parSemaine") * p(x, "semaines"),
  "MATH-019": (x) => p(x, "budget") - (p(x, "a1") + p(x, "a2") + p(x, "a3")),
  "MATH-020": (x) => p(x, "total") / p(x, "articles"),
  "MATH-021": (x) => p(x, "prix") - (p(x, "prix") * p(x, "taux")) / 100,
  "MATH-022": (x) => p(x, "reserve") / p(x, "parTour"),
  "MATH-023": () => null,
  "MATH-024": (x) => p(x, "objectif") / p(x, "semaines"),
  "MATH-025": (x) => p(x, "prix") + (p(x, "prix") * p(x, "taux")) / 100,
  "MATH-026": () => null,
  "MATH-027": () => null,
  "MATH-028": (x) => p(x, "depense") / p(x, "personnes"),
  "MATH-029": (x) => p(x, "total") - (p(x, "total") * p(x, "reste")) / 100,
  "MATH-030": (x) => (p(x, "gain") - p(x, "depense")) * p(x, "tours"),
};

/** Divisions qui doivent tomber juste : dividende et diviseur. */
const EXACT_DIVISIONS: Readonly<Record<string, readonly [string, string]>> = {
  "MATH-009": ["total", "enfants"],
  "MATH-017": ["total", "objets"],
  "MATH-020": ["total", "articles"],
  "MATH-022": ["reserve", "parTour"],
  "MATH-024": ["objectif", "semaines"],
  "MATH-028": ["depense", "personnes"],
};

/** Pourcentages qui doivent tomber sur un entier : montant et taux. */
const PERCENTAGES: Readonly<Record<string, readonly [string, string]>> = {
  "MATH-021": ["prix", "taux"],
  "MATH-025": ["prix", "taux"],
  "MATH-029": ["total", "reste"],
};

const VARIATIONS = 60;

describe("parcours déterministe d'intervalle", () => {
  it("visite toutes les valeurs avant de se répéter, sans hasard", () => {
    const seen = Array.from({ length: 9 }, (_, i) => pickInRange(2, 10, i));
    expect([...seen].sort((a, b) => a - b)).toEqual([2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(pickInRange(2, 10, 9)).toBe(pickInRange(2, 10, 0));
    expect(strideFor(9)).toBe(8);
    expect(strideFor(2)).toBe(1);
  });
});

describe("les 30 modèles pédagogiques validés", () => {
  it("sont exactement 30, avec des identifiants uniques de MATH-001 à MATH-030", () => {
    expect(MATHS_MODELS).toHaveLength(30);
    expect(new Set(MATHS_MODELS.map((m) => m.id)).size).toBe(30);
    expect(MATHS_MODELS.map((m) => m.id)).toEqual(Array.from({ length: 30 }, (_, i) => `MATH-${String(i + 1).padStart(3, "0")}`));
    expect(mathsModelById("MATH-015")?.difficulty).toBe(3);
    expect(mathsModelById("MATH-999")).toBeUndefined();
  });

  it("portent une difficulté entière de 1 à 5, une compétence nommée et un régime déclaré ; chaque difficulté a des modèles", () => {
    for (const m of MATHS_MODELS) {
      expect(Number.isInteger(m.difficulty), m.id).toBe(true);
      expect(m.difficulty, m.id).toBeGreaterThanOrEqual(1);
      expect(m.difficulty, m.id).toBeLessThanOrEqual(5);
      expect(m.knowledgeNodeId, m.id).toMatch(/^maths\./);
      expect(["static", "parametric"], m.id).toContain(m.kind);
    }
    for (const d of [1, 2, 3, 4, 5]) expect(mathsModelsAt(d).length, `difficulté ${d}`).toBeGreaterThan(0);
    // Trois modèles sont statiques : leurs nombres SONT la démonstration.
    expect(MATHS_MODELS.filter((m) => m.kind === "static").map((m) => m.id)).toEqual(["MATH-023", "MATH-026", "MATH-027"]);
    expect(MATHS_MODELS.filter((m) => m.kind === "parametric")).toHaveLength(27);
  });

  it("produisent toujours un énoncé, une réponse et une explication en français ET en arabe", () => {
    for (const m of MATHS_MODELS) {
      for (let v = 0; v < 10; v += 1) {
        const q = instantiateMathsModel(m, v);
        for (const [label, text] of [
          ["énoncé", q.prompt],
          ["réponse", q.answer],
        ] as const) {
          expect(text.fr.trim().length, `${m.id} ${label} FR`).toBeGreaterThan(0);
          expect((text.ar ?? "").trim().length, `${m.id} ${label} AR`).toBeGreaterThan(0);
        }
        // L'énoncé est une phrase : il porte forcément de l'arabe. Une réponse peut n'être qu'un nombre.
        expect(/[؀-ۿ]/.test(q.prompt.ar ?? ""), `${m.id} énoncé AR en arabe`).toBe(true);
        expect(q.explanation.fr.trim().length, `${m.id} explication FR`).toBeGreaterThan(0);
        expect(q.explanation.ar.trim().length, `${m.id} explication AR`).toBeGreaterThan(0);
        expect(/[؀-ۿ]/.test(q.explanation.ar), `${m.id} explication AR en arabe`).toBe(true);
        expect(q.categoryId).toBe(MATHS_CATEGORY_ID);
        expect(q.sources).toEqual([]);
      }
    }
  });

  it("un modèle statique ne varie jamais, un modèle paramétrique varie", () => {
    for (const m of MATHS_MODELS.filter((x) => x.kind === "static")) {
      const textes = new Set(Array.from({ length: 20 }, (_, v) => instantiateMathsModel(m, v).prompt.fr));
      expect(textes.size, m.id).toBe(1);
    }
    for (const m of MATHS_MODELS.filter((x) => x.kind === "parametric")) {
      const textes = new Set(Array.from({ length: 20 }, (_, v) => instantiateMathsModel(m, v).prompt.fr));
      expect(textes.size, m.id).toBeGreaterThan(1);
    }
  });
});

describe("variantes numériques : justes, bornées, sans reste ni résultat négatif", () => {
  it("la réponse servie est celle que donne le calcul, recalculé indépendamment des paramètres", () => {
    for (const m of MATHS_MODELS) {
      const expected = EXPECTED[m.id];
      expect(expected, `attente manquante pour ${m.id}`).toBeDefined();
      for (let v = 0; v < VARIATIONS; v += 1) {
        const q = instantiateMathsModel(m, v);
        const ref = q.ref;
        if (ref.origin !== "algorithmic") throw new Error("référence algorithmique attendue");
        const params = Object.fromEntries(Object.entries(ref.params).map(([k, val]) => [k, Number(val)])) as MathsParams;
        const attendu = expected!(params);
        if (attendu === null) continue;
        expect(firstNumber(q.answer.fr), `${m.id}@${v} : ${q.prompt.fr} → ${q.answer.fr}`).toBe(attendu);
      }
    }
  });

  it("aucun nombre servi ne dépasse la borne pédagogique de sa difficulté, ni ne descend sous zéro", () => {
    for (const m of MATHS_MODELS) {
      const borne = MATHS_BOUNDS[m.difficulty]!;
      for (let v = 0; v < VARIATIONS; v += 1) {
        const q = instantiateMathsModel(m, v);
        const ref = q.ref;
        if (ref.origin !== "algorithmic") throw new Error("référence algorithmique attendue");
        for (const [key, value] of Object.entries(ref.params)) {
          const n = Number(value);
          expect(n, `${m.id}@${v} paramètre ${key}`).toBeGreaterThanOrEqual(0);
          expect(n, `${m.id}@${v} paramètre ${key}`).toBeLessThanOrEqual(borne);
        }
        for (const n of numbersIn(q.answer.fr)) {
          expect(n, `${m.id}@${v} réponse « ${q.answer.fr} »`).toBeGreaterThanOrEqual(0);
          expect(n, `${m.id}@${v} réponse « ${q.answer.fr} »`).toBeLessThanOrEqual(borne);
        }
      }
    }
  });

  it("toute division censée tomber juste tombe juste, et tout partage donne une part entière", () => {
    for (const [id, [dividende, diviseur]] of Object.entries(EXACT_DIVISIONS)) {
      const m = mathsModelById(id)!;
      for (let v = 0; v < VARIATIONS; v += 1) {
        const ref = instantiateMathsModel(m, v).ref;
        if (ref.origin !== "algorithmic") throw new Error("référence algorithmique attendue");
        const a = Number(ref.params[dividende]);
        const b = Number(ref.params[diviseur]);
        expect(b, `${id}@${v} diviseur`).toBeGreaterThan(0);
        expect(a % b, `${id}@${v} : ${a} ÷ ${b}`).toBe(0);
        expect(Number.isInteger(a / b)).toBe(true);
      }
    }
  });

  it("toute soustraction censée rester positive le reste : le reste annoncé est strictement supérieur à zéro", () => {
    const soustractions: readonly (readonly [string, string, string])[] = [
      ["MATH-002", "total", "depense"],
      ["MATH-005", "besoin", "possede"],
      ["MATH-007", "total", "achat"],
      ["MATH-013", "total", "depense"],
    ];
    for (const [id, grand, petit] of soustractions) {
      const m = mathsModelById(id)!;
      for (let v = 0; v < VARIATIONS; v += 1) {
        const ref = instantiateMathsModel(m, v).ref;
        if (ref.origin !== "algorithmic") throw new Error("référence algorithmique attendue");
        expect(Number(ref.params[grand]) - Number(ref.params[petit]), `${id}@${v}`).toBeGreaterThan(0);
      }
    }
    // Budgets bâtis à partir du reste voulu : le reste est toujours strictement positif.
    for (const [id, key] of [
      ["MATH-011", "reste"],
      ["MATH-015", "reste"],
      ["MATH-019", "reste"],
    ] as const) {
      const m = mathsModelById(id)!;
      for (let v = 0; v < VARIATIONS; v += 1) {
        const ref = instantiateMathsModel(m, v).ref;
        if (ref.origin !== "algorithmic") throw new Error("référence algorithmique attendue");
        expect(Number(ref.params[key]), `${id}@${v}`).toBeGreaterThan(0);
      }
    }
  });

  it("les pourcentages tombent sur des valeurs entières, jamais sur une décimale bancale", () => {
    for (const [id, [montant, taux]] of Object.entries(PERCENTAGES)) {
      const m = mathsModelById(id)!;
      for (let v = 0; v < VARIATIONS; v += 1) {
        const ref = instantiateMathsModel(m, v).ref;
        if (ref.origin !== "algorithmic") throw new Error("référence algorithmique attendue");
        const a = Number(ref.params[montant]);
        const t = Number(ref.params[taux]);
        expect(t, `${id}@${v} taux`).toBeGreaterThan(0);
        expect((a * t) % 100, `${id}@${v} : ${t} % de ${a}`).toBe(0);
      }
    }
  });

  it("MATH-026 démontre exactement que +20 % puis −20 % ramène 100 à 96, et ne varie jamais", () => {
    const m = mathsModelById("MATH-026")!;
    expect(m.kind).toBe("static");
    expect(m.difficulty).toBe(5);
    const q = instantiateMathsModel(m, 0);
    const ref = q.ref;
    if (ref.origin !== "algorithmic") throw new Error("référence algorithmique attendue");
    expect(ref.params).toEqual({ depart: 100, taux: 20, apresHausse: 120, apresBaisse: 96 });
    // Le calcul refait ici, indépendamment du texte.
    const apresHausse = 100 * 1.2;
    const apresBaisse = apresHausse * 0.8;
    expect(apresHausse).toBe(120);
    expect(apresBaisse).toBe(96);
    expect(q.answer.fr).toBe("Non. Il finit 4 % plus bas.");
    expect(q.explanation.fr).toContain("96");
    expect(q.explanation.ar).toContain("96");
    expect(new Set(Array.from({ length: 10 }, (_, v) => instantiateMathsModel(m, v).prompt.fr)).size).toBe(1);
  });

  it("les deux comparaisons de prix unitaire désignent bien l'offre la moins chère à l'unité", () => {
    const vingtTrois = instantiateMathsModel(mathsModelById("MATH-023")!, 0);
    expect(12 / 4).toBeGreaterThan(15 / 6);
    expect(vingtTrois.answer.fr).toBe("Le paquet de 6.");
    const vingtSept = instantiateMathsModel(mathsModelById("MATH-027")!, 0);
    expect(30 / 5).toBeGreaterThan(44 / 8);
    expect(vingtSept.answer.fr).toBe("8 unités pour 44 Kounouz.");
  });

  it("MATH-003 nomme toujours celui qui en a le plus, quelles que soient les valeurs", () => {
    const m = mathsModelById("MATH-003")!;
    for (let v = 0; v < VARIATIONS; v += 1) {
      const q = instantiateMathsModel(m, v);
      const ref = q.ref;
      if (ref.origin !== "algorithmic") throw new Error("référence algorithmique attendue");
      const lina = Number(ref.params["lina"]);
      const adam = Number(ref.params["adam"]);
      expect(lina, `${v} : égalité interdite`).not.toBe(adam);
      expect(q.answer.fr).toBe(lina > adam ? "Lina." : "Adam.");
    }
  });
});

describe("générateur : déterministe, sans hasard, compatible avec le contrat du registre", () => {
  const req = { categoryId: MATHS_CATEGORY_ID, difficulty: 3, profileType: "child" as const, variation: 7 };

  it("la même demande donne toujours la même question, et la difficulté servie suit celle demandée", () => {
    expect(generateMaths(req)).toEqual(generateMaths(req));
    expect(generateMaths({ ...req, difficulty: 1, variation: 0 }).difficulty).toBe(1);
    expect(generateMaths({ ...req, difficulty: 5, variation: 0 }).difficulty).toBe(5);
    expect(generateMaths({ ...req, difficulty: 9, variation: 0 }).difficulty).toBe(5);
    expect(generateMaths({ ...req, difficulty: 0, variation: 0 }).difficulty).toBe(1);
  });

  it("parcourt les modèles de la difficulté demandée avant de les répéter", () => {
    for (const d of [1, 2, 3, 4, 5]) {
      const total = mathsModelsAt(d).length;
      const vus = new Set(Array.from({ length: total }, (_, v) => generateMaths({ ...req, difficulty: d, variation: v }).ref).map((r) => (r.origin === "algorithmic" ? r.generatorId : "")));
      expect(vus.size, `difficulté ${d}`).toBe(total);
    }
  });

  it("ne sert plus d'opération nue : chaque énoncé est une situation, avec des mots", () => {
    for (const d of [1, 2, 3, 4, 5]) {
      for (let v = 0; v < 20; v += 1) {
        const q = generateMaths({ ...req, difficulty: d, variation: v });
        expect(q.prompt.fr, `d${d}@${v}`).not.toMatch(/^\s*\d+\s*[+×÷−-]\s*\d+\s*=\s*\?\s*$/);
        expect(q.prompt.fr.split(/\s+/).length, `d${d}@${v} : ${q.prompt.fr}`).toBeGreaterThan(5);
      }
    }
  });

  it("chaque créneau correspond à un modèle, avec un identifiant unique et une instanciation déterministe", () => {
    const slots = mathsSlots();
    expect(slots).toHaveLength(30);
    expect(new Set(slots.map((s) => s.slotId)).size).toBe(30);
    for (const s of slots) {
      expect(s.categoryId).toBe(MATHS_CATEGORY_ID);
      expect(s.audienceScope).toBe("all");
      const a = s.instantiate(4);
      const b = s.instantiate(4);
      expect(a).toEqual(b);
      expect(a!.knowledgeNodeId).toBe(s.knowledgeNodeId);
      expect(a!.difficulty).toBe(s.difficulty);
    }
    // Plusieurs modèles peuvent travailler la même compétence : c'est voulu.
    expect(new Set(slots.map((s) => s.knowledgeNodeId)).size).toBeLessThan(30);
  });

  it("une question servie se reconstruit à l'identique depuis sa référence ; une autre version ne se reconstruit pas", () => {
    for (const d of [1, 3, 5]) {
      for (let v = 0; v < 12; v += 1) {
        const q = generateMaths({ ...req, difficulty: d, variation: v });
        const ref = q.ref;
        if (ref.origin !== "algorithmic") throw new Error("référence algorithmique attendue");
        expect(rebuildMaths(ref)).toEqual(q);
        expect(ref.generatorVersion).toBe(MATHS_GENERATOR_VERSION);
      }
    }
    const ref = generateMaths(req).ref;
    if (ref.origin !== "algorithmic") throw new Error("référence algorithmique attendue");
    expect(rebuildMaths({ ...ref, generatorVersion: 99 })).toBeNull();
    expect(rebuildMaths({ ...ref, generatorId: "maths.MATH-999" })).toBeNull();
    // Ancienne référence v1 (opérations nues) : plus reconstructible, jamais servie à nouveau.
    expect(rebuildMaths({ origin: "algorithmic", generatorId: "maths.addition", generatorVersion: 1, knowledgeNodeId: "maths.addition.d2", difficulty: 2, params: { a: 7, b: 8 } })).toBeNull();
  });
});
