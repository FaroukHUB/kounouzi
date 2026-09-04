import { describe, expect, it } from "vitest";
import { FAMILY_CHALLENGES } from "@/config/challenges";
import { GAME_SCHEMA_VERSION, NO_CHALLENGES, deserializeGameState, isChallengeEligible, playerAge, reduce, selectChallenge, serializeGameState, variantFor, type ChallengeDefinition, type GameState, type PlayerSetup } from "@/core/game";
import { cardForPhase } from "@/ui/cards/cardState";
import { challengesFixture, THREE_CHALLENGES } from "../../fixtures/game/challenges.fixture";
import { scenariosOf } from "../../fixtures/game/scenarios.fixture";
import { active, advanceUntil, create, eventsOf, journey, lineBoard, makeLineSetup, pid, run, simulate, type Policy } from "../../fixtures/game/setup.fixture";

/** Maryam (6 ans), Papa (adulte), Yacine (11 ans). */
const FAMILY: readonly PlayerSetup[] = [
  { id: pid("maryam"), displayName: "Maryam", profileType: "child", age: 6 },
  { id: pid("papa"), displayName: "Papa", profileType: "adult" },
  { id: pid("yacine"), displayName: "Yacine", profileType: "child", age: 11 },
];

/** Toutes les cases (sauf le départ) sont des cases Défi servant un Défi famille : chaque tour en propose un. */
const ALL_CHALLENGE_CELLS = { 1: "challenge", 2: "challenge", 3: "challenge", 4: "challenge", 5: "challenge", 6: "challenge", 7: "challenge" } as const;

const landOnChallenge = (config = challengesFixture(), players = FAMILY, scenarioOffset = 0) =>
  journey(create(makeLineSetup({ cells: { 1: "challenge" }, scenarios: scenariosOf("challenge-family"), players, challenges: config, scenarioOffset })).state);

const phaseOf = (state: GameState) => (state.phase.kind === "awaiting_challenge" ? state.phase.challenge : null);
const definitionOf = (state: GameState, id: string): ChallengeDefinition => state.config.challenges.definitions.find((d) => d.id === id)!;
const roundTrip = (state: GameState) => {
  const back = deserializeGameState(serializeGameState(state));
  expect(back.ok).toBe(true);
  if (back.ok) expect(back.value).toEqual(state);
};

describe("Défis famille — sélection déterministe cachée", () => {
  it("une case Défi peut proposer un Défi famille (distinct du Duel, qui reste inchangé)", () => {
    const landed = landOnChallenge();
    const assigned = eventsOf(landed.events, "FamilyChallengeAssigned")[0]!;
    expect(assigned).toMatchObject({ playerId: pid("maryam"), requestId: "q1" });
    expect(landed.state.phase).toMatchObject({ kind: "awaiting_challenge", challenge: { challengeId: assigned.challengeId, stage: "assigned" } });
    expect(landed.state.challengeServed[pid("maryam")]?.[assigned.challengeId]).toBe(1);
    expect(landed.state.counters.challenge).toBe(1);
    // Le Duel existant est intact : même plateau, scénario Duel.
    const duel = journey(create(makeLineSetup({ cells: { 1: "challenge" }, scenarios: scenariosOf("challenge-duel"), players: FAMILY, challenges: challengesFixture() })).state);
    expect(duel.state.phase).toMatchObject({ kind: "awaiting_duel_opponent", candidates: [pid("papa"), pid("yacine")] });
  });

  it("même état + mêmes commandes = même défi ; l'ordre des sièges et le compteur décident, jamais le solde", () => {
    const a = landOnChallenge();
    const b = landOnChallenge();
    expect(phaseOf(a.state)?.challengeId).toBe(phaseOf(b.state)?.challengeId);
    // Un solde différent ne change rien : l'argent n'entre jamais dans la sélection.
    const richer = { ...a.state, players: a.state.players.map((p) => ({ ...p, money: p.money + 5000 })) };
    expect(selectChallenge(richer, pid("maryam"))?.id).toBe(selectChallenge(a.state, pid("maryam"))?.id);
    // Une autre partie familiale (décalage) commence ailleurs dans la banque.
    const other = landOnChallenge(challengesFixture(), FAMILY, 7);
    expect(phaseOf(other.state)?.challengeId).not.toBe(phaseOf(a.state)?.challengeId);
  });

  it("reprise : l'état en plein défi fait l'aller-retour (assigné, accepté, avec question figée) et la carte est reconstruite", () => {
    const assigned = landOnChallenge();
    roundTrip(assigned.state);
    expect(cardForPhase(assigned.state)).toMatchObject({ kind: "challenge", step: "reveal", playerId: pid("maryam") });
    const accepted = run(assigned.state, { type: "AcceptChallenge", playerId: pid("maryam") });
    roundTrip(accepted.state);
    expect(cardForPhase(accepted.state)).toMatchObject({ kind: "challenge", step: "accepted" });
    // Même défi après rechargement.
    const reloaded = deserializeGameState(serializeGameState(accepted.state));
    expect(reloaded.ok && phaseOf(reloaded.value)?.challengeId).toBe(phaseOf(accepted.state)?.challengeId);
  });

  it("aucune répétition tant que le vivier éligible n'est pas épuisé, puis rotation (mini-banque de 3)", () => {
    const setup = makeLineSetup({ board: lineBoard(ALL_CHALLENGE_CELLS), scenarios: scenariosOf("challenge-family"), players: FAMILY, challenges: challengesFixture({ definitions: THREE_CHALLENGES }) });
    const sim = simulate(setup);
    const forMaryam = eventsOf(sim.events, "FamilyChallengeAssigned")
      .filter((e) => e.playerId === pid("maryam"))
      .map((e) => e.challengeId);
    expect(forMaryam.length).toBeGreaterThanOrEqual(4);
    // Trois défis distincts avant tout retour, puis le cycle reprend.
    expect(new Set(forMaryam.slice(0, 3)).size).toBe(3);
    expect(forMaryam[3]).toBe(forMaryam[0]);
  });

  it("banque réelle : un joueur ne revoit jamais un défi tant qu'il en reste d'inédits", () => {
    const setup = makeLineSetup({ board: lineBoard(ALL_CHALLENGE_CELLS), scenarios: scenariosOf("challenge-family"), players: FAMILY, challenges: challengesFixture() });
    const sim = simulate(setup);
    for (const id of [pid("maryam"), pid("papa"), pid("yacine")]) {
      const ids = eventsOf(sim.events, "FamilyChallengeAssigned")
        .filter((e) => e.playerId === id)
        .map((e) => e.challengeId);
      expect(ids.length).toBeGreaterThan(3);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });
});

describe("Défis famille — filtres d'âge, réglages parents, contenu validé", () => {
  it("âge : une enfant de 6 ans ne reçoit jamais un défi 8+ ou 10+ ; un adulte est éligible à tout ; un enfant d'âge inconnu est traité comme le plus jeune", () => {
    const config = challengesFixture();
    for (const d of FAMILY_CHALLENGES) {
      expect(isChallengeEligible(d, { profileType: "child", age: 6, masteredSurahs: [] }, config), d.id).toBe(d.minAge <= 6 && !d.contentRef);
      expect(isChallengeEligible(d, { profileType: "adult", masteredSurahs: [] }, config), d.id).toBe(!d.contentRef);
    }
    expect(playerAge({ profileType: "child" })).toBe(5);
    expect(playerAge({ profileType: "adult" })).toBe(18);
    const setup = makeLineSetup({ board: lineBoard(ALL_CHALLENGE_CELLS), scenarios: scenariosOf("challenge-family"), players: FAMILY, challenges: config });
    const sim = simulate(setup);
    for (const e of eventsOf(sim.events, "FamilyChallengeAssigned").filter((x) => x.playerId === pid("maryam"))) expect(FAMILY_CHALLENGES.find((d) => d.id === e.challengeId)!.minAge, e.challengeId).toBeLessThanOrEqual(6);
  });

  it("réglages parents : contact désactivé, « OH NON » désactivé, mouvement désactivé, boss désactivé", () => {
    const off = challengesFixture({ settings: { contact: false, ohNo: false, movement: false, boss: false } });
    for (const d of FAMILY_CHALLENGES) {
      const eligible = isChallengeEligible(d, { profileType: "adult", masteredSurahs: [] }, off);
      if (d.consentRequired || d.ohNo || d.category === "movement" || d.boss || d.contentRef) expect(eligible, d.id).toBe(false);
      else expect(eligible, d.id).toBe(true);
    }
    // En partie : les réglages changent par commande explicite, journalisée, et s'appliquent au défi suivant.
    const landed = landOnChallenge();
    const changed = run(landed.state, { type: "SetChallengeSettings", settings: { ...landed.state.config.challenges.settings, ohNo: false, contact: false } });
    expect(eventsOf(changed.events, "ChallengeSettingsChanged")).toHaveLength(1);
    expect(changed.state.config.challenges.settings.ohNo).toBe(false);
    const sim = simulate(makeLineSetup({ board: lineBoard(ALL_CHALLENGE_CELLS), scenarios: scenariosOf("challenge-family"), players: FAMILY, challenges: off }));
    for (const e of eventsOf(sim.events, "FamilyChallengeAssigned")) {
      expect(e.ohNo, e.challengeId).toBe(false);
      expect(e.consentRequired, e.challengeId).toBe(false);
      expect(e.category, e.challengeId).not.toBe("movement");
    }
  });

  it("consentement refusé : aucun échec, 0 Kounouz, le défi éligible suivant est proposé (déterministe, différent)", () => {
    const contactOnly = FAMILY_CHALLENGES.filter((d) => d.consentRequired || d.id === "CH-042");
    const landed = landOnChallenge(challengesFixture({ definitions: contactOnly }), [{ id: pid("papa"), displayName: "Papa", profileType: "adult" }, { id: pid("maryam"), displayName: "Maryam", profileType: "child", age: 6 }]);
    const first = phaseOf(landed.state)!;
    const before = landed.state.players.find((p) => p.id === pid("papa"))!.money;
    const refused = run(landed.state, { type: "SkipChallenge", playerId: pid("papa"), reason: "consent_refused" });
    expect(eventsOf(refused.events, "FamilyChallengeSkipped")[0]).toMatchObject({ challengeId: first.challengeId, reason: "consent_refused" });
    const next = phaseOf(refused.state)!;
    expect(next.challengeId).not.toBe(first.challengeId);
    expect(eventsOf(refused.events, "ChallengeRewardGranted")).toHaveLength(0);
    expect(refused.state.players.find((p) => p.id === pid("papa"))!.money).toBe(before);
    // Identique si l'on rejoue les mêmes commandes.
    const again = run(landed.state, { type: "SkipChallenge", playerId: pid("papa"), reason: "consent_refused" });
    expect(phaseOf(again.state)?.challengeId).toBe(next.challengeId);
  });

  it("refus simple : 0 Kounouz, aucune autre pénalité, le tour continue normalement", () => {
    const landed = landOnChallenge();
    const before = landed.state.players.find((p) => p.id === pid("maryam"))!.money;
    const skipped = run(landed.state, { type: "SkipChallenge", playerId: pid("maryam"), reason: "declined" });
    expect(eventsOf(skipped.events, "FamilyChallengeSkipped")[0]).toMatchObject({ reason: "declined" });
    expect(skipped.state.players.find((p) => p.id === pid("maryam"))!.money).toBe(before);
    expect(skipped.state.effects).toEqual([]);
    expect(skipped.state.players.find((p) => p.id === pid("maryam"))!.halted).toBe(false);
    expect(eventsOf(skipped.events, "TurnEnded")).toHaveLength(1);
  });

  it("contenu religieux : sans contenu `validated` disponible, aucun défi religieux n'est jamais servi ; avec, la question figée doit être de la bonne catégorie", () => {
    const sim = simulate(makeLineSetup({ board: lineBoard(ALL_CHALLENGE_CELLS), scenarios: scenariosOf("challenge-family"), players: FAMILY, challenges: challengesFixture() }));
    expect(eventsOf(sim.events, "FamilyChallengeAssigned").some((e) => e.category === "religion")).toBe(false);
    for (const d of FAMILY_CHALLENGES.filter((x) => x.category === "religion")) expect(d.contentRef, d.id).toBeDefined();

    const religionOnly = FAMILY_CHALLENGES.filter((d) => d.id === "CH-094");
    const withContent = challengesFixture({ definitions: religionOnly, contentAvailable: ["CH-094"] });
    const landed = landOnChallenge(withContent, [{ id: pid("papa"), displayName: "Papa", profileType: "adult" }, { id: pid("maryam"), displayName: "Maryam", profileType: "child", age: 6 }]);
    const c = phaseOf(landed.state)!;
    expect(c.challengeId).toBe("CH-094");
    const question = { ref: { origin: "curated" as const, questionId: "REL-X", contentVersion: 1 }, categoryId: "religion", knowledgeNodeId: "religion.x", difficulty: 1, audienceScope: "all" as const, prompt: { fr: "?" }, answer: { fr: "!" }, explanation: { fr: "e", ar: "ع" }, sources: [{ title: "s" }], review: { ar: "reviewed" as const } };
    expect(reduce(landed.state, { type: "ServeQuestion", requestId: c.requestId, question: { ...question, categoryId: "maths" } })).toMatchObject({ ok: false, error: { code: "DUEL_CATEGORY_MISMATCH" } });
    const served = run(landed.state, { type: "ServeQuestion", requestId: c.requestId, question });
    expect(phaseOf(served.state)?.served?.ref).toMatchObject({ questionId: "REL-X" });
    roundTrip(served.state);
    // Sans le contenu disponible, le même défi n'est pas éligible.
    expect(isChallengeEligible(religionOnly[0]!, { profileType: "adult", masteredSurahs: [] }, challengesFixture({ definitions: religionOnly }))).toBe(false);
  });
});

describe("Défis famille — récompense, échec, étapes", () => {
  it("réussi : le gain est crédité EXACTEMENT une fois, sans multiplicateur ; raté : 0", () => {
    const landed = landOnChallenge();
    const c = phaseOf(landed.state)!;
    const reward = definitionOf(landed.state, c.challengeId).reward;
    expect(reduce(landed.state, { type: "CompleteChallenge", playerId: pid("maryam"), success: true })).toMatchObject({ ok: false, error: { code: "CHALLENGE_STAGE", expected: "accepted" } });
    const accepted = run(landed.state, { type: "AcceptChallenge", playerId: pid("maryam") });
    expect(reduce(accepted.state, { type: "AcceptChallenge", playerId: pid("maryam") })).toMatchObject({ ok: false, error: { code: "CHALLENGE_STAGE", expected: "assigned" } });
    const before = accepted.state.players.find((p) => p.id === pid("maryam"))!.money;
    const done = run(accepted.state, { type: "CompleteChallenge", playerId: pid("maryam"), success: true });
    expect(eventsOf(done.events, "ChallengeRewardGranted")).toEqual([{ type: "ChallengeRewardGranted", playerId: pid("maryam"), challengeId: c.challengeId, amount: reward }]);
    expect(done.state.ledger.filter((tx) => tx.reason === "challenge_reward")).toHaveLength(1);
    expect(done.state.players.find((p) => p.id === pid("maryam"))!.money).toBe(before + reward);
    // Une seconde validation est impossible : le tour est passé (phase suivante, autre joueur actif).
    expect(reduce(done.state, { type: "CompleteChallenge", playerId: active(done.state), success: true })).toMatchObject({ ok: false, error: { code: "INVALID_PHASE" } });
    expect(reduce(done.state, { type: "CompleteChallenge", playerId: pid("maryam"), success: true })).toMatchObject({ ok: false, error: { code: "NOT_ACTIVE_PLAYER" } });

    const failed = run(accepted.state, { type: "CompleteChallenge", playerId: pid("maryam"), success: false });
    expect(eventsOf(failed.events, "FamilyChallengeCompleted")[0]).toMatchObject({ success: false });
    expect(eventsOf(failed.events, "ChallengeRewardGranted")).toHaveLength(0);
    expect(failed.state.players.find((p) => p.id === pid("maryam"))!.money).toBe(before);
  });

  it("un multiplicateur de récompense de question en attente ne touche jamais un gain de défi", () => {
    const boosted = journey(create(makeLineSetup({ cells: { 1: "treasure", 2: "challenge" }, scenarios: scenariosOf("treasure-boost", "challenge-family"), players: FAMILY, challenges: challengesFixture() })).state);
    const landed = advanceUntil(boosted.state, (s) => s.phase.kind === "awaiting_challenge" && s.players[s.activePlayerIndex]!.id === pid("maryam"));
    const c = phaseOf(landed.state)!;
    const done = run(run(landed.state, { type: "AcceptChallenge", playerId: pid("maryam") }).state, { type: "CompleteChallenge", playerId: pid("maryam"), success: true });
    expect(eventsOf(done.events, "ChallengeRewardGranted")[0]?.amount).toBe(definitionOf(landed.state, c.challengeId).reward);
    expect(done.state.effects.some((e) => e.spec.type === "reward_multiplier" && e.playerId === pid("maryam"))).toBe(true);
  });

  it("défi solidaire réussi : le transfert réel déclaré par les données s'applique après la récompense (CH-052 : au plus pauvre)", () => {
    const only = FAMILY_CHALLENGES.filter((d) => d.id === "CH-052");
    const landed = landOnChallenge(challengesFixture({ definitions: only }), [{ id: pid("papa"), displayName: "Papa", profileType: "adult" }, { id: pid("maryam"), displayName: "Maryam", profileType: "child", age: 6 }]);
    const done = run(run(landed.state, { type: "AcceptChallenge", playerId: pid("papa") }).state, { type: "CompleteChallenge", playerId: pid("papa"), success: true });
    expect(eventsOf(done.events, "ChallengeRewardGranted")[0]?.amount).toBe(20);
    expect(eventsOf(done.events, "MoneyTransferred")[0]).toMatchObject({ fromPlayerId: pid("papa"), toPlayerId: pid("maryam"), amount: 10, reason: "solidarity" });
    expect(eventsOf(done.events, "TurnEnded")).toHaveLength(1);
  });

  it("aucun défi éligible : la case n'impose rien, le tour continue", () => {
    const none = challengesFixture({ settings: { movement: false, fun: false, family: false, ohNo: false, memoryLogic: false, arabic: false, religion: false, boss: false } });
    const landed = landOnChallenge(none);
    expect(eventsOf(landed.events, "FamilyChallengeUnavailable")).toHaveLength(1);
    expect(landed.state.phase.kind).toBe("awaiting_journey");
    const empty = landOnChallenge(NO_CHALLENGES);
    expect(eventsOf(empty.events, "FamilyChallengeUnavailable")).toHaveLength(1);
  });

  it("variantes d'âge : la variante affichée suit l'âge du joueur ; la partie simulée reste cohérente avec toutes les décisions", () => {
    const d = FAMILY_CHALLENGES.find((x) => x.id === "CH-002")!;
    expect(variantFor(d, 6)?.text).toBe("5 s");
    expect(variantFor(d, 9)?.text).toBe("10 s");
    expect(variantFor(d, 18)?.text).toBe("15 s");
    const policy: Policy = { answer: () => ({ outcome: "correct", explanationMastery: "none", validationMode: "collective" }), buy: () => false, choose: (o) => o[0]!.id, challenge: (_, i) => (["success", "failure", "skip", "consent_refused"] as const)[i % 4]! };
    const sim = simulate(makeLineSetup({ board: lineBoard(ALL_CHALLENGE_CELLS), scenarios: scenariosOf("challenge-family"), players: FAMILY, challenges: challengesFixture() }), policy);
    expect(sim.state.status).toBe("finished");
    const rewards = eventsOf(sim.events, "ChallengeRewardGranted");
    const successes = eventsOf(sim.events, "FamilyChallengeCompleted").filter((e) => e.success);
    expect(rewards.length).toBe(successes.filter((s) => definitionOf(sim.state, s.challengeId).reward > 0).length);
  });

  it("migration : une sauvegarde v4 (sans Défis famille) reprend en v5 sans banque ; une case Défi n'y propose alors aucun défi famille", () => {
    const landed = landOnChallenge();
    const v4 = JSON.parse(serializeGameState(create(makeLineSetup({ players: FAMILY })).state)) as Record<string, unknown>;
    const config = v4["config"] as Record<string, unknown>;
    delete config["challenges"];
    delete v4["challengeServed"];
    const counters = v4["counters"] as Record<string, unknown>;
    delete counters["challenge"];
    delete v4["recitationServed"];
    for (const p of v4["players"] as Record<string, unknown>[]) delete p["masteredSurahs"];
    v4["schemaVersion"] = 4;
    const migrated = deserializeGameState(JSON.stringify(v4));
    expect(migrated.ok).toBe(true);
    if (!migrated.ok) return;
    expect(migrated.value.schemaVersion).toBe(GAME_SCHEMA_VERSION);
    expect(migrated.value.config.challenges).toEqual(NO_CHALLENGES);
    expect(migrated.value.counters.challenge).toBe(0);
    expect(migrated.value.players.every((p) => p.masteredSurahs.length === 0)).toBe(true);
    expect(selectChallenge(migrated.value, pid("maryam"))).toBeNull();
    expect(landed.state.schemaVersion).toBe(GAME_SCHEMA_VERSION);
  });
});
