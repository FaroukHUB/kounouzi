import { describe, expect, it } from "vitest";
import { NullNarrator, WebSpeechNarrator, utteranceFor, type NarrationService } from "@/experience/narration";
import { pid } from "../../fixtures/game/setup.fixture";
import { create, makeSetup } from "../../fixtures/game/setup.fixture";

describe("script de narration (Phase 3 : tour, Chemin, arrivée, départ, dernier tour, fin)", () => {
  const { state } = create(makeSetup());

  it("annonce le changement de joueur et le Chemin en français", () => {
    expect(utteranceFor({ type: "TurnStarted", turnNumber: 1, playerId: pid("p1") }, state, "fr")).toEqual({ text: "C'est au tour de Joueur 1.", lang: "fr", important: true });
    expect(utteranceFor({ type: "MovementAssigned", playerId: pid("p2"), steps: 4, journeyIndex: 0 }, state, "fr")?.text).toBe("Joueur 2, ton chemin avance de 4 étapes.");
    expect(utteranceFor({ type: "MovementAssigned", playerId: pid("p2"), steps: 1, journeyIndex: 0 }, state, "fr")?.text).toBe("Joueur 2, ton chemin avance d'une étape.");
  });

  it("contextualise l'arrivée par type de case, sans lire aucun contenu", () => {
    expect(utteranceFor({ type: "CellArrived", playerId: pid("p1"), position: 2, cellType: "heritage" }, state, "fr")?.text).toBe("Tu es arrivé devant un monument.");
    expect(utteranceFor({ type: "CellArrived", playerId: pid("p1"), position: 1, cellType: "question" }, state, "fr")?.text).toBe("Tu es arrivé sur une case Savoir.");
  });

  it("ne dit rien pour les événements hors périmètre Phase 3 (question, réponse, argent…)", () => {
    expect(utteranceFor({ type: "QuestionRequested", requestId: "q1", playerId: pid("p1"), position: 1 }, state, "fr")).toBeNull();
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
    expect(n.getAvailableVoices()).toEqual([]);
  });

  it("le narrateur Web Speech se dégrade proprement sans `speechSynthesis` (Node, rendu serveur)", () => {
    const n = new WebSpeechNarrator();
    expect(n.isSupported()).toBe(false);
    expect(() => {
      n.speak({ text: "Bonjour", lang: "fr", important: true });
      n.replayLast();
      n.stop();
      n.setRate("fast");
      n.setEnabled(false);
    }).not.toThrow();
    expect(n.getAvailableVoices()).toEqual([]);
  });
});
