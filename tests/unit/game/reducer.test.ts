import { describe, expect, it } from "vitest";
import { createGame, reduce, type CellType, type GameState, type RulesConfig } from "@/core/game";
import { TEST_MONUMENTS } from "../../fixtures/game/heritage.fixture";
import { TWO_STEP_CYCLE } from "../../fixtures/game/journey.fixture";
import { scenariosOf } from "../../fixtures/game/scenarios.fixture";
import { active, advanceUntil, answer, create, eventsOf, journey, makeLineSetup, makeSetup, pid, players, run } from "../../fixtures/game/setup.fixture";

describe("création de partie", () => {
  it("refuse moins de 2 ou plus de 6 joueurs", () => {
    expect(createGame(makeSetup({ players: players(1) })).ok).toBe(false);
    expect(createGame(makeSetup({ players: players(7) })).ok).toBe(false);
    for (const n of [2, 3, 4, 5, 6]) expect(createGame(makeSetup({ players: players(n) })).ok).toBe(true);
  });

  it("refuse un identifiant de joueur dupliqué", () => {
    const dup = [...players(2), { id: pid("p1"), displayName: "Doublon", profileType: "adult" as const }];
    const result = createGame(makeSetup({ players: dup }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("DUPLICATE_PLAYER");
  });

  it("refuse une configuration invalide sans lever d'exception (règles, cycle, FamilyAssist)", () => {
    const badRules = createGame(makeSetup({ rules: { ...makeSetup().rules, startingMoney: -1 } }));
    expect(badRules.ok).toBe(false);
    const badCycle = createGame(makeSetup({ journey: { id: "bad", version: 1, stepMax: 3, blocks: [[1, 1, 2]] } }));
    expect(badCycle.ok).toBe(false);
    const badAssist = createGame(makeSetup({ familyAssist: { enabled: true, assistedPlayers: [{ playerId: pid("inconnu"), level: "subtle" }] } }));
    expect(badAssist.ok).toBe(false);
    if (!badAssist.ok) expect(badAssist.error.code).toBe("INVALID_CONFIG");
  });

  it("fige FamilyAssist dans la configuration de la partie (désactivé par défaut)", () => {
    expect(create().state.config.familyAssist).toEqual({ enabled: false, assistedPlayers: [] });
    const on = create(makeSetup({ familyAssist: { enabled: true, assistedPlayers: [{ playerId: pid("p1"), level: "subtle" }] } }));
    expect(on.state.config.familyAssist.assistedPlayers).toEqual([{ playerId: pid("p1"), level: "subtle" }]);
  });

  it("distribue l'argent de départ par le grand livre et ouvre le tour 1", () => {
    const { state, events } = create();
    expect(state.players.every((p) => p.money === 1000 && p.position === 0 && p.journeysTaken === 0)).toBe(true);
    expect(state.ledger.every((t) => t.reason === "starting_money")).toBe(true);
    expect(state.turnNumber).toBe(1);
    expect(state.phase).toEqual({ kind: "awaiting_journey" });
    expect(state.clock).toEqual({ activePlaySeconds: 0, timeTargetReached: false });
    expect(events[0]?.type).toBe("GameCreated");
  });

  it("ne fait aucune hypothèse sur le type des joueurs", () => {
    expect(createGame(makeSetup({ players: players(3).map((p) => ({ ...p, profileType: "adult" as const })) })).ok).toBe(true);
    expect(createGame(makeSetup({ players: players(3).map((p) => ({ ...p, profileType: "child" as const })) })).ok).toBe(true);
  });
});

describe("commandes refusées (état inchangé)", () => {
  it("refuse une commande d'un joueur non actif", () => {
    const { state } = create();
    expect(reduce(state, { type: "StartJourney", playerId: pid("p2") })).toEqual({ ok: false, error: { code: "NOT_ACTIVE_PLAYER", expected: pid("p1"), received: pid("p2") } });
  });

  it("refuse une commande hors phase", () => {
    const { state } = create();
    const result = reduce(state, { type: "SubmitAnswer", playerId: pid("p1"), requestId: "q1", answer: answer("correct") });
    expect(result).toEqual({ ok: false, error: { code: "INVALID_PHASE", expected: "awaiting_answer", actual: "awaiting_journey" } });
  });

  it("refuse une réponse pour une autre demande", () => {
    const asked = journey(create(makeLineSetup()).state);
    const result = reduce(asked.state, { type: "SubmitAnswer", playerId: active(asked.state), requestId: "autre", answer: answer("correct") });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("REQUEST_MISMATCH");
  });
});

describe("le Chemin : déplacement attribué par le moteur, jamais choisi", () => {
  it("StartJourney attribue les étapes depuis le cycle et fait avancer le pion case par case", () => {
    const { state } = create();
    const { state: next, events } = journey(state);
    expect(eventsOf(events, "MovementAssigned")).toEqual([{ type: "MovementAssigned", playerId: pid("p1"), steps: 3, journeyIndex: 0 }]);
    const moved = eventsOf(events, "PawnMoved")[0]!;
    expect(moved).toEqual({ type: "PawnMoved", playerId: pid("p1"), from: 0, to: 3, path: [1, 2, 3] });
    expect(next.players[0]!.position).toBe(3);
    expect(next.players[0]!.journeysTaken).toBe(1);
    expect(eventsOf(events, "CellArrived")[0]).toMatchObject({ position: 3, cellType: "event" });
  });

  it("le même état produit toujours le même Chemin", () => {
    const { state } = create();
    const a = journey(state);
    const b = journey(state);
    expect(a.events).toEqual(b.events);
    expect(a.state).toEqual(b.state);
  });

  it("le deuxième joueur suit son propre bloc du cycle", () => {
    const { state } = create(makeSetup({ scenarios: [] }));
    const afterP1 = advanceUntil(journey(state).state, (s) => active(s) === pid("p2") && s.phase.kind === "awaiting_journey");
    const p2 = journey(afterP1.state);
    expect(eventsOf(p2.events, "MovementAssigned")[0]).toMatchObject({ playerId: pid("p2"), steps: 2, journeyIndex: 0 });
  });
});

describe("case question", () => {
  it("demande une question sans en connaître le contenu, puis récompense selon la validation", () => {
    const asked = journey(create(makeLineSetup()).state);
    expect(asked.state.phase.kind).toBe("awaiting_answer");
    expect(eventsOf(asked.events, "QuestionRequested")).toEqual([{ type: "QuestionRequested", requestId: "q1", playerId: pid("p1"), position: 1 }]);

    const answered = run(asked.state, { type: "SubmitAnswer", playerId: pid("p1"), requestId: "q1", answer: answer("correct", "ar") });
    expect(eventsOf(answered.events, "AnswerRecorded")[0]).toMatchObject({ outcome: "correct", explanationMastery: "ar", validationMode: "collective" });
    expect(eventsOf(answered.events, "RewardGranted")[0]).toMatchObject({ base: 50, multiplier: 2, amount: 100 });
    expect(answered.state.players[0]!.money).toBe(1100);
    expect(answered.state.ledger.at(-1)).toMatchObject({ reason: "question_reward", amount: 100, ref: "q1" });
    expect(active(answered.state)).toBe(pid("p2"));
    expect(answered.state.phase.kind).toBe("awaiting_journey");
  });

  it("une réponse incorrecte ne coûte rien et ne rapporte rien", () => {
    const asked = journey(create(makeLineSetup()).state);
    const answered = run(asked.state, { type: "SubmitAnswer", playerId: pid("p1"), requestId: "q1", answer: answer("incorrect") });
    expect(eventsOf(answered.events, "RewardGranted")).toHaveLength(0);
    expect(answered.state.players[0]!.money).toBe(1000);
  });

  it("enregistre l'auto-évaluation telle que déclarée, sans la déduire", () => {
    const asked = journey(create(makeLineSetup()).state);
    const answered = run(asked.state, { type: "SubmitAnswer", playerId: pid("p1"), requestId: "q1", answer: { outcome: "partial", explanationMastery: "none", validationMode: "self" } });
    expect(eventsOf(answered.events, "AnswerRecorded")[0]).toMatchObject({ validationMode: "self" });
    expect(eventsOf(answered.events, "RewardGranted")[0]).toMatchObject({ amount: 25 });
  });
});

describe("case monument", () => {
  const monument = TEST_MONUMENTS[0]!;
  const landOnMonument = (rules?: RulesConfig) => journey(create(makeLineSetup({ cells: { 1: "heritage" }, ...(rules ? { rules } : {}) })).state);

  it("propose l'achat d'un monument libre", () => {
    const offered = landOnMonument();
    expect(offered.state.phase).toMatchObject({ kind: "awaiting_purchase", siteId: monument.id, price: monument.price });
    expect(eventsOf(offered.events, "PurchaseOffered")[0]).toMatchObject({ siteId: monument.id, price: 300, affordable: true });
  });

  it("acheter débite le joueur et ajoute le monument au patrimoine", () => {
    const bought = run(landOnMonument().state, { type: "DecidePurchase", playerId: pid("p1"), siteId: monument.id, buy: true });
    expect(eventsOf(bought.events, "SiteAcquired")[0]).toMatchObject({ siteId: monument.id, price: 300, heritageValue: 250 });
    expect(bought.state.players[0]!.money).toBe(700);
    expect(bought.state.holdings).toEqual([{ siteId: monument.id, ownerId: pid("p1"), price: 300, heritageValue: 250, acquiredTurn: 1 }]);
    expect(bought.state.ledger.at(-1)).toMatchObject({ reason: "purchase", amount: -300, ref: monument.id });
  });

  it("passer ne change rien et clôt le tour", () => {
    const declined = run(landOnMonument().state, { type: "DecidePurchase", playerId: pid("p1"), siteId: monument.id, buy: false });
    expect(eventsOf(declined.events, "PurchaseDeclined")).toHaveLength(1);
    expect(declined.state.holdings).toEqual([]);
    expect(declined.state.players[0]!.money).toBe(1000);
    expect(active(declined.state)).toBe(pid("p2"));
  });

  it("refuse l'achat si le solde est insuffisant, sans modifier l'état", () => {
    const offered = landOnMonument({ ...makeSetup().rules, startingMoney: 100 });
    expect(eventsOf(offered.events, "PurchaseOffered")[0]!.affordable).toBe(false);
    expect(reduce(offered.state, { type: "DecidePurchase", playerId: pid("p1"), siteId: monument.id, buy: true })).toEqual({ ok: false, error: { code: "INSUFFICIENT_FUNDS", required: 300, available: 100 } });
    expect(run(offered.state, { type: "DecidePurchase", playerId: pid("p1"), siteId: monument.id, buy: false }).state.holdings).toEqual([]);
  });

  it("un monument déjà possédé par un autre n'est plus proposé et n'entraîne aucun paiement", () => {
    const { state } = create(makeLineSetup({ cells: { 1: "heritage" }, players: players(2) }));
    const bought = run(journey(state).state, { type: "DecidePurchase", playerId: pid("p1"), siteId: monument.id, buy: true });
    const before = bought.state.players.map((p) => p.money);
    const second = journey(bought.state); // p2 arrive sur la même case 1
    expect(eventsOf(second.events, "SiteAlreadyOwned")).toEqual([{ type: "SiteAlreadyOwned", playerId: pid("p2"), siteId: monument.id, ownerId: pid("p1") }]);
    expect(eventsOf(second.events, "PurchaseOffered")).toHaveLength(0);
    expect(eventsOf(second.events, "MoneyChanged")).toHaveLength(0);
    expect(second.state.players.map((p) => p.money)).toEqual(before);
    expect(second.state.holdings).toHaveLength(1);
    expect(active(second.state)).toBe(pid("p1"));
  });

  it("un monument déjà possédé par soi-même n'est pas racheté", () => {
    // Plateau de 4 cases, 1 étape par Chemin : p1 revient sur la case 1 après un tour complet.
    const board = { id: "board-test-4", version: 1, cellCount: 4, cells: [{ position: 0, type: "start" as const }, { position: 1, type: "heritage" as const }, { position: 2, type: "question" as const }, { position: 3, type: "event" as const }] };
    const { state } = create(makeLineSetup({ board, heritageSites: [TEST_MONUMENTS[0]!], players: players(2) }));
    const bought = run(journey(state).state, { type: "DecidePurchase", playerId: pid("p1"), siteId: monument.id, buy: true });
    const back = advanceUntil(bought.state, (s) => active(s) === pid("p1") && s.players[0]!.position === 0 && s.phase.kind === "awaiting_journey");
    const again = journey(back.state); // p1 → case 1, son propre monument
    expect(eventsOf(again.events, "SiteAlreadyOwned")).toEqual([{ type: "SiteAlreadyOwned", playerId: pid("p1"), siteId: monument.id, ownerId: pid("p1") }]);
    expect(eventsOf(again.events, "PurchaseOffered")).toHaveLength(0);
    expect(again.state.holdings).toHaveLength(1);
    expect(again.state.players[0]!.money).toBe(bought.state.players[0]!.money + 100); // seul le bonus de passage par le départ a bougé
  });

  it("un cycle à deux valeurs enchaîne 1 puis 2 étapes", () => {
    const { state } = create(makeLineSetup({ cells: { 1: "question", 2: "question", 3: "question" }, players: players(2), journey: TWO_STEP_CYCLE }));
    const first = journey(state);
    expect(eventsOf(first.events, "MovementAssigned")[0]!.steps).toBe(1);
    const p2 = advanceUntil(first.state, (s) => active(s) === pid("p1") && s.phase.kind === "awaiting_journey");
    expect(eventsOf(journey(p2.state).events, "MovementAssigned")[0]!.steps).toBe(2);
  });
});

describe("scénarios génériques (fixtures)", () => {
  function landOn(type: CellType, scenarioIds: readonly string[], rulesPatch: Partial<RulesConfig> = {}) {
    const base = makeLineSetup({ cells: { 1: type }, scenarios: scenariosOf(...scenarioIds), rules: { ...makeSetup().rules, ...rulesPatch } });
    return journey(create(base).state);
  }

  it("un gain est crédité par le grand livre", () => {
    const r = landOn("event", ["event-gain"]);
    expect(eventsOf(r.events, "ScenarioTriggered")[0]).toMatchObject({ scenarioId: "event-gain", cellType: "event", visit: 1 });
    expect(r.state.players[0]!.money).toBe(1100);
    expect(r.state.ledger.at(-1)).toMatchObject({ reason: "scenario_gain", amount: 100 });
  });

  it("les scénarios d'une case sont servis dans l'ordre configuré selon les visites — jamais tirés au sort", () => {
    const base = makeLineSetup({ cells: { 1: "event" }, scenarios: scenariosOf("event-gain", "event-loss"), players: players(3) });
    let s = create(base).state;
    const seen: string[] = [];
    for (let i = 0; i < 3; i += 1) {
      const r = journey(s);
      seen.push(eventsOf(r.events, "ScenarioTriggered")[0]!.scenarioId);
      s = r.state;
    }
    expect(seen).toEqual(["event-gain", "event-loss", "event-gain"]);
    expect(s.cellVisits["1"]).toBe(3);
  });

  it("une perte est plafonnée au solde quand le solde négatif est interdit", () => {
    const r = landOn("event", ["event-loss"], { startingMoney: 80 });
    expect(r.state.players[0]!.money).toBe(0);
    expect(r.state.ledger.at(-1)).toMatchObject({ reason: "scenario_loss", amount: -80 });
  });

  it("une perte peut rendre le solde négatif si les règles l'autorisent", () => {
    expect(landOn("event", ["event-loss"], { startingMoney: 80, allowNegativeBalance: true }).state.players[0]!.money).toBe(-70);
  });

  it("un déplacement de scénario recule le pion sans résoudre la case d'arrivée (défaut)", () => {
    const r = landOn("event", ["event-back"]);
    const moves = eventsOf(r.events, "PawnMoved");
    expect(moves).toHaveLength(2);
    expect(moves[1]).toMatchObject({ from: 1, to: 6, path: [0, 7, 6] });
    expect(eventsOf(r.events, "CellArrived")).toHaveLength(1);
    expect(r.state.players[0]!.position).toBe(6);
  });

  it("un déplacement peut demander explicitement la résolution de la case d'arrivée", () => {
    const forward = { id: "event-forward-resolve", cellType: "event" as const, outcomes: [{ kind: "move" as const, steps: 1, resolveDestination: true }] };
    const base = makeLineSetup({ cells: { 1: "event", 2: "question" }, scenarios: [forward] });
    const r = journey(create(base).state);
    expect(eventsOf(r.events, "CellArrived").map((e) => e.position)).toEqual([1, 2]);
    expect(r.state.phase.kind).toBe("awaiting_answer");
  });

  it("un tour sauté est consommé au retour du joueur et COMPTE comme un tour joué", () => {
    // Deux scénarios en rotation : p1 (visite 1) reçoit le tour sauté, p2 (visite 2) un simple gain.
    const base = makeLineSetup({ cells: { 1: "event" }, scenarios: scenariosOf("event-skip", "event-gain"), players: players(2) });
    const r = journey(create(base).state);
    expect(eventsOf(r.events, "EffectQueued")[0]!.effect.spec).toEqual({ type: "skip_turn", consumeOn: "turn_start" });
    const { state, events } = advanceUntil(r.state, (_, evts) => eventsOf(evts, "TurnSkipped").length > 0);
    expect(eventsOf(events, "TurnSkipped")[0]).toMatchObject({ playerId: pid("p1"), effectId: "e1" });
    expect(state.effects).toHaveLength(0);
    expect(state.players[0]!.turnsPlayed).toBe(2);
    expect(state.players[0]!.journeysTaken).toBe(1);
    expect(eventsOf(events, "MovementAssigned").some((e) => e.playerId === pid("p1"))).toBe(false);
    expect(active(state)).toBe(pid("p2"));
  });

  it("un tour sauté ne rallonge pas la partie : la condition de fin compte les tours consommés", () => {
    const r = landOn("event", ["event-skip"], { endCondition: { kind: "turns_per_player", turns: 2 } });
    const { state, events } = advanceUntil(r.state, (s) => s.status === "finished");
    expect(state.status).toBe("finished");
    expect(state.players[0]!.turnsPlayed).toBe(2);
    expect(eventsOf(events, "TurnSkipped").some((e) => e.playerId === pid("p1"))).toBe(true);
  });

  it("un tour supplémentaire redonne la main au même joueur", () => {
    const r = landOn("event", ["event-extra"]);
    expect(eventsOf(r.events, "EffectConsumed")[0]).toMatchObject({ effectType: "extra_turn" });
    expect(active(r.state)).toBe(pid("p1"));
    expect(eventsOf(r.events, "TurnStarted")).toEqual([{ type: "TurnStarted", turnNumber: 2, playerId: pid("p1") }]);
  });

  it("un choix de gestion suspend le tour puis applique l'option choisie", () => {
    const r = landOn("management", ["management-choice"]);
    expect(r.state.phase).toMatchObject({ kind: "awaiting_choice", choiceId: "management-choice" });
    expect(reduce(r.state, { type: "Choose", playerId: pid("p1"), choiceId: "management-choice", optionId: "inconnue" }).ok).toBe(false);
    const chosen = run(r.state, { type: "Choose", playerId: pid("p1"), choiceId: "management-choice", optionId: "spend" });
    expect(chosen.state.players[0]!.money).toBe(950);
    expect(active(chosen.state)).toBe(pid("p2"));
  });

  it("un défi peut demander une question par le même mécanisme", () => {
    const r = landOn("challenge", ["challenge-question"]);
    expect(r.state.phase.kind).toBe("awaiting_answer");
  });

  it("un trésor peut accorder un multiplicateur, consommé uniquement quand une récompense est versée", () => {
    const base = makeLineSetup({ cells: { 1: "treasure", 2: "question", 3: "question" }, scenarios: scenariosOf("treasure-boost"), players: players(2) });
    const boosted = journey(create(base).state);
    expect(boosted.state.effects[0]).toMatchObject({ playerId: pid("p1"), spec: { type: "reward_multiplier", multiplier: 2, uses: 1, consumeOn: "reward_granted" } });

    const p2 = journey(boosted.state); // p2 → case 1 (trésor aussi)
    const asked = journey(p2.state); // p1 → case 2 (question)
    const missed = run(asked.state, { type: "SubmitAnswer", playerId: pid("p1"), requestId: eventsOf(asked.events, "QuestionRequested")[0]!.requestId, answer: answer("incorrect") });
    expect(missed.state.effects.some((e) => e.playerId === pid("p1"))).toBe(true); // conservé

    const p2again = advanceUntil(missed.state, (s) => active(s) === pid("p1") && s.phase.kind === "awaiting_journey");
    const askedAgain = journey(p2again.state); // p1 → case 3 (question)
    const won = run(askedAgain.state, { type: "SubmitAnswer", playerId: pid("p1"), requestId: eventsOf(askedAgain.events, "QuestionRequested")[0]!.requestId, answer: answer("correct") });
    expect(eventsOf(won.events, "EffectConsumed")[0]).toMatchObject({ effectType: "reward_multiplier" });
    expect(eventsOf(won.events, "RewardGranted")[0]).toMatchObject({ base: 50, multiplier: 2, amount: 100 });
    expect(won.state.effects.filter((e) => e.playerId === pid("p1"))).toHaveLength(0);
  });

  it("une case sans scénario configuré ne fait rien et clôt le tour", () => {
    const r = landOn("event", []);
    expect(eventsOf(r.events, "ScenarioTriggered")).toHaveLength(0);
    expect(active(r.state)).toBe(pid("p2"));
  });
});

describe("état après la fin", () => {
  it("aucune commande n'est acceptée après la fin", () => {
    const { state } = create(makeSetup({ players: players(2), rules: { ...makeSetup().rules, endCondition: { kind: "turns_per_player", turns: 1 } }, scenarios: [] }));
    const finished = advanceUntil(state, (s) => s.status === "finished");
    const s: GameState = finished.state;
    expect(reduce(s, { type: "StartJourney", playerId: active(s) }).ok).toBe(false);
    expect(reduce(s, { type: "AdvanceClock", seconds: 1 }).ok).toBe(false);
  });
});
