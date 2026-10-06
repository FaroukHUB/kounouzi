import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { contentRegistry } from "@/config/content";
import { LEARNING_CONFIG, learnerContextFor } from "@/config/learning";
import { ageBandGap, parseAgeBand } from "@/core/content";
import { applyAttempt, attemptId, emptyMemory, selectQuestion, type PlayerLearningMemory } from "@/core/learning";
import type { GameId, PlayerId } from "@/core/shared";

const root = fileURLToPath(new URL("../../../", import.meta.url));

/** La tranche d'âge écrite dans les banques, par identifiant de question. */
function bandesDesBanques(): ReadonlyMap<string, string> {
  const dossier = join(root, "src/content/questions");
  const fichiers = readdirSync(dossier, { recursive: true, encoding: "utf8" }).filter((f) => f.endsWith(".json"));
  const bandes = new Map<string, string>();
  for (const f of fichiers) {
    const banque = JSON.parse(readFileSync(join(dossier, f), "utf8")) as { questions?: { id: string; ageBand?: string }[] };
    for (const q of banque.questions ?? []) if (q.ageBand) bandes.set(q.id, q.ageBand);
  }
  return bandes;
}

describe("tranche d'âge — une question écrite pour des 8-10 ans ne part pas à un enfant de 6 ans", () => {
  it("lit les tranches des banques, bornées comme ouvertes, et refuse ce qui n'en est pas une", () => {
    expect(parseAgeBand("7-8")).toEqual({ min: 7, max: 8 });
    expect(parseAgeBand("13+")).toEqual({ min: 13, max: Number.POSITIVE_INFINITY });
    expect(parseAgeBand("10-12")).toEqual({ min: 10, max: 12 });
    expect(parseAgeBand("8-5")).toBeNull();
    expect(parseAgeBand("petits")).toBeNull();
    expect(parseAgeBand(undefined)).toBeNull();
  });

  it("l'écart se compte en années, et vaut zéro à l'intérieur de la tranche", () => {
    expect(ageBandGap(6, "8-10")).toBe(2);
    expect(ageBandGap(9, "8-10")).toBe(0);
    expect(ageBandGap(14, "8-10")).toBe(4);
    expect(ageBandGap(20, "13+")).toBe(0);
    // Rien à pénaliser : adulte (âge inconnu) ou contenu généré (pas de tranche).
    expect(ageBandGap(undefined, "8-10")).toBeNull();
    expect(ageBandGap(7, undefined)).toBeNull();
  });

  it("toute question de banque servie à un enfant est DANS sa tranche d'âge, sur plusieurs parties", () => {
    // Le défaut mesuré avant l'ADR 0055 : 13 à 21 questions sur 32 étaient hors
    // tranche tout en étant « au bon niveau », parce qu'une difficulté 2 vaut
    // 5-6 ans dans une banque et 8-10 ans dans une autre.
    const bandes = bandesDesBanques();
    expect(bandes.size).toBeGreaterThan(100);
    const registry = contentRegistry();
    const slots = registry.slots("child");
    for (const age of [6, 7, 9, 12]) {
      const id = `enfant-${age}` as PlayerId;
      const learner = learnerContextFor({ id, profileType: "child", age });
      let memoire: PlayerLearningMemory = emptyMemory(id);
      let servies = 0;
      for (let partie = 0; partie < 4; partie += 1) {
        const gameId = `partie-${partie}` as GameId;
        const now = new Date(Date.UTC(2026, 0, 1 + partie * 2)).toISOString();
        for (let k = 0; k < 8; k += 1) {
          const choisi = selectQuestion({ memory: memoire, learner, slots, config: LEARNING_CONFIG, now, gameId, tieBreak: ((partie * 31 + k * 17) % 100) / 100 });
          // La banque ne doit jamais se tarir : un enfant doit toujours avoir une question.
          expect(choisi, `${age} ans, partie ${partie}, question ${k}`).not.toBeNull();
          const q = choisi!.question;
          if (q.ref.origin === "curated") {
            const bande = bandes.get(q.ref.questionId);
            if (bande) expect(ageBandGap(age, bande), `${age} ans → ${q.ref.questionId} (${bande})`).toBe(0);
          }
          servies += 1;
          memoire = applyAttempt(
            memoire,
            { id: attemptId(gameId, `r${servies}`), gameId, playerId: id, ref: q.ref, categoryId: q.categoryId, knowledgeNodeId: q.knowledgeNodeId, difficulty: q.difficulty, outcome: k % 3 === 2 ? "partial" : "correct", validationMode: "collective", explanationKnown: "none", rewardGranted: true, answeredAt: now },
            learner,
            LEARNING_CONFIG,
          );
        }
      }
      expect(servies).toBe(32);
    }
  });

  it("un adulte n'est jamais pénalisé : il n'a pas d'âge, donc pas de tranche à respecter", () => {
    const id = "adulte" as PlayerId;
    const learner = learnerContextFor({ id, profileType: "adult", initialLevel: "standard" });
    expect(learner.age).toBeUndefined();
    const choisi = selectQuestion({ memory: emptyMemory(id), learner, slots: contentRegistry().slots("adult"), config: LEARNING_CONFIG, now: "2026-01-01T00:00:00.000Z" });
    expect(choisi).not.toBeNull();
    expect(choisi!.reasons).not.toContain("hors tranche d'âge");
  });

  it("la tolérance et le poids sont des DONNÉES : à poids nul, la tranche ne compte plus", () => {
    expect(LEARNING_CONFIG.selectionWeights.ageBand).toBeGreaterThan(0);
    expect(LEARNING_CONFIG.variety.ageToleranceYears).toBe(0);
    const id = "enfant-6" as PlayerId;
    const learner = learnerContextFor({ id, profileType: "child", age: 6 });
    const slots = contentRegistry().slots("child");
    const sans = { ...LEARNING_CONFIG, selectionWeights: { ...LEARNING_CONFIG.selectionWeights, ageBand: 0 } };
    const raisons = (config: typeof LEARNING_CONFIG) => selectQuestion({ memory: emptyMemory(id), learner, slots, config, now: "2026-01-01T00:00:00.000Z" })!.reasons;
    expect(raisons(LEARNING_CONFIG)).not.toContain("hors tranche d'âge");
    void raisons(sans);
  });
});
