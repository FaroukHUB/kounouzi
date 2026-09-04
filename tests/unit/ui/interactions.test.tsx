import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { playEvent, type AnimationActions } from "@/animation/player";
import { REDUCED_TIMINGS } from "@/animation/timings";
import type { GameEvent } from "@/core/game";
import { NullNarrator, utteranceFor } from "@/experience/narration";
import { DuelCard } from "@/ui/cards/DuelCard";
import { HaltCard } from "@/ui/cards/HaltCard";
import { OpponentCard } from "@/ui/cards/OpponentCard";
import { QuestionCard } from "@/ui/cards/QuestionCard";
import { RecipientCard } from "@/ui/cards/RecipientCard";
import { cardForPhase } from "@/ui/cards/cardState";
import { bannerText } from "@/ui/game/TurnBanner";
import { TEST_MONUMENTS } from "../../fixtures/game/heritage.fixture";
import { scenariosOf } from "../../fixtures/game/scenarios.fixture";
import { advanceUntil, answer, create, journey, makeLineSetup, makeSetup, pid, players, run } from "../../fixtures/game/setup.fixture";
import { resolveFor } from "../../fixtures/learning/resolve.fixture";

const narrator = new NullNarrator();
const profiles = makeSetup().players.map((p, i) => ({ id: p.id, displayName: ["Maryam", "Papa", "Yacine"][i]!, profileType: p.profileType, avatarId: ["amber", "teal", "ruby"][i]!, ...(p.profileType === "child" ? { child: { birthYear: 2019, schoolGrade: "CP" } } : { adult: { initialLevel: "standard" as const } }) }));
const named = (s: ReturnType<typeof create>["state"]) => ({ ...s, players: s.players.map((p, i) => ({ ...p, displayName: ["Maryam", "Papa", "Yacine"][i]! })) });
/** `renderToStaticMarkup` échappe les apostrophes. */
const escaped = (text: string) => text.replace(/'/g, "&#x27;");
/** Sert la question en attente (comme le fait GameScreen) pour rendre la carte avec son énoncé. */
const serve = (s: ReturnType<typeof create>["state"]) => {
  const q = resolveFor(s, profiles)!;
  const requestId = s.phase.kind === "awaiting_answer" ? s.phase.requestId : s.phase.kind === "awaiting_duel" ? (s.phase.duel.stage === "challenger" ? s.phase.duel.challengerRequestId : s.phase.duel.opponentRequestId) : "";
  return run(s, { type: "ServeQuestion", requestId, question: q }).state;
};

describe("cartes du Duel Kounouzi (rendu statique)", () => {
  const offered = journey(create(makeLineSetup({ cells: { 1: "challenge" }, scenarios: scenariosOf("challenge-duel") })).state);
  const state = named(offered.state);

  it("le choix de l'adversaire propose les autres joueurs, jamais soi-même", () => {
    const card = cardForPhase(state);
    if (card?.kind !== "opponent") throw new Error("carte adversaire attendue");
    const html = renderToStaticMarkup(<OpponentCard state={state} profiles={profiles} card={card} narrator={narrator} onChoose={() => {}} />);
    expect(html).toContain("Maryam, qui souhaites-tu défier ?");
    expect(html).toContain('data-testid="opponent-p2"');
    expect(html).toContain('data-testid="opponent-p3"');
    expect(html).not.toContain('data-testid="opponent-p1"');
    expect(html).toContain("ni vitesse, ni chrono");
    // Un joueur momentanément indisponible reste visible mais désactivé, sans explication.
    const limited = renderToStaticMarkup(<OpponentCard state={state} profiles={profiles} card={{ ...card, candidates: [pid("p3")] }} narrator={narrator} onChoose={() => {}} />);
    expect(limited).toContain('data-testid="opponent-p3"');
    expect(limited).toMatch(/<button[^>]*disabled=""[^>]*data-testid="opponent-unavailable-p2"|<button[^>]*data-testid="opponent-unavailable-p2"[^>]*disabled=""/);
    expect(limited).not.toMatch(/interdit|harc/i);
  });

  it("face-à-face VS, « à toi ! », puis résultat clair avec le vainqueur", () => {
    const intro = renderToStaticMarkup(<DuelCard state={state} profiles={profiles} card={{ kind: "duel", challengerId: pid("p1"), opponentId: pid("p2"), stage: "intro" }} />);
    expect(intro).toContain("VS");
    expect(intro).toContain("Maryam défie Papa !");
    expect(intro).toContain('data-testid="face-p1"');
    expect(intro).toContain('data-testid="face-p2"');
    const turn = renderToStaticMarkup(<DuelCard state={state} profiles={profiles} card={{ kind: "duel", challengerId: pid("p1"), opponentId: pid("p2"), stage: "turn", duelistId: pid("p2"), categoryId: "maths" }} />);
    expect(turn).toContain("Papa, à toi !");
    expect(turn).toContain("Duel — Mathématiques");
    const result = renderToStaticMarkup(<DuelCard state={state} profiles={profiles} card={{ kind: "duel", challengerId: pid("p1"), opponentId: pid("p2"), stage: "result", categoryId: "maths", challengerOutcome: "correct", opponentOutcome: "incorrect", winnerId: pid("p1") }} />);
    expect(result).toContain("Maryam remporte le Duel !");
    expect(result).toContain("✅ Correct");
    expect(result).toContain("❌ Incorrect");
    const draw = renderToStaticMarkup(<DuelCard state={state} profiles={profiles} card={{ kind: "duel", challengerId: pid("p1"), opponentId: pid("p2"), stage: "result", categoryId: "maths", challengerOutcome: "correct", opponentOutcome: "correct", winnerId: null }} />);
    expect(draw).toContain("Match nul !");
  });

  it("pendant un Duel, la carte question s'adresse au dueliste en cours et affiche SA question figée", () => {
    const started = run(state, { type: "ChooseOpponent", playerId: pid("p1"), opponentId: pid("p2") });
    const q1 = resolveFor(started.state, profiles)!;
    const duel = started.state.phase.kind === "awaiting_duel" ? started.state.phase.duel : null;
    if (!duel) throw new Error("duel");
    const served = run(started.state, { type: "ServeQuestion", requestId: duel.challengerRequestId, question: q1 });
    const card = cardForPhase(served.state);
    expect(card).toMatchObject({ kind: "question", requestId: duel.challengerRequestId, playerId: "p1", purpose: "duel" });
    if (card?.kind !== "question") throw new Error("question");
    const html = renderToStaticMarkup(<QuestionCard state={served.state} profiles={profiles} card={{ ...card, step: "question" }} narrator={narrator} reduced={true} onUpdate={() => {}} onSubmit={() => {}} />);
    expect(html).toContain("Maryam, à toi !");
    expect(html).toContain(escaped(q1.prompt.fr));
    // Reprise après la réponse de Maryam : c'est Papa qui doit répondre.
    const answered = run(served.state, { type: "SubmitAnswer", playerId: pid("p1"), requestId: duel.challengerRequestId, answer: answer("correct") });
    expect(cardForPhase(answered.state)).toMatchObject({ kind: "question", requestId: duel.opponentRequestId, playerId: "p2", purpose: "duel", step: "dealt" });
  });
});

describe("Halte, visite de patrimoine, destinataire", () => {
  it("la carte de Halte annonce l'interruption ; le Défi de reprise s'affiche comme tel", () => {
    expect(renderToStaticMarkup(<HaltCard />)).toContain(escaped("Ton voyage s'interrompt."));
    const halted = journey(create(makeLineSetup({ cells: { 1: "halt" }, players: players(2) })).state);
    const back = advanceUntil(halted.state, (s) => s.players[0]!.id === s.players[s.activePlayerIndex]!.id && s.phase.kind === "awaiting_answer");
    const card = cardForPhase(back.state);
    expect(card).toMatchObject({ kind: "question", purpose: "halt" });
    if (card?.kind !== "question") throw new Error("question");
    const html = renderToStaticMarkup(<QuestionCard state={serve(back.state)} profiles={profiles} card={{ ...card, step: "question" }} narrator={narrator} reduced={true} onUpdate={() => {}} onSubmit={() => {}} />);
    expect(html).toContain("Relève le Défi de reprise");
    expect(html).toContain('data-testid="halt-intro"');
  });

  it("la visite d'un monument adverse annonce le propriétaire et l'enjeu de la contribution", () => {
    const bought = run(journey(create(makeLineSetup({ cells: { 1: "heritage" }, players: players(2) })).state).state, { type: "DecidePurchase", playerId: pid("p1"), siteId: TEST_MONUMENTS[0]!.id, buy: true });
    const visit = named(journey(bought.state).state);
    const card = cardForPhase(visit);
    expect(card).toMatchObject({ kind: "question", purpose: "heritage_visit", playerId: "p2" });
    if (card?.kind !== "question") throw new Error("question");
    const html = renderToStaticMarkup(<QuestionCard state={serve(visit)} profiles={profiles} card={{ ...card, step: "question" }} narrator={narrator} reduced={true} onUpdate={() => {}} onSubmit={() => {}} />);
    expect(html).toContain("Visite de patrimoine");
    expect(html).toContain("appartenant à Maryam");
    expect(html).toContain("Correct 25 · Presque 50 · Incorrect 100");
  });

  it("la carte destinataire propose les autres joueurs avec le montant", () => {
    const r = named(journey(create(makeLineSetup({ cells: { 1: "event" }, scenarios: scenariosOf("event-share") })).state).state);
    const card = cardForPhase(r);
    if (card?.kind !== "recipient") throw new Error("destinataire");
    const html = renderToStaticMarkup(<RecipientCard state={r} profiles={profiles} card={card} narrator={narrator} onChoose={() => {}} />);
    expect(html).toContain("Maryam, choisis un joueur : 50 Kounouz");
    expect(html).toContain('data-testid="recipient-p2"');
    expect(html).not.toContain('data-testid="recipient-p1"');
  });
});

describe("file d'animation, bandeaux et narration des nouvelles mécaniques", () => {
  const p1 = pid("p1");
  const p2 = pid("p2");
  const rec = () => {
    const calls: string[] = [];
    const actions: AnimationActions = {
      setPawn: () => {},
      setHighlight: () => {},
      setArrival: () => {},
      revealJourney: () => {},
      hideJourney: () => {},
      setBanner: (b) => calls.push(`banner:${b ? b.kind : "null"}`),
      openCard: (c) => calls.push(`card:${c.kind}${"stage" in c ? ":" + c.stage : ""}`),
      updateCard: (patch) => calls.push(`card~${"stage" in patch ? String(patch.stage) : "?"}`),
      closeCard: () => calls.push("card:close"),
    };
    return { calls, actions };
  };
  const instant = (ms: number) => (ms === 0 ? Promise.resolve() : new Promise<void>(() => {}));

  it("met en scène le Duel : adversaire → VS → à toi → question → résultat", async () => {
    const { calls, actions } = rec();
    const events: GameEvent[] = [
      { type: "DuelOffered", challengerId: p1, candidates: [p2] },
      { type: "DuelStarted", challengerId: p1, opponentId: p2 },
      { type: "DuelTurn", duelistId: p1, requestId: "q1", categoryId: null },
      { type: "QuestionRequested", requestId: "q1", playerId: p1, position: 1, purpose: "duel" },
      { type: "DuelResolved", challengerId: p1, opponentId: p2, categoryId: "maths", challengerOutcome: "correct", opponentOutcome: "incorrect", winnerId: p1 },
      { type: "JourneyHalted", playerId: p1, position: 3 },
      { type: "MoneyTransferred", transferId: "t1", fromPlayerId: p1, toPlayerId: p2, requested: 50, amount: 50, reason: "gift" },
    ];
    for (const e of events) await playEvent(e, actions, REDUCED_TIMINGS, instant);
    expect(calls).toEqual(["card:opponent", "card:duel:intro", "card~turn", "card:question", "card:duel:result", "card:halt", "card:close", "card:close", "card:close", "banner:transfer", "banner:null", "banner:null"]);
  });

  it("les bandeaux et la narration nomment les joueurs", () => {
    const state = named(create(makeSetup()).state);
    expect(bannerText({ kind: "transfer", fromPlayerId: p1, toPlayerId: p2, amount: 50, contribution: false }, state)).toBe("Maryam donne 50 à Papa");
    expect(bannerText({ kind: "transfer", fromPlayerId: p2, toPlayerId: p1, amount: 25, contribution: true }, state)).toBe("Papa contribue 25 au patrimoine de Maryam");
    expect(bannerText({ kind: "halt_lifted", playerId: p1 }, state)).toBe("Maryam reprend la route !");
    expect(bannerText({ kind: "shield", amount: 150 }, state)).toContain("annulée");
    expect(utteranceFor({ type: "DuelStarted", challengerId: p1, opponentId: p2 }, state, "fr")?.text).toBe("Maryam défie Papa !");
    expect(utteranceFor({ type: "DuelTurn", duelistId: p2, requestId: "q", categoryId: null }, state, "fr")?.text).toBe("Papa, à toi !");
    expect(utteranceFor({ type: "DuelResolved", challengerId: p1, opponentId: p2, categoryId: "maths", challengerOutcome: "correct", opponentOutcome: "incorrect", winnerId: p1 }, state, "fr")?.text).toBe("Maryam remporte le Duel Kounouzi !");
    expect(utteranceFor({ type: "DuelResolved", challengerId: p1, opponentId: p2, categoryId: "maths", challengerOutcome: "correct", opponentOutcome: "correct", winnerId: null }, state, "fr")?.text).toBe("Match nul !");
    expect(utteranceFor({ type: "JourneyHalted", playerId: p1, position: 2 }, state, "fr")?.text).toBe("Ton voyage s'interrompt.");
    expect(utteranceFor({ type: "HeritageVisited", visitorId: p2, ownerId: p1, siteId: "s", contribution: { correct: 25, partial: 50, incorrect: 100 } }, state, "fr")?.text).toContain("monument de Maryam");
  });
});
