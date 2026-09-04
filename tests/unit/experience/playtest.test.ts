import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { GameEvent, GameState } from "@/core/game";
import { reduce, serializeGameState } from "@/core/game";
import { createMemoryPlaytestRepository } from "@/data/local";
import { buildPlaytestReport, measureInteractions, reportToText, type PlaytestLog } from "@/experience/playtest";
import { createPlaytestStore } from "@/state/playtestStore";
import { scenariosOf } from "../../fixtures/game/scenarios.fixture";
import { DEFAULT_POLICY, active, create, journey, lineBoard, makeLineSetup, makeSetup, pid, players, run, simulate, answer } from "../../fixtures/game/setup.fixture";
import { challengesFixture } from "../../fixtures/game/challenges.fixture";

const root = fileURLToPath(new URL("../../../", import.meta.url));

/** Rejoue une simulation (même configuration) en construisant un journal horodaté : 1 lot = 1 commande, 3 s entre lots. */
function logOf(sim: ReturnType<typeof simulate>, setup: Parameters<typeof simulate>[0], stepMs = 3000): PlaytestLog {
  const created = create(setup);
  let s: GameState = created.state;
  let at = 1_000_000;
  const entries: PlaytestLog["entries"][number][] = [{ at, active: 0, events: created.events }];
  for (const command of sim.commands) {
    const r = reduce(s, command);
    if (!r.ok) throw new Error("replay");
    s = r.value.state;
    at += stepMs;
    if (r.value.events.length > 0) entries.push({ at, active: s.clock.activePlaySeconds, events: r.value.events });
  }
  expect(serializeGameState(s)).toBe(serializeGameState(sim.state));
  return { gameId: sim.state.gameId, entries };
}

describe("diagnostic de playtest — Défis famille", () => {
  it("proposés / réussis / ratés / passés, catégories, Kounouz via défis, taux par tranche d'âge, cartes OH NON : tout vient des événements", () => {
    const players = [
      { id: pid("maryam"), displayName: "Maryam", profileType: "child" as const, age: 6 },
      { id: pid("papa"), displayName: "Papa", profileType: "adult" as const },
      { id: pid("yacine"), displayName: "Yacine", profileType: "child" as const, age: 11 },
    ];
    const setup = makeLineSetup({ board: lineBoard({ 1: "challenge", 2: "challenge", 3: "challenge", 4: "challenge", 5: "challenge", 6: "challenge", 7: "challenge" }), scenarios: scenariosOf("challenge-family"), players, challenges: challengesFixture() });
    const policy = { ...DEFAULT_POLICY, challenge: (_: string, i: number) => (["success", "failure", "skip", "success"] as const)[i % 4]! };
    const sim = simulate(setup, policy);
    const log = logOf(sim, setup);
    const report = buildPlaytestReport(sim.state, log);
    const count = (t: GameEvent["type"]) => sim.events.filter((e) => e.type === t).length;
    expect(report.challenges.proposed).toBe(count("FamilyChallengeAssigned"));
    expect(report.challenges.succeeded + report.challenges.failed).toBe(count("FamilyChallengeCompleted"));
    expect(report.challenges.skipped).toBe(count("FamilyChallengeSkipped"));
    expect(report.challenges.kounouz).toBe(sim.events.filter((e): e is Extract<GameEvent, { type: "ChallengeRewardGranted" }> => e.type === "ChallengeRewardGranted").reduce((s, e) => s + e.amount, 0));
    expect(report.challenges.ohNo).toBe(sim.events.filter((e) => e.type === "FamilyChallengeAssigned" && e.ohNo).length);
    expect(report.challenges.byCategory.reduce((s, c) => s + c.proposed, 0)).toBe(report.challenges.proposed);
    expect(report.challenges.byAgeBand.map((b) => b.band).sort()).toEqual(["5-8", "10-12", "adulte"].sort());
    for (const b of report.challenges.byAgeBand) expect(b.rate).toBe(b.succeeded + b.failed === 0 ? 0 : Math.round((100 * b.succeeded) / (b.succeeded + b.failed)));
    expect(report.players.reduce((s, p) => s + p.challengeKounouz, 0)).toBe(report.challenges.kounouz);
    const timing = report.interactions.find((t) => t.kind === "family_challenge")!;
    expect(timing.count).toBe(report.challenges.succeeded + report.challenges.failed + report.challenges.skipped);
    const text = reportToText(report);
    expect(text).toContain("Défis famille :");
    expect(text).toMatch(/Réussite 5-8 : \d+ %/);
    expect(report.journal.some((l) => /Défi famille pour Maryam/.test(l))).toBe(true);
  });
});

describe("diagnostic de playtest (local, dérivé des événements)", () => {
  it("les statistiques correspondent exactement aux événements réellement joués", () => {
    const setup = makeSetup({ players: players(4) });
    const sim = simulate(setup);
    const log = logOf(sim, setup);
    const report = buildPlaytestReport(sim.state, log);
    const count = (t: GameEvent["type"]) => sim.events.filter((e) => e.type === t).length;
    expect(report.turns).toBe(count("TurnStarted"));
    expect(report.counts.questions).toBe(count("AnswerRecorded"));
    expect(report.counts.duels).toBe(count("DuelResolved"));
    expect(report.counts.monumentsBought).toBe(count("SiteAcquired"));
    expect(report.counts.heritageVisits).toBe(count("HeritageVisited"));
    expect(report.counts.transfers).toBe(count("MoneyTransferred"));
    expect(report.counts.managementChoices).toBe(count("ChoiceMade"));
    expect(report.counts.solidarityActions).toBe(count("SolidarityActionRecorded"));
    expect(report.counts.halts).toBe(count("JourneyHalted"));
    for (const p of report.players) {
      const mine = sim.events.filter((e): e is Extract<GameEvent, { type: "AnswerRecorded" }> => e.type === "AnswerRecorded" && e.playerId === p.playerId);
      expect(p.questions).toBe(mine.length);
      expect(p.correct).toBe(mine.filter((a) => a.outcome === "correct").length);
      expect(p.money).toBe(sim.state.players.find((x) => x.id === p.playerId)!.money);
    }
    expect(report.status).toBe("finished");
    expect(report.journal.some((l) => /Fin de partie/.test(l))).toBe(true);
    const text = reportToText(report);
    expect(text).toContain("PARTIE KOUNOUZI — TEST");
    expect(text).toContain("Joueur 1");
    expect(JSON.parse(JSON.stringify(report))).toEqual(report);
  });

  it("mesure le temps par interaction depuis l'horloge murale des lots (question, Duel, monument, scénarios)", () => {
    const setup = makeLineSetup({ cells: { 1: "question", 2: "challenge", 3: "heritage", 4: "event" }, scenarios: scenariosOf("challenge-duel", "event-gain"), players: players(2) });
    let state = create(setup).state;
    const entries: PlaytestLog["entries"][number][] = [];
    let at = 0;
    const apply = (command: Parameters<typeof run>[1], delayMs: number) => {
      const r = run(state, command);
      at += delayMs;
      entries.push({ at, active: r.state.clock.activePlaySeconds, events: r.events });
      state = r.state;
    };
    // p1 : question (10 s de réflexion)
    apply({ type: "StartJourney", playerId: pid("p1") }, 1000);
    const q1 = state.phase.kind === "awaiting_answer" ? state.phase.requestId : "";
    apply({ type: "SubmitAnswer", playerId: pid("p1"), requestId: q1, answer: answer("correct") }, 10_000);
    // p2 : question (4 s)
    apply({ type: "StartJourney", playerId: pid("p2") }, 1000);
    const q2 = state.phase.kind === "awaiting_answer" ? state.phase.requestId : "";
    apply({ type: "SubmitAnswer", playerId: pid("p2"), requestId: q2, answer: answer("incorrect") }, 4000);
    // p1 : Duel (choix 3 s, réponse 6 s, réponse adverse 5 s → 14 s au total)
    apply({ type: "StartJourney", playerId: pid("p1") }, 1000);
    apply({ type: "ChooseOpponent", playerId: pid("p1"), opponentId: pid("p2") }, 3000);
    const duel = state.phase.kind === "awaiting_duel" ? state.phase.duel : null;
    if (!duel) throw new Error("duel");
    apply({ type: "SubmitAnswer", playerId: pid("p1"), requestId: duel.challengerRequestId, answer: answer("correct") }, 6000);
    apply({ type: "SubmitAnswer", playerId: pid("p2"), requestId: duel.opponentRequestId, answer: answer("partial") }, 5000);
    // p2 : Duel aussi (case 2) — on l'expédie
    apply({ type: "StartJourney", playerId: pid("p2") }, 1000);
    apply({ type: "ChooseOpponent", playerId: pid("p2"), opponentId: pid("p1") }, 1000);
    const duel2 = state.phase.kind === "awaiting_duel" ? state.phase.duel : null;
    if (!duel2) throw new Error("duel2");
    apply({ type: "SubmitAnswer", playerId: pid("p2"), requestId: duel2.challengerRequestId, answer: answer("correct") }, 1000);
    apply({ type: "SubmitAnswer", playerId: pid("p1"), requestId: duel2.opponentRequestId, answer: answer("correct") }, 1000);
    // p1 : monument (achat après 7 s)
    apply({ type: "StartJourney", playerId: pid("p1") }, 1000);
    apply({ type: "DecidePurchase", playerId: pid("p1"), siteId: state.phase.kind === "awaiting_purchase" ? state.phase.siteId : "", buy: true }, 7000);
    // p2 : monument (visite → question, 5 s)
    apply({ type: "StartJourney", playerId: pid("p2") }, 1000);
    const qv = state.phase.kind === "awaiting_answer" ? state.phase.requestId : "";
    apply({ type: "SubmitAnswer", playerId: pid("p2"), requestId: qv, answer: answer("correct") }, 5000);
    // p1 : événement automatique (le lot suivant arrive 2 s plus tard)
    apply({ type: "StartJourney", playerId: pid("p1") }, 1000);
    apply({ type: "StartJourney", playerId: pid("p2") }, 2000);

    const timings = Object.fromEntries(measureInteractions({ gameId: state.gameId, entries }).map((t) => [t.kind, t]));
    expect(timings["question"]).toMatchObject({ count: 2, totalMs: 14_000, averageMs: 7000 });
    expect(timings["duel"]).toMatchObject({ count: 2, totalMs: 14_000 + 3000 });
    expect(timings["monument"]).toMatchObject({ count: 1, totalMs: 7000 });
    expect(timings["heritage_visit"]).toMatchObject({ count: 1, totalMs: 5000 });
    expect(timings["event"]).toMatchObject({ count: 1, totalMs: 2000 });
    expect(active(state)).toBe(pid("p1"));
  });

  it("l'enregistreur observe les lots, persiste localement, et ne touche jamais à l'état de jeu", async () => {
    const repository = createMemoryPlaytestRepository();
    let now = 5000;
    const store = createPlaytestStore({ repository, now: () => (now += 1000) });
    const created = create(makeLineSetup({ players: players(2) }));
    store.getState().record(created.state.gameId, created.events, created.state);
    const before = serializeGameState(created.state);
    const moved = journey(created.state);
    store.getState().record(created.state.gameId, moved.events, moved.state);
    store.getState().record(created.state.gameId, [], moved.state); // lot vide ignoré
    expect(serializeGameState(created.state)).toBe(before);
    const log = store.getState().logs[created.state.gameId]!;
    expect(log.entries.map((e) => e.at)).toEqual([6000, 7000]);
    expect(log.entries[1]!.events).toEqual(moved.events);
    await Promise.resolve();
    expect(await repository.load(created.state.gameId)).toEqual(log);
    const fresh = createPlaytestStore({ repository, now: () => 0 });
    expect(await fresh.getState().load(created.state.gameId)).toEqual(log);
  });

  it("structurel : le noyau (jeu, apprentissage, contenu) ignore le playtest ; le playtest n'émet aucune commande ni requête réseau", () => {
    const walk = (dir: string): string[] => readdirSync(dir, { withFileTypes: true }).flatMap((d) => (d.isDirectory() ? walk(join(dir, d.name)) : /\.tsx?$/.test(d.name) ? [join(dir, d.name)] : []));
    for (const f of walk(join(root, "src/core"))) expect(readFileSync(f, "utf8"), f).not.toMatch(/playtest/i);
    for (const f of [...walk(join(root, "src/experience/playtest")), join(root, "src/state/playtestStore.ts"), join(root, "src/ui/dev/DiagnosticScreen.tsx")]) {
      const source = readFileSync(f, "utf8");
      expect(source, f).not.toMatch(/dispatch\(|reduce\(|fetch\(|XMLHttpRequest|WebSocket|navigator\.sendBeacon|supabase|analytics|gtag/i);
    }
  });
});
