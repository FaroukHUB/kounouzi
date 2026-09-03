import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { contentRegistry } from "@/config/content";
import { NullNarrator } from "@/experience/narration";
import { resolveQuestion } from "@/experience/questionResolver";
import { ChoiceCard, optionLabel, scenarioTitle } from "@/ui/cards/ChoiceCard";
import { MonumentCard, siteDisplayName } from "@/ui/cards/MonumentCard";
import { QuestionCard } from "@/ui/cards/QuestionCard";
import { cardForPhase } from "@/ui/cards/cardState";
import { create, journey, makeLineSetup, makeSetup, players, run } from "../../fixtures/game/setup.fixture";
import { scenariosOf } from "../../fixtures/game/scenarios.fixture";

const narrator = new NullNarrator();
const profiles = makeSetup().players.map((p) => ({ id: p.id, displayName: p.displayName, profileType: p.profileType, avatarId: "teal", child: { birthYear: 2018, schoolGrade: "CE2" } }));

describe("carte question (rendu statique)", () => {
  const pending = journey(create(makeLineSetup()).state);
  // La carte affiche la question FIGÉE dans l'état : on la sert d'abord (comme le fait GameScreen).
  const asked = run(pending.state, { type: "ServeQuestion", requestId: "q1", question: resolveQuestion(pending.state, profiles, contentRegistry())! });
  const base = { kind: "question" as const, requestId: "q1", validationMode: "collective" as const };
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
    const m = render({ ...base, step: "mastery", outcome: "correct" });
    for (const k of ["none", "fr", "ar", "both"]) expect(m).toContain(`data-testid="mastery-${k}"`);
  });

  it("affiche le résultat puis la récompense, avec la mention du gain doublé", () => {
    expect(render({ ...base, step: "result", outcome: "partial" })).toContain("Presque");
    const reward = render({ ...base, step: "reward", rewardAmount: 100, multiplier: 2 });
    expect(reward).toContain("+100");
    expect(reward).toContain("gain doublé");
  });

  it("reconstruit la carte depuis la phase à la reprise", () => {
    expect(cardForPhase(asked.state)).toEqual({ kind: "question", requestId: "q1", step: "dealt", validationMode: "collective" });
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
