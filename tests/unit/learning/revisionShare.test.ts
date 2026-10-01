import { describe, expect, it } from "vitest";
import { contentRegistry } from "@/config/content";
import { LEARNING_CONFIG, learnerContextFor } from "@/config/learning";
import { questionRefKey } from "@/core/content";
import { applyAttempt, attemptId, emptyMemory, selectQuestion, type Attempt, type PlayerLearningMemory } from "@/core/learning";
import type { GameId } from "@/core/shared";
import { pid } from "../../fixtures/game/setup.fixture";

const JOUEUR = { id: pid("p1"), profileType: "child" as const, age: 10 };
const learner = learnerContextFor(JOUEUR);
const registry = contentRegistry();
const slots = registry.slots("child");

/** Joue `n` questions et renvoie ce qui a été posé, avec la raison retenue. */
function jouer(memoireDepart: PlayerLearningMemory, gameId: string, n: number, jour: number) {
  let memory = memoireDepart;
  const posees: { readonly ref: string; readonly revision: boolean; readonly categoryId: string }[] = [];
  const essais: Attempt[] = [];
  for (let i = 0; i < n; i += 1) {
    const now = new Date(Date.UTC(2026, 0, jour, 10, i)).toISOString();
    const choix = selectQuestion({ memory, learner, slots, config: LEARNING_CONFIG, now, gameId, tableAttempts: essais, tieBreak: 0.5 });
    if (!choix) break;
    const q = choix.question;
    posees.push({ ref: questionRefKey(q.ref), revision: (memory.knowledge[q.knowledgeNodeId]?.attempts ?? 0) > 0, categoryId: q.categoryId });
    const a: Attempt = { id: attemptId(gameId as GameId, `q${i}`), playerId: learner.playerId, gameId: gameId as GameId, knowledgeNodeId: q.knowledgeNodeId, ref: q.ref, categoryId: q.categoryId, difficulty: q.difficulty, outcome: "correct", validationMode: "collective", explanationKnown: "none", rewardGranted: true, answeredAt: now };
    essais.push(a);
    memory = applyAttempt(memory, a, learner, LEARNING_CONFIG);
  }
  return { memory, posees };
}

describe("part de révision : revoir sans tourner en rond", () => {
  it("une partie ne se remplit pas de révisions : au plus un tiers des questions, le reste est neuf", () => {
    // Première partie : tout est neuf.
    const un = jouer(emptyMemory(learner.playerId), "game-1", 12, 1);
    expect(un.posees.every((p) => !p.revision)).toBe(true);
    // Cinq jours plus tard : tout ce qui a été répondu est DÛ. Sans plafond, la partie
    // entière serait une reprise de la précédente.
    const deux = jouer(un.memory, "game-2", 12, 6);
    const revisions = deux.posees.filter((p) => p.revision).length;
    const plafond = Math.ceil(12 * LEARNING_CONFIG.variety.revisionShare) + 1;
    expect(revisions).toBeGreaterThan(0); // la révision existe toujours
    expect(revisions).toBeLessThanOrEqual(plafond);
    // Et la partie reste variée : aucune catégorie n'occupe la moitié des questions.
    const parCategorie = new Map<string, number>();
    for (const p of deux.posees) parCategorie.set(p.categoryId, (parCategorie.get(p.categoryId) ?? 0) + 1);
    expect(Math.max(...parCategorie.values())).toBeLessThan(deux.posees.length / 2);
  });

  it("une même question n'est jamais posée deux fois dans la même partie", () => {
    const un = jouer(emptyMemory(learner.playerId), "game-1", 12, 1);
    const deux = jouer(un.memory, "game-2", 12, 6);
    for (const partie of [un, deux]) {
      const refs = partie.posees.map((p) => p.ref);
      expect(new Set(refs).size).toBe(refs.length);
    }
  });
});
