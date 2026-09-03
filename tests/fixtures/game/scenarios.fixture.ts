import type { Scenario } from "@/core/game";

/** ⚠️ Scénarios génériques de test — aucun contenu pédagogique réel. */
export const TEST_SCENARIOS: readonly Scenario[] = [
  { id: "event-gain", cellType: "event", outcomes: [{ kind: "money", amount: 100 }] },
  { id: "event-loss", cellType: "event", outcomes: [{ kind: "money", amount: -150 }] },
  { id: "event-back", cellType: "event", outcomes: [{ kind: "move", steps: -3 }] },
  { id: "event-skip", cellType: "event", outcomes: [{ kind: "effect", effect: { type: "skip_turn", consumeOn: "turn_start" } }] },
  { id: "event-extra", cellType: "event", outcomes: [{ kind: "effect", effect: { type: "extra_turn", consumeOn: "turn_end" } }] },
  {
    id: "management-choice",
    cellType: "management",
    outcomes: [
      {
        kind: "choice",
        choiceId: "management-choice",
        options: [
          { id: "save", outcomes: [{ kind: "money", amount: 50 }] },
          { id: "spend", outcomes: [{ kind: "money", amount: -50 }] },
        ],
      },
    ],
  },
  { id: "challenge-question", cellType: "challenge", outcomes: [{ kind: "question" }] },
  {
    id: "solidarity-donate",
    cellType: "solidarity",
    outcomes: [
      {
        kind: "choice",
        choiceId: "solidarity-donate",
        options: [
          { id: "donate", outcomes: [{ kind: "money", amount: -100 }] },
          { id: "pass", outcomes: [] },
        ],
      },
    ],
  },
  { id: "treasure-bonus", cellType: "treasure", outcomes: [{ kind: "money", amount: 200 }] },
  { id: "treasure-boost", cellType: "treasure", outcomes: [{ kind: "effect", effect: { type: "reward_multiplier", multiplier: 2, uses: 1, consumeOn: "reward_granted" } }] },
];

export const scenariosOf = (...ids: readonly string[]): readonly Scenario[] => TEST_SCENARIOS.filter((s) => ids.includes(s.id));
