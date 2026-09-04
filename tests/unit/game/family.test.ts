import { describe, expect, it } from "vitest";
import { BOARD_32_V1 } from "@/config/board";
import { contentRegistry } from "@/config/content";
import { DEMO_HERITAGE_SITES, DEMO_RULES_QUICK, DEMO_SCENARIOS } from "@/config/demo";
import { JOURNEY_CYCLE_V1 } from "@/config/journey";
import { LEARNING_CONFIG, learnerContextFor } from "@/config/learning";
import { checkInvariants, createGame, deserializeGameState, reduce, serializeGameState, type Command, type GameEvent, type GameSetup, type GameState } from "@/core/game";
import { addDays, applyAttempt, attemptId, emptyMemory, type PlayerLearningMemory } from "@/core/learning";
import { isAudienceAllowed, type GameId, type PlayerId } from "@/core/shared";
import type { PlayerProfileDraft } from "@/data/ports";
import { pendingRequest, resolveQuestion } from "@/experience/questionResolver";
import { nextCommand, type Policy } from "../../fixtures/game/setup.fixture";
import { T0 } from "../../fixtures/learning/resolve.fixture";

/**
 * SIMULATION FAMILIALE — Maryam (6 ans), Yacine (11 ans), Maman, Papa —
 * sur le vrai plateau 32 cases, les scénarios de démonstration et le VRAI
 * Learning Engine pour chaque question (classique, Duel, Halte, Défi
 * Patrimoine). Sans React, sans navigateur, sans hasard.
 */
const profiles: readonly PlayerProfileDraft[] = [
  { id: "maryam" as PlayerId, displayName: "Maryam", profileType: "child", avatarId: "amber", child: { birthYear: 2020, schoolGrade: "CP" } },
  { id: "yacine" as PlayerId, displayName: "Yacine", profileType: "child", avatarId: "teal", child: { birthYear: 2015, schoolGrade: "6e" } },
  { id: "maman" as PlayerId, displayName: "Maman", profileType: "adult", avatarId: "ruby", adult: { initialLevel: "standard" } },
  { id: "papa" as PlayerId, displayName: "Papa", profileType: "adult", avatarId: "violet", adult: { initialLevel: "advanced" } },
];

const setup = (turns: number, extra: Partial<GameSetup> = {}): GameSetup => ({
  gameId: "game-family" as GameId,
  players: profiles.map((p) => ({ id: p.id, displayName: p.displayName, profileType: p.profileType })),
  board: BOARD_32_V1,
  heritageSites: DEMO_HERITAGE_SITES,
  scenarios: DEMO_SCENARIOS,
  rules: { ...DEMO_RULES_QUICK, endCondition: { kind: "turns_per_player", turns } },
  journey: JOURNEY_CYCLE_V1,
  ...extra,
});

interface FamilyRun {
  readonly state: GameState;
  readonly events: readonly GameEvent[];
  readonly commands: readonly Command[];
  readonly memories: Readonly<Record<string, PlayerLearningMemory>>;
  readonly served: readonly { readonly playerId: PlayerId; readonly categoryId: string; readonly audienceScope: string; readonly difficulty: number }[];
}

/** Joue une partie complète : chaque demande de question passe par le Learning Engine, chaque réponse alimente la mémoire du joueur qui répond. */
function playFamily(turns: number, policy: Policy, extra: Partial<GameSetup> = {}, checkEveryStep = true): FamilyRun {
  const created = createGame(setup(turns, extra));
  if (!created.ok) throw new Error(JSON.stringify(created.error));
  let state = created.value.state;
  const events: GameEvent[] = [...created.value.events];
  const commands: Command[] = [];
  const memories: Record<string, PlayerLearningMemory> = Object.fromEntries(profiles.map((p) => [p.id, emptyMemory(p.id)]));
  const learners = profiles.map((p) => learnerContextFor({ id: p.id, profileType: p.profileType, schoolGrade: p.child?.schoolGrade, initialLevel: p.adult?.initialLevel }));
  const served: { playerId: PlayerId; categoryId: string; audienceScope: string; difficulty: number }[] = [];
  const counters = { answers: 0, purchases: 0, choices: 0, duels: 0, transfers: 0 };
  const registry = contentRegistry();
  let step = 0;

  const apply = (command: Command) => {
    const r = reduce(state, command);
    if (!r.ok) throw new Error(`${command.type}: ${JSON.stringify(r.error)} (phase ${state.phase.kind})`);
    if (checkEveryStep) {
      expect(checkInvariants(r.value.state)).toEqual([]);
      const back = deserializeGameState(serializeGameState(r.value.state));
      expect(back.ok && back.value).toEqual(r.value.state);
    }
    state = r.value.state;
    events.push(...r.value.events);
    commands.push(command);
    // Mémoire pédagogique : exactement ce que ferait le learningStore.
    for (const e of r.value.events) {
      if (e.type !== "AnswerRecorded" || !e.question) continue;
      const learner = learners.find((l) => l.playerId === e.playerId)!;
      memories[e.playerId] = applyAttempt(
        memories[e.playerId]!,
        { id: attemptId(state.gameId, e.requestId), playerId: e.playerId, gameId: state.gameId, knowledgeNodeId: e.question.knowledgeNodeId, ref: e.question.ref, categoryId: e.question.categoryId, difficulty: e.question.difficulty, outcome: e.outcome, validationMode: e.validationMode, explanationKnown: e.explanationMastery, rewardGranted: r.value.events.some((x) => x.type === "RewardGranted" && x.requestId === e.requestId), answeredAt: addDays(T0, step / 200) },
        learner,
        LEARNING_CONFIG,
      );
    }
  };

  while (state.status === "in_progress") {
    if (++step > 3000) throw new Error("impasse : trop de commandes");
    const pending = pendingRequest(state);
    if (pending) {
      const q = resolveQuestion({ state, profiles, registry, memoryOf: (id) => memories[id], config: LEARNING_CONFIG, now: addDays(T0, step / 200) });
      if (!q) throw new Error(`aucune question pour ${pending.playerId} (${state.phase.kind})`);
      served.push({ playerId: pending.playerId, categoryId: q.categoryId, audienceScope: q.audienceScope, difficulty: q.difficulty });
      apply({ type: "ServeQuestion", requestId: pending.requestId, question: q });
      continue;
    }
    const command = nextCommand(state, policy, counters);
    if (!command) throw new Error("finished ?");
    apply(command);
  }
  return { state, events, commands, memories, served };
}

/** Politique « famille » : Maryam se trompe souvent, les adultes réussissent, on achète quand on peut, on choisit la première option. */
const FAMILY_POLICY: Policy = {
  answer: (i) => (["correct", "correct", "partial", "incorrect", "correct", "incorrect"] as const).map((o) => ({ outcome: o, explanationMastery: i % 5 === 0 ? ("fr" as const) : ("none" as const), validationMode: "collective" as const }))[i % 6]!,
  buy: (affordable) => affordable,
  choose: (options, i) => options[i % options.length]!.id,
  opponent: (candidates, i) => candidates[i % candidates.length]!,
  recipient: (candidates, i) => candidates[(i + 1) % candidates.length]!,
};

describe("simulation familiale (Maryam 6 ans, Yacine 11 ans, Maman, Papa)", () => {
  const run = playFamily(14, FAMILY_POLICY);
  const types = new Set(run.events.map((e) => e.type));

  it("se termine sans impasse, avec un classement, et rencontre toutes les mécaniques", () => {
    expect(run.state.status).toBe("finished");
    expect(run.state.ranking).toHaveLength(4);
    for (const t of ["QuestionRequested", "DuelStarted", "DuelResolved", "JourneyHalted", "PurchaseOffered", "SiteAcquired", "HeritageVisited", "MoneyTransferred", "ScenarioTriggered", "ChoiceOffered", "RecipientChoiceOffered", "SolidarityActionRecorded", "EffectQueued"] as const) {
      expect(types.has(t), t).toBe(true);
    }
    const cellTypes = new Set(run.events.filter((e): e is Extract<GameEvent, { type: "ScenarioTriggered" }> => e.type === "ScenarioTriggered").map((e) => e.cellType));
    for (const c of ["event", "management", "solidarity", "treasure", "challenge"] as const) expect(cellTypes.has(c), c).toBe(true);
    const purposes = new Set(run.events.filter((e): e is Extract<GameEvent, { type: "QuestionRequested" }> => e.type === "QuestionRequested").map((e) => e.purpose));
    expect([...purposes].sort()).toEqual(["duel", "halt", "heritage_visit", "standard"]);
  });

  it("un Duel enfant / adulte a eu lieu, résolu uniquement par les réponses", () => {
    const duels = run.events.filter((e): e is Extract<GameEvent, { type: "DuelResolved" }> => e.type === "DuelResolved");
    const type = (id: PlayerId) => run.state.players.find((p) => p.id === id)!.profileType;
    expect(duels.some((d) => type(d.challengerId) !== type(d.opponentId))).toBe(true);
    for (const d of duels) {
      const rank = { correct: 2, partial: 1, incorrect: 0 };
      const expected = rank[d.challengerOutcome] === rank[d.opponentOutcome] ? null : rank[d.challengerOutcome] > rank[d.opponentOutcome] ? d.challengerId : d.opponentId;
      expect(d.winnerId).toBe(expected);
      expect(d.categoryId).not.toBeNull();
    }
  });

  it("aucune violation d'audience : chaque question servie respecte le profil de celui qui répond ; Maryam et Papa reçoivent des difficultés différentes", () => {
    const type = (id: PlayerId) => run.state.players.find((p) => p.id === id)!.profileType;
    for (const q of run.served) expect(isAudienceAllowed(q.audienceScope as "all" | "child" | "adult", type(q.playerId))).toBe(true);
    const avg = (id: string) => {
      const d = run.served.filter((q) => q.playerId === id).map((q) => q.difficulty);
      return d.reduce((a, b) => a + b, 0) / d.length;
    };
    expect(avg("papa")).toBeGreaterThan(avg("maryam") + 1);
  });

  it("l'économie est cohérente : grand livre = soldes, transferts équilibrés, aucun solde négatif", () => {
    for (const p of run.state.players) {
      expect(p.money).toBeGreaterThanOrEqual(0);
      expect(run.state.ledger.filter((t) => t.playerId === p.id).reduce((s, t) => s + t.amount, 0)).toBe(p.money);
    }
    const transfers = run.events.filter((e): e is Extract<GameEvent, { type: "MoneyTransferred" }> => e.type === "MoneyTransferred");
    expect(transfers.length).toBeGreaterThan(0);
    for (const t of transfers) {
      const legs = run.state.ledger.filter((l) => l.ref === t.transferId);
      expect(legs.map((l) => l.amount).reduce((a, b) => a + b, 0)).toBe(0);
    }
    expect(run.state.players.some((p) => p.solidarityActions > 0)).toBe(true);
  });

  it("la mémoire pédagogique est cohérente : un essai par réponse servie, pour chaque joueur, jamais de montant", () => {
    const answered = run.events.filter((e): e is Extract<GameEvent, { type: "AnswerRecorded" }> => e.type === "AnswerRecorded" && e.question !== undefined);
    const total = Object.values(run.memories).reduce((s, m) => s + m.attempts.length, 0);
    expect(total).toBe(answered.length);
    for (const p of profiles) {
      const m = run.memories[p.id]!;
      expect(m.attempts.length).toBe(answered.filter((e) => e.playerId === p.id).length);
      expect(m.attempts.every((a) => !("amount" in a))).toBe(true);
    }
    // Les duels alimentent la mémoire des DEUX duelistes.
    const duelAnswers = answered.filter((e) => e.purpose === "duel");
    expect(new Set(duelAnswers.map((e) => e.playerId)).size).toBeGreaterThan(1);
  });

  it("les tours sont cohérents : chacun a joué le même nombre de tours ; une Halte perdue ne coûte qu'un tour", () => {
    expect(new Set(run.state.players.map((p) => p.turnsPlayed)).size).toBe(1);
    const lost = run.events.filter((e) => e.type === "HaltTurnLost").length;
    const halted = run.events.filter((e) => e.type === "JourneyHalted").length;
    expect(lost).toBeLessThanOrEqual(halted);
    expect(run.state.players.every((p) => !p.halted || run.state.status === "finished")).toBe(true);
  });

  it("est déterministe et se sauvegarde/reprend à l'identique à chaque commande (vérifié à chaque pas)", () => {
    const again = playFamily(14, FAMILY_POLICY, {}, false);
    expect(again.commands).toEqual(run.commands);
    expect(serializeGameState(again.state)).toBe(serializeGameState(run.state));
  });

  it("FamilyAssist activé : mêmes commandes, mêmes questions, mêmes vainqueurs, mêmes mémoires", () => {
    const assisted = playFamily(14, FAMILY_POLICY, { familyAssist: { enabled: true, assistedPlayers: [{ playerId: "maryam" as PlayerId, level: "subtle" }] } }, false);
    expect(assisted.served).toEqual(run.served);
    expect(assisted.events.filter((e) => e.type === "DuelResolved")).toEqual(run.events.filter((e) => e.type === "DuelResolved"));
    expect(assisted.memories).toEqual(run.memories);
  });
});
