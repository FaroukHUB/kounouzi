import { describe, expect, it } from "vitest";
import { FAMILY_CHALLENGES } from "@/config/challenges";
import { deserializeGameState, isChallengeEligible, recitationCandidates, recitationLevelFor, selectRecitations, serializeGameState, type GameState, type PlayerSetup } from "@/core/game";
import { cardForPhase } from "@/ui/cards/cardState";
import { challengesFixture, RECITATIONS } from "../../fixtures/game/challenges.fixture";
import { scenariosOf } from "../../fixtures/game/scenarios.fixture";
import { create, eventsOf, journey, lineBoard, makeLineSetup, pid, run, simulate } from "../../fixtures/game/setup.fixture";

const recitation = (id: string) => FAMILY_CHALLENGES.find((c) => c.id === id)!;
const only = (...ids: string[]) => FAMILY_CHALLENGES.filter((c) => ids.includes(c.id));
const ALL_CHALLENGE_CELLS = { 1: "challenge", 2: "challenge", 3: "challenge", 4: "challenge", 5: "challenge", 6: "challenge", 7: "challenge" } as const;

const land = (players: readonly PlayerSetup[], definitions = only("CH-091", "CH-092", "CH-093")) =>
  journey(create(makeLineSetup({ cells: { 1: "challenge" }, scenarios: scenariosOf("challenge-family"), players, challenges: challengesFixture({ definitions, recitations: RECITATIONS }) })).state);
const challengeOf = (state: GameState) => (state.phase.kind === "awaiting_challenge" ? state.phase.challenge : null);

describe("défis de récitation (CH-091 à CH-093) : références seulement, sélection déterministe", () => {
  const maryam: PlayerSetup = { id: pid("maryam"), displayName: "Maryam", profileType: "child", age: 6 };
  const papa: PlayerSetup = { id: pid("papa"), displayName: "Papa", profileType: "adult", masteredSurahs: ["surah_112", "surah_114"] };

  it("CH-093 référence toujours Al-Fātiḥah (surah_001), quel que soit le joueur", () => {
    for (const player of [maryam, papa]) {
      const landed = land([player, player.id === maryam.id ? papa : maryam], only("CH-093"));
      expect(challengeOf(landed.state)).toMatchObject({ challengeId: "CH-093", surahIds: ["surah_001"] });
      expect(eventsOf(landed.events, "FamilyChallengeAssigned")[0]?.surahIds).toEqual(["surah_001"]);
    }
  });

  it("CH-091 : une sourate validée du niveau du joueur (niveau de jeu selon l'âge, jamais un rang religieux), sans répétition tant que le vivier n'est pas épuisé", () => {
    expect(recitationLevelFor(6)).toBe(1);
    expect(recitationLevelFor(9)).toBe(2);
    expect(recitationLevelFor(18)).toBe(5);
    const ref = recitation("CH-091").contentRef!;
    if (ref.kind !== "validated_recitation") throw new Error("ref");
    const forChild = recitationCandidates(ref, { profileType: "child", age: 6, masteredSurahs: [] }, RECITATIONS);
    expect(forChild.every((s) => s.level === 1)).toBe(true);
    expect(forChild).toHaveLength(8);
    expect(recitationCandidates(ref, { profileType: "adult", masteredSurahs: [] }, RECITATIONS)).toHaveLength(38);

    const sim = simulate(makeLineSetup({ board: lineBoard(ALL_CHALLENGE_CELLS), scenarios: scenariosOf("challenge-family"), players: [maryam, papa], challenges: challengesFixture({ definitions: only("CH-091"), recitations: RECITATIONS }) }));
    const mine = eventsOf(sim.events, "FamilyChallengeAssigned")
      .filter((e) => e.playerId === maryam.id)
      .map((e) => e.surahIds![0]!);
    expect(mine.length).toBeGreaterThanOrEqual(4);
    expect(new Set(mine.slice(0, Math.min(8, mine.length))).size).toBe(Math.min(8, mine.length));
    for (const id of mine) expect(RECITATIONS.find((r) => r.id === id)!.level).toBe(1);
  });

  it("CH-092 est impossible avec moins de 2 sourates maîtrisées ; avec 2, deux sourates différentes parmi les siennes", () => {
    const config = challengesFixture({ definitions: only("CH-092"), recitations: RECITATIONS });
    const def = recitation("CH-092");
    expect(isChallengeEligible(def, { profileType: "child", age: 6, masteredSurahs: [] }, config)).toBe(false);
    expect(isChallengeEligible(def, { profileType: "adult", masteredSurahs: ["surah_001"] }, config)).toBe(false);
    expect(isChallengeEligible(def, { profileType: "adult", masteredSurahs: ["surah_001", "surah_112"] }, config)).toBe(true);
    // Maryam (rien de maîtrisé) : aucun défi éligible → la case ne propose rien. Papa (2 maîtrisées) : les deux siennes.
    const landedMaryam = land([maryam, papa], only("CH-092"));
    expect(eventsOf(landedMaryam.events, "FamilyChallengeUnavailable")).toHaveLength(1);
    const landedPapa = land([papa, maryam], only("CH-092"));
    const c = challengeOf(landedPapa.state)!;
    expect(c.challengeId).toBe("CH-092");
    expect([...c.surahIds!].sort()).toEqual(["surah_112", "surah_114"]);
  });

  it("rechargement : même défi, mêmes sourates ; la carte reconstruite affiche les mêmes références", () => {
    const landed = land([papa, maryam]);
    const before = challengeOf(landed.state)!;
    const back = deserializeGameState(serializeGameState(landed.state));
    expect(back.ok).toBe(true);
    if (!back.ok) return;
    expect(back.value).toEqual(landed.state);
    expect(challengeOf(back.value)).toEqual(before);
    expect(cardForPhase(back.value)).toMatchObject({ kind: "challenge", challengeId: before.challengeId, surahIds: before.surahIds });
    // Même état + mêmes commandes → mêmes sourates (aucun hasard).
    expect(selectRecitations(landed.state, papa.id, { kind: "validated_recitation", count: 1 })).toEqual(selectRecitations(landed.state, papa.id, { kind: "validated_recitation", count: 1 }));
  });

  it("une récitation réussie rend la sourate maîtrisée (une fois) ; ratée ou passée, rien ne change ; le gain est crédité une fois", () => {
    const landed = land([maryam, papa], only("CH-093"));
    const accepted = run(landed.state, { type: "AcceptChallenge", playerId: maryam.id });
    const done = run(accepted.state, { type: "CompleteChallenge", playerId: maryam.id, success: true });
    expect(eventsOf(done.events, "RecitationMastered")).toEqual([{ type: "RecitationMastered", playerId: maryam.id, surahId: "surah_001" }]);
    expect(done.state.players.find((p) => p.id === maryam.id)!.masteredSurahs).toEqual(["surah_001"]);
    expect(eventsOf(done.events, "ChallengeRewardGranted")).toHaveLength(1);
    // Déjà maîtrisée : pas de second événement.
    const again = land([{ ...maryam, masteredSurahs: ["surah_001"] }, papa], only("CH-093"));
    const doneAgain = run(run(again.state, { type: "AcceptChallenge", playerId: maryam.id }).state, { type: "CompleteChallenge", playerId: maryam.id, success: true });
    expect(eventsOf(doneAgain.events, "RecitationMastered")).toHaveLength(0);
    const failed = run(accepted.state, { type: "CompleteChallenge", playerId: maryam.id, success: false });
    expect(failed.state.players.find((p) => p.id === maryam.id)!.masteredSurahs).toEqual([]);
    const skipped = run(landed.state, { type: "SkipChallenge", playerId: maryam.id, reason: "declined" });
    expect(skipped.state.players.find((p) => p.id === maryam.id)!.masteredSurahs).toEqual([]);
  });

  it("sans banque de sourates figée (partie migrée), aucun défi de récitation n'est jamais proposé", () => {
    const landed = journey(create(makeLineSetup({ cells: { 1: "challenge" }, scenarios: scenariosOf("challenge-family"), players: [papa, maryam], challenges: challengesFixture({ definitions: only("CH-091", "CH-092", "CH-093") }) })).state);
    expect(eventsOf(landed.events, "FamilyChallengeUnavailable")).toHaveLength(1);
  });
});
