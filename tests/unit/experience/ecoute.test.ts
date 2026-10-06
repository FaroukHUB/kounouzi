import { describe, expect, it } from "vitest";
import { ECOUTE_CONFIG, ecouteSchema } from "@/config/ecoute";
import { ANSWER_OUTCOMES } from "@/core/shared";
import { NullEcouteur, WebSpeechEcouteur, normaliser, verdictEntendu, type EcouteService } from "@/experience/ecoute";

const dit = (phrase: string) => verdictEntendu(phrase, ECOUTE_CONFIG);

describe("écoute — vocabulaire de validation (données)", () => {
  it("le vocabulaire ne déclenche que les TROIS verdicts des boutons, jamais autre chose", () => {
    const ids = new Set(ECOUTE_CONFIG.commandes.map((c) => c.id));
    expect([...ids].sort()).toEqual([...ANSWER_OUTCOMES].sort());
    for (const c of ECOUTE_CONFIG.commandes) expect(c.phrases.length, c.id).toBeGreaterThan(0);
  });

  it("une donnée hors schéma est refusée au chargement (verdict inventé, confiance absurde)", () => {
    expect(() => ecouteSchema.parse({ ...ECOUTE_CONFIG, commandes: [{ id: "parfait", phrases: ["parfait"] }] })).toThrow();
    expect(() => ecouteSchema.parse({ ...ECOUTE_CONFIG, minConfidence: 1.5 })).toThrow();
  });

  it("reconnaît les mots de la tablée, accents, apostrophes et ponctuation compris", () => {
    expect(dit("correct")).toBe("correct");
    expect(dit("C'est juste !")).toBe("correct");
    expect(dit("bonne réponse")).toBe("correct");
    expect(dit("presque")).toBe("partial");
    expect(dit("à moitié")).toBe("partial");
    expect(dit("a moitie")).toBe("partial");
    expect(dit("faux")).toBe("incorrect");
    expect(dit("raté")).toBe("incorrect");
  });

  it("LA NÉGATION L'EMPORTE : « pas juste » n'est jamais entendu comme « juste »", () => {
    // Sans cette règle, un enfant qui a eu faux serait félicité — et l'inverse.
    expect(dit("pas juste")).toBe("incorrect");
    expect(dit("c'est pas juste")).toBe("incorrect");
    expect(dit("pas correct")).toBe("incorrect");
    expect(dit("pas bon")).toBe("incorrect");
    expect(dit("pas tout à fait")).toBe("partial");
    expect(dit("presque juste")).toBe("partial");
  });

  it("ne valide RIEN quand deux verdicts sont aussi plausibles l'un que l'autre", () => {
    // « oui ou non » : on ne devine pas un verdict à la place d'un enfant.
    expect(dit("oui ou non")).toBeUndefined();
    expect(dit("correct ou faux")).toBeUndefined();
  });

  it("ne valide RIEN sur une phrase qui ne contient aucun mot du vocabulaire", () => {
    expect(dit("")).toBeUndefined();
    expect(dit("l'Algérie est en Afrique")).toBeUndefined();
    expect(dit("passe-moi le dé")).toBeUndefined();
    // Mots entiers seulement : « injuste » n'est pas « juste ».
    expect(dit("c'est injuste")).toBeUndefined();
    expect(dit("justement")).toBeUndefined();
  });

  it("normalise minuscules, accents et ponctuation des deux côtés de la comparaison", () => {
    expect(normaliser("  C'EST  Presque, à moitié ! ")).toBe("c est presque a moitie");
  });
});

/** Reconnaissance factice : on pilote exactement ce que « le navigateur » a entendu. */
function fausseFabrique() {
  const instances: {
    lang: string;
    continuous: boolean;
    interimResults: boolean;
    maxAlternatives: number;
    onresult: ((e: { results: unknown; resultIndex: number }) => void) | null;
    onerror: ((e: { error: string }) => void) | null;
    onend: (() => void) | null;
    demarrages: number;
    arrets: number;
    start(): void;
    stop(): void;
    abort(): void;
  }[] = [];
  class Fausse {
    lang = "";
    continuous = false;
    interimResults = true;
    maxAlternatives = 1;
    onresult: ((e: { results: unknown; resultIndex: number }) => void) | null = null;
    onerror: ((e: { error: string }) => void) | null = null;
    onend: (() => void) | null = null;
    demarrages = 0;
    arrets = 0;
    constructor() {
      instances.push(this as never);
    }
    start() {
      this.demarrages += 1;
    }
    stop() {
      this.arrets += 1;
    }
    abort() {
      this.arrets += 1;
    }
  }
  return { Fausse: Fausse as never, instances };
}

/** Un résultat tel que le navigateur le livre : liste indexée, `isFinal`, propositions. */
const resultats = (propositions: readonly { readonly transcript: string; readonly confidence: number }[], isFinal = true) => {
  const resultat = Object.assign([...propositions], { isFinal, length: propositions.length, item: (i: number) => propositions[i]! });
  return Object.assign([resultat], { length: 1, item: (i: number) => [resultat][i]! });
};

describe("écoute — écouteur du navigateur", () => {
  it("l'écouteur sourd ne s'ouvre jamais et dit pourquoi", () => {
    const sourd: EcouteService = new NullEcouteur();
    expect(sourd.isSupported()).toBe(false);
    expect(sourd.raison()).toBe("unsupported");
    sourd.ecouter(() => expect.fail("un écouteur sourd ne doit rien entendre"));
    expect(sourd.ecoute()).toBe(false);
  });

  it("sans reconnaissance dans le navigateur, l'écoute est impossible et annoncée comme telle", () => {
    const e = new WebSpeechEcouteur({ fabrique: null });
    expect(e.isSupported()).toBe(false);
    expect(e.raison()).toBe("unsupported");
    e.ecouter(() => expect.fail("rien ne doit être entendu"));
    expect(e.ecoute()).toBe(false);
  });

  it("une phrase finale reconnue remonte le verdict, une seule fois", () => {
    const { Fausse, instances } = fausseFabrique();
    const e = new WebSpeechEcouteur({ fabrique: Fausse });
    const vus: string[] = [];
    e.ecouter((v) => vus.push(v));
    const reco = instances[0]!;
    expect(reco.continuous).toBe(true);
    expect(reco.interimResults).toBe(false);
    expect(reco.lang).toBe(ECOUTE_CONFIG.lang);
    reco.onresult!({ results: resultats([{ transcript: "c'est presque ça", confidence: 0.9 }]), resultIndex: 0 });
    expect(vus).toEqual(["partial"]);
  });

  it("une phrase NON finale ne valide rien : elle change encore", () => {
    const { Fausse, instances } = fausseFabrique();
    const e = new WebSpeechEcouteur({ fabrique: Fausse });
    const vus: string[] = [];
    e.ecouter((v) => vus.push(v));
    instances[0]!.onresult!({ results: resultats([{ transcript: "correct", confidence: 0.9 }], false), resultIndex: 0 });
    expect(vus).toEqual([]);
  });

  it("une proposition peu sûre est ignorée ; une confiance absente (0) ne veut pas dire mauvaise", () => {
    const { Fausse, instances } = fausseFabrique();
    const e = new WebSpeechEcouteur({ fabrique: Fausse });
    const vus: string[] = [];
    e.ecouter((v) => vus.push(v));
    instances[0]!.onresult!({ results: resultats([{ transcript: "faux", confidence: 0.1 }]), resultIndex: 0 });
    expect(vus).toEqual([]);
    instances[0]!.onresult!({ results: resultats([{ transcript: "faux", confidence: 0 }]), resultIndex: 0 });
    expect(vus).toEqual(["incorrect"]);
  });

  it("le silence relance l'écoute ; `arreter()` l'arrête pour de bon", () => {
    const { Fausse, instances } = fausseFabrique();
    const e = new WebSpeechEcouteur({ fabrique: Fausse });
    e.ecouter(() => {});
    instances[0]!.onend!();
    expect(instances.length).toBe(2);
    e.arreter();
    expect(e.ecoute()).toBe(false);
    instances[1]!.onend!();
    expect(instances.length).toBe(2);
  });

  it("un micro REFUSÉ est définitif : on ne redemande pas en boucle, et on dit pourquoi", () => {
    const { Fausse, instances } = fausseFabrique();
    const e = new WebSpeechEcouteur({ fabrique: Fausse });
    e.ecouter(() => {});
    instances[0]!.onerror!({ error: "not-allowed" });
    expect(e.raison()).toBe("denied");
    expect(e.isSupported()).toBe(false);
    e.ecouter(() => {});
    expect(instances.length).toBe(1);
  });
});
