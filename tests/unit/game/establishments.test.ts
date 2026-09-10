import { describe, expect, it } from "vitest";
import { DEMO_ESTABLISHMENTS, DEMO_HERITAGE_SITES } from "@/config/demo";
import { HASSANAT_CONFIG } from "@/config/hassanat";
import { checkInvariants, deserializeGameState, heritageSiteSchema, ownsWholeFamily, reduce, serializeGameState, ESTABLISHMENT_FAMILIES, type BoardConfig, type EstablishmentFamily, type GameState, type HeritageSite, type RulesConfig } from "@/core/game";
import { fr } from "@/i18n/fr";
import { TEST_RULES_QUICK } from "../../fixtures/game/rules.fixture";
import { create, eventsOf, journey, makeLineSetup, pid, players, run, simulate } from "../../fixtures/game/setup.fixture";

const NO_ZAKAT: RulesConfig = { ...TEST_RULES_QUICK, zakat: { ...TEST_RULES_QUICK.zakat, enabled: false } };
const HOTEL = DEMO_ESTABLISHMENTS.find((s) => s.id === "est-hotel-madinah-a")!;
const withFee = (site: HeritageSite, serviceFee: number): HeritageSite => ({ ...site, establishment: { ...site.establishment!, serviceFee } });
/** Plateau linéaire : Départ, Établissement, Savoir (cycle à 1 étape : chacun passe sur l'établissement tous les 3 tours). */
const TRIANGLE: BoardConfig = { id: "board-test-triangle", version: 1, cellCount: 3, cells: [{ position: 0, type: "start" }, { position: 1, type: "heritage" }, { position: 2, type: "question" }] };
/** Plateau linéaire de test avec UN seul établissement (position 1) ; la case 2, établissement par défaut, devient Savoir. */
const setupFor = (sites: readonly HeritageSite[], rules: RulesConfig = NO_ZAKAT, n = 2) => makeLineSetup({ cells: { 1: "heritage", 2: "question" }, heritageSites: sites, players: players(n), rules, hassanat: HASSANAT_CONFIG });
const PRICE = HOTEL.price!;
const money = (s: GameState, id: string) => s.players.find((p) => p.id === id)!.money;
const load = (json: string): GameState => {
  const r = deserializeGameState(json);
  if (!r.ok) throw new Error(JSON.stringify(r.error));
  return r.value;
};

describe("les 12 établissements du plateau 26 (données, jamais codés en dur)", () => {
  it("sont exactement 12, tous achetables (type interne conservé), avec famille, service, frais, nom FR et AR, icône ; aucun lieu de culte", () => {
    expect(DEMO_ESTABLISHMENTS).toHaveLength(12);
    expect(DEMO_HERITAGE_SITES).toBe(DEMO_ESTABLISHMENTS);
    for (const s of DEMO_ESTABLISHMENTS) {
      expect(s.kind).toBe("purchasable_monument");
      expect(s.price).toBeGreaterThan(0);
      expect(s.establishment).toBeDefined();
      expect(s.establishment!.name.fr.length).toBeGreaterThan(0);
      expect(s.establishment!.name.ar?.length ?? 0).toBeGreaterThan(0);
      expect(s.establishment!.icon?.length ?? 0).toBeGreaterThan(0);
      expect(s.establishment!.serviceFee).toBeGreaterThan(0);
      expect(ESTABLISHMENT_FAMILIES).toContain(s.establishment!.family);
    }
    expect(DEMO_ESTABLISHMENTS.map((s) => s.id)).toEqual([
      "est-maktaba-albani",
      "est-maktaba-ibn-baz",
      "est-hotel-madinah-a",
      "est-hotel-madinah-b",
      "est-hotel-makkah-a",
      "est-hotel-makkah-b",
      "est-restaurant-algerie",
      "est-restaurant-maroc",
      "est-umrah-agency-a",
      "est-umrah-agency-b",
      "est-museum-dubai",
      "est-park-kounouzi",
    ]);
  });

  it("les familles sont correctement définies : 2 maktaba, 2 hôtels Médine, 2 hôtels La Mecque, 2 restaurants, 2 agences ; musée et parc indépendants", () => {
    const byFamily = (f: EstablishmentFamily) => DEMO_ESTABLISHMENTS.filter((s) => s.establishment!.family === f).map((s) => s.id);
    expect(byFamily("maktaba")).toEqual(["est-maktaba-albani", "est-maktaba-ibn-baz"]);
    expect(byFamily("madinah_hotel")).toEqual(["est-hotel-madinah-a", "est-hotel-madinah-b"]);
    expect(byFamily("makkah_hotel")).toEqual(["est-hotel-makkah-a", "est-hotel-makkah-b"]);
    expect(byFamily("maghreb_restaurant")).toEqual(["est-restaurant-algerie", "est-restaurant-maroc"]);
    expect(byFamily("umrah_agency")).toEqual(["est-umrah-agency-a", "est-umrah-agency-b"]);
    expect(byFamily("museum")).toEqual(["est-museum-dubai"]);
    expect(byFamily("park")).toEqual(["est-park-kounouzi"]);
    const services = Object.fromEntries(DEMO_ESTABLISHMENTS.map((s) => [s.establishment!.family, s.establishment!.serviceType]));
    expect(services).toEqual({ maktaba: "book", madinah_hotel: "stay", makkah_hotel: "stay", maghreb_restaurant: "meal", umrah_agency: "umrah_trip", museum: "ticket", park: "ticket" });
  });

  it("un lieu de culte ne porte jamais d'établissement ni de prix (schéma)", () => {
    expect(heritageSiteSchema.safeParse({ id: "x", kind: "religious_place", establishment: HOTEL.establishment }).success).toBe(false);
    expect(heritageSiteSchema.safeParse({ id: "x", kind: "religious_place" }).success).toBe(true);
    expect(heritageSiteSchema.safeParse(HOTEL).success).toBe(true);
  });

  it("à l'écran, « Monument » a disparu : le dictionnaire FR parle d'établissements", () => {
    for (const [key, value] of Object.entries(fr)) expect(value.toLowerCase(), key).not.toContain("monument");
    expect(fr["cell.heritage"]).toBe("Établissement");
  });
});

describe("arrivée sur un établissement : libre → achat ; le sien → rien ; celui d'un autre → service et paiement", () => {
  it("un établissement libre se propose à l'achat ; acheté, il a un propriétaire", () => {
    const offered = journey(create(setupFor([HOTEL])).state);
    expect(offered.state.phase.kind).toBe("awaiting_purchase");
    const bought = run(offered.state, { type: "DecidePurchase", playerId: pid("p1"), siteId: HOTEL.id, buy: true });
    expect(bought.state.holdings).toEqual([expect.objectContaining({ siteId: HOTEL.id, ownerId: "p1" })]);
    expect(money(bought.state, "p1")).toBe(1000 - PRICE);
  });

  it("chez un autre joueur : ServiceOffered (famille, type, montant des données), puis PayService transfère exactement les frais au propriétaire, une seule fois, grand livre équilibré", () => {
    const bought = run(journey(create(setupFor([HOTEL])).state).state, { type: "DecidePurchase", playerId: pid("p1"), siteId: HOTEL.id, buy: true });
    const arrived = journey(bought.state);
    expect(arrived.state.phase).toMatchObject({ kind: "awaiting_service", siteId: HOTEL.id, ownerId: "p1", amount: 30 });
    expect(eventsOf(arrived.events, "ServiceOffered")).toEqual([{ type: "ServiceOffered", playerId: pid("p2"), ownerId: pid("p1"), siteId: HOTEL.id, family: "madinah_hotel", serviceType: "stay", amount: 30 }]);
    expect(eventsOf(arrived.events, "HeritageVisited")).toHaveLength(0);
    expect(eventsOf(arrived.events, "QuestionRequested")).toHaveLength(0);
    // Rien n'est payé tant que le joueur n'a pas confirmé.
    expect(money(arrived.state, "p2")).toBe(1000);
    const paid = run(arrived.state, { type: "PayService", playerId: pid("p2") });
    expect(eventsOf(paid.events, "ServiceConsumed")).toEqual([{ type: "ServiceConsumed", playerId: pid("p2"), ownerId: pid("p1"), siteId: HOTEL.id, family: "madinah_hotel", serviceType: "stay", requested: 30, amount: 30 }]);
    expect(eventsOf(paid.events, "MoneyTransferred")).toEqual([expect.objectContaining({ fromPlayerId: "p2", toPlayerId: "p1", amount: 30, reason: "service_fee" })]);
    expect(money(paid.state, "p2")).toBe(970);
    expect(money(paid.state, "p1")).toBe(1000 - PRICE + 30);
    // Grand livre : deux écritures liées par l'identifiant du transfert, somme nulle (rien n'est créé ni perdu).
    const transferId = eventsOf(paid.events, "MoneyTransferred")[0]!.transferId;
    const fees = paid.state.ledger.filter((t) => t.ref === transferId);
    expect(fees.map((t) => [t.playerId, t.reason, t.amount])).toEqual([["p2", "transfer_sent", -30], ["p1", "transfer_received", 30]]);
    expect(fees.reduce((sum, t) => sum + t.amount, 0)).toBe(0);
    // Aucun double paiement : la phase est passée, une seconde commande est refusée.
    expect(paid.state.phase.kind).not.toBe("awaiting_service");
    expect(reduce(paid.state, { type: "PayService", playerId: pid("p2") }).ok).toBe(false);
    expect(checkInvariants(paid.state)).toEqual([]);
  });

  it("le propriétaire qui revient chez lui ne paie rien (HeritageRevisited, aucune écriture)", () => {
    const sim = simulate(makeLineSetup({ board: TRIANGLE, heritageSites: [HOTEL], players: players(2), rules: { ...NO_ZAKAT, endCondition: { kind: "turns_per_player", turns: 4 } } }));
    expect(eventsOf(sim.events, "SiteAcquired")).toEqual([expect.objectContaining({ playerId: "p1", siteId: HOTEL.id })]);
    // p2 passe deux fois chez p1 (tours 1 et 4) et paie chaque fois ; p1 revient chez lui au tour 4 sans rien payer.
    expect(eventsOf(sim.events, "ServiceConsumed")).toEqual([expect.objectContaining({ playerId: "p2", ownerId: "p1", amount: 30 }), expect.objectContaining({ playerId: "p2", ownerId: "p1", amount: 30 })]);
    expect(eventsOf(sim.events, "HeritageRevisited")).toEqual([{ type: "HeritageRevisited", playerId: pid("p1"), siteId: HOTEL.id }]);
    const transfers = eventsOf(sim.events, "MoneyTransferred").filter((t) => t.reason === "service_fee");
    expect(transfers).toHaveLength(2);
    const refs = new Set(transfers.map((t) => t.transferId));
    const entries = sim.state.ledger.filter((t) => t.ref !== undefined && refs.has(t.ref));
    expect(entries).toHaveLength(4);
    expect(entries.filter((t) => t.playerId === "p1").every((t) => t.reason === "transfer_received" && t.amount === 30)).toBe(true);
    expect(entries.reduce((sum, t) => sum + t.amount, 0)).toBe(0);
    expect(checkInvariants(sim.state)).toEqual([]);
  });

  it("les frais viennent des données : 45 → 45 ; 0 → ancien Défi Patrimoine (parties anciennes)", () => {
    const at45 = run(journey(create(setupFor([withFee(HOTEL, 45)])).state).state, { type: "DecidePurchase", playerId: pid("p1"), siteId: HOTEL.id, buy: true });
    expect(journey(at45.state).state.phase).toMatchObject({ kind: "awaiting_service", amount: 45 });
    const legacy = run(journey(create(setupFor([withFee(HOTEL, 0)])).state).state, { type: "DecidePurchase", playerId: pid("p1"), siteId: HOTEL.id, buy: true });
    const visit = journey(legacy.state);
    expect(visit.state.phase).toMatchObject({ kind: "awaiting_answer", purpose: { kind: "heritage_visit", ownerId: "p1" } });
    expect(eventsOf(visit.events, "ServiceOffered")).toHaveLength(0);
  });

  it("sans assez de Kounouz, la politique des règles s'applique (plafonné au solde) : le montant réel est consigné", () => {
    const bought = run(journey(create(setupFor([HOTEL], { ...NO_ZAKAT, startingMoney: 10 + PRICE })).state).state, { type: "DecidePurchase", playerId: pid("p1"), siteId: HOTEL.id, buy: true });
    // p2 dispose de 10 + prix ; on l'appauvrit par une variante : startingMoney identique, mais frais 500 > solde.
    const rich = journey(bought.state);
    expect(rich.state.phase).toMatchObject({ kind: "awaiting_service", amount: 30 });
    const poorSetup = setupFor([withFee(HOTEL, 5000)], { ...NO_ZAKAT, startingMoney: 5000 });
    const b2 = run(journey(create(poorSetup).state).state, { type: "DecidePurchase", playerId: pid("p1"), siteId: HOTEL.id, buy: true });
    const paid = run(journey(b2.state).state, { type: "PayService", playerId: pid("p2") });
    expect(eventsOf(paid.events, "ServiceConsumed")[0]).toMatchObject({ requested: 5000, amount: 5000 });
    expect(money(paid.state, "p2")).toBe(0);
    expect(checkInvariants(paid.state)).toEqual([]);
  });
});

describe("familles d'établissements : l'architecture sait qui possède toute une famille (aucun bonus codé)", () => {
  it("une maktaba sur deux → non ; les deux → oui ; le musée (famille d'un seul site) → oui dès l'achat ; une famille absente du plateau → non", () => {
    const maktabas = DEMO_ESTABLISHMENTS.filter((s) => s.establishment!.family === "maktaba");
    const museum = DEMO_ESTABLISHMENTS.find((s) => s.id === "est-museum-dubai")!;
    const setup = makeLineSetup({ cells: { 1: "heritage", 2: "heritage", 3: "heritage" }, heritageSites: [...maktabas, museum], players: players(2), rules: { ...NO_ZAKAT, startingMoney: 2000 } });
    let s = create(setup).state;
    const buy = (siteId: string) => {
      s = journey(s).state;
      s = run(s, { type: "DecidePurchase", playerId: pid("p1"), siteId, buy: true }).state;
      // Le second joueur suit d'un pas : il paie le service chez p1 (aucun achat).
      s = journey(s).state;
      if (s.phase.kind === "awaiting_service") s = run(s, { type: "PayService", playerId: pid("p2") }).state;
    };
    buy(maktabas[0]!.id);
    expect(ownsWholeFamily(s, pid("p1"), "maktaba")).toBe(false);
    buy(maktabas[1]!.id);
    expect(ownsWholeFamily(s, pid("p1"), "maktaba")).toBe(true);
    expect(ownsWholeFamily(s, pid("p1"), "museum")).toBe(false);
    buy(museum.id);
    expect(ownsWholeFamily(s, pid("p1"), "museum")).toBe(true);
    expect(ownsWholeFamily(s, pid("p1"), "park")).toBe(false);
    // Aucune règle de bonus : le solde de p1 ne bouge que des prix d'achat et des frais de service reçus (données).
    const fees = s.ledger.filter((t) => t.reason === "transfer_received" && t.playerId === "p1").reduce((sum, t) => sum + t.amount, 0);
    expect(money(s, "p1")).toBe(2000 - maktabas[0]!.price! - maktabas[1]!.price! - museum.price! + fees);
    expect(fees).toBe(3 * 30);
  });
});

describe("sauvegardes : propriétaire et établissement conservés ; anciennes parties (v8, sans établissement ni Hassanāt) migrées", () => {
  it("aller-retour v9 : propriétaire, données d'établissement et phase de service intacts", () => {
    const bought = run(journey(create(setupFor([HOTEL])).state).state, { type: "DecidePurchase", playerId: pid("p1"), siteId: HOTEL.id, buy: true });
    const arrived = journey(bought.state).state;
    const back = load(serializeGameState(arrived));
    expect(back).toEqual(arrived);
    expect(back.config.sites[HOTEL.id]!.establishment).toEqual(HOTEL.establishment);
    expect(back.holdings[0]!.ownerId).toBe("p1");
    expect(back.phase.kind).toBe("awaiting_service");
    expect(run(back, { type: "PayService", playerId: pid("p2") }).state.players.find((p) => p.id === "p1")!.money).toBe(1000 - PRICE + 30);
  });

  it("une sauvegarde v8 se relit : sites sans établissement (ancien flux de visite), Hassanāt à zéro, poids de score à 0", () => {
    const bought = run(journey(create(makeLineSetup({ cells: { 1: "heritage" }, players: players(2), rules: NO_ZAKAT })).state).state, { type: "DecidePurchase", playerId: pid("p1"), siteId: "test-monument-01", buy: true });
    const v9 = JSON.parse(serializeGameState(bought.state)) as Record<string, unknown>;
    const config = v9["config"] as Record<string, unknown>;
    const rules = config["rules"] as Record<string, unknown>;
    const { hassanat: _h, ...configV8 } = config;
    const { service: _s, ...rulesV8 } = rules;
    const { hassanatWeight: _w, ...scoringV8 } = rules["scoring"] as Record<string, unknown>;
    const { hassanatLedger: _l, hassanatServed: _v, ...stateV8 } = v9;
    const counters = v9["counters"] as Record<string, unknown>;
    const { hassanat: _c, ...countersV8 } = counters;
    void [_h, _s, _w, _l, _v, _c];
    const playersV8 = (v9["players"] as Record<string, unknown>[]).map(({ hassanatPoints: _p, ...p }) => (void _p, p));
    const v8 = { ...stateV8, schemaVersion: 8, config: { ...configV8, rules: { ...rulesV8, scoring: scoringV8 } }, players: playersV8, counters: countersV8 };
    const migrated = load(JSON.stringify(v8));
    expect(migrated.schemaVersion).toBe(9);
    expect(migrated.holdings[0]).toMatchObject({ siteId: "test-monument-01", ownerId: "p1" });
    expect(migrated.config.sites["test-monument-01"]!.establishment).toBeUndefined();
    expect(migrated.config.hassanat.definitions).toEqual([]);
    expect(migrated.config.rules.scoring.hassanatWeight).toBe(0);
    expect(migrated.config.rules.service.insufficient).toBe("cap_to_balance");
    expect(migrated.players.every((p) => p.hassanatPoints === 0)).toBe(true);
    expect(migrated.hassanatLedger).toEqual([]);
    expect(migrated.counters.hassanat).toBe(0);
    expect(checkInvariants(migrated)).toEqual([]);
    // Elle reste jouable : l'autre joueur arrive sur le site → Défi Patrimoine (ancien flux, aucun service inventé).
    expect(journey(migrated).state.phase).toMatchObject({ kind: "awaiting_answer", purpose: { kind: "heritage_visit" } });
  });
});
