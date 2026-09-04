import { describe, expect, it } from "vitest";
import { estimateDuration, playEvent, type AnimationActions } from "@/animation/player";
import { DEFAULT_TIMINGS, REDUCED_TIMINGS, resolveTimings, safetyTimeout } from "@/animation/timings";
import type { GameEvent } from "@/core/game";
import type { PlayerId } from "@/core/shared";

function recorder() {
  const calls: string[] = [];
  const actions: AnimationActions = {
    setPawn: (id, pos) => calls.push(`pawn:${id}:${pos}`),
    setHighlight: (pos) => calls.push(`hl:${pos}`),
    setArrival: (pos) => calls.push(`arr:${pos}`),
    revealJourney: (id, steps) => calls.push(`reveal:${id}:${steps}`),
    hideJourney: () => calls.push("hide"),
    setBanner: (b) => calls.push(`banner:${b ? b.kind : "null"}`),
    openCard: (c) => calls.push(`card:${c.kind}${"step" in c ? ":" + c.step : ""}`),
    updateCard: (patch) => calls.push(`card~${JSON.stringify(patch)}`),
    closeCard: () => calls.push("card:close"),
  };
  return { calls, actions };
}
/** Les durées nulles se résolvent tout de suite ; le délai de sécurité (> 0) n'expire jamais ici. */
const instant = (ms: number) => (ms === 0 ? Promise.resolve() : new Promise<void>(() => {}));
const p1 = "p1" as PlayerId;

describe("rejoueur d'événements (file d'animation)", () => {
  it("rejoue PawnMoved case par case depuis le chemin du moteur, sans le recalculer", async () => {
    const { calls, actions } = recorder();
    const event: GameEvent = { type: "PawnMoved", playerId: p1, from: 7, to: 11, path: [8, 9, 10, 11] };
    await playEvent(event, actions, REDUCED_TIMINGS, instant);
    expect(calls).toEqual(["pawn:p1:8", "hl:8", "pawn:p1:9", "hl:9", "pawn:p1:10", "hl:10", "pawn:p1:11", "hl:11", "hl:null", "pawn:p1:11", "hl:null"]);
  });

  it("dévoile le Chemin avec la valeur attribuée par le moteur", async () => {
    const { calls, actions } = recorder();
    await playEvent({ type: "MovementAssigned", playerId: p1, steps: 4, journeyIndex: 0 }, actions, REDUCED_TIMINGS, instant);
    expect(calls).toEqual(["reveal:p1:4", "hide", "hide"]);
  });

  it("affiche puis retire les bandeaux (tour, tour sauté, passage par le départ, dernier tour)", async () => {
    const { calls, actions } = recorder();
    await playEvent({ type: "TurnStarted", turnNumber: 1, playerId: p1 }, actions, REDUCED_TIMINGS, instant);
    await playEvent({ type: "PassedStart", playerId: p1, bonus: 100 }, actions, REDUCED_TIMINGS, instant);
    await playEvent({ type: "TimeTargetReached", activePlaySeconds: 60 }, actions, REDUCED_TIMINGS, instant);
    expect(calls).toEqual(["banner:turn", "banner:null", "banner:null", "banner:passed_start", "banner:null", "banner:null", "banner:last_round", "banner:null", "banner:null"]);
  });

  it("ignore les événements sans rendu visuel propre", async () => {
    const { calls, actions } = recorder();
    await playEvent({ type: "MoneyChanged", transactionId: 1, playerId: p1, amount: 5, reason: "scenario_gain", balanceAfter: 5 }, actions, REDUCED_TIMINGS, instant);
    expect(calls).toEqual([]);
  });

  it("ne bloque jamais : une animation qui ne se termine pas est coupée par le délai de sécurité et l'état visuel final est garanti", async () => {
    const { calls, actions } = recorder();
    const never = () => new Promise<void>(() => {});
    let budgetSleeps = 0;
    const sleep = (ms: number) => {
      // Les pas d'animation « pendent » ; seul le délai de sécurité se résout.
      if (ms === safetyTimeout(DEFAULT_TIMINGS.stepMs * 2)) {
        budgetSleeps += 1;
        return Promise.resolve();
      }
      return never();
    };
    await playEvent({ type: "PawnMoved", playerId: p1, from: 0, to: 2, path: [1, 2] }, actions, DEFAULT_TIMINGS, sleep);
    expect(budgetSleeps).toBe(1);
    expect(calls.at(-2)).toBe("pawn:p1:2");
    expect(calls.at(-1)).toBe("hl:null");
  });

  it("ouvre les cartes sur demande du moteur et les fait progresser sur ses réponses", async () => {
    const { calls, actions } = recorder();
    await playEvent({ type: "QuestionRequested", requestId: "q3", playerId: p1, position: 1, purpose: "standard" }, actions, REDUCED_TIMINGS, instant);
    await playEvent({ type: "AnswerRecorded", requestId: "q3", playerId: p1, outcome: "correct", explanationMastery: "fr", validationMode: "collective", purpose: "standard" }, actions, REDUCED_TIMINGS, instant);
    await playEvent({ type: "RewardGranted", requestId: "q3", playerId: p1, base: 50, multiplier: 2, bonus: 0, amount: 100 }, actions, REDUCED_TIMINGS, instant);
    await playEvent({ type: "TurnEnded", turnNumber: 1, playerId: p1 }, actions, REDUCED_TIMINGS, instant);
    expect(calls).toEqual(["card:question:dealt", 'card~{"step":"result","outcome":"correct"}', 'card~{"step":"reward","rewardAmount":100,"multiplier":2}', "card:close", "card:close"]);
  });

  it("ouvre la carte monument avec l'offre du moteur, puis la carte choix ; un scénario se révèle puis se referme", async () => {
    const { calls, actions } = recorder();
    await playEvent({ type: "PurchaseOffered", playerId: p1, siteId: "s1", price: 300, affordable: false }, actions, REDUCED_TIMINGS, instant);
    await playEvent({ type: "ChoiceOffered", playerId: p1, choiceId: "c", optionIds: ["a", "b"] }, actions, REDUCED_TIMINGS, instant);
    await playEvent({ type: "ScenarioTriggered", playerId: p1, scenarioId: "demo-event-gain", cellType: "event", visit: 1 }, actions, REDUCED_TIMINGS, instant);
    expect(calls).toEqual(["card:monument:offer", "card:choice:offer", "card:scenario", "card:close", "card:close"]);
  });

  it("le mode réduit garde la même séquence avec des durées nulles", () => {
    expect(resolveTimings(true)).toEqual(REDUCED_TIMINGS);
    expect(resolveTimings(false)).toEqual(DEFAULT_TIMINGS);
    expect(Object.values(REDUCED_TIMINGS).every((v) => v === 0)).toBe(true);
    expect(estimateDuration({ type: "PawnMoved", playerId: p1, from: 0, to: 3, path: [1, 2, 3] }, DEFAULT_TIMINGS)).toBe(3 * DEFAULT_TIMINGS.stepMs);
  });
});
