import { describe, expect, it } from "vitest";
import { DEFAULT_BOARD } from "@/config/board";
import { DEMO_HERITAGE_SITES, DEMO_RULES_QUICK, DEMO_SCENARIOS } from "@/config/demo";
import { addMoney, checkInvariants, deserializeGameState, isMoney, percentOf, reduce, serializeGameState, sumMoney, zakatDue, type GameState, type RulesConfig } from "@/core/game";
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

describe("Don : montant fixe des règles, destination au choix (Caisse Masākīn ou joueur), toujours par le grand livre ; jamais une Zakat", () => {
  const land = (rules: RulesConfig = NO_ZAKAT) => journey(create(makeLineSetup({ cells: { 1: "donation" }, players: players(3), rules })).state);

  it("propose le montant des règles et attend seulement la destination", () => {
    const landed = land();
    expect(eventsOf(landed.events, "DonationOffered")).toEqual([{ type: "DonationOffered", playerId: pid("p1"), amount: 20, candidates: [pid("p2"), pid("p3")] }]);
    expect(landed.state.phase.kind).toBe("awaiting_donation");
    expect(checkInvariants(landed.state)).toEqual([]);
    expect(DEMO_RULES_QUICK.donation.amount).toBe(20);
  });

  it("vers la Caisse Masākīn : dépôt tracé (écriture joueur + écriture caisse liées), les Kounouz n'appartiennent plus à personne, action de solidarité comptée", () => {
    const landed = land();
    const done = run(landed.state, { type: "Donate", playerId: pid("p1"), to: { kind: "masakin" } });
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
    const done = run(landed.state, { type: "Donate", playerId: pid("p1"), to: { kind: "player", playerId: pid("p3") } });
    expect(eventsOf(done.events, "MoneyTransferred")).toEqual([expect.objectContaining({ fromPlayerId: pid("p1"), toPlayerId: pid("p3"), amount: 20, reason: "donation" })]);
    expect(eventsOf(done.events, "DonationMade")[0]).toMatchObject({ amount: 20, to: { kind: "player", playerId: pid("p3") } });
    expect(done.state.players[2]!.money).toBe(TEST_RULES_QUICK.startingMoney + 20);
    expect(done.state.funds.masakin).toBe(0);
    expect(checkInvariants(done.state)).toEqual([]);
  });

  it("refuse un joueur inconnu ; sans les 20 Kounouz, la case ne demande rien ; à 0 dans les règles (partie migrée), la case est inactive", () => {
    const landed = land();
    expect(reduce(landed.state, { type: "Donate", playerId: pid("p1"), to: { kind: "player", playerId: pid("p1") } })).toMatchObject({ ok: false, error: { code: "INVALID_RECIPIENT" } });
    const poor = journey(create(makeLineSetup({ cells: { 1: "donation" }, players: players(2), rules: { ...NO_ZAKAT, startingMoney: 15 } })).state);
    expect(eventsOf(poor.events, "DonationUnavailable")).toHaveLength(1);
    expect(poor.state.phase.kind).not.toBe("awaiting_donation");
    const inactive = journey(create(makeLineSetup({ cells: { 1: "donation" }, players: players(2), rules: { ...NO_ZAKAT, donation: { amount: 0 } } })).state);
    expect(eventsOf(inactive.events, "DonationUnavailable")).toHaveLength(1);
    expect(checkInvariants(poor.state)).toEqual([]);
  });
});

describe("Zakat al-Māl : ḥawl par joueur contrôlé à chaque tour de table complet, exactement 2,5 % au centime, hors plateau", () => {
  const rules: RulesConfig = { ...TEST_RULES_QUICK, zakat: { enabled: true, rate: 0.025, nisabKounouz: 1000, cycleRounds: 6, eligibleAssetTypes: ["money"] }, passStartBonus: 0, rewards: { correct: 0, partial: 0, incorrect: 0, masteryMultiplier: 1 } };
  // Aucune case Zakat, aucune case économique : seules des questions (réponses sans récompense).
  const quiet = { 1: "question", 2: "question", 3: "question", 4: "question", 5: "question", 6: "question", 7: "question" } as const;
  const silent = { answer: () => answer("incorrect"), buy: () => false, choose: (o: readonly { id: string }[]) => o[0]!.id };

  it("après 6 tours de table consécutifs au-dessus du nissab, chaque joueur verse 2,5 % à la Caisse Masākīn, puis un nouveau ḥawl commence", () => {
    // 1100 Kounouz au départ : après la première Zakat (27,50), chacun reste au-dessus du nissab et un second ḥawl s'accomplit.
    const sim = simulate(makeLineSetup({ cells: quiet, players: players(3), rules: { ...rules, startingMoney: 1100, endCondition: { kind: "turns_per_player", turns: 13 } } }), silent);
    // 13 tours par joueur → 13 tours de table : ḥawl accompli aux tours de table 6 et 12.
    const paid = eventsOf(sim.events, "ZakatPaid");
    expect(paid.map((e) => e.playerId)).toEqual([pid("p1"), pid("p2"), pid("p3"), pid("p1"), pid("p2"), pid("p3")]);
    expect(paid[0]).toMatchObject({ base: 1100, amount: 27.5, to: { kind: "masakin" } });
    // Deuxième ḥawl : base 1072,50 → 26,8125 → 26,81 au centime (jamais tronqué à l'entier).
    expect(paid[3]).toMatchObject({ base: 1072.5, amount: 26.81 });
    expect(eventsOf(sim.events, "HawlCompleted")).toHaveLength(6);
    const advanced = eventsOf(sim.events, "HawlAdvanced").filter((e) => e.playerId === pid("p1")).map((e) => e.rounds);
    expect(advanced.slice(0, 5)).toEqual([1, 2, 3, 4, 5]);
    // Le premier ḥawl s'accomplit exactement après 6 tours de table (18 fins de tour), jamais selon les pions.
    const firstPaid = sim.events.findIndex((e) => e.type === "ZakatPaid");
    expect(sim.events.slice(0, firstPaid).filter((e) => e.type === "TurnEnded")).toHaveLength(18);
    expect(sim.state.players[0]!.money).toBe(1045.69);
    expect(sim.state.players.every((p) => p.hawlRounds === 1)).toBe(true);
    expect(sim.state.funds.masakin).toBe(sumMoney(sim.state.fundLedger.map((t) => t.amount)));
    expect(sim.state.funds.masakin).toBe(162.93);
    expect(sim.state.ledger.filter((t) => t.reason === "zakat_paid")).toHaveLength(6);
    expect(eventsOf(sim.events, "YearCompleted").map((e) => e.year)).toEqual([1, 2]);
    expect(checkInvariants(sim.state)).toEqual([]);
  });

  it("à 1000 pile : une seule Zakat (25), puis le joueur passe sous le nissab et aucun nouveau ḥawl ne s'ouvre tant qu'il n'y revient pas", () => {
    const sim = simulate(makeLineSetup({ cells: quiet, players: players(2), rules: { ...rules, endCondition: { kind: "turns_per_player", turns: 13 } } }), silent);
    expect(eventsOf(sim.events, "ZakatPaid").map((e) => e.amount)).toEqual([25, 25]);
    expect(sim.state.players.map((p) => [p.money, p.hawlRounds])).toEqual([[975, 0], [975, 0]]);
    expect(sim.state.funds.masakin).toBe(50);
  });

  it("le taux est exact au centime, jamais tronqué : 2,5 % de 1005 = 25,13 ; les additions du grand livre restent exactes", () => {
    const { state } = create(makeSetup({ rules }));
    const p = state.players[0]!;
    expect(zakatDue(state, { ...p, money: 1005 })).toEqual({ base: 1005, amount: 25.13, reached: true });
    expect(zakatDue(state, { ...p, money: 1000 })).toEqual({ base: 1000, amount: 25, reached: true });
    expect(zakatDue(state, { ...p, money: 1234.56 })).toEqual({ base: 1234.56, amount: 30.86, reached: true });
    expect(zakatDue(state, { ...p, money: 999.99 })).toEqual({ base: 999.99, amount: 0, reached: false });
    expect(percentOf(0.1, 0.025)).toBe(0);
    expect(addMoney(0.1, 0.2)).toBe(0.3);
    expect(sumMoney([0.1, 0.2, 0.3])).toBe(0.6);
    expect(isMoney(25.13)).toBe(true);
    expect(isMoney(25.125)).toBe(false);
  });

  it("sous le nissab, le ḥawl repart de zéro (interruption) ; la valeur des monuments n'entre jamais dans la base ; désactivée, rien ne se produit", () => {
    // Un joueur passe sous le nissab au 3e tour de table : son ḥawl est interrompu, il ne paie jamais ; les autres paient au 6e.
    const dip: RulesConfig = { ...rules, endCondition: { kind: "turns_per_player", turns: 7 } };
    const cells = { ...quiet, 3: "donation" } as const; // au 3e tour, chacun donne 20 : celui qui démarre à 1000 tombe à 980
    const sim = simulate(makeLineSetup({ cells, players: players(2), rules: { ...dip, donation: { amount: 20 } } }), { ...silent, donate: () => ({ kind: "masakin" }) });
    expect(eventsOf(sim.events, "HawlInterrupted").map((e) => [e.playerId, e.rounds])).toEqual([[pid("p1"), 2], [pid("p2"), 2]]);
    expect(eventsOf(sim.events, "ZakatPaid")).toHaveLength(0);
    expect(sim.state.players.every((p) => p.hawlRounds === 0)).toBe(true);
    const { state } = create(makeSetup({ rules }));
    const rich = state.players[0]!;
    const withHolding: GameState = { ...state, holdings: [{ siteId: "test-monument-01", ownerId: rich.id, price: 300, heritageValue: 250, acquiredTurn: 1 }] };
    expect(zakatDue(withHolding, rich).base).toBe(1000);
    expect(rules.zakat.eligibleAssetTypes).toEqual(["money"]);
    expect(DEMO_RULES_QUICK.zakat).toEqual({ enabled: true, rate: 0.025, nisabKounouz: 1000, cycleRounds: 6, eligibleAssetTypes: ["money"] });
    const off = simulate(makeLineSetup({ cells: quiet, players: players(2), rules: { ...rules, zakat: { ...rules.zakat, enabled: false }, endCondition: { kind: "turns_per_player", turns: 13 } } }), silent);
    expect(eventsOf(off.events, "HawlAdvanced")).toHaveLength(0);
    expect(off.state.funds.masakin).toBe(0);
  });

  it("aucune Zakat de fin de partie : une partie plus courte que le ḥawl ne verse rien", () => {
    const sim = simulate(makeLineSetup({ cells: quiet, players: players(2), rules: { ...rules, endCondition: { kind: "turns_per_player", turns: 5 } } }), silent);
    expect(eventsOf(sim.events, "ZakatPaid")).toHaveLength(0);
    expect(sim.state.players.every((p) => p.hawlRounds === 5)).toBe(true);
    expect(sim.state.status).toBe("finished");
  });
});

describe("migration 32 → 26 : sauvegardes, reprise, joueurs, économie neutre enfant / adulte", () => {
  it("une sauvegarde v6 (plateau 32, sans caisse ni calendrier) se relit avec des règles neutres et garde ses positions ; une v7 (liste de montants) devient un don fixe", () => {
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
    expect(restored.value.config.rules.donation.amount).toBe(0);
    expect(restored.value.config.rules.zakat.enabled).toBe(false);
    expect(restored.value.players.every((p) => p.hawlRounds === 0)).toBe(true);
    expect(checkInvariants(restored.value)).toEqual([]);
    // v7 : `donation.amounts` et phase Don avec liste → premier montant retenu, ḥawl à zéro.
    const v7 = JSON.parse(serializeGameState(moved.state)) as Record<string, unknown>;
    const c7 = v7["config"] as Record<string, unknown>;
    const r7 = { ...(c7["rules"] as Record<string, unknown>), donation: { amounts: [10, 20, 50, 100] } };
    const p7 = (v7["players"] as Record<string, unknown>[]).map((p) => { const { hawlRounds: _h, ...rest } = p; void _h; return rest; });
    const seven = deserializeGameState(JSON.stringify({ ...v7, schemaVersion: 7, config: { ...c7, rules: r7 }, players: p7 }));
    expect(seven.ok && seven.value.config.rules.donation.amount).toBe(10);
    expect(seven.ok && seven.value.players.every((p) => p.hawlRounds === 0)).toBe(true);
  });

  it("l'aller-retour conserve la caisse, son grand livre, le calendrier et la phase Don", () => {
    const landed = journey(create(makeLineSetup({ cells: { 1: "donation" }, players: players(2), rules: NO_ZAKAT })).state);
    const back = deserializeGameState(serializeGameState(landed.state));
    expect(back.ok && back.value).toEqual(landed.state);
    const done = run(landed.state, { type: "Donate", playerId: pid("p1"), to: { kind: "masakin" } });
    const again = deserializeGameState(serializeGameState(done.state));
    expect(again.ok && again.value).toEqual(done.state);
  });

  it("de 2 à 6 joueurs sur le vrai plateau 28 avec les données de démonstration : partie complète, aucune violation, positions toujours dans le plateau, enfants et adultes traités pareil", () => {
    for (let n = 2; n <= 6; n += 1) {
      const sim = simulate(makeSetup({ players: players(n), board: DEFAULT_BOARD, heritageSites: DEMO_HERITAGE_SITES, scenarios: DEMO_SCENARIOS, rules: { ...DEMO_RULES_QUICK, endCondition: { kind: "turns_per_player", turns: 8 } } }));
      expect(sim.state.status).toBe("finished");
      expect(checkInvariants(sim.state)).toEqual([]);
      for (const p of sim.state.players) expect(p.position).toBeLessThan(sim.state.config.board.cellCount);
      expect(sim.state.config.board.cellCount).toBe(28);
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
