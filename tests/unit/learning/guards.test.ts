import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { LEARNING_CONFIG, learnerContextFor } from "@/config/learning";
import type { GameEvent, GameSetup } from "@/core/game";
import { applyAttempt, attemptId, emptyMemory, type PlayerLearningMemory } from "@/core/learning";
import { makeSetup, pid, simulate } from "../../fixtures/game/setup.fixture";
import { T0 } from "../../fixtures/learning/resolve.fixture";

const root = fileURLToPath(new URL("../../../", import.meta.url));

describe("garde-fou FamilyAssist : jamais de trace dans la mémoire pédagogique", () => {
  it("structurel : src/core/learning ignore FamilyAssist, l'argent, le patrimoine et le score", () => {
    const dir = join(root, "src/core/learning");
    for (const name of readdirSync(dir)) {
      const source = readFileSync(join(dir, name), "utf8");
      expect(source, name).not.toMatch(/familyAssist|FamilyAssist|money|heritage|balance|ledger|scoreOf/);
      // Le noyau ne lit jamais l'horloge : aucune date « maintenant ».
      expect(source, name).not.toMatch(/Date\.now\(|new Date\(\)/);
    }
  });

  it("comportemental : FamilyAssist activé ou non, mêmes réponses ⇒ mémoire pédagogique identique", () => {
    const record = (setup: GameSetup): Record<string, PlayerLearningMemory> => {
      const sim = simulate(setup);
      const memories: Record<string, PlayerLearningMemory> = {};
      const learners = setup.players.map((p) => learnerContextFor({ id: p.id, profileType: p.profileType, age: 8 }));
      let n = 0;
      for (const e of sim.events as readonly GameEvent[]) {
        if (e.type !== "AnswerRecorded") continue;
        n += 1;
        // Sans question servie (simulation moteur), on enregistre une notion de test : ce qui compte est l'égalité stricte.
        const learner = learners.find((l) => l.playerId === e.playerId)!;
        const before = memories[e.playerId] ?? emptyMemory(e.playerId);
        memories[e.playerId] = applyAttempt(
          before,
          { id: attemptId(setup.gameId, e.requestId), playerId: e.playerId, gameId: setup.gameId, knowledgeNodeId: `test.node.${n % 3}`, ref: { origin: "curated", questionId: `t${n % 3}`, contentVersion: 1 }, categoryId: "logic", difficulty: 2, outcome: e.outcome, validationMode: e.validationMode, explanationKnown: e.explanationMastery, rewardGranted: sim.events.some((r) => r.type === "RewardGranted" && r.requestId === e.requestId), answeredAt: T0 },
          learner,
          LEARNING_CONFIG,
        );
      }
      return memories;
    };
    const off = record(makeSetup());
    const on = record(makeSetup({ familyAssist: { enabled: true, assistedPlayers: [{ playerId: pid("p1"), level: "subtle" }] } }));
    expect(Object.keys(off).length).toBeGreaterThan(0);
    expect(on).toEqual(off);
  });
});
