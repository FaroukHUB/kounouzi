import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { playEvent, type AnimationActions } from "@/animation/player";
import { REDUCED_TIMINGS } from "@/animation/timings";
import { NullNarrator, utteranceFor } from "@/experience/narration";
import { ChallengeCard } from "@/ui/cards/ChallengeCard";
import { cardForPhase, type CardState } from "@/ui/cards/cardState";
import { challengesFixture } from "../../fixtures/game/challenges.fixture";
import { scenariosOf } from "../../fixtures/game/scenarios.fixture";
import { create, journey, makeLineSetup, pid, run } from "../../fixtures/game/setup.fixture";

const narrator = new NullNarrator();
const players = [
  { id: pid("maryam"), displayName: "Maryam", profileType: "child" as const, age: 6 },
  { id: pid("papa"), displayName: "Papa", profileType: "adult" as const },
];

describe("carte Défi famille (rendu statique)", () => {
  const landed = journey(create(makeLineSetup({ cells: { 1: "challenge" }, scenarios: scenariosOf("challenge-family"), players, challenges: challengesFixture() })).state);
  const base = cardForPhase(landed.state) as Extract<CardState, { kind: "challenge" }>;
  const definition = landed.state.config.challenges.definitions.find((d) => d.id === base.challengeId)!;
  const render = (card: Extract<CardState, { kind: "challenge" }>, state = landed.state) => renderToStaticMarkup(<ChallengeCard state={state} card={card} narrator={narrator} reduced={true} onUpdate={() => {}} onAccept={() => {}} onComplete={() => {}} onSkip={() => {}} />);

  it("révélation : texte du défi, gain, variante d'âge pour l'enfant, J'accepte / Je passe", () => {
    const html = render({ ...base, step: "reveal" });
    expect(html).toContain('data-testid="challenge-text"');
    expect(html).toContain(definition.text.replace(/'/g, "&#x27;").replace(/’/g, "’"));
    expect(html).toContain('data-testid="challenge-accept"');
    expect(html).toContain('data-testid="challenge-skip"');
    expect(html).toContain('data-testid="challenge-stake"');
    expect(html).not.toContain('data-testid="challenge-ohno"');
  });

  it("« OH NOOON… » s'affiche avant la révélation d'une carte ohNo, puis la révélation ; un défi de contact propose « Pas d'accord »", () => {
    expect(render({ ...base, step: "ohno" })).toContain("OH NOOON");
    const contact = landed.state.config.challenges.definitions.find((d) => d.consentRequired)!;
    const html = render({ ...base, challengeId: contact.id, step: "reveal" });
    expect(html).toContain('data-testid="challenge-consent"');
    expect(html).toContain('data-testid="challenge-consent-refused"');
  });

  it("accepté : Réussi / Raté ; résultat et gain affichés ensuite", () => {
    const accepted = run(landed.state, { type: "AcceptChallenge", playerId: pid("maryam") });
    expect(cardForPhase(accepted.state)).toMatchObject({ kind: "challenge", step: "accepted" });
    const html = render({ ...base, step: "accepted" }, accepted.state);
    expect(html).toContain('data-testid="challenge-success"');
    expect(html).toContain('data-testid="challenge-failure"');
    expect(render({ ...base, step: "result", success: true })).toContain("Défi réussi");
    expect(render({ ...base, step: "result", skipped: "declined" })).toContain("sans souci");
    expect(render({ ...base, step: "reward", rewardAmount: 15 })).toContain("+15");
  });

  it("le rejoueur ouvre la carte à l'assignation (« OH NON » puis révélation), la fait progresser et la narration reste courte", async () => {
    const calls: string[] = [];
    const actions: AnimationActions = {
      setPawn: () => {},
      setHighlight: () => {},
      setArrival: () => {},
      revealJourney: () => {},
      hideJourney: () => {},
      setBanner: () => {},
      openCard: (c) => calls.push(`open:${c.kind}:${"step" in c ? c.step : ""}`),
      updateCard: (p) => calls.push(`update:${"step" in p ? p.step : ""}`),
      closeCard: () => calls.push("close"),
    };
    const sleep = () => Promise.resolve();
    await playEvent({ type: "FamilyChallengeAssigned", playerId: pid("maryam"), challengeId: "CH-005", requestId: "q1", category: "movement", reward: 10, ohNo: true, consentRequired: false }, actions, REDUCED_TIMINGS, sleep);
    await playEvent({ type: "FamilyChallengeAccepted", playerId: pid("maryam"), challengeId: "CH-005" }, actions, REDUCED_TIMINGS, sleep);
    await playEvent({ type: "FamilyChallengeCompleted", playerId: pid("maryam"), challengeId: "CH-005", success: true }, actions, REDUCED_TIMINGS, sleep);
    await playEvent({ type: "ChallengeRewardGranted", playerId: pid("maryam"), challengeId: "CH-005", amount: 10 }, actions, REDUCED_TIMINGS, sleep);
    expect(calls).toEqual(["open:challenge:ohno", "update:reveal", "update:reveal", "update:accepted", "update:result", "update:reward"]);
    expect(utteranceFor({ type: "FamilyChallengeAssigned", playerId: pid("maryam"), challengeId: "CH-005", requestId: "q1", category: "movement", reward: 10, ohNo: true, consentRequired: false }, landed.state, "fr")?.text).toBe("Oh non ! Défi famille pour Maryam !");
    expect(utteranceFor({ type: "FamilyChallengeSkipped", playerId: pid("maryam"), challengeId: "CH-005", reason: "declined" }, landed.state, "fr")?.text).toBe("Défi passé, sans souci.");
  });
});
