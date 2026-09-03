import { describe, expect, it } from "vitest";
import { createGame, reduce, type GameState } from "@/core/game";
import { TEST_MONUMENTS } from "../../fixtures/game/heritage.fixture";
import { scenariosOf } from "../../fixtures/game/scenarios.fixture";
import { active, advanceUntil, answer, create, eventsOf, findSeed, makeLineSetup, makeSetup, pid, players, run, seedForFirstSpin } from "../../fixtures/game/setup.fixture";

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

  it("refuse une configuration invalide sans lever d'exception", () => {
    const result = createGame(makeSetup({ rules: { ...makeSetup().rules, wheel: { min: 6, max: 1 } } }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("INVALID_CONFIG");
  });

  it("distribue l'argent de départ par le grand livre et ouvre le tour 1", () => {
    const { state, events } = create();
    expect(state.players.every((p) => p.money === 1000 && p.position === 0)).toBe(true);
    expect(state.ledger).toHaveLength(3);
    expect(state.ledger.every((t) => t.reason === "starting_money")).toBe(true);
    expect(state.turnNumber).toBe(1);
    expect(state.phase).toEqual({ kind: "awaiting_spin" });
    expect(events[0]?.type).toBe("GameCreated");
    expect(eventsOf(events, "TurnStarted")).toEqual([{ type: "TurnStarted", turnNumber: 1, playerId: pid("p1") }]);
  });

  it("ne fait aucune hypothèse sur le type des joueurs", () => {
    const adultsOnly = players(3).map((p) => ({ ...p, profileType: "adult" as const }));
    const childrenOnly = players(3).map((p) => ({ ...p, profileType: "child" as const }));
    expect(createGame(makeSetup({ players: adultsOnly })).ok).toBe(true);
    expect(createGame(makeSetup({ players: childrenOnly })).ok).toBe(true);
  });
});

describe("commandes refusées (état inchangé)", () => {
  it("refuse une commande d'un joueur non actif", () => {
    const { state } = create();
    const result = reduce(state, { type: "SpinWheel", playerId: pid("p2") });
    expect(result).toEqual({ ok: false, error: { code: "NOT_ACTIVE_PLAYER", expected: pid("p1"), received: pid("p2") } });
  });

  it("refuse une commande hors phase", () => {
    const { state } = create();
    const result = reduce(state, { type: "SubmitAnswer", playerId: pid("p1"), requestId: "q1", answer: answer("correct") });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toEqual({ code: "INVALID_PHASE", expected: "awaiting_answer", actual: "awaiting_spin" });
  });

  it("refuse une réponse pour une autre demande", () => {
    const seed = seedForFirstSpin(1);
    const { state } = create(makeLineSetup({ seed }));
    const asked = run(state, { type: "SpinWheel", playerId: active(state) });
    const result = reduce(asked.state, { type: "SubmitAnswer", playerId: active(asked.state), requestId: "autre", answer: answer("correct") });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("REQUEST_MISMATCH");
  });
});

describe("roue et déplacement", () => {
  it("la roue vient du moteur et le pion avance du nombre indiqué", () => {
    const { state } = create();
    const { state: next, events } = run(state, { type: "SpinWheel", playerId: pid("p1") });
    const spun = eventsOf(events, "WheelSpun")[0]!;
    const moved = eventsOf(events, "PawnMoved")[0]!;
    expect(spun.value).toBeGreaterThanOrEqual(1);
    expect(spun.value).toBeLessThanOrEqual(6);
    expect(moved.path).toHaveLength(spun.value);
    expect(moved.to).toBe(spun.value);
    expect(next.players[0]!.position).toBe(spun.value);
    expect(eventsOf(events, "CellArrived")[0]!.position).toBe(spun.value);
  });
});

describe("case question", () => {
  it("demande une question sans en connaître le contenu, puis récompense selon la validation", () => {
    const seed = seedForFirstSpin(1);
    const { state } = create(makeLineSetup({ seed }));
    const asked = run(state, { type: "SpinWheel", playerId: pid("p1") });
    expect(asked.state.phase.kind).toBe("awaiting_answer");
    expect(eventsOf(asked.events, "QuestionRequested")).toEqual([{ type: "QuestionRequested", requestId: "q1", playerId: pid("p1"), position: 1 }]);

    const answered = run(asked.state, { type: "SubmitAnswer", playerId: pid("p1"), requestId: "q1", answer: answer("correct", "ar") });
    expect(eventsOf(answered.events, "AnswerRecorded")[0]).toMatchObject({ outcome: "correct", explanationMastery: "ar", validationMode: "collective" });
    expect(eventsOf(answered.events, "RewardGranted")[0]).toMatchObject({ base: 50, multiplier: 2, amount: 100 });
    expect(answered.state.players[0]!.money).toBe(1100);
    expect(answered.state.ledger.at(-1)).toMatchObject({ reason: "question_reward", amount: 100, ref: "q1" });
    // Le tour est clos : la main passe au joueur suivant.
    expect(active(answered.state)).toBe(pid("p2"));
    expect(answered.state.phase.kind).toBe("awaiting_spin");
  });

  it("une réponse incorrecte ne coûte rien et ne rapporte rien", () => {
    const seed = seedForFirstSpin(1);
    const { state } = create(makeLineSetup({ seed }));
    const asked = run(state, { type: "SpinWheel", playerId: pid("p1") });
    const answered = run(asked.state, { type: "SubmitAnswer", playerId: pid("p1"), requestId: "q1", answer: answer("incorrect") });
    expect(eventsOf(answered.events, "RewardGranted")).toHaveLength(0);
    expect(answered.state.players[0]!.money).toBe(1000);
  });

  it("enregistre l'auto-évaluation telle que déclarée, sans la déduire", () => {
    const seed = seedForFirstSpin(1);
    const { state } = create(makeLineSetup({ seed }));
    const asked = run(state, { type: "SpinWheel", playerId: pid("p1") });
    const answered = run(asked.state, { type: "SubmitAnswer", playerId: pid("p1"), requestId: "q1", answer: { outcome: "partial", explanationMastery: "none", validationMode: "self" } });
    expect(eventsOf(answered.events, "AnswerRecorded")[0]).toMatchObject({ validationMode: "self" });
    expect(eventsOf(answered.events, "RewardGranted")[0]).toMatchObject({ amount: 25 });
  });
});

describe("case monument", () => {
  const monument = TEST_MONUMENTS[0]!;

  function landOnMonument(overrides: Parameters<typeof makeLineSetup>[0] = {}) {
    const seed = seedForFirstSpin(2, makeLineSetup(overrides));
    const { state } = create(makeLineSetup({ ...overrides, seed }));
    return run(state, { type: "SpinWheel", playerId: pid("p1") });
  }

  it("propose l'achat d'un monument libre", () => {
    const offered = landOnMonument();
    expect(offered.state.phase).toMatchObject({ kind: "awaiting_purchase", siteId: monument.id, price: monument.price });
    expect(eventsOf(offered.events, "PurchaseOffered")[0]).toMatchObject({ siteId: monument.id, price: 300, affordable: true });
  });

  it("acheter débite le joueur et ajoute le monument au patrimoine", () => {
    const offered = landOnMonument();
    const bought = run(offered.state, { type: "DecidePurchase", playerId: pid("p1"), siteId: monument.id, buy: true });
    expect(eventsOf(bought.events, "SiteAcquired")[0]).toMatchObject({ siteId: monument.id, price: 300, heritageValue: 250 });
    expect(bought.state.players[0]!.money).toBe(700);
    expect(bought.state.holdings).toEqual([{ siteId: monument.id, ownerId: pid("p1"), price: 300, heritageValue: 250, acquiredTurn: 1 }]);
    expect(bought.state.ledger.at(-1)).toMatchObject({ reason: "purchase", amount: -300, ref: monument.id });
  });

  it("passer ne change rien et clôt le tour", () => {
    const offered = landOnMonument();
    const declined = run(offered.state, { type: "DecidePurchase", playerId: pid("p1"), siteId: monument.id, buy: false });
    expect(eventsOf(declined.events, "PurchaseDeclined")).toHaveLength(1);
    expect(declined.state.holdings).toEqual([]);
    expect(declined.state.players[0]!.money).toBe(1000);
    expect(active(declined.state)).toBe(pid("p2"));
  });

  it("refuse l'achat si le solde est insuffisant, sans modifier l'état", () => {
    const poor = { ...makeLineSetup().rules, startingMoney: 100 };
    const offered = landOnMonument({ rules: poor });
    expect(eventsOf(offered.events, "PurchaseOffered")[0]!.affordable).toBe(false);
    const result = reduce(offered.state, { type: "DecidePurchase", playerId: pid("p1"), siteId: monument.id, buy: true });
    expect(result).toEqual({ ok: false, error: { code: "INSUFFICIENT_FUNDS", required: 300, available: 100 } });
    // Le joueur peut toujours passer.
    const declined = run(offered.state, { type: "DecidePurchase", playerId: pid("p1"), siteId: monument.id, buy: false });
    expect(declined.state.holdings).toEqual([]);
  });

  it("un monument déjà possédé (par soi ou par un autre) n'est plus proposé et n'entraîne aucun paiement", () => {
    // Deux joueurs sur le plateau de test ; p1 achète, puis p2 tombe sur la même case.
    const setupOf = (seed: number) => makeLineSetup({ seed, players: players(2) });
    const seed = (() => {
      for (let s = 1; s < 5000; s += 1) {
        const { state } = create(setupOf(s));
        const first = run(state, { type: "SpinWheel", playerId: pid("p1") });
        if (first.state.phase.kind !== "awaiting_purchase") continue;
        const bought = run(first.state, { type: "DecidePurchase", playerId: pid("p1"), siteId: monument.id, buy: true });
        const second = run(bought.state, { type: "SpinWheel", playerId: pid("p2") });
        if (eventsOf(second.events, "WheelSpun")[0]?.value === 2) return s;
      }
      throw new Error("pas de graine");
    })();

    const { state } = create(setupOf(seed));
    const first = run(state, { type: "SpinWheel", playerId: pid("p1") });
    const bought = run(first.state, { type: "DecidePurchase", playerId: pid("p1"), siteId: monument.id, buy: true });
    const before = bought.state.players.map((p) => p.money);
    const second = run(bought.state, { type: "SpinWheel", playerId: pid("p2") });

    expect(eventsOf(second.events, "SiteAlreadyOwned")).toEqual([{ type: "SiteAlreadyOwned", playerId: pid("p2"), siteId: monument.id, ownerId: pid("p1") }]);
    expect(eventsOf(second.events, "PurchaseOffered")).toHaveLength(0);
    expect(eventsOf(second.events, "MoneyChanged")).toHaveLength(0);
    expect(second.state.players.map((p) => p.money)).toEqual(before);
    expect(second.state.holdings).toHaveLength(1);
    expect(active(second.state)).toBe(pid("p1"));
  });
});

describe("scénarios génériques (fixtures)", () => {
  function landOn(position: number, scenarioIds: readonly string[], rulesPatch: Partial<GameState["config"]["rules"]> = {}) {
    const base = makeLineSetup({ scenarios: scenariosOf(...scenarioIds), rules: { ...makeLineSetup().rules, ...rulesPatch } });
    const seed = seedForFirstSpin(position, base);
    const { state } = create({ ...base, seed });
    return run(state, { type: "SpinWheel", playerId: pid("p1") });
  }

  it("un gain est crédité par le grand livre", () => {
    const r = landOn(3, ["event-gain"]);
    expect(eventsOf(r.events, "ScenarioTriggered")[0]).toMatchObject({ scenarioId: "event-gain", cellType: "event" });
    expect(r.state.players[0]!.money).toBe(1100);
    expect(r.state.ledger.at(-1)).toMatchObject({ reason: "scenario_gain", amount: 100 });
  });

  it("une perte est plafonnée au solde quand le solde négatif est interdit", () => {
    const r = landOn(3, ["event-loss"], { startingMoney: 80 });
    expect(r.state.players[0]!.money).toBe(0);
    expect(r.state.ledger.at(-1)).toMatchObject({ reason: "scenario_loss", amount: -80 });
  });

  it("une perte peut rendre le solde négatif si les règles l'autorisent", () => {
    const r = landOn(3, ["event-loss"], { startingMoney: 80, allowNegativeBalance: true });
    expect(r.state.players[0]!.money).toBe(-70);
  });

  it("un déplacement de scénario recule le pion sans résoudre la case d'arrivée", () => {
    const r = landOn(3, ["event-back"]);
    const moves = eventsOf(r.events, "PawnMoved");
    expect(moves).toHaveLength(2);
    expect(moves[1]).toMatchObject({ from: 3, to: 0, path: [2, 1, 0] });
    expect(eventsOf(r.events, "PurchaseOffered")).toHaveLength(0);
    expect(r.state.players[0]!.position).toBe(0);
  });

  it("un tour sauté est consommé au retour du joueur et COMPTE comme un tour joué", () => {
    const r = landOn(3, ["event-skip"]);
    expect(eventsOf(r.events, "EffectQueued")[0]!.effect.spec).toEqual({ type: "skip_turn", consumeOn: "turn_start" });
    expect(r.state.effects).toHaveLength(1);

    const { state, events } = advanceUntil(r.state, (_, evts) => eventsOf(evts, "TurnSkipped").length > 0);
    expect(eventsOf(events, "TurnSkipped")[0]).toMatchObject({ playerId: pid("p1"), effectId: "e1" });
    expect(state.effects).toHaveLength(0);
    // Le tour sauté est perdu : il compte dans les tours du joueur, sans roue ni déplacement.
    expect(state.players[0]!.turnsPlayed).toBe(2);
    const skippedTurn = eventsOf(events, "TurnSkipped")[0]!.turnNumber;
    expect(eventsOf(events, "WheelSpun").some((e) => e.playerId === pid("p1"))).toBe(false);
    expect(eventsOf(events, "TurnEnded").some((e) => e.turnNumber === skippedTurn && e.playerId === pid("p1"))).toBe(true);
    expect(active(state)).toBe(pid("p2"));
  });

  it("un tour sauté ne rallonge pas la partie : la condition de fin compte les tours consommés", () => {
    const r = landOn(3, ["event-skip"], { endCondition: { kind: "turns_per_player", turns: 2 } });
    const { state, events } = advanceUntil(r.state, (s) => s.status === "finished");
    expect(state.status).toBe("finished");
    expect(state.players[0]!.turnsPlayed).toBe(2);
    expect(eventsOf(events, "TurnSkipped").some((e) => e.playerId === pid("p1"))).toBe(true);
    expect(eventsOf(events, "WheelSpun").filter((e) => e.playerId === pid("p1"))).toHaveLength(0);
  });

  it("un tour supplémentaire redonne la main au même joueur", () => {
    const r = landOn(3, ["event-extra"]);
    expect(eventsOf(r.events, "EffectConsumed")[0]).toMatchObject({ effectType: "extra_turn" });
    expect(active(r.state)).toBe(pid("p1"));
    expect(eventsOf(r.events, "TurnStarted")).toEqual([{ type: "TurnStarted", turnNumber: 2, playerId: pid("p1") }]);
  });

  it("un choix de gestion suspend le tour puis applique l'option choisie", () => {
    const r = landOn(4, ["management-choice"]);
    expect(r.state.phase).toMatchObject({ kind: "awaiting_choice", choiceId: "management-choice" });
    expect(eventsOf(r.events, "ChoiceOffered")[0]!.optionIds).toEqual(["save", "spend"]);
    const bad = reduce(r.state, { type: "Choose", playerId: pid("p1"), choiceId: "management-choice", optionId: "inconnue" });
    expect(bad.ok).toBe(false);
    const chosen = run(r.state, { type: "Choose", playerId: pid("p1"), choiceId: "management-choice", optionId: "spend" });
    expect(chosen.state.players[0]!.money).toBe(950);
    expect(active(chosen.state)).toBe(pid("p2"));
  });

  it("un défi peut demander une question par le même mécanisme", () => {
    const r = landOn(6, ["challenge-question"]);
    expect(r.state.phase.kind).toBe("awaiting_answer");
    expect(eventsOf(r.events, "QuestionRequested")[0]).toMatchObject({ position: 6 });
  });

  it("un trésor peut accorder un multiplicateur consommé à la prochaine récompense", () => {
    // Graine telle que p1 tombe sur le trésor (5) puis, à son tour suivant, sur la question (1) : 5 + 4 ≡ 1 (mod 8).
    const base = makeLineSetup({ scenarios: scenariosOf("treasure-boost"), players: players(2) });
    const seed = findSeed((s) => {
      const { state } = create({ ...base, seed: s });
      const first = run(state, { type: "SpinWheel", playerId: pid("p1") });
      if (eventsOf(first.events, "WheelSpun")[0]!.value !== 5) return false;
      const back = advanceUntil(first.state, (st) => active(st) === pid("p1") && st.phase.kind === "awaiting_spin");
      const again = run(back.state, { type: "SpinWheel", playerId: pid("p1") });
      return eventsOf(again.events, "WheelSpun")[0]!.value === 4;
    });

    const { state } = create({ ...base, seed });
    const first = run(state, { type: "SpinWheel", playerId: pid("p1") });
    expect(first.state.effects[0]).toMatchObject({ playerId: pid("p1"), spec: { type: "reward_multiplier", multiplier: 2, uses: 1, consumeOn: "reward_granted" } });
    const back = advanceUntil(first.state, (st) => active(st) === pid("p1") && st.phase.kind === "awaiting_spin");
    const asked = run(back.state, { type: "SpinWheel", playerId: pid("p1") });
    expect(asked.state.phase.kind).toBe("awaiting_answer");
    const requestId = asked.state.phase.kind === "awaiting_answer" ? asked.state.phase.requestId : "";
    const moneyBefore = asked.state.players[0]!.money;
    const answered = run(asked.state, { type: "SubmitAnswer", playerId: pid("p1"), requestId, answer: answer("correct") });

    expect(eventsOf(answered.events, "EffectConsumed")[0]).toMatchObject({ effectType: "reward_multiplier" });
    expect(eventsOf(answered.events, "RewardGranted")[0]).toMatchObject({ base: 50, multiplier: 2, amount: 100 });
    expect(answered.state.players[0]!.money).toBe(moneyBefore + 100);
    expect(answered.state.effects.filter((e) => e.playerId === pid("p1"))).toHaveLength(0);
  });

  it("une case sans scénario configuré ne fait rien et clôt le tour", () => {
    const r = landOn(3, []);
    expect(eventsOf(r.events, "ScenarioTriggered")).toHaveLength(0);
    expect(active(r.state)).toBe(pid("p2"));
  });
});
