import { describe, expect, it } from "vitest";
import { createGame, deserializeGameState, duelWinner, reduce, serializeGameState, type GameState, type Scenario } from "@/core/game";
import type { AnswerOutcome } from "@/core/shared";
import { TEST_MONUMENTS } from "../../fixtures/game/heritage.fixture";
import { TEST_RULES_SCENARIO_TREASURE } from "../../fixtures/game/rules.fixture";
import { scenariosOf } from "../../fixtures/game/scenarios.fixture";
import { active, advanceUntil, answer, create, eventsOf, journey, makeLineSetup, makeSetup, pid, players, responder, run } from "../../fixtures/game/setup.fixture";

/** Un plateau où la case 1 porte le type voulu et le premier Chemin y mène. */
const landOn = (cellType: "event" | "management" | "challenge" | "solidarity" | "treasure" | "halt" | "heritage", scenarios: readonly Scenario[] = [], n = 3, cells: Record<number, "question" | "event" | "heritage" | "halt"> = {}) =>
  journey(create(makeLineSetup({ cells: { 1: cellType, ...cells }, scenarios, players: players(n) })).state);

const roundTrip = (state: GameState) => {
  const back = deserializeGameState(serializeGameState(state));
  expect(back.ok).toBe(true);
  if (back.ok) expect(back.value).toEqual(state);
};

describe("Duel Kounouzi", () => {
  it("compare uniquement correct > presque > incorrect (jamais la vitesse ni la maîtrise de l'explication)", () => {
    const m = pid("maryam");
    const p = pid("papa");
    const cases: readonly [AnswerOutcome, AnswerOutcome, string | null][] = [
      ["correct", "incorrect", m],
      ["correct", "correct", null],
      ["partial", "incorrect", m],
      ["incorrect", "correct", p],
      ["incorrect", "partial", p],
      ["partial", "partial", null],
    ];
    for (const [a, b, winner] of cases) expect(duelWinner(m, a, p, b)).toBe(winner);
  });

  it("le défieur choisit son adversaire ; chacun répond à SA demande ; la maîtrise ne départage pas ; les deux mémoires reçoivent un essai", () => {
    const offered = landOn("challenge", scenariosOf("challenge-duel"));
    expect(offered.state.phase).toMatchObject({ kind: "awaiting_duel_opponent", candidates: [pid("p2"), pid("p3")] });
    expect(eventsOf(offered.events, "DuelOffered")[0]).toMatchObject({ challengerId: pid("p1") });
    expect(reduce(offered.state, { type: "ChooseOpponent", playerId: pid("p1"), opponentId: pid("p1") })).toMatchObject({ ok: false, error: { code: "INVALID_OPPONENT" } });

    const started = run(offered.state, { type: "ChooseOpponent", playerId: pid("p1"), opponentId: pid("p3") });
    expect(started.state.phase).toMatchObject({ kind: "awaiting_duel", duel: { challengerId: pid("p1"), opponentId: pid("p3"), stage: "challenger", categoryId: null } });
    expect(eventsOf(started.events, "QuestionRequested")[0]).toMatchObject({ playerId: pid("p1"), purpose: "duel" });
    roundTrip(started.state);
    const duel = started.state.phase.kind === "awaiting_duel" ? started.state.phase.duel : null;
    if (!duel) throw new Error("duel");

    // L'adversaire ne peut pas répondre à la place du défieur.
    expect(reduce(started.state, { type: "SubmitAnswer", playerId: pid("p3"), requestId: duel.challengerRequestId, answer: answer("correct") })).toMatchObject({ ok: false, error: { code: "NOT_ACTIVE_PLAYER", expected: pid("p1") } });
    expect(responder(started.state)).toBe(pid("p1"));

    const first = run(started.state, { type: "SubmitAnswer", playerId: pid("p1"), requestId: duel.challengerRequestId, answer: answer("correct", "both") });
    expect(eventsOf(first.events, "AnswerRecorded")[0]).toMatchObject({ playerId: pid("p1"), outcome: "correct", explanationMastery: "both", purpose: "duel" });
    expect(eventsOf(first.events, "RewardGranted")[0]).toMatchObject({ playerId: pid("p1"), amount: 100 }); // ×2 individuel conservé
    expect(first.state.phase).toMatchObject({ kind: "awaiting_duel", duel: { stage: "opponent", challengerOutcome: "correct" } });
    expect(eventsOf(first.events, "DuelTurn")[0]).toMatchObject({ duelistId: pid("p3") });
    expect(responder(first.state)).toBe(pid("p3"));
    roundTrip(first.state);

    // Papa (p3) répond correct sans maîtrise : ÉGALITÉ malgré la maîtrise AR de Maryam.
    const second = run(first.state, { type: "SubmitAnswer", playerId: pid("p3"), requestId: duel.opponentRequestId, answer: answer("correct") });
    const resolved = eventsOf(second.events, "DuelResolved")[0]!;
    expect(resolved).toMatchObject({ challengerId: pid("p1"), opponentId: pid("p3"), challengerOutcome: "correct", opponentOutcome: "correct", winnerId: null });
    expect(second.state.ledger.filter((t) => t.reason === "duel_reward").map((t) => [t.playerId, t.amount])).toEqual([
      [pid("p1"), 20],
      [pid("p3"), 20],
    ]);
    expect(eventsOf(second.events, "AnswerRecorded").map((e) => e.playerId)).toEqual([pid("p3")]);
    expect(active(second.state)).toBe(pid("p2"));
  });

  it.each([
    ["correct", "incorrect", "p1"],
    ["correct", "correct", null],
    ["partial", "incorrect", "p1"],
    ["incorrect", "correct", "p3"],
  ] as const)("enfant %s / adulte %s → vainqueur %s, bonus configurés", (child, adult, winner) => {
    const offered = landOn("challenge", scenariosOf("challenge-duel"));
    const started = run(offered.state, { type: "ChooseOpponent", playerId: pid("p1"), opponentId: pid("p3") });
    const duel = started.state.phase.kind === "awaiting_duel" ? started.state.phase.duel : null;
    if (!duel) throw new Error("duel");
    const done = run(run(started.state, { type: "SubmitAnswer", playerId: pid("p1"), requestId: duel.challengerRequestId, answer: answer(child) }).state, { type: "SubmitAnswer", playerId: pid("p3"), requestId: duel.opponentRequestId, answer: answer(adult) });
    expect(eventsOf(done.events, "DuelResolved")[0]!.winnerId).toBe(winner ? pid(winner) : null);
    const rewards = Object.fromEntries(done.state.ledger.filter((t) => t.reason === "duel_reward").map((t) => [t.playerId, t.amount]));
    if (winner) expect(rewards).toEqual({ [pid(winner)]: 60 });
    else expect(rewards).toEqual({ p1: 20, p3: 20 });
  });

  it("les deux questions d'un Duel doivent appartenir à la même catégorie (refus sinon)", () => {
    const started = run(landOn("challenge", scenariosOf("challenge-duel")).state, { type: "ChooseOpponent", playerId: pid("p1"), opponentId: pid("p2") });
    const duel = started.state.phase.kind === "awaiting_duel" ? started.state.phase.duel : null;
    if (!duel) throw new Error("duel");
    const q = (categoryId: string) => ({ ref: { origin: "curated" as const, questionId: `x-${categoryId}`, contentVersion: 1 }, categoryId, knowledgeNodeId: "n", difficulty: 2, audienceScope: "all" as const, prompt: { fr: "?", ar: "؟" }, answer: { fr: "a", ar: "ب" }, explanation: { fr: "e", ar: "ش" }, sources: [], review: { ar: "reviewed" as const } });
    const served = run(started.state, { type: "ServeQuestion", requestId: duel.challengerRequestId, question: q("maths") });
    expect(served.state.phase).toMatchObject({ kind: "awaiting_duel", duel: { categoryId: "maths" } });
    expect(reduce(served.state, { type: "ServeQuestion", requestId: duel.challengerRequestId, question: q("maths") })).toMatchObject({ ok: false, error: { code: "QUESTION_ALREADY_SERVED" } });
    const answered = run(served.state, { type: "SubmitAnswer", playerId: pid("p1"), requestId: duel.challengerRequestId, answer: answer("correct") });
    expect(reduce(answered.state, { type: "ServeQuestion", requestId: duel.opponentRequestId, question: q("arabic") })).toMatchObject({ ok: false, error: { code: "DUEL_CATEGORY_MISMATCH", expected: "maths" } });
    const ok = run(answered.state, { type: "ServeQuestion", requestId: duel.opponentRequestId, question: q("maths") });
    expect(ok.state.phase).toMatchObject({ kind: "awaiting_duel", duel: { opponentServed: { categoryId: "maths" } } });
    // Reprise en plein Duel : Maryam a répondu, Papa attend encore — rien n'est redistribué.
    const restored = deserializeGameState(serializeGameState(ok.state));
    expect(restored.ok && restored.value.phase.kind === "awaiting_duel" ? restored.value.phase.duel : null).toMatchObject({ stage: "opponent", challengerOutcome: "correct", challengerServed: { categoryId: "maths" }, opponentServed: { categoryId: "maths" } });
  });

  it("FamilyAssist activé ou non : mêmes réponses ⇒ même Duel, même vainqueur, mêmes événements", () => {
    const play = (familyAssist?: { enabled: boolean; assistedPlayers: { playerId: ReturnType<typeof pid>; level: "subtle" }[] }) => {
      const s = journey(create(makeLineSetup({ cells: { 1: "challenge" }, scenarios: scenariosOf("challenge-duel"), players: players(3), ...(familyAssist ? { familyAssist } : {}) })).state);
      const started = run(s.state, { type: "ChooseOpponent", playerId: pid("p1"), opponentId: pid("p2") });
      const duel = started.state.phase.kind === "awaiting_duel" ? started.state.phase.duel : null;
      if (!duel) throw new Error("duel");
      const a = run(started.state, { type: "SubmitAnswer", playerId: pid("p1"), requestId: duel.challengerRequestId, answer: answer("incorrect") });
      return run(a.state, { type: "SubmitAnswer", playerId: pid("p2"), requestId: duel.opponentRequestId, answer: answer("partial") }).events;
    };
    expect(play({ enabled: true, assistedPlayers: [{ playerId: pid("p1"), level: "subtle" }] })).toEqual(play());
  });
});

describe("Halte du voyage", () => {
  it("à l'arrivée : halted ; au tour suivant, Correct ou Presque lève la Halte et le Chemin part tout de suite", () => {
    const halted = landOn("halt", [], 2);
    expect(eventsOf(halted.events, "JourneyHalted")).toEqual([{ type: "JourneyHalted", playerId: pid("p1"), position: 1 }]);
    expect(halted.state.players[0]!.halted).toBe(true);
    expect(active(halted.state)).toBe(pid("p2"));
    roundTrip(halted.state);
    const back = advanceUntil(halted.state, (s) => active(s) === pid("p1"));
    expect(back.state.phase).toMatchObject({ kind: "awaiting_answer", purpose: { kind: "halt" } });
    expect(eventsOf(back.events, "QuestionRequested").at(-1)).toMatchObject({ playerId: pid("p1"), purpose: "halt" });
    roundTrip(back.state);
    const requestId = back.state.phase.kind === "awaiting_answer" ? back.state.phase.requestId : "";
    expect(reduce(back.state, { type: "StartJourney", playerId: pid("p1") })).toMatchObject({ ok: false, error: { code: "INVALID_PHASE" } });
    const lifted = run(back.state, { type: "SubmitAnswer", playerId: pid("p1"), requestId, answer: answer("partial") });
    expect(eventsOf(lifted.events, "HaltLifted")).toEqual([{ type: "HaltLifted", playerId: pid("p1"), outcome: "partial" }]);
    expect(eventsOf(lifted.events, "AnswerRecorded")[0]).toMatchObject({ purpose: "halt", outcome: "partial" });
    expect(lifted.state.phase).toEqual({ kind: "awaiting_journey" });
    expect(lifted.state.players[0]!.halted).toBe(false);
    expect(active(lifted.state)).toBe(pid("p1"));
    expect(eventsOf(journey(lifted.state).events, "MovementAssigned")).toHaveLength(1);
  });

  it("Incorrect : tour consommé sans Chemin, Halte levée — personne ne reste bloqué plusieurs tours", () => {
    const halted = landOn("halt", [], 2);
    const back = advanceUntil(halted.state, (s) => active(s) === pid("p1"));
    const requestId = back.state.phase.kind === "awaiting_answer" ? back.state.phase.requestId : "";
    const lost = run(back.state, { type: "SubmitAnswer", playerId: pid("p1"), requestId, answer: answer("incorrect") });
    expect(eventsOf(lost.events, "HaltTurnLost")).toEqual([{ type: "HaltTurnLost", playerId: pid("p1") }]);
    expect(eventsOf(lost.events, "MovementAssigned")).toHaveLength(0);
    expect(eventsOf(lost.events, "TurnEnded")[0]).toMatchObject({ playerId: pid("p1") });
    expect(lost.state.players[0]!).toMatchObject({ halted: false, turnsPlayed: 2, journeysTaken: 1 });
    expect(active(lost.state)).toBe(pid("p2"));
    const again = advanceUntil(lost.state, (s) => active(s) === pid("p1"));
    expect(again.state.phase).toEqual({ kind: "awaiting_journey" });
  });
});

describe("visite de patrimoine et Défi Patrimoine", () => {
  const monument = TEST_MONUMENTS[0]!;
  const visit = () => {
    const bought = run(landOn("heritage", [], 2).state, { type: "DecidePurchase", playerId: pid("p1"), siteId: monument.id, buy: true });
    return journey(bought.state); // p2 visite le monument de p1
  };

  it.each([
    ["correct", 25],
    ["partial", 50],
    ["incorrect", 100],
  ] as const)("réponse %s → contribution %i du visiteur au propriétaire, tracée comme UN transfert", (outcome, amount) => {
    const v = visit();
    roundTrip(v.state);
    const requestId = v.state.phase.kind === "awaiting_answer" ? v.state.phase.requestId : "";
    const paid = run(v.state, { type: "SubmitAnswer", playerId: pid("p2"), requestId, answer: answer(outcome) });
    expect(eventsOf(paid.events, "AnswerRecorded")[0]).toMatchObject({ purpose: "heritage_visit" });
    expect(eventsOf(paid.events, "RewardGranted")).toHaveLength(0);
    expect(eventsOf(paid.events, "MoneyTransferred")).toEqual([{ type: "MoneyTransferred", transferId: "t1", fromPlayerId: pid("p2"), toPlayerId: pid("p1"), requested: amount, amount, reason: "heritage_contribution" }]);
    expect(paid.state.players[1]!.money).toBe(1000 - amount);
    expect(paid.state.players[0]!.money).toBe(700 + amount);
    expect(paid.state.ledger.slice(-2).map((t) => [t.playerId, t.amount, t.reason, t.ref])).toEqual([
      [pid("p2"), -amount, "transfer_sent", "t1"],
      [pid("p1"), amount, "transfer_received", "t1"],
    ]);
  });

  it("un visiteur sans argent contribue ce qu'il a (cap_to_balance), jamais un solde négatif", () => {
    const setup = makeLineSetup({ cells: { 1: "heritage" }, players: players(2), rules: { ...makeSetup().rules, startingMoney: 300 } });
    const bought = run(journey(create(setup).state).state, { type: "DecidePurchase", playerId: pid("p1"), siteId: monument.id, buy: true });
    const v = journey(bought.state);
    const drained = { ...v.state, players: v.state.players.map((p) => (p.id === pid("p2") ? { ...p, money: 40 } : p)), ledger: [...v.state.ledger, { id: v.state.ledger.length + 1, turnNumber: 2, playerId: pid("p2"), amount: -260, reason: "scenario_loss" as const, balanceAfter: 40 }], counters: { ...v.state.counters, transaction: v.state.ledger.length + 1 } };
    const requestId = drained.phase.kind === "awaiting_answer" ? drained.phase.requestId : "";
    const paid = run(drained, { type: "SubmitAnswer", playerId: pid("p2"), requestId, answer: answer("incorrect") });
    expect(eventsOf(paid.events, "MoneyTransferred")[0]).toMatchObject({ requested: 100, amount: 40 });
    expect(paid.state.players[1]!.money).toBe(0);
  });
});

describe("transferts, solidarité et politiques d'argent insuffisant", () => {
  it("partage : le joueur choisit un destinataire ; le transfert est tracé ; un cadeau n'est pas une action de solidarité", () => {
    const r = landOn("event", scenariosOf("event-share"));
    expect(r.state.phase).toMatchObject({ kind: "awaiting_recipient", amount: 50, reason: "gift", candidates: [pid("p2"), pid("p3")] });
    roundTrip(r.state);
    expect(reduce(r.state, { type: "ChooseRecipient", playerId: pid("p1"), recipientId: pid("p1") })).toMatchObject({ ok: false, error: { code: "INVALID_RECIPIENT" } });
    const given = run(r.state, { type: "ChooseRecipient", playerId: pid("p1"), recipientId: pid("p3") });
    expect(eventsOf(given.events, "MoneyTransferred")[0]).toMatchObject({ fromPlayerId: pid("p1"), toPlayerId: pid("p3"), amount: 50, reason: "gift" });
    expect(given.state.players.map((p) => p.money)).toEqual([950, 1000, 1050]);
    expect(eventsOf(given.events, "SolidarityActionRecorded")).toHaveLength(0);
  });

  it("don solidaire au plus faible : va au joueur qui a le moins d'argent (départage par siège) et compte comme solidarité", () => {
    const base = create(makeLineSetup({ cells: { 1: "solidarity" }, scenarios: scenariosOf("solidarity-poorest"), players: players(3) })).state;
    const uneven = { ...base, players: base.players.map((p) => (p.id === pid("p3") ? { ...p, money: 400 } : p)), ledger: [...base.ledger, { id: 4, turnNumber: 1, playerId: pid("p3"), amount: -600, reason: "scenario_loss" as const, balanceAfter: 400 }], counters: { ...base.counters, transaction: 4 } };
    const r = journey(uneven);
    expect(eventsOf(r.events, "MoneyTransferred")[0]).toMatchObject({ fromPlayerId: pid("p1"), toPlayerId: pid("p3"), amount: 80, reason: "solidarity" });
    expect(eventsOf(r.events, "SolidarityActionRecorded")[0]).toMatchObject({ playerId: pid("p1"), beneficiaryId: pid("p3"), amount: 80 });
    expect(r.state.players[0]).toMatchObject({ solidarityActions: 1, solidarityGiven: 80 });
  });

  it("caisse solidaire : chacun contribue au plus faible ; coup de main : le plus riche aide le moins riche", () => {
    const base = create(makeLineSetup({ cells: { 1: "event" }, scenarios: scenariosOf("event-collective", "event-helping-hand"), players: players(3) })).state;
    const uneven = { ...base, players: base.players.map((p) => (p.id === pid("p2") ? { ...p, money: 100 } : p.id === pid("p3") ? { ...p, money: 2000 } : p)), ledger: [...base.ledger, { id: 4, turnNumber: 1, playerId: pid("p2"), amount: -900, reason: "scenario_loss" as const, balanceAfter: 100 }, { id: 5, turnNumber: 1, playerId: pid("p3"), amount: 1000, reason: "scenario_gain" as const, balanceAfter: 2000 }], counters: { ...base.counters, transaction: 5 } };
    const fund = journey(uneven);
    expect(eventsOf(fund.events, "MoneyTransferred").map((e) => [e.fromPlayerId, e.toPlayerId, e.amount])).toEqual([
      [pid("p1"), pid("p2"), 50],
      [pid("p3"), pid("p2"), 50],
    ]);
    expect(fund.state.players[1]!.money).toBe(200);
    const hand = journey(fund.state); // p2 (visite 2) → coup de main : p3 (le plus riche) aide p2
    expect(eventsOf(hand.events, "MoneyTransferred")[0]).toMatchObject({ fromPlayerId: pid("p3"), toPlayerId: pid("p2"), amount: 100, reason: "aid" });
    expect(hand.state.players[2]!).toMatchObject({ solidarityActions: 2, solidarityGiven: 150 });
  });

  it("une perte « cancel_if_insufficient » est annulée sans rien débiter ; « cap_to_balance » prend ce qui existe", () => {
    const poor = { ...makeSetup().rules, startingMoney: 50 };
    const cancelled = journey(create(makeLineSetup({ cells: { 1: "event" }, scenarios: scenariosOf("event-hard-journey-cancel"), rules: poor })).state);
    expect(eventsOf(cancelled.events, "OutcomeCancelled")[0]).toMatchObject({ kind: "money", required: 80, available: 50 });
    expect(cancelled.state.players[0]!.money).toBe(50);
    const capped = journey(create(makeLineSetup({ cells: { 1: "event" }, scenarios: scenariosOf("event-loss"), rules: poor })).state);
    expect(capped.state.players[0]!.money).toBe(0);
  });

  it("une option « require_full_amount » est refusée sans modifier l'état si le joueur ne peut pas payer", () => {
    const poor = { ...makeSetup().rules, startingMoney: 50 };
    const r = journey(create(makeLineSetup({ cells: { 1: "management" }, scenarios: scenariosOf("management-invest"), rules: poor })).state);
    expect(reduce(r.state, { type: "Choose", playerId: pid("p1"), choiceId: "management-invest", optionId: "invest" })).toEqual({ ok: false, error: { code: "INSUFFICIENT_FUNDS", required: 100, available: 50 } });
    expect(run(r.state, { type: "Choose", playerId: pid("p1"), choiceId: "management-invest", optionId: "pass" }).state.players[0]!.money).toBe(50);
  });

  it("le schéma refuse une perte sans politique déclarée (aucun comportement implicite)", () => {
    const bad = { id: "bad", cellType: "event" as const, outcomes: [{ kind: "money" as const, amount: -10 }] };
    const result = createGame(makeLineSetup({ scenarios: [bad] }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("INVALID_CONFIG");
  });
});

describe("gestion : investissement, épargne, protection, choix immédiat ou futur", () => {
  it("investir : débit immédiat ; la prochaine réponse décide du versement (aucun hasard)", () => {
    const r = journey(create(makeLineSetup({ cells: { 1: "management", 2: "question" }, scenarios: scenariosOf("management-invest"), players: players(2) })).state);
    const invested = run(r.state, { type: "Choose", playerId: pid("p1"), choiceId: "management-invest", optionId: "invest" });
    expect(invested.state.players[0]!.money).toBe(900);
    expect(invested.state.effects[0]).toMatchObject({ playerId: pid("p1"), spec: { type: "investment_pending" }, queuedAtTurn: 1 });
    roundTrip(invested.state);
    const asked = advanceUntil(invested.state, (s) => active(s) === pid("p1") && s.phase.kind === "awaiting_answer");
    const requestId = asked.state.phase.kind === "awaiting_answer" ? asked.state.phase.requestId : "";
    const won = run(asked.state, { type: "SubmitAnswer", playerId: pid("p1"), requestId, answer: answer("correct") });
    expect(eventsOf(won.events, "InvestmentSettled")[0]).toMatchObject({ outcome: "correct", payout: 150 });
    expect(won.state.players[0]!.money).toBe(900 + 50 + 150);
    expect(won.state.effects.filter((e) => e.playerId === pid("p1"))).toHaveLength(0);
    const lost = run(asked.state, { type: "SubmitAnswer", playerId: pid("p1"), requestId, answer: answer("incorrect") });
    expect(eventsOf(lost.events, "InvestmentSettled")[0]).toMatchObject({ outcome: "incorrect", payout: 0 });
    expect(lost.state.players[0]!.money).toBe(900);
  });

  it("épargner : 100 de côté, 150 récupérés après deux tours consommés", () => {
    const r = journey(create(makeLineSetup({ cells: { 1: "management" }, scenarios: scenariosOf("management-saving"), players: players(2) })).state);
    const saved = run(r.state, { type: "Choose", playerId: pid("p1"), choiceId: "management-saving", optionId: "save" });
    expect(saved.state.players[0]!.money).toBe(900);
    expect(saved.state.effects[0]!.spec).toMatchObject({ type: "saving_pending", turnsRemaining: 2 });
    roundTrip(saved.state);
    const matured = advanceUntil(saved.state, (_, evts) => eventsOf(evts, "SavingMatured").length > 0);
    const turnsAfter = matured.state.players[0]!.turnsPlayed;
    expect(turnsAfter).toBe(3); // tour d'épargne + deux tours consommés
    expect(matured.state.ledger.find((t) => t.reason === "saving_payout")).toMatchObject({ playerId: pid("p1"), amount: 150 });
    expect(matured.state.effects.some((e) => e.playerId === pid("p1") && e.spec.type === "saving_pending")).toBe(false);
  });

  it("protection : annule la prochaine petite pénalité, pas une grosse ; une protection datée expire", () => {
    const r = journey(create(makeLineSetup({ cells: { 1: "management", 2: "event" }, scenarios: scenariosOf("management-protection", "event-loss"), players: players(2) })).state);
    const protectedState = run(r.state, { type: "Choose", playerId: pid("p1"), choiceId: "management-protection", optionId: "protect" });
    expect(protectedState.state.players[0]!.money).toBe(925);
    const hit = advanceUntil(protectedState.state, (_, evts) => eventsOf(evts, "PenaltyShielded").length > 0);
    expect(eventsOf(hit.events, "PenaltyShielded")[0]).toMatchObject({ playerId: pid("p1"), amount: 150 });
    expect(hit.state.players[0]!.money).toBe(925);
    // Une pénalité plus grosse que la protection n'est pas couverte.
    const big = { id: "big-loss", cellType: "event" as const, outcomes: [{ kind: "money" as const, amount: -500, insufficient: "cap_to_balance" as const }] };
    const r2 = journey(create(makeLineSetup({ cells: { 1: "management", 2: "event" }, scenarios: [...scenariosOf("management-protection"), big], players: players(2) })).state);
    const p2 = run(r2.state, { type: "Choose", playerId: pid("p1"), choiceId: "management-protection", optionId: "protect" });
    const bigHit = advanceUntil(p2.state, (s) => s.players[0]!.money < 925);
    expect(eventsOf(bigHit.events, "PenaltyShielded")).toHaveLength(0);
    expect(bigHit.state.effects.some((e) => e.spec.type === "penalty_shield")).toBe(true);
    // Expiration : une protection d'événement (4 tours) disparaît.
    const r3 = journey(create(makeLineSetup({ cells: { 1: "event" }, scenarios: scenariosOf("event-protection"), players: players(2) })).state);
    expect(r3.state.effects[0]).toMatchObject({ spec: { type: "penalty_shield" }, expiresAtTurn: 5 });
    const expired = advanceUntil(r3.state, (_, evts) => eventsOf(evts, "EffectExpired").length > 0);
    expect(eventsOf(expired.events, "EffectExpired")[0]).toMatchObject({ playerId: pid("p1"), effectType: "penalty_shield" });
    expect(expired.state.turnNumber).toBeGreaterThan(5);
  });

  it("100 maintenant ou bonus futur : le bonus s'ajoute à la prochaine récompense ; réduction et multiplicateur ×1,5 s'appliquent", () => {
    const r = journey(create(makeLineSetup({ cells: { 1: "management", 2: "question" }, scenarios: scenariosOf("management-now-or-later"), players: players(2) })).state);
    const later = run(r.state, { type: "Choose", playerId: pid("p1"), choiceId: "management-now-or-later", optionId: "later" });
    expect(later.state.players[0]!.money).toBe(1000);
    const asked = advanceUntil(later.state, (s) => active(s) === pid("p1") && s.phase.kind === "awaiting_answer");
    const requestId = asked.state.phase.kind === "awaiting_answer" ? asked.state.phase.requestId : "";
    const won = run(asked.state, { type: "SubmitAnswer", playerId: pid("p1"), requestId, answer: answer("correct") });
    expect(eventsOf(won.events, "RewardGranted")[0]).toMatchObject({ base: 50, bonus: 150, amount: 200 });
    const now = run(r.state, { type: "Choose", playerId: pid("p1"), choiceId: "management-now-or-later", optionId: "now" });
    expect(now.state.players[0]!.money).toBe(1100);

    const discount = journey(create(makeLineSetup({ cells: { 1: "treasure", 2: "heritage" }, scenarios: scenariosOf("treasure-discount"), players: players(2), rules: TEST_RULES_SCENARIO_TREASURE })).state);
    const offered = advanceUntil(discount.state, (s) => active(s) === pid("p1") && s.phase.kind === "awaiting_purchase");
    const bought = run(offered.state, { type: "DecidePurchase", playerId: pid("p1"), siteId: TEST_MONUMENTS[0]!.id, buy: true });
    expect(eventsOf(bought.events, "SiteAcquired")[0]).toMatchObject({ price: 150, heritageValue: 250 });
    expect(eventsOf(bought.events, "EffectConsumed")[0]).toMatchObject({ effectType: "next_purchase_discount" });
  });

  it("trésor « reprise » : efface un tour à sauter et lève une Halte", () => {
    const setup = makeLineSetup({ cells: { 1: "event", 2: "halt", 3: "treasure" }, scenarios: scenariosOf("event-skip", "treasure-recovery"), players: players(1).concat(players(2).slice(1)), rules: TEST_RULES_SCENARIO_TREASURE });
    let s = journey(create(setup).state).state; // p1 : tour à sauter en attente
    s = advanceUntil(s, (x) => active(x) === pid("p1") && x.players[0]!.position === 2).state; // arrive à la Halte (le tour sauté a été consommé)
    expect(s.players[0]!.halted).toBe(true);
    const back = advanceUntil(s, (x) => active(x) === pid("p1") && x.phase.kind === "awaiting_answer");
    const requestId = back.state.phase.kind === "awaiting_answer" ? back.state.phase.requestId : "";
    const lifted = run(back.state, { type: "SubmitAnswer", playerId: pid("p1"), requestId, answer: answer("correct") });
    const treasure = journey(lifted.state); // case 3 : reprise
    expect(eventsOf(treasure.events, "ScenarioTriggered")[0]).toMatchObject({ scenarioId: "treasure-recovery" });
    expect(treasure.state.players[0]!.halted).toBe(false);
  });
});

describe("séquences déterministes et rotation inter-parties", () => {
  it("le décalage de scénarios change l'ordre servi d'une partie à l'autre, sans aucun tirage", () => {
    const ids = (offset: number) => {
      const s = create(makeLineSetup({ cells: { 1: "event" }, scenarios: scenariosOf("event-gain", "event-loss", "event-share"), players: players(3), scenarioOffset: offset })).state;
      const first = journey(s);
      return [eventsOf(first.events, "ScenarioTriggered")[0]!.scenarioId, first.state.config.scenarioOffset];
    };
    expect(ids(0)).toEqual(["event-gain", 0]);
    expect(ids(1)).toEqual(["event-loss", 1]);
    expect(ids(2)).toEqual(["event-share", 2]);
    expect(ids(3)).toEqual(["event-gain", 3]);
  });
});
