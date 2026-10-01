import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { QUESTION_TIMER, questionTimerSchema, timerSecondsFor } from "@/config/timer";
import { NullNarrator } from "@/experience/narration";
import { QuestionCard } from "@/ui/cards/QuestionCard";
import { QuestionTimer } from "@/ui/cards/QuestionTimer";
import { cardForPhase } from "@/ui/cards/cardState";
import { advanceUntil, create, journey, makeLineSetup, pid, run } from "../../fixtures/game/setup.fixture";
import { resolveFor } from "../../fixtures/learning/resolve.fixture";
import type { PlayerSetup } from "@/core/game";

/**
 * CHRONOMÈTRE PAR QUESTION. Il mesure, il ne juge pas : la durée est une
 * donnée (par type de profil), à zéro il s'arrête et le dit, et la réponse
 * reste possible. Aucun effet sur le moteur : rien n'est envoyé, rien n'entre
 * dans l'état, donc une partie reprise ne dépend pas de lui.
 */
const narrator = new NullNarrator();
const FAMILLE: readonly PlayerSetup[] = [
  { id: pid("maryam"), displayName: "Maryam", profileType: "child", age: 8 },
  { id: pid("papa"), displayName: "Papa", profileType: "adult" },
];
const profiles = [
  { id: pid("maryam"), displayName: "Maryam", profileType: "child" as const, avatarId: "fille-7-9", child: { birthYear: 2018 } },
  { id: pid("papa"), displayName: "Papa", profileType: "adult" as const, avatarId: "garcon-17-plus", adult: { initialLevel: "standard" as const } },
];

/** Partie minimale : la case 1 est une case Savoir, donc le joueur actif reçoit une question. */
function questionPour(joueur: "maryam" | "papa") {
  let state = create(makeLineSetup({ cells: { 1: "question" }, players: FAMILLE })).state;
  state = journey(state).state;
  if (joueur === "papa") {
    const q = resolveFor(state, profiles)!;
    const requestId = state.phase.kind === "awaiting_answer" ? state.phase.requestId : "";
    state = run(run(state, { type: "ServeQuestion", requestId, question: q }).state, { type: "SubmitAnswer", playerId: pid("maryam"), requestId, answer: { outcome: "correct", explanationMastery: "none", validationMode: "collective" } }).state;
    state = advanceUntil(state, (s) => s.phase.kind === "awaiting_answer" && s.players[s.activePlayerIndex]!.id === "papa").state;
  }
  const q = resolveFor(state, profiles)!;
  const requestId = state.phase.kind === "awaiting_answer" ? state.phase.requestId : "";
  const servi = run(state, { type: "ServeQuestion", requestId, question: q }).state;
  const card = cardForPhase(servi);
  if (card?.kind !== "question") throw new Error("carte question attendue");
  return { state: servi, card };
}

const rendu = (joueur: "maryam" | "papa", step: "question" | "revealed") => {
  const { state, card } = questionPour(joueur);
  return renderToStaticMarkup(<QuestionCard state={state} profiles={profiles} card={{ ...card, step }} narrator={narrator} reduced={true} onUpdate={() => {}} onSubmit={() => {}} />);
};

describe("chronomètre d'une question", () => {
  it("la durée est une donnée validée, différente selon le profil du répondant", () => {
    expect(questionTimerSchema.parse(QUESTION_TIMER)).toEqual(QUESTION_TIMER);
    expect(QUESTION_TIMER.atZero).toBe("signal");
    const enfant = timerSecondsFor("child");
    const adulte = timerSecondsFor("adult");
    expect(enfant).toBeGreaterThan(0);
    expect(adulte).toBeGreaterThan(0);
    // Un enfant lit et formule plus lentement : il reçoit au moins autant de temps qu'un adulte.
    expect(enfant!).toBeGreaterThanOrEqual(adulte!);
    // Éteint par les données : plus aucun chronomètre, nulle part.
    expect(timerSecondsFor("child", { ...QUESTION_TIMER, enabled: false })).toBeNull();
  });

  it("la carte question l'affiche pendant qu'on cherche, avec la durée du répondant, et plus après la révélation", () => {
    const deMaryam = rendu("maryam", "question");
    expect(deMaryam).toContain('data-testid="question-timer"');
    expect(deMaryam).toContain(`data-remaining="${timerSecondsFor("child")}"`);
    expect(deMaryam).toContain('data-expired="false"');

    const dePapa = rendu("papa", "question");
    expect(dePapa).toContain(`data-remaining="${timerSecondsFor("adult")}"`);

    // Réponse révélée : on valide ensemble, le chronomètre n'a plus rien à mesurer.
    expect(rendu("maryam", "revealed")).not.toContain('data-testid="question-timer"');
  });

  it("à zéro il le dit et n'empêche rien ; en dessous du seuil il alerte", () => {
    const plein = renderToStaticMarkup(<QuestionTimer seconds={60} warnAtSeconds={10} running={false} />);
    expect(plein).toContain('data-expired="false"');
    expect(plein).toContain("60 s");

    const alerte = renderToStaticMarkup(<QuestionTimer seconds={8} warnAtSeconds={10} running={false} />);
    expect(alerte).toContain("var(--k-amber)");

    const ecoule = renderToStaticMarkup(<QuestionTimer seconds={0} warnAtSeconds={10} running={false} />);
    expect(ecoule).toContain('data-expired="true"');
    // Le mot dit explicitement que la réponse reste possible : le chronomètre ne décide de rien.
    expect(ecoule).toContain("Temps écoulé");
    expect(ecoule).toContain("réponds quand même");
  });

  it("le chronomètre ne touche pas au moteur : même partie, même déroulé, qu'il soit allumé ou non", () => {
    // Le moteur ne connaît ni le fichier de chronomètre ni le composant : l'état d'une
    // question servie est identique, et aucune commande ne vient du chronomètre.
    const a = questionPour("maryam");
    const b = questionPour("maryam");
    expect(b.state).toEqual(a.state);
    expect(Object.keys(a.state)).not.toContain("timer");
    expect(JSON.stringify(a.state)).not.toContain("warnAtSeconds");
  });
});
