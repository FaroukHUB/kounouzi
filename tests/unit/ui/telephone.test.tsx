import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { NullNarrator } from "@/experience/narration";
import { CardShell } from "@/ui/cards/CardShell";
import { QuestionCard } from "@/ui/cards/QuestionCard";
import { cardForPhase } from "@/ui/cards/cardState";
import { SettingsSheet } from "@/ui/game/SettingsSheet";
import { FinalRanking } from "@/ui/game/FinalRanking";
import { deckFor } from "@/config/cards";
import { create, journey, makeLineSetup, pid, players, run, simulate, makeSetup } from "../../fixtures/game/setup.fixture";
import { resolveFor } from "../../fixtures/learning/resolve.fixture";

/**
 * TÉLÉPHONE : CE QUI DOIT RESTER ATTEIGNABLE.
 *
 * Constaté en partie sur téléphone : « les boutons ont disparu ». Deux causes,
 * toutes deux des pièges de petit écran.
 *
 *  1. Le parchemin d'une carte illustrée fait 279 × 290 px sur un téléphone.
 *     Une carte longue (énoncé, choix, réponse, explication FR puis AR, source,
 *     puis quatre boutons) débordait de 90 px, et le débordement est MASQUÉ par
 *     l'illustration : les boutons devenaient invisibles, sans rien pour dire
 *     qu'il fallait faire défiler un cadre de la taille d'un timbre.
 *  2. Les réglages mesuraient 921 px de haut sur un écran de 909 px, sans
 *     hauteur bornée ni défilement : le panneau débordait par le HAUT et le
 *     bouton « Fermer » sortait de l'écran.
 */
const narrator = new NullNarrator();
const profiles = [
  { id: pid("p1"), displayName: "Maryam", profileType: "child" as const, avatarId: "fille-7-9", child: { birthYear: 2018 } },
  { id: pid("p2"), displayName: "Papa", profileType: "adult" as const, avatarId: "garcon-17-plus", adult: { initialLevel: "standard" as const } },
];

function carteQuestion() {
  let state = journey(create(makeLineSetup({ cells: { 1: "question" }, players: players(2) })).state).state;
  const q = resolveFor(state, profiles)!;
  const requestId = state.phase.kind === "awaiting_answer" ? state.phase.requestId : "";
  state = run(state, { type: "ServeQuestion", requestId, question: q }).state;
  const card = cardForPhase(state);
  if (card?.kind !== "question") throw new Error("carte question attendue");
  return { state, card };
}

const rendu = (step: "question" | "revealed" | "explanation" | "mastery") => {
  const { state, card } = carteQuestion();
  return renderToStaticMarkup(<QuestionCard state={state} profiles={profiles} card={{ ...card, step, outcome: "correct" }} narrator={narrator} reduced={true} onUpdate={() => {}} onSubmit={() => {}} />);
};

describe("sur téléphone, une action ne quitte jamais l'écran", () => {
  it("chaque moment où il faut agir porte une zone d'actions, donc elle colle au bas du parchemin", () => {
    // Sans ce marquage, l'action se retrouve sous la ligne de flottaison d'un parchemin minuscule.
    for (const step of ["question", "revealed", "explanation", "mastery"] as const) {
      expect(rendu(step), `étape ${step}`).toContain("data-card-actions");
    }
  });

  it("les deux coques savent faire coller les actions, et la réduction du texte ne rend plus un bouton minuscule", () => {
    const html = renderToStaticMarkup(
      <CardShell cellType="question" title="T">
        <div data-card-actions>
          <button type="button">Agir</button>
        </div>
      </CardShell>,
    );
    expect(html).toContain("data-card-actions");
    // Coque illustrée : les actions collent, et un bouton d'action garde une cible tactile.
    const deck = deckFor({ categoryId: "maths" })!;
    const illustre = renderToStaticMarkup(
      <CardShell cellType="question" title="T" deck={deck}>
        <div data-card-actions>
          <button type="button">Agir</button>
        </div>
      </CardShell>,
    );
    // `renderToStaticMarkup` échappe les `&` des sélecteurs Tailwind.
    expect(illustre).toContain("[&amp;_[data-card-actions]]:sticky");
    expect(illustre).toContain("[&amp;_[data-card-actions]_button]:min-h-14");
  });

  it("les panneaux plus hauts que l'écran se bornent et défilent, sinon « Fermer » sort de l'écran", () => {
    const reglages = renderToStaticMarkup(
      <SettingsSheet open={true} onClose={() => {}} narrationSupported={true} narrationMode="cloud" onReplay={() => {}} paused={false} onTogglePause={() => {}} endRequested={false} onRequestEnd={() => {}} onOpenHelp={() => {}} challengeSettings={null} onChallengeSettings={() => {}} />,
    );
    expect(reglages).toContain("max-h-[92dvh]");
    expect(reglages).toContain("overflow-y-auto");
    // Et l'en-tête, qui porte « Fermer », reste visible pendant le défilement.
    expect(reglages).toContain("sticky top-0");

    const fin = simulate(makeSetup({ players: players(4) }));
    const classement = renderToStaticMarkup(<FinalRanking state={fin.state} />);
    expect(classement).toContain("max-h-[92dvh]");
    expect(classement).toContain("overflow-y-auto");
  });
});
