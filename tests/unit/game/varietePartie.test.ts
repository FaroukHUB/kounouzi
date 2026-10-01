import { describe, expect, it } from "vitest";
import { DEMO_SCENARIOS } from "@/config/demo";
import { JOURNEY_VARIANTS, journeyCycleForOrdinal } from "@/config/journey";
import { assignJourneySteps, flattenCycle, MAX_PLAYERS } from "@/core/game";
import { challengesFixture } from "../../fixtures/game/challenges.fixture";
import { TEST_RULES_CLASSIC } from "../../fixtures/game/rules.fixture";
import { eventsOf, makeLineSetup, makeSetup, players, simulate } from "../../fixtures/game/setup.fixture";

const CHALLENGE_SCENARIOS = DEMO_SCENARIOS.filter((s) => s.cellType === "challenge");

/**
 * DEUX RÉPÉTITIONS CONSTATÉES EN PARTIE RÉELLE, et ce qui les causait :
 *
 *  1. Le Défi famille n'arrivait pratiquement jamais. La rotation des
 *     scénarios se faisait sur le nombre de visites de LA CASE : le plateau
 *     compte cinq cases Défi, donc arriver pour la première fois sur
 *     n'importe laquelle donnait toujours le premier scénario (le Duel). Il
 *     fallait retomber une deuxième fois sur la MÊME case pour voir le
 *     deuxième scénario. Elle se fait maintenant sur le nombre de scénarios
 *     déjà servis pour la FAMILLE de case dans la partie.
 *
 *  2. Toutes les parties commençaient par la même suite de pas : cinq des six
 *     variantes du Chemin démarrent par un pas de 1. La partie reçoit
 *     désormais un décalage EN BLOCS (compteur persistant de parties, jamais
 *     un tirage) qui fait tourner les blocs du cycle — en blocs, et pas en
 *     valeurs, pour que tous les sièges restent alignés sur une frontière de
 *     bloc et parcourent la même distance totale.
 */
describe("variété d'une partie à l'autre (répétitions constatées en partie réelle)", () => {
  it("cinq cases Défi, quatre scénarios : les premières arrivées les servent tous, Défi famille compris", () => {
    // Plateau linéaire, un pas par Chemin : le k-ième Chemin de chaque joueur mène à la case k.
    const run = simulate(
      makeLineSetup({
        // Cinq cases Défi comme sur le vrai plateau (la case 6 du plateau linéaire en est une par défaut).
        cells: { 1: "challenge", 2: "challenge", 3: "challenge", 4: "challenge", 5: "challenge", 6: "question" },
        scenarios: CHALLENGE_SCENARIOS,
        challenges: challengesFixture(),
        players: players(2),
        rules: TEST_RULES_CLASSIC,
      }),
    );
    const servis = eventsOf(run.events, "ScenarioTriggered").filter((e) => e.cellType === "challenge");
    expect(servis.length).toBeGreaterThanOrEqual(CHALLENGE_SCENARIOS.length);
    // Les quatre premières arrivées sur une case Défi servent les quatre scénarios, chacun une fois.
    const quatrePremiers = servis.slice(0, CHALLENGE_SCENARIOS.length).map((e) => e.scenarioId);
    expect(new Set(quatrePremiers).size).toBe(CHALLENGE_SCENARIOS.length);
    expect(quatrePremiers).toContain("challenge-family");
    // Surtout : les PREMIÈRES arrivées sur une case (`visit === 1`, une par case Défi) servaient
    // toutes le même scénario, le Duel, puisque le compteur repartait de zéro à chaque case.
    const premieresFois = servis.filter((e) => e.visit === 1).map((e) => e.scenarioId);
    expect(premieresFois.length).toBe(5);
    expect(new Set(premieresFois).size).toBeGreaterThan(1);
    // Et sur la partie entière, les quatre scénarios de la famille sont tous servis.
    expect(new Set(servis.map((e) => e.scenarioId))).toEqual(new Set(CHALLENGE_SCENARIOS.map((s) => s.id)));
    // Et le compteur est bien dans l'état, par famille de case.
    expect(run.state.scenarioServed["challenge"]).toBe(servis.length);
  });

  it("le décalage de partie change la suite de pas, sans toucher à l'équité du Chemin", () => {
    const cycle = JOURNEY_VARIANTS[0]!;
    const longueur = flattenCycle(cycle).length;
    const suite = (offset: number, seat: number, n: number) => Array.from({ length: n }, (_, k) => assignJourneySteps(cycle, seat, k, offset));

    // Même décalage ⇒ même suite ; décalage différent ⇒ suite différente.
    expect(suite(3, 0, 10)).toEqual(suite(3, 0, 10));
    expect(suite(3, 0, 10)).not.toEqual(suite(0, 0, 10));
    // Un tour complet de blocs ne change rien (c'est bien une rotation).
    expect(suite(cycle.blocks.length, 0, 10)).toEqual(suite(0, 0, 10));

    for (let offset = 0; offset < cycle.blocks.length; offset += 1) {
      for (let seat = 0; seat < MAX_PLAYERS; seat += 1) {
        const s = suite(offset, seat, longueur);
        // Chaque valeur revient le même nombre de fois, donc la même distance totale pour tous.
        for (const v of [1, 2, 3, 4, 5]) expect(s.filter((x) => x === v)).toHaveLength(longueur / cycle.stepMax);
        // Jamais deux fois le même nombre de pas de suite.
        for (let k = 1; k < s.length; k += 1) expect(s[k]).not.toBe(s[k - 1]);
      }
      // Aucun siège favorisé : après un multiple de stepMax voyages, tous ont parcouru la même distance.
      for (const k of [cycle.stepMax, cycle.stepMax * 2, cycle.stepMax * 3]) {
        const totaux = Array.from({ length: MAX_PLAYERS }, (_, seat) => suite(offset, seat, k).reduce((a, b) => a + b, 0));
        expect(new Set(totaux).size).toBe(1);
      }
    }
    expect(() => assignJourneySteps(cycle, 0, 0, -1)).toThrow(RangeError);
  });

  it("les six premières parties ne commencent plus par le même pas (variante ET décalage)", () => {
    // Reproduit le câblage de la création de partie : variante et décalage viennent du même compteur persistant.
    const premierPas = (ordinal: number) => assignJourneySteps(journeyCycleForOrdinal(ordinal), 0, 0, ordinal - 1);
    const avant = Array.from({ length: JOURNEY_VARIANTS.length }, (_, i) => assignJourneySteps(journeyCycleForOrdinal(i + 1), 0, 0, 0));
    const apres = Array.from({ length: JOURNEY_VARIANTS.length }, (_, i) => premierPas(i + 1));
    // Sans décalage, cinq variantes sur six démarraient sur le même pas : c'est ce que voyait la famille.
    expect(new Set(avant).size).toBeLessThanOrEqual(2);
    expect(new Set(apres).size).toBeGreaterThan(new Set(avant).size);
    // Deux parties consécutives ne partagent plus la même suite de départ.
    for (let ordinal = 1; ordinal < JOURNEY_VARIANTS.length; ordinal += 1) {
      const a = Array.from({ length: 5 }, (_, k) => assignJourneySteps(journeyCycleForOrdinal(ordinal), 0, k, ordinal - 1));
      const b = Array.from({ length: 5 }, (_, k) => assignJourneySteps(journeyCycleForOrdinal(ordinal + 1), 0, k, ordinal));
      expect(a).not.toEqual(b);
    }
  });

  it("sur le vrai plateau (cinq cases Défi, quatre scénarios), le Défi famille sort bien", () => {
    const run = simulate(makeSetup({ players: players(4), scenarios: DEMO_SCENARIOS, challenges: challengesFixture(), rules: TEST_RULES_CLASSIC }));
    const servis = eventsOf(run.events, "ScenarioTriggered").filter((e) => e.cellType === "challenge");
    expect(servis.length).toBeGreaterThanOrEqual(2);
    expect(servis.map((e) => e.scenarioId)).toContain("challenge-family");
  });

  it("une partie reste parfaitement déterministe : même décalage, même déroulé", () => {
    const setup = (journeyOffset: number) => makeSetup({ players: players(3), scenarios: DEMO_SCENARIOS, journeyOffset });
    const a1 = simulate(setup(4));
    const a2 = simulate(setup(4));
    const autre = simulate(setup(0));
    expect(a1.events).toEqual(a2.events);
    expect(eventsOf(a1.events, "MovementAssigned").map((e) => e.steps)).not.toEqual(eventsOf(autre.events, "MovementAssigned").map((e) => e.steps));
  });
});
