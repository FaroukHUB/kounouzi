import { describe, expect, it } from "vitest";
import { DEMO_ESTABLISHMENTS } from "@/config/demo";
import { HASSANAT_CARDS, HASSANAT_CONFIG } from "@/config/hassanat";
import { checkInvariants, computeRanking, deserializeGameState, grantHassanat, hassanatConfigSchema, reduce, scoreOf, serializeGameState, type GameSetup, type GameState, type HassanatCardDefinition, type RulesConfig } from "@/core/game";
import { TEST_RULES_QUICK } from "../../fixtures/game/rules.fixture";
import { scenariosOf } from "../../fixtures/game/scenarios.fixture";
import { create, eventsOf, journey, makeLineSetup, makeSetup, pid, players, run, simulate } from "../../fixtures/game/setup.fixture";

const NO_ZAKAT: RulesConfig = { ...TEST_RULES_QUICK, zakat: { ...TEST_RULES_QUICK.zakat, enabled: false } };
const money = (s: GameState, id: string) => s.players.find((p) => p.id === id)!.money;
const points = (s: GameState, id: string) => s.players.find((p) => p.id === id)!.hassanatPoints;
const load = (json: string): GameState => {
  const r = deserializeGameState(json);
  if (!r.ok) throw new Error(JSON.stringify(r.error));
  return r.value;
};
/** Case Défi (position 1) dont le scénario déclenche une occasion Hassanāt, par le système déterministe existant. */
const setupFor = (overrides: Partial<GameSetup> = {}) => makeLineSetup({ cells: { 1: "challenge" }, scenarios: scenariosOf("challenge-hassanat"), players: players(3), rules: NO_ZAKAT, hassanat: HASSANAT_CONFIG, ...overrides });
const only = (card: HassanatCardDefinition): Partial<GameSetup> => ({ hassanat: { definitions: [card] } });
const MEAL = HASSANAT_CARDS.find((c) => c.kind === "offer_meal")!;
const UMRAH = HASSANAT_CARDS.find((c) => c.kind === "offer_umrah")!;
const HELP = HASSANAT_CARDS.find((c) => c.kind === "help_player")!;

describe("banque Hassanāt : données validées par Zod, trois types, rien de codé en dur", () => {
  it("contient les trois types (repas, ʿUmra, aide) avec coût, destination du coût et points ; le schéma refuse une carte incomplète", () => {
    expect(HASSANAT_CARDS.map((c) => c.kind).sort()).toEqual(["help_player", "offer_meal", "offer_umrah"]);
    expect(HASSANAT_CONFIG.definitions).toBe(HASSANAT_CARDS);
    expect(hassanatConfigSchema.safeParse({ definitions: [{ id: "x", kind: "offer_meal", title: "t", text: "x", cost: 1, costDestination: "none", hassanatReward: 1 }] }).success).toBe(true);
    expect(hassanatConfigSchema.safeParse({ definitions: [{ id: "x", kind: "offer_meal", title: "t", text: "x", cost: -1, costDestination: "none", hassanatReward: 1 }] }).success).toBe(false);
    expect(hassanatConfigSchema.safeParse({ definitions: [{ id: "x", kind: "offer_meal", title: "t", text: "x", cost: 1, costDestination: "elsewhere", hassanatReward: 1 }] }).success).toBe(false);
    // Le lien établissement ↔ Hassanāt est prêt (champs optionnels), sans rabais décidé.
    expect(hassanatConfigSchema.safeParse({ definitions: [{ id: "x", kind: "offer_meal", title: "t", text: "x", cost: 20, ownerCost: 5, costDestination: "none", hassanatReward: 10, requiresEstablishmentFamily: "maghreb_restaurant" }] }).success).toBe(true);
    expect(HASSANAT_CARDS.every((c) => c.requiresEstablishmentFamily === undefined && c.ownerCost === undefined)).toBe(true);
  });

  it("les coûts et les points viennent de la configuration : une autre banque donne d'autres montants, sans toucher au moteur", () => {
    const custom: HassanatCardDefinition = { ...MEAL, id: "HS-X", cost: 7, hassanatReward: 3 };
    const offered = journey(create(setupFor(only(custom))).state);
    expect(eventsOf(offered.events, "HassanatOffered")).toEqual([expect.objectContaining({ cardId: "HS-X", cost: 7, hassanatReward: 3, candidates: ["p2", "p3"] })]);
    const accepted = run(offered.state, { type: "AcceptHassanat", playerId: pid("p1"), beneficiaryId: pid("p2") });
    expect(money(accepted.state, "p1")).toBe(993);
    expect(points(accepted.state, "p1")).toBe(3);
  });
});

describe("carte Hassanāt : acceptée → coût réglé et points crédités une fois ; passée → 0 point, 0 pénalité", () => {
  it("accepter : Kounouz −coût (dépensés : personne ne les reçoit), +points Hassanāt, grand livre Hassanāt, action de solidarité comptée ; le bénéficiaire ne perd rien", () => {
    const offered = journey(create(setupFor(only(MEAL))).state);
    expect(offered.state.phase).toMatchObject({ kind: "awaiting_hassanat", hassanat: { cardId: MEAL.id, playerId: "p1", cost: MEAL.cost, candidates: ["p2", "p3"] } });
    expect(eventsOf(offered.events, "FamilyChallengeAssigned")).toHaveLength(0);
    const accepted = run(offered.state, { type: "AcceptHassanat", playerId: pid("p1"), beneficiaryId: pid("p2") });
    expect(eventsOf(accepted.events, "HassanatAccepted")).toEqual([{ type: "HassanatAccepted", playerId: pid("p1"), cardId: MEAL.id, beneficiaryId: pid("p2"), cost: MEAL.cost }]);
    expect(eventsOf(accepted.events, "HassanatGranted")).toEqual([{ type: "HassanatGranted", playerId: pid("p1"), cardId: MEAL.id, amount: MEAL.hassanatReward, ref: `h1:${MEAL.id}`, total: MEAL.hassanatReward }]);
    expect(money(accepted.state, "p1")).toBe(1000 - MEAL.cost);
    expect(money(accepted.state, "p2")).toBe(1000);
    expect(points(accepted.state, "p1")).toBe(MEAL.hassanatReward);
    expect(points(accepted.state, "p2")).toBe(0);
    expect(accepted.state.hassanatLedger).toEqual([expect.objectContaining({ playerId: "p1", amount: MEAL.hassanatReward, source: "hassanat_card", ref: `h1:${MEAL.id}` })]);
    expect(accepted.state.ledger.filter((t) => t.reason === "hassanat_cost")).toEqual([expect.objectContaining({ playerId: "p1", amount: -MEAL.cost })]);
    expect(accepted.state.players[0]!.solidarityActions).toBe(1);
    expect(accepted.state.phase.kind).toBe("awaiting_journey");
    expect(checkInvariants(accepted.state)).toEqual([]);
  });

  it("passer : aucun point, aucune pénalité, aucune écriture ; le tour continue", () => {
    const offered = journey(create(setupFor(only(UMRAH))).state);
    const skipped = run(offered.state, { type: "SkipHassanat", playerId: pid("p1") });
    expect(eventsOf(skipped.events, "HassanatSkipped")).toEqual([{ type: "HassanatSkipped", playerId: pid("p1"), cardId: UMRAH.id }]);
    expect(money(skipped.state, "p1")).toBe(1000);
    expect(points(skipped.state, "p1")).toBe(0);
    expect(skipped.state.hassanatLedger).toEqual([]);
    expect(skipped.state.ledger.some((t) => t.reason === "hassanat_cost")).toBe(false);
    expect(skipped.state.phase.kind).toBe("awaiting_journey");
    expect(skipped.state.activePlayerIndex).toBe(1);
  });

  it("aucun double gain : la même référence n'est jamais créditée deux fois, et une carte ne se répond qu'une fois", () => {
    const accepted = run(journey(create(setupFor(only(MEAL))).state).state, { type: "AcceptHassanat", playerId: pid("p1"), beneficiaryId: pid("p2") });
    const again = grantHassanat(accepted.state, pid("p1"), MEAL.hassanatReward, `h1:${MEAL.id}`, MEAL.id);
    expect(again.events).toEqual([]);
    expect(points(again.state, "p1")).toBe(MEAL.hassanatReward);
    expect(reduce(accepted.state, { type: "AcceptHassanat", playerId: pid("p1"), beneficiaryId: pid("p2") }).ok).toBe(false);
    expect(reduce(accepted.state, { type: "SkipHassanat", playerId: pid("p1") }).ok).toBe(false);
  });

  it("aider un joueur : le coût va au bénéficiaire (transfert `hassanat` équilibré) ; vers la Caisse Masākīn : écriture de caisse liée", () => {
    const helped = run(journey(create(setupFor(only(HELP))).state).state, { type: "AcceptHassanat", playerId: pid("p1"), beneficiaryId: pid("p3") });
    expect(eventsOf(helped.events, "MoneyTransferred")).toEqual([expect.objectContaining({ fromPlayerId: "p1", toPlayerId: "p3", amount: HELP.cost, reason: "hassanat" })]);
    expect(money(helped.state, "p3")).toBe(1000 + HELP.cost);
    expect(points(helped.state, "p1")).toBe(HELP.hassanatReward);
    expect(points(helped.state, "p3")).toBe(0);
    const toFund = run(journey(create(setupFor(only({ ...MEAL, id: "HS-F", costDestination: "masakin" }))).state).state, { type: "AcceptHassanat", playerId: pid("p1"), beneficiaryId: pid("p2") });
    expect(eventsOf(toFund.events, "FundChanged")).toEqual([expect.objectContaining({ fund: "masakin", fromPlayerId: "p1", amount: MEAL.cost, reason: "hassanat" })]);
    expect(toFund.state.funds.masakin).toBe(MEAL.cost);
    expect(checkInvariants(toFund.state)).toEqual([]);
  });

  it("bénéficiaire invalide (soi-même, inconnu) refusé ; sans les Kounouz du coût, aucune carte n'est proposée (HassanatUnavailable), la partie continue", () => {
    const offered = journey(create(setupFor(only(MEAL))).state).state;
    expect(reduce(offered, { type: "AcceptHassanat", playerId: pid("p1"), beneficiaryId: pid("p1") })).toMatchObject({ ok: false, error: { code: "INVALID_BENEFICIARY" } });
    expect(reduce(offered, { type: "AcceptHassanat", playerId: pid("p1"), beneficiaryId: pid("zz") })).toMatchObject({ ok: false, error: { code: "INVALID_BENEFICIARY" } });
    const poor = journey(create(setupFor({ ...only(MEAL), rules: { ...NO_ZAKAT, startingMoney: MEAL.cost - 1 } })).state);
    expect(eventsOf(poor.events, "HassanatUnavailable")).toEqual([{ type: "HassanatUnavailable", playerId: pid("p1") }]);
    expect(poor.state.phase.kind).toBe("awaiting_journey");
  });

  it("rotation déterministe : chaque joueur reçoit d'abord la carte qu'on lui a le moins servie ; jamais de hasard", () => {
    const sim = simulate(setupFor({ rules: { ...NO_ZAKAT, endCondition: { kind: "turns_per_player", turns: 1 } } }), { answer: () => ({ outcome: "correct", explanationMastery: "none", validationMode: "collective" }), buy: () => false, choose: (o) => o[0]!.id, hassanat: (_c, candidates) => candidates[0]! });
    const offered = eventsOf(sim.events, "HassanatOffered");
    expect(offered.map((e) => e.playerId)).toEqual(["p1", "p2", "p3"]);
    // Trois joueurs, trois cartes : la rotation globale sert des cartes différentes à la tablée.
    expect(new Set(offered.map((e) => e.cardId)).size).toBe(3);
    expect(sim.state.players.every((p) => p.hassanatPoints > 0)).toBe(true);
    expect(checkInvariants(sim.state)).toEqual([]);
  });
});

describe("deux ressources distinctes : Kounouz et points Hassanāt ; score configurable ; Zakat et Don ne donnent jamais de Hassanāt", () => {
  it("le score ignore les Hassanāt à poids 0 (aucune formule de victoire décidée) ; un poids configuré les compte, sans conversion 1 = 1", () => {
    const accepted = run(journey(create(setupFor(only(MEAL))).state).state, { type: "AcceptHassanat", playerId: pid("p1"), beneficiaryId: pid("p2") }).state;
    expect(scoreOf(accepted, pid("p1"))).toBe(1000 - MEAL.cost);
    expect(computeRanking(accepted).find((r) => r.playerId === "p1")).toMatchObject({ hassanat: MEAL.hassanatReward });
    const weighted: GameState = { ...accepted, config: { ...accepted.config, rules: { ...accepted.config.rules, scoring: { ...accepted.config.rules.scoring, hassanatWeight: 2 } } } };
    expect(scoreOf(weighted, pid("p1"))).toBe(1000 - MEAL.cost + 2 * MEAL.hassanatReward);
  });

  it("la Zakat al-Māl et le Don ne créditent jamais de points Hassanāt", () => {
    const board = makeLineSetup({ cells: { 1: "question", 2: "donation", 3: "question", 4: "question", 5: "question", 6: "question", 7: "question" }, players: players(2), rules: { ...TEST_RULES_QUICK, startingMoney: 1100, endCondition: { kind: "turns_per_player", turns: 8 } }, hassanat: HASSANAT_CONFIG });
    const sim = simulate(board, { answer: () => ({ outcome: "correct", explanationMastery: "none", validationMode: "collective" }), buy: () => false, choose: (o) => o[0]!.id });
    expect(eventsOf(sim.events, "ZakatPaid").length).toBeGreaterThan(0);
    expect(eventsOf(sim.events, "DonationMade").length).toBeGreaterThan(0);
    expect(eventsOf(sim.events, "HassanatGranted")).toHaveLength(0);
    expect(sim.state.hassanatLedger).toEqual([]);
    expect(sim.state.players.every((p) => p.hassanatPoints === 0)).toBe(true);
  });

  it("Défi ≠ Hassanāt : le scénario Défi « question » ne propose pas de carte Hassanāt", () => {
    const q = journey(create(setupFor({ scenarios: scenariosOf("challenge-question") })).state);
    expect(eventsOf(q.events, "HassanatOffered")).toHaveLength(0);
    expect(q.state.phase.kind).toBe("awaiting_answer");
  });

  it("sauvegarde : phase Carte Hassanāt et points conservés ; sur le vrai plateau, une partie complète reste cohérente", () => {
    const offered = journey(create(setupFor(only(HELP))).state).state;
    const back = load(serializeGameState(offered));
    expect(back).toEqual(offered);
    const accepted = run(back, { type: "AcceptHassanat", playerId: pid("p1"), beneficiaryId: pid("p2") }).state;
    expect(load(serializeGameState(accepted))).toEqual(accepted);
    const real = simulate(makeSetup({ heritageSites: DEMO_ESTABLISHMENTS, scenarios: scenariosOf("challenge-hassanat", "challenge-question"), players: players(3), rules: { ...NO_ZAKAT, endCondition: { kind: "turns_per_player", turns: 12 } }, hassanat: HASSANAT_CONFIG }), { answer: () => ({ outcome: "correct", explanationMastery: "none", validationMode: "collective" }), buy: (a) => a, choose: (o) => o[0]!.id });
    expect(real.state.status).toBe("finished");
    expect(checkInvariants(real.state)).toEqual([]);
  });
});
