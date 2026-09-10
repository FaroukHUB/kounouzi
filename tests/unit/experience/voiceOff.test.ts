import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { playEvent, type AnimationActions } from "@/animation/player";
import { REDUCED_TIMINGS } from "@/animation/timings";
import type { GameEvent } from "@/core/game";
import { NullNarrator, WebSpeechNarrator, type NarrationService } from "@/experience/narration";
import { useSessionStore } from "@/state/sessionStore";
import { pid } from "../../fixtures/game/setup.fixture";

const root = fileURLToPath(new URL("../../../", import.meta.url));
const source = (path: string) => readFileSync(`${root}${path}`, "utf8");

describe("voix OFF (ADR 0035) : narration automatique désactivée par défaut, jamais bloquante", () => {
  it("la préférence de session est OFF par défaut ; une préférence enregistrée avant (v1, voix ON) est migrée vers OFF, les autres réglages conservés", () => {
    expect(useSessionStore.getState().narrationEnabled).toBe(false);
    const options = useSessionStore.persist.getOptions();
    expect(options.version).toBe(2);
    const migrated = options.migrate!({ narrationEnabled: true, narrationRate: "fast", preciseTimer: true, reducedMotion: null }, 1) as { narrationEnabled: boolean; narrationRate: string; preciseTimer: boolean };
    expect(migrated.narrationEnabled).toBe(false);
    expect(migrated.narrationRate).toBe("fast");
    expect(migrated.preciseTimer).toBe(true);
    const kept = options.migrate!({ narrationEnabled: true, narrationRate: "slow" }, 2) as { narrationEnabled: boolean };
    expect(kept.narrationEnabled).toBe(true);
  });

  it("l'écran de jeu ne fait plus parler les événements (tour, Chemin, arrivée) ; le rejoueur d'animation et le store de jeu ignorent la narration", () => {
    const screen = source("src/ui/game/GameScreen.tsx");
    expect(screen).not.toContain("utteranceFor(");
    expect(screen).not.toContain("narrator.speak(");
    expect(screen).not.toContain("narrator.speakSequence(");
    for (const file of ["src/animation/player.ts", "src/animation/useAnimationQueue.ts", "src/state/gameStore.ts", "src/state/uiStore.ts"]) expect(source(file), file).not.toContain("@/experience/narration");
  });

  it("le NarrationService reste en place (bouton 🔊 des explications) mais désactivé, sa file est neutralisée : rien n'est mis en attente", () => {
    const narrator = new WebSpeechNarrator({ lexicon: { symbols: {}, words: {} } });
    narrator.setEnabled(false);
    expect(narrator.isSupported()).toBe(false);
    expect(() => narrator.speak({ text: "Bonjour", lang: "fr", important: true })).not.toThrow();
    expect(() => narrator.speakSequence([{ text: "A", lang: "fr" }, { text: "B", lang: "ar" }])).not.toThrow();
    expect(() => narrator.replayLast()).not.toThrow();
    const muted: NarrationService = new NullNarrator();
    expect(muted.hasVoice("ar")).toBe(false);
    expect(muted.isSupported()).toBe(false);
  });

  it("le rejoueur d'animation ne dépend d'aucune voix : chaque événement se rejoue avec des délais nuls sans attendre", async () => {
    const calls: string[] = [];
    const actions: AnimationActions = { setPawn: () => {}, setHighlight: () => {}, setArrival: () => {}, revealJourney: () => {}, hideJourney: () => {}, setBanner: (b) => calls.push(`banner:${b ? b.kind : "null"}`), openCard: (c) => calls.push(`card:${c.kind}`), updateCard: () => calls.push("card~"), closeCard: () => calls.push("card:close") };
    const p1 = pid("p1");
    const p2 = pid("p2");
    const events: GameEvent[] = [
      { type: "TurnStarted", turnNumber: 1, playerId: p1 },
      { type: "MovementAssigned", playerId: p1, steps: 2, journeyIndex: 0 },
      { type: "CellArrived", playerId: p1, position: 2, cellType: "heritage" },
      { type: "ServiceOffered", playerId: p1, ownerId: p2, siteId: "s", family: "madinah_hotel", serviceType: "stay", amount: 30 },
      { type: "ServiceConsumed", playerId: p1, ownerId: p2, siteId: "s", family: "madinah_hotel", serviceType: "stay", requested: 30, amount: 30 },
      { type: "HassanatOffered", playerId: p1, cardId: "HS-001", kind: "offer_meal", cost: 20, hassanatReward: 10, candidates: [p2] },
      { type: "HassanatAccepted", playerId: p1, cardId: "HS-001", beneficiaryId: p2, cost: 20 },
      { type: "HassanatGranted", playerId: p1, cardId: "HS-001", amount: 10, ref: "h1:HS-001", total: 10 },
    ];
    const instant = (ms: number) => (ms === 0 ? Promise.resolve() : new Promise<void>(() => {}));
    const start = Date.now();
    for (const e of events) await playEvent(e, actions, REDUCED_TIMINGS, instant);
    expect(Date.now() - start).toBeLessThan(1000);
    expect(calls).toEqual(["banner:turn", "banner:null", "banner:null", "card:service", "card~", "card:close", "banner:service", "banner:null", "card:close", "banner:null", "card:hassanat", "card~", "card~", "card:close", "banner:hassanat_granted", "banner:null", "card:close", "banner:null"]);
  });
});
