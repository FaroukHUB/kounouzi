import { describe, expect, it } from "vitest";
import { duelCandidates, reduce, type GameState } from "@/core/game";
import { scenariosOf } from "../../fixtures/game/scenarios.fixture";
import { active, advanceUntil, answer, create, eventsOf, journey, makeLineSetup, pid, players, run } from "../../fixtures/game/setup.fixture";

/** Plateau où chaque case (sauf le départ) est un Défi qui déclenche un Duel : chaque tour est un Duel. */
const allDuels = (n: number) => makeLineSetup({ cells: { 1: "challenge", 2: "challenge", 3: "challenge", 4: "challenge", 5: "challenge", 6: "challenge", 7: "challenge" }, scenarios: scenariosOf("challenge-duel"), players: players(n), rules: { ...makeLineSetup().rules, endCondition: { kind: "turns_per_player", turns: 12 } } });

/** Joue le Duel de p1 contre `opponent`, puis avance jusqu'au prochain Duel proposé à p1. */
function duelThenNext(state: GameState, opponent: string): GameState {
  const started = run(state, { type: "ChooseOpponent", playerId: pid("p1"), opponentId: pid(opponent) });
  const duel = started.state.phase.kind === "awaiting_duel" ? started.state.phase.duel : null;
  if (!duel) throw new Error("duel");
  const a = run(started.state, { type: "SubmitAnswer", playerId: pid("p1"), requestId: duel.challengerRequestId, answer: answer("correct") });
  const b = run(a.state, { type: "SubmitAnswer", playerId: pid(opponent), requestId: duel.opponentRequestId, answer: answer("incorrect") });
  return advanceUntil(b.state, (s) => active(s) === pid("p1") && s.phase.kind === "awaiting_duel_opponent", undefined, 200).state;
}

describe("Duel : adversaires disponibles (V1)", () => {
  it("à 4 joueurs, l'adversaire du dernier Duel déclenché est momentanément indisponible, puis redevient disponible", () => {
    const first = journey(create(allDuels(4)).state);
    expect(first.state.phase).toMatchObject({ kind: "awaiting_duel_opponent", candidates: [pid("p2"), pid("p3"), pid("p4")] });
    // A (p1) défie B (p2).
    const second = duelThenNext(first.state, "p2");
    expect(second.phase).toMatchObject({ kind: "awaiting_duel_opponent", candidates: [pid("p3"), pid("p4")] });
    expect(duelCandidates(second, pid("p1"))).toEqual([pid("p3"), pid("p4")]);
    expect(second.players[0]!.lastDuelOpponentId).toBe(pid("p2"));
    expect(eventsOf(journey(create(allDuels(4)).state).events, "DuelOffered")[0]!.candidates).toHaveLength(3);
    // A défie C (p3) : au Duel suivant, B est de nouveau disponible et C ne l'est plus.
    const third = duelThenNext(second, "p3");
    expect(third.phase).toMatchObject({ kind: "awaiting_duel_opponent", candidates: [pid("p2"), pid("p4")] });
  });

  it("le choix de l'adversaire indisponible est refusé (INVALID_OPPONENT)", () => {
    const first = journey(create(allDuels(3)).state);
    const second = duelThenNext(first.state, "p2");
    expect(reduce(second, { type: "ChooseOpponent", playerId: pid("p1"), opponentId: pid("p2") })).toMatchObject({ ok: false, error: { code: "INVALID_OPPONENT", opponentId: pid("p2") } });
    expect(reduce(second, { type: "ChooseOpponent", playerId: pid("p1"), opponentId: pid("p3") }).ok).toBe(true);
  });

  it("à 2 joueurs, la règle ne s'applique pas : A peut toujours défier B", () => {
    const first = journey(create(allDuels(2)).state);
    expect(first.state.phase).toMatchObject({ kind: "awaiting_duel_opponent", candidates: [pid("p2")] });
    const second = duelThenNext(first.state, "p2");
    expect(second.phase).toMatchObject({ kind: "awaiting_duel_opponent", candidates: [pid("p2")] });
    const third = duelThenNext(second, "p2");
    expect(third.phase).toMatchObject({ kind: "awaiting_duel_opponent", candidates: [pid("p2")] });
  });
});
