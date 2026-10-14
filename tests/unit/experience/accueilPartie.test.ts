import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { VOICE_CONFIG } from "@/config/narration";
import type { GameEvent } from "@/core/game";
import { listeDeNoms, utteranceFor } from "@/experience/narration";
import { t } from "@/i18n";
import { fr } from "@/i18n/fr";
import { ar } from "@/i18n/ar";
import { create, makeSetup, pid, players } from "../../fixtures/game/setup.fixture";

const root = fileURLToPath(new URL("../../../", import.meta.url));

/** Une partie créée avec ces prénoms, dans cet ordre de sièges. */
function partie(noms: readonly string[]) {
  const base = players(noms.length);
  const setup = makeSetup({ players: base.map((p, i) => ({ ...p, displayName: noms[i]! })) });
  return create(setup);
}

const accueil = (noms: readonly string[]) => {
  const { state, events } = partie(noms);
  const creation = events.find((e) => e.type === "GameCreated")!;
  return { phrase: utteranceFor(creation, state, "fr")?.text ?? "", events, state };
};

describe("accueil de partie — la première phrase que la famille entend", () => {
  it("la liste des prénoms se dit d'un seul souffle, de 1 à 6 joueurs", () => {
    expect(listeDeNoms(["Mariam"])).toBe("Mariam");
    expect(listeDeNoms(["Mariam", "Adam"])).toBe("Mariam et Adam");
    expect(listeDeNoms(["Mariam", "Adam", "Yasmine"])).toBe("Mariam, Adam et Yasmine");
    expect(listeDeNoms(["Mariam", "Adam", "Yasmine", "Abi"])).toBe("Mariam, Adam, Yasmine et Abi");
    expect(listeDeNoms(["A", "B", "C", "D", "E", "F"])).toBe("A, B, C, D, E et F");
  });

  it("un prénom vide est ignoré plutôt que de produire « Mariam,  et Adam »", () => {
    expect(listeDeNoms([])).toBe("");
    expect(listeDeNoms(["Mariam", "  ", "Adam"])).toBe("Mariam et Adam");
    expect(listeDeNoms(["  Mariam  "])).toBe("Mariam");
  });

  it("TOUS les joueurs sont nommés, dans l'ordre des sièges, aucun perdu", () => {
    const noms = ["Mariam", "Adam", "Yasmine", "Abi"];
    const { phrase } = accueil(noms);
    for (const n of noms) expect(phrase, `${n} manque`).toContain(n);
    // L'ordre compte : c'est celui du tour de table.
    const positions = noms.map((n) => phrase.indexOf(n));
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
    expect(phrase).toContain("Mariam, Adam, Yasmine et Abi");
  });

  it("la phrase est complète et naturelle, de 1 à 4 joueurs", () => {
    // Un seul joueur n'existe pas comme PARTIE — le moteur en exige deux au
    // minimum — mais la phrase doit rester correcte au singulier : c'est la
    // liste et le gabarit qu'on vérifie ici, pas une partie impossible.
    expect(t("fr", "narration.gameStart", { names: listeDeNoms(["Mariam"]) })).toContain("nous avons Mariam.");
    expect(accueil(["Mariam", "Adam"]).phrase).toContain("nous avons Mariam et Adam.");
    expect(accueil(["Mariam", "Adam", "Yasmine"]).phrase).toContain("nous avons Mariam, Adam et Yasmine.");
    const quatre = accueil(["Mariam", "Adam", "Yasmine", "Abi"]).phrase;
    expect(quatre.startsWith("As-salāmu ʿalaykum la famille !")).toBe(true);
    expect(quatre).toContain("Bienvenue dans Kounouzi !");
    expect(quatre).toContain("c’est parti !");
    // Aucun gabarit ne doit survivre dans la phrase dite.
    expect(quatre).not.toMatch(/\{[a-zA-Z]+\}/);
  });

  it("l'accueil n'est dit QU'UNE FOIS : un seul GameCreated, et rien d'autre ne le déclenche", () => {
    const { events, state } = partie(["Mariam", "Adam"]);
    expect(events.filter((e) => e.type === "GameCreated")).toHaveLength(1);
    // Aucun autre type d'événement ne produit la phrase d'accueil.
    const accueilFr = fr["narration.gameStart"].split("{names}")[0]!;
    for (const e of events.filter((x) => x.type !== "GameCreated")) {
      expect(utteranceFor(e as GameEvent, state, "fr")?.text ?? "", e.type).not.toContain(accueilFr);
    }
  });

  it("une reprise de partie ne rejoue aucun événement : l'accueil ne revient pas", () => {
    // C'est le magasin qui le garantit, pas un verrou dans la narration : on
    // vérifie donc que la règle est toujours écrite là où elle vit.
    const magasin = readFileSync(root + "src/state/gameStore.ts", "utf8");
    expect(magasin).toContain("aucune animation n'est rejouée");
    expect(magasin.slice(magasin.indexOf("load:") === -1 ? 0 : magasin.indexOf("load:"))).not.toContain("onEvents?.(result");
  });

  it("l'accueil ne peut PAS être pré-généré : il contient des prénoms", () => {
    expect(fr["narration.gameStart"]).toContain("{names}");
    expect(VOICE_CONFIG.phrases).not.toContain("narration.gameStart");
    // La garde est structurelle : aucune clé à gabarit n'est pré-générable.
    for (const cle of VOICE_CONFIG.phrases) expect((fr as Record<string, string>)[cle]!).not.toMatch(/\{[a-zA-Z]+\}/);
  });

  it("français et arabe gardent EXACTEMENT les mêmes clés", () => {
    expect(Object.keys(ar).sort()).toEqual(Object.keys(fr).sort());
    expect(ar["narration.gameStart"]).toContain("{names}");
  });
});

describe("tour et déplacement — les gabarits survivent à la réécriture", () => {
  it("les trois annonces de tour nomment toujours le joueur", () => {
    for (const cle of ["narration.turn.1", "narration.turn.2", "narration.turn.3"] as const) {
      expect(fr[cle], cle).toContain("{name}");
      expect(ar[cle], cle).toContain("{name}");
    }
  });

  it("les annonces de déplacement gardent le prénom ET le nombre de cases", () => {
    for (const cle of ["narration.journey.1", "narration.journey.2", "narration.journey.3"] as const) {
      expect(fr[cle], cle).toContain("{name}");
      expect(fr[cle], cle).toContain("{steps}");
    }
    // Une seule case : pas de « 1 cases », donc pas de `{steps}` — c'est voulu.
    expect(fr["narration.journeyOne"]).toContain("{name}");
    expect(fr["narration.journeyOne"]).not.toContain("{steps}");
  });

  it("le prénom et le nombre de cases arrivent vraiment dans la phrase dite", () => {
    const { state } = partie(["Mariam", "Adam"]);
    const tour: GameEvent = { type: "TurnStarted", turnNumber: 0, playerId: pid("p1") };
    expect(utteranceFor(tour, state, "fr")!.text).toContain("Mariam");
    const chemin: GameEvent = { type: "MovementAssigned", playerId: pid("p1"), steps: 4, journeyIndex: 0 };
    const dit = utteranceFor(chemin, state, "fr")!.text;
    expect(dit).toContain("Mariam");
    expect(dit).toContain("4");
    expect(dit).not.toMatch(/\{[a-zA-Z]+\}/);
    const une: GameEvent = { type: "MovementAssigned", playerId: pid("p1"), steps: 1, journeyIndex: 0 };
    expect(utteranceFor(une, state, "fr")!.text).toContain("Mariam");
  });
});
