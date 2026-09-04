import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { NullNarrator } from "@/experience/narration";
import { ChoiceCard, optionLabel, scenarioTitle } from "@/ui/cards/ChoiceCard";
import { MonumentCard, siteDisplayName } from "@/ui/cards/MonumentCard";
import { QuestionCard } from "@/ui/cards/QuestionCard";
import { cardForPhase } from "@/ui/cards/cardState";
import { create, journey, makeLineSetup, makeSetup, pid, players, run } from "../../fixtures/game/setup.fixture";
import { scenariosOf } from "../../fixtures/game/scenarios.fixture";
import { resolveFor } from "../../fixtures/learning/resolve.fixture";

const narrator = new NullNarrator();
const profiles = makeSetup().players.map((p) => ({ id: p.id, displayName: p.displayName, profileType: p.profileType, avatarId: "teal", child: { birthYear: 2018 } }));

describe("carte question (rendu statique)", () => {
  const pending = journey(create(makeLineSetup()).state);
  // La carte affiche la question FIGÉE dans l'état : on la sert d'abord (comme le fait GameScreen).
  const asked = run(pending.state, { type: "ServeQuestion", requestId: "q1", question: resolveFor(pending.state, profiles)! });
  const base = { kind: "question" as const, requestId: "q1", playerId: pid("p1"), purpose: "standard" as const, validationMode: "collective" as const };
  const render = (card: Parameters<typeof QuestionCard>[0]["card"], state = asked.state) => renderToStaticMarkup(<QuestionCard state={state} profiles={profiles} card={card} narrator={narrator} reduced={true} onUpdate={() => {}} onSubmit={() => {}} />);

  it("tant que la question n'est pas servie, la carte attend (aucun énoncé résolu au rendu)", () => {
    const waiting = render({ ...base, step: "question" }, pending.state);
    expect(waiting).not.toContain('data-testid="question-prompt"');
    expect(waiting).toContain("…");
  });

  it("commence face cachée, puis affiche l'énoncé et le bouton de révélation à appui long", () => {
    expect(render({ ...base, step: "dealt" })).toContain('data-testid="card-back"');
    const q = render({ ...base, step: "question" });
    expect(q).toContain('data-testid="question-prompt"');
    expect(q).toContain('data-testid="reveal-hold"');
    expect(q).not.toContain('data-testid="question-answer"');
  });

  it("après révélation : réponse, Correct / Presque / Incorrect et auto-évaluation explicite", () => {
    const r = render({ ...base, step: "revealed" });
    expect(r).toContain('data-testid="question-answer"');
    for (const o of ["correct", "partial", "incorrect"]) expect(r).toContain(`data-testid="validate-${o}"`);
    expect(r).toContain('data-testid="self-eval"');
  });

  it("l'explication est bilingue (FR puis AR isolé en RTL) et mène à « connaissais-tu déjà ? » si la réponse est correcte", () => {
    const e = render({ ...base, step: "explanation", outcome: "correct" });
    expect(e).toContain('data-testid="explanation"');
    expect(e).toContain('lang="fr"');
    expect(e).toContain('lang="ar" dir="rtl" class="bidi-isolate');
    // Sans voix disponible (narrateur muet), pas de bouton « Écouter en arabe » ; avec une voix, il est proposé et l'arabe n'est jamais lu automatiquement.
    expect(e).not.toContain('data-testid="explanation-listen-ar"');
    const spoken: string[] = [];
    const voiced = { ...narrator, isSupported: () => true, speak: (u: { text: string; lang: string }) => spoken.push(u.lang), stop: () => {}, replayLast: () => {}, getAvailableVoices: () => [], setEnabled: () => {}, setRate: () => {} };
    const withVoice = renderToStaticMarkup(<QuestionCard state={asked.state} profiles={profiles} card={{ ...base, step: "explanation", outcome: "correct" }} narrator={voiced} reduced={true} onUpdate={() => {}} onSubmit={() => {}} />);
    expect(withVoice).toContain('data-testid="explanation-listen-ar"');
    expect(spoken).toEqual([]);
    const m = render({ ...base, step: "mastery", outcome: "correct" });
    for (const k of ["none", "fr", "ar", "both"]) expect(m).toContain(`data-testid="mastery-${k}"`);
  });

  it("affiche le résultat puis la récompense, avec la mention du gain doublé — même quand l'état réel est déjà passé à la suite", () => {
    expect(render({ ...base, step: "result", outcome: "partial" })).toContain("Presque");
    const reward = render({ ...base, step: "reward", rewardAmount: 100, multiplier: 2 });
    expect(reward).toContain("+100");
    expect(reward).toContain("gain doublé");
    // Après SubmitAnswer, la phase a changé : la carte garde son instantané de la question et n'affiche jamais « Aucune question ».
    const served = asked.state.phase.kind === "awaiting_answer" ? asked.state.phase.served! : null!;
    const moved = run(asked.state, { type: "SubmitAnswer", playerId: pid("p1"), requestId: "q1", answer: { outcome: "correct", explanationMastery: "fr", validationMode: "collective" } });
    const after = render({ ...base, step: "reward", rewardAmount: 100, multiplier: 2, question: served }, moved.state);
    expect(after).toContain("+100");
    expect(after).not.toContain("Aucune question");
  });

  it("reconstruit la carte depuis la phase à la reprise", () => {
    expect(cardForPhase(asked.state)).toEqual({ kind: "question", requestId: "q1", playerId: "p1", purpose: "standard", step: "dealt", validationMode: "collective" });
    expect(cardForPhase(create(makeLineSetup()).state)).toBeNull();
  });
});

describe("carte monument et carte choix", () => {
  it("propose l'achat avec prix et valeur patrimoniale, sans histoire inventée ; désactive l'achat si trop cher", () => {
    const offered = journey(create(makeLineSetup({ cells: { 1: "heritage" } })).state);
    const card = cardForPhase(offered.state);
    if (card?.kind !== "monument") throw new Error("carte monument attendue");
    const html = renderToStaticMarkup(<MonumentCard state={offered.state} card={card} narrator={narrator} onDecide={() => {}} />);
    expect(html).toContain(siteDisplayName("test-monument-01"));
    expect(html).toContain("contenu validé");
    expect(html).toContain('data-testid="monument-buy"');
    const poor = renderToStaticMarkup(<MonumentCard state={offered.state} card={{ ...card, affordable: false }} narrator={narrator} onDecide={() => {}} />);
    expect(poor).toMatch(/<button[^>]*disabled=""[^>]*data-testid="monument-buy"|<button[^>]*data-testid="monument-buy"[^>]*disabled=""/);
  });

  it("présente les options d'un choix avec des libellés de démonstration", () => {
    const setup = makeLineSetup({ cells: { 1: "management" }, scenarios: scenariosOf("management-choice"), players: players(2) });
    const chosen = journey(create(setup).state);
    const card = cardForPhase(chosen.state);
    if (card?.kind !== "choice") throw new Error("carte choix attendue");
    const html = renderToStaticMarkup(<ChoiceCard state={chosen.state} card={card} narrator={narrator} onChoose={() => {}} />);
    expect(html).toContain('data-testid="choose-save"');
    expect(html).toContain('data-testid="choose-spend"');
    expect(optionLabel("save")).toBe("Épargner (+50)");
    expect(scenarioTitle("demo-event-gain")).toContain("rentrée d'argent");
    expect(scenarioTitle("inconnu")).toBe("inconnu");
  });
});
