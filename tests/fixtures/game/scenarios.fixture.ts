import type { Scenario } from "@/core/game";

/** ⚠️ Scénarios génériques de test — aucun contenu pédagogique réel. */
export const TEST_SCENARIOS: readonly Scenario[] = [
  { id: "event-gain", cellType: "event", outcomes: [{ kind: "money", amount: 100 }] },
  { id: "event-loss", cellType: "event", outcomes: [{ kind: "money", amount: -150, insufficient: "cap_to_balance" }] },
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
          { id: "spend", outcomes: [{ kind: "money", amount: -50, insufficient: "cap_to_balance" }] },
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
          { id: "donate", outcomes: [{ kind: "money", amount: -100, insufficient: "cap_to_balance" }] },
          { id: "pass", outcomes: [] },
        ],
      },
    ],
  },
  { id: "treasure-bonus", cellType: "treasure", outcomes: [{ kind: "money", amount: 200 }] },
  { id: "treasure-boost", cellType: "treasure", outcomes: [{ kind: "effect", effect: { type: "reward_multiplier", multiplier: 2, uses: 1, consumeOn: "reward_granted" } }] },
  /* ---- Phase 5.1 : interactions ---- */
  { id: "challenge-duel", cellType: "challenge", outcomes: [{ kind: "duel" }] },
  { id: "challenge-family", cellType: "challenge", outcomes: [{ kind: "family_challenge" }] },
  { id: "event-halt", cellType: "event", outcomes: [{ kind: "halt" }] },
  { id: "event-share", cellType: "event", outcomes: [{ kind: "transfer_choice", amount: 50, reason: "gift", insufficient: "cap_to_balance" }] },
  { id: "event-collective", cellType: "event", outcomes: [{ kind: "collective_fund", amount: 50, insufficient: "cap_to_balance" }] },
  { id: "event-helping-hand", cellType: "event", outcomes: [{ kind: "aid_from_richest", amount: 100, insufficient: "cap_to_balance" }] },
  { id: "event-maintenance", cellType: "event", outcomes: [{ kind: "heritage_maintenance", amountPerSite: 40, insufficient: "cap_to_balance" }] },
  { id: "event-good-news", cellType: "event", outcomes: [{ kind: "heritage_bonus", amountPerSite: 60 }] },
  { id: "event-protection", cellType: "event", outcomes: [{ kind: "effect", effect: { type: "penalty_shield", maxAmount: 150, consumeOn: "penalty" }, expiresInTurns: 4 }] },
  { id: "event-hard-journey-cancel", cellType: "event", outcomes: [{ kind: "money", amount: -80, insufficient: "cancel_if_insufficient" }] },
  {
    id: "management-invest",
    cellType: "management",
    outcomes: [{ kind: "choice", choiceId: "management-invest", options: [{ id: "invest", outcomes: [{ kind: "invest", amount: 100, payout: { correct: 150, partial: 100, incorrect: 0 }, insufficient: "require_full_amount" }] }, { id: "pass", outcomes: [] }] }],
  },
  {
    id: "management-saving",
    cellType: "management",
    outcomes: [{ kind: "choice", choiceId: "management-saving", options: [{ id: "save", outcomes: [{ kind: "save", amount: 100, payout: 150, turns: 2, insufficient: "require_full_amount" }] }, { id: "pass", outcomes: [] }] }],
  },
  {
    id: "management-protection",
    cellType: "management",
    outcomes: [{ kind: "choice", choiceId: "management-protection", options: [{ id: "protect", outcomes: [{ kind: "money", amount: -75, insufficient: "require_full_amount" }, { kind: "effect", effect: { type: "penalty_shield", maxAmount: 150, consumeOn: "penalty" } }] }, { id: "pass", outcomes: [] }] }],
  },
  {
    id: "management-now-or-later",
    cellType: "management",
    outcomes: [{ kind: "choice", choiceId: "management-now-or-later", options: [{ id: "now", outcomes: [{ kind: "money", amount: 100 }] }, { id: "later", outcomes: [{ kind: "effect", effect: { type: "next_reward_bonus", amount: 150, consumeOn: "reward_granted" } }] }] }],
  },
  { id: "solidarity-poorest", cellType: "solidarity", outcomes: [{ kind: "give_to_poorest", amount: 80, reason: "solidarity", insufficient: "cap_to_balance" }] },
  { id: "solidarity-share", cellType: "solidarity", outcomes: [{ kind: "transfer_choice", amount: 50, reason: "solidarity", insufficient: "cap_to_balance" }] },
  { id: "treasure-shield", cellType: "treasure", outcomes: [{ kind: "effect", effect: { type: "penalty_shield", maxAmount: 150, consumeOn: "penalty" } }] },
  { id: "treasure-discount", cellType: "treasure", outcomes: [{ kind: "effect", effect: { type: "next_purchase_discount", percent: 50, consumeOn: "purchase" } }] },
  { id: "treasure-knowledge", cellType: "treasure", outcomes: [{ kind: "effect", effect: { type: "next_reward_bonus", amount: 100, consumeOn: "reward_granted" } }] },
  { id: "treasure-recovery", cellType: "treasure", outcomes: [{ kind: "clear_effects", types: ["skip_turn"], liftHalt: true }, { kind: "money", amount: 50 }] },
];

/** Scénarios dans l'ordre DEMANDÉ (l'ordre configuré détermine la rotation par visites). */
export const scenariosOf = (...ids: readonly string[]): readonly Scenario[] =>
  ids.map((id) => {
    const found = TEST_SCENARIOS.find((s) => s.id === id);
    if (!found) throw new Error(`scénario de test inconnu : ${id}`);
    return found;
  });
