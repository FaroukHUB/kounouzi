import { describe, expect, it } from "vitest";
import { NullNarrator, WebSpeechNarrator, cleVariante, rangDeTour, utteranceFor, varianteDe, type NarrationService } from "@/experience/narration";
import { fr } from "@/i18n/fr";
import { pid } from "../../fixtures/game/setup.fixture";
import { create, makeSetup } from "../../fixtures/game/setup.fixture";

describe("le guide bienveillant : à qui il parle, ce qu'il souligne, ce qu'il tait", () => {
  const { state } = create(makeSetup());

  it("s'adresse au joueur par son prénom, au tour comme au Chemin", () => {
    const tour = utteranceFor({ type: "TurnStarted", turnNumber: 1, playerId: pid("p1") }, state, "fr");
    expect(tour?.text).toContain("Joueur 1");
    expect(tour?.important).toBe(true);
    expect(utteranceFor({ type: "MovementAssigned", playerId: pid("p2"), steps: 4, journeyIndex: 0 }, state, "fr")?.text).toContain("Joueur 2");
    expect(utteranceFor({ type: "MovementAssigned", playerId: pid("p2"), steps: 4, journeyIndex: 0 }, state, "fr")?.text).toContain("4");
    // Une seule case a sa propre phrase : « 1 cases » ne se dit pas.
    expect(utteranceFor({ type: "MovementAssigned", playerId: pid("p2"), steps: 1, journeyIndex: 0 }, state, "fr")?.text).not.toContain("1 case");
  });

  it("change de formulation sans aucun hasard : le compteur de l'état décide, donc une partie rejouée dit les mêmes mots", () => {
    const au = (turnNumber: number) => utteranceFor({ type: "TurnStarted", turnNumber, playerId: pid("p1") }, { ...state, turnNumber }, "fr")?.text;
    const dits = [au(1), au(2), au(3)];
    expect(new Set(dits).size).toBeGreaterThan(1);
    // Même tour ⇒ exactement la même phrase.
    expect(au(2)).toBe(au(2));
    expect(varianteDe(0, 3)).toBe(1);
    expect(varianteDe(3, 3)).toBe(1);
    expect(cleVariante("narration.turn", 1)).toBe("narration.turn.2");

    // Piège évité : avec trois joueurs et trois formulations, prendre le numéro de tour
    // SEUL donnerait à chaque joueur toujours la même phrase (son reste modulo est constant).
    const pourUnSiege = (joueurs: number, siege: number) => [0, 1, 2, 3].map((tour) => varianteDe(rangDeTour(tour * joueurs + siege, joueurs), 3));
    for (const joueurs of [2, 3, 4, 5, 6]) {
      for (let siege = 0; siege < joueurs; siege += 1) expect(new Set(pourUnSiege(joueurs, siege)).size, `${joueurs} joueurs, siège ${siege}`).toBeGreaterThan(1);
    }
  });

  it("se tait sur l'arrivée : la carte qui s'ouvre juste après le dit déjà, en grand et en image", () => {
    expect(utteranceFor({ type: "CellArrived", playerId: pid("p1"), position: 2, cellType: "heritage" }, state, "fr")).toBeNull();
    expect(utteranceFor({ type: "CellArrived", playerId: pid("p1"), position: 1, cellType: "question" }, state, "fr")).toBeNull();
  });

  it("souligne les moments forts qui étaient muets : un établissement acquis, une bonne action offerte", () => {
    const acquis = utteranceFor({ type: "SiteAcquired", playerId: pid("p1"), siteId: "test-monument-01", price: 100, heritageValue: 120 }, state, "fr");
    expect(acquis?.text).toContain("Joueur 1");
    expect(acquis?.important).toBe(true);
    const hassanat = utteranceFor({ type: "HassanatGranted", playerId: pid("p1"), cardId: "c1", amount: 5, ref: "r", total: 5 }, state, "fr");
    expect(hassanat?.text).toContain("Joueur 1");
    expect(hassanat?.text).toContain("5");
  });

  it("quand on se trompe, il rassure : aucune phrase de résultat ne gronde", () => {
    for (const n of [0, 1, 2]) {
      const phrase = fr[cleVariante("narration.result.incorrect", n) as keyof typeof fr];
      expect(phrase).toBeTruthy();
      expect(phrase.toLowerCase()).not.toContain("faux");
      expect(phrase.toLowerCase()).not.toContain("perdu");
      expect(phrase).toContain("{name}");
    }
    for (const n of [0, 1, 2]) expect(fr[cleVariante("narration.result.correct", n) as keyof typeof fr]).toContain("{name}");
  });

  it("ne dit rien pour les événements hors périmètre Phase 3 (question, réponse, argent…)", () => {
    expect(utteranceFor({ type: "QuestionRequested", requestId: "q1", playerId: pid("p1"), position: 1, purpose: "standard" }, state, "fr")).toBeNull();
    expect(utteranceFor({ type: "MoneyChanged", transactionId: 1, playerId: pid("p1"), amount: 5, reason: "scenario_gain", balanceAfter: 5 }, state, "fr")).toBeNull();
  });

  it("accepte l'arabe comme langue cible (contenu réel en Phase 4+)", () => {
    expect(utteranceFor({ type: "TurnStarted", turnNumber: 1, playerId: pid("p1") }, state, "ar")?.lang).toBe("ar");
  });
});

describe("narrateurs", () => {
  it("le narrateur muet ne fait rien et n'est pas supporté", () => {
    const n: NarrationService = new NullNarrator();
    expect(n.isSupported()).toBe(false);
    expect(() => n.speak({ text: "x", lang: "fr" })).not.toThrow();
    expect(() => n.speakSequence([{ text: "x", lang: "fr" }])).not.toThrow();
    expect(n.hasVoice("ar")).toBe(false);
    expect(n.getAvailableVoices()).toEqual([]);
  });

  it("le narrateur Web Speech se dégrade proprement sans `speechSynthesis` (Node, rendu serveur)", () => {
    const n = new WebSpeechNarrator();
    expect(n.isSupported()).toBe(false);
    expect(() => {
      n.speak({ text: "Bonjour", lang: "fr", important: true });
      n.speakSequence([{ text: "Question : ?", lang: "fr", important: true }, { text: "Réponse A : oui", lang: "fr", important: true }]);
      n.replayLast();
      n.stop();
      n.setRate("fast");
      n.setEnabled(false);
    }).not.toThrow();
    expect(n.getAvailableVoices()).toEqual([]);
    expect(n.hasVoice("fr")).toBe(false);
    expect(n.hasVoice("ar")).toBe(false);
  });
});
