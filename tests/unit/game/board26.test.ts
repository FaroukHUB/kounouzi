import { describe, expect, it } from "vitest";
import { DEFAULT_BOARD } from "@/config/board";
import { DEMO_HERITAGE_SITES, DEMO_RULES_QUICK, DEMO_SCENARIOS } from "@/config/demo";
import { checkInvariants, deserializeGameState, reduce, serializeGameState, zakatDue, type GameState, type RulesConfig } from "@/core/game";
import type { GameId } from "@/core/shared";
import { ONE_STEP_CYCLE } from "../../fixtures/game/journey.fixture";
import { TEST_RULES_QUICK } from "../../fixtures/game/rules.fixture";
import { active, answer, create, eventsOf, journey, makeLineSetup, makeSetup, pid, players, run, simulate } from "../../fixtures/game/setup.fixture";

const NO_ZAKAT: RulesConfig = { ...TEST_RULES_QUICK, zakat: { ...TEST_RULES_QUICK.zakat, enabled: false } };
const ledgerOf = (state: GameState, playerId: string) => state.ledger.filter((t) => t.playerId === playerId);

describe("Départ : +100 Kounouz à chaque passage complet, exactement une fois par franchissement, par le grand livre", () => {
  it("sur le plateau 26, un tour complet crédite le bonus une seule fois ; atterrir sur Départ compte aussi comme un passage", () => {
    // Plateau linéaire de 8 cases, un pas par tour : chaque joueur franchit Départ tous les 8 tours.
    const sim = simulate(makeLineSetup({ cells: { 1: "question", 2: "question", 3: "question", 4: "question", 5: "question", 6: "question", 7: "question" }, players: players(2), rules: { ...NO_ZAKAT, passStartBonus: 100, endCondition: { kind: "turns_per_player", turns: 9 } } }));
    for (const p of sim.state.players) {
      const crossings = eventsOf(sim.events, "PassedStart").filter((e) => e.playerId === p.id);
      expect(crossings).toHaveLength(1);
      expect(crossings[0]!.bonus).toBe(100);
      expect(ledgerOf(sim.state, p.id).filter((t) => t.reason === "start_bonus")).toEqual([expect.objectContaining({ amount: 100 })]);
    }
    expect(checkInvariants(sim.state)).toEqual([]);
    expect(DEMO_RULES_QUICK.passStartBonus).toBe(100);
  });

  it("le bonus vient des règles (données) : à 0, aucun passage n'est payé", () => {
    const sim = simulate(makeLineSetup({ cells: { 1: "question", 2: "question", 3: "question", 4: "question", 5: "question", 6: "question", 7: "question" }, players: players(2), rules: { ...NO_ZAKAT, passStartBonus: 0, endCondition: { kind: "turns_per_player", turns: 9 } } }));
    expect(eventsOf(sim.events, "PassedStart")).toHaveLength(0);
    expect(sim.state.ledger.some((t) => t.reason === "start_bonus")).toBe(false);
  });
});

describe("Trésor : +100 Kounouz à l'arrivée, exactement une fois, sans scénario ni hasard", () => {
  it("crédite le montant des règles par le grand livre et n'appelle aucun scénario Trésor", () => {
    const landed = journey(create(makeLineSetup({ cells: { 1: "treasure" }, scenarios: DEMO_SCENARIOS, rules: NO_ZAKAT })).state);
    const found = eventsOf(landed.events, "TreasureFound");
    expect(found).toEqual([{ type: "TreasureFound", playerId: pid("p1"), amount: 100 }]);
    expect(ledgerOf(landed.state, "p1").filter((t) => t.reason === "treasure")).toEqual([expect.objectContaining({ amount: 100 })]);
    expect(landed.state.players[0]!.money).toBe(TEST_RULES_QUICK.startingMoney + 100);
    expect(eventsOf(landed.events, "ScenarioTriggered")).toHaveLength(0);
    // Le tour se clôt tout seul : aucune décision humaine.
    expect(landed.state.activePlayerIndex).toBe(1);
    expect(checkInvariants(landed.state)).toEqual([]);
    expect(DEMO_RULES_QUICK.treasure.amount).toBe(100);
  });

  it("une partie ancienne (trésor à 0 dans ses règles) laisse la case servir ses scénarios", () => {
    const landed = journey(create(makeLineSetup({ cells: { 1: "treasure" }, scenarios: DEMO_SCENARIOS, rules: { ...NO_ZAKAT, treasure: { amount: 0 } } })).state);
    expect(eventsOf(landed.events, "TreasureFound")).toHaveLength(0);
    expect(eventsOf(landed.events, "ScenarioTriggered")).toHaveLength(1);
  });
});

describe("Don : un don volontaire vers la Caisse Masākīn ou vers un joueur, toujours par le grand livre ; jamais une Zakat", () => {
  const land = (rules: RulesConfig = NO_ZAKAT) => journey(create(makeLineSetup({ cells: { 1: "donation" }, players: players(3), rules })).state);

  it("propose les montants des règles que le joueur peut payer, puis attend sa décision", () => {
    const landed = land();
    expect(eventsOf(landed.events, "DonationOffered")).toEqual([{ type: "DonationOffered", playerId: pid("p1"), amounts: [10, 20, 50, 100], candidates: [pid("p2"), pid("p3")] }]);
    expect(landed.state.phase.kind).toBe("awaiting_donation");
    expect(checkInvariants(landed.state)).toEqual([]);
  });

  it("vers la Caisse Masākīn : dépôt tracé (écriture joueur + écriture caisse liées), les Kounouz n'appartiennent plus à personne, action de solidarité comptée", () => {
    const landed = land();
    const done = run(landed.state, { type: "Donate", playerId: pid("p1"), amount: 20, to: { kind: "masakin" } });
    expect(eventsOf(done.events, "DonationMade")).toEqual([{ type: "DonationMade", playerId: pid("p1"), amount: 20, to: { kind: "masakin" } }]);
    expect(eventsOf(done.events, "FundChanged")).toEqual([{ type: "FundChanged", fund: "masakin", fromPlayerId: pid("p1"), amount: 20, reason: "donation", balanceAfter: 20, ref: "f1" }]);
    expect(done.state.funds.masakin).toBe(20);
    expect(done.state.fundLedger).toEqual([expect.objectContaining({ id: 1, fund: "masakin", fromPlayerId: pid("p1"), amount: 20, reason: "donation", balanceAfter: 20, ref: "f1" })]);
    expect(ledgerOf(done.state, "p1").filter((t) => t.reason === "donation_sent")).toEqual([expect.objectContaining({ amount: -20, ref: "f1" })]);
    expect(done.state.players[0]!.money).toBe(TEST_RULES_QUICK.startingMoney - 20);
    expect(done.state.players.reduce((s, p) => s + p.money, 0) + done.state.funds.masakin).toBe(3 * TEST_RULES_QUICK.startingMoney);
    expect(done.state.players[0]).toMatchObject({ solidarityActions: 1, solidarityGiven: 20 });
    expect(eventsOf(done.events, "MoneyTransferred")).toHaveLength(0);
    expect(checkInvariants(done.state)).toEqual([]);
  });

  it("vers un joueur : transfert équilibré par le grand livre (motif `donation`), compté comme solidarité", () => {
    const landed = land();
    const done = run(landed.state, { type: "Donate", playerId: pid("p1"), amount: 50, to: { kind: "player", playerId: pid("p3") } });
    expect(eventsOf(done.events, "MoneyTransferred")).toEqual([expect.objectContaining({ fromPlayerId: pid("p1"), toPlayerId: pid("p3"), amount: 50, reason: "donation" })]);
    expect(eventsOf(done.events, "DonationMade")[0]).toMatchObject({ amount: 50, to: { kind: "player", playerId: pid("p3") } });
    expect(done.state.players[2]!.money).toBe(TEST_RULES_QUICK.startingMoney + 50);
    expect(done.state.funds.masakin).toBe(0);
    expect(checkInvariants(done.state)).toEqual([]);
  });

  it("refuse un montant hors liste ou un joueur inconnu ; sans aucun montant payable, la case ne demande rien", () => {
    const landed = land();
    expect(reduce(landed.state, { type: "Donate", playerId: pid("p1"), amount: 33, to: { kind: "masakin" } })).toMatchObject({ ok: false, error: { code: "INVALID_DONATION" } });
    expect(reduce(landed.state, { type: "Donate", playerId: pid("p1"), amount: 10, to: { kind: "player", playerId: pid("p1") } })).toMatchObject({ ok: false, error: { code: "INVALID_RECIPIENT" } });
    const poor = journey(create(makeLineSetup({ cells: { 1: "donation" }, players: players(2), rules: { ...NO_ZAKAT, startingMoney: 5 } })).state);
    expect(eventsOf(poor.events, "DonationUnavailable")).toHaveLength(1);
    expect(poor.state.phase.kind).not.toBe("awaiting_donation");
    expect(checkInvariants(poor.state)).toEqual([]);
  });

  it("les montants proposés sont des données (10 / 20 / 50 / 100 en démonstration) ; le joueur ne voit que ceux qu'il peut payer", () => {
    expect(DEMO_RULES_QUICK.donation.amounts).toEqual([10, 20, 50, 100]);
    const landed = journey(create(makeLineSetup({ cells: { 1: "donation" }, players: players(2), rules: { ...NO_ZAKAT, startingMoney: 30 } })).state);
    expect(landed.state.phase.kind === "awaiting_donation" && landed.state.phase.amounts).toEqual([10, 20]);
  });
});

describe("Zakat al-Māl : annuelle, hors plateau, commune à tous les joueurs, 2,5 % des Kounouz éligibles au-dessus du nissab", () => {
  const rules: RulesConfig = { ...TEST_RULES_QUICK, zakat: { enabled: true, rate: 0.025, nisabKounouz: 500, cycleRounds: 2, eligibleAssetTypes: ["money"] }, endCondition: { kind: "turns_per_player", turns: 6 } };
  // Aucune case Zakat, aucune case économique : seules des questions (réponses sans récompense).
  const setup = makeLineSetup({ cells: { 1: "question", 2: "question", 3: "question", 4: "question", 5: "question", 6: "question", 7: "question" }, players: players(3), rules: { ...rules, rewards: { correct: 0, partial: 0, incorrect: 0, masteryMultiplier: 1 }, passStartBonus: 0 } });

  it("l'échéance tombe à la fin du tour de table n° cycleRounds, pour tous les joueurs en même temps, indépendamment de leurs positions", () => {
    const sim = simulate(setup, { answer: () => answer("incorrect"), buy: () => false, choose: (o) => o[0]!.id });
    const requested = eventsOf(sim.events, "ZakatEvaluationRequested");
    // 6 tours par joueur, une année tous les 2 tours de table → 3 années.
    expect(requested.map((e) => e.year)).toEqual([1, 2, 3]);
    expect(requested[0]).toMatchObject({ nisab: 500, rate: 0.025 });
    const paid = eventsOf(sim.events, "ZakatPaid");
    expect(paid.filter((e) => e.year === 1).map((e) => e.playerId)).toEqual([pid("p1"), pid("p2"), pid("p3")]);
    // Année 1 : chacun a 1000 Kounouz → 25 chacun, à la Caisse Masākīn.
    for (const e of paid.filter((x) => x.year === 1)) expect(e).toMatchObject({ base: 1000, amount: 25, to: { kind: "masakin" } });
    expect(eventsOf(sim.events, "YearCompleted").map((e) => e.year)).toEqual([1, 2, 3]);
    expect(sim.state.calendar).toEqual({ year: 4, roundsInYear: 0 });
    expect(sim.state.funds.masakin).toBe(sim.state.fundLedger.reduce((s, t) => s + t.amount, 0));
    expect(sim.state.fundLedger.every((t) => t.reason === "zakat")).toBe(true);
    expect(sim.state.ledger.filter((t) => t.reason === "zakat_paid")).toHaveLength(paid.length);
    expect(checkInvariants(sim.state)).toEqual([]);
    // L'échéance de l'année 1 tombe exactement après 2 tours de table (6 fins de tour), jamais selon les pions.
    const firstRequest = sim.events.findIndex((e) => e.type === "ZakatEvaluationRequested");
    expect(sim.events.slice(0, firstRequest).filter((e) => e.type === "TurnEnded")).toHaveLength(6);
  });

  it("sous le nissab, rien n'est dû ; la valeur des monuments n'entre jamais dans la base ; le taux et le nissab viennent des règles", () => {
    const { state } = create(makeSetup({ rules }));
    const rich = state.players[0]!;
    expect(zakatDue(state, rich)).toEqual({ base: 1000, amount: 25, due: true });
    expect(zakatDue(state, { ...rich, money: 499 })).toEqual({ base: 499, amount: 0, due: false });
    expect(zakatDue(state, { ...rich, money: 0 })).toEqual({ base: 0, amount: 0, due: false });
    // Un monument possédé (valeur 250) ne change pas la base.
    const withHolding: GameState = { ...state, holdings: [{ siteId: "test-monument-01", ownerId: rich.id, price: 300, heritageValue: 250, acquiredTurn: 1 }] };
    expect(zakatDue(withHolding, rich).base).toBe(1000);
    expect(rules.zakat.eligibleAssetTypes).toEqual(["money"]);
    expect(DEMO_RULES_QUICK.zakat.rate).toBe(0.025);
    expect(DEMO_RULES_QUICK.zakat.eligibleAssetTypes).toEqual(["money"]);
  });

  it("un joueur sous le nissab est évalué mais ne verse rien (événement ZakatNotDue) ; désactivée, la mécanique ne produit aucun événement", () => {
    const poorRules: RulesConfig = { ...setup.rules, zakat: { ...setup.rules.zakat, nisabKounouz: 1001 } };
    const sim = simulate({ ...setup, rules: poorRules }, { answer: () => answer("incorrect"), buy: () => false, choose: (o) => o[0]!.id });
    expect(eventsOf(sim.events, "ZakatPaid")).toHaveLength(0);
    expect(eventsOf(sim.events, "ZakatNotDue").filter((e) => e.year === 1)).toHaveLength(3);
    const off = simulate({ ...setup, rules: { ...setup.rules, zakat: { ...setup.rules.zakat, enabled: false } } }, { answer: () => answer("incorrect"), buy: () => false, choose: (o) => o[0]!.id });
    expect(eventsOf(off.events, "ZakatEvaluationRequested")).toHaveLength(0);
    expect(off.state.funds.masakin).toBe(0);
  });
});

describe("migration 32 → 26 : sauvegardes, reprise, joueurs, économie neutre enfant / adulte", () => {
  it("une sauvegarde v6 (plateau 32, sans caisse ni calendrier) se relit avec des règles neutres et garde ses positions", () => {
    const { state } = create(makeLineSetup());
    const moved = journey(state);
    const v6 = JSON.parse(serializeGameState(moved.state)) as Record<string, unknown>;
    const config = v6["config"] as Record<string, unknown>;
    const rulesV6 = { ...(config["rules"] as Record<string, unknown>) };
    delete rulesV6["treasure"];
    delete rulesV6["donation"];
    delete rulesV6["zakat"];
    delete v6["funds"];
    delete v6["fundLedger"];
    delete v6["calendar"];
    const restored = deserializeGameState(JSON.stringify({ ...v6, schemaVersion: 6, config: { ...config, rules: rulesV6 } }));
    expect(restored.ok).toBe(true);
    if (!restored.ok) return;
    expect(restored.value.players.map((p) => p.position)).toEqual(moved.state.players.map((p) => p.position));
    expect(restored.value.funds).toEqual({ masakin: 0 });
    expect(restored.value.calendar).toEqual({ year: 1, roundsInYear: 0 });
    expect(restored.value.config.rules.treasure.amount).toBe(0);
    expect(restored.value.config.rules.donation.amounts).toEqual([]);
    expect(restored.value.config.rules.zakat.enabled).toBe(false);
    expect(checkInvariants(restored.value)).toEqual([]);
  });

  it("l'aller-retour conserve la caisse, son grand livre, le calendrier et la phase Don", () => {
    const landed = journey(create(makeLineSetup({ cells: { 1: "donation" }, players: players(2), rules: NO_ZAKAT })).state);
    const back = deserializeGameState(serializeGameState(landed.state));
    expect(back.ok && back.value).toEqual(landed.state);
    const done = run(landed.state, { type: "Donate", playerId: pid("p1"), amount: 100, to: { kind: "masakin" } });
    const again = deserializeGameState(serializeGameState(done.state));
    expect(again.ok && again.value).toEqual(done.state);
  });

  it("de 2 à 6 joueurs sur le vrai plateau 26 avec les données de démonstration : partie complète, aucune violation, positions toujours dans le plateau, enfants et adultes traités pareil", () => {
    for (let n = 2; n <= 6; n += 1) {
      const sim = simulate(makeSetup({ players: players(n), board: DEFAULT_BOARD, heritageSites: DEMO_HERITAGE_SITES, scenarios: DEMO_SCENARIOS, rules: { ...DEMO_RULES_QUICK, endCondition: { kind: "turns_per_player", turns: 8 } } }));
      expect(sim.state.status).toBe("finished");
      expect(checkInvariants(sim.state)).toEqual([]);
      for (const p of sim.state.players) expect(p.position).toBeLessThan(sim.state.config.board.cellCount);
      expect(sim.state.config.board.cellCount).toBe(26);
      // Aucune règle économique ne lit le profil : les écritures sont les mêmes pour un enfant et un adulte à situation égale.
      const reasons = new Set(sim.state.ledger.map((t) => t.reason));
      expect([...reasons].every((r) => !/child|adult/.test(r))).toBe(true);
    }
  });

  it("le nombre de cases n'est jamais codé en dur : un plateau de 12 cases boucle et paie Départ correctement", () => {
    const twelve = { id: "board-12", version: 1, cellCount: 12, cells: Array.from({ length: 12 }, (_, i) => ({ position: i, type: i === 0 ? ("start" as const) : ("question" as const) })) };
    const sim = simulate(makeLineSetup({ board: twelve, heritageSites: [], journey: ONE_STEP_CYCLE, players: players(2), rules: { ...NO_ZAKAT, endCondition: { kind: "turns_per_player", turns: 13 } } }));
    for (const p of sim.state.players) expect(eventsOf(sim.events, "PassedStart").filter((e) => e.playerId === p.id)).toHaveLength(1);
    expect(sim.state.players.every((p) => p.position < 12)).toBe(true);
    expect(active(sim.state)).toBeDefined();
    expect(sim.state.gameId).toBe("game-test" as GameId);
  });
});
