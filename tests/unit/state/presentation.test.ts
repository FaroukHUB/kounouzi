import { describe, expect, it } from "vitest";
import { projectEvent } from "@/state/presentation";
import { useUiStore } from "@/state/uiStore";
import { create, journey, makeLineSetup, makeSetup, pid, players } from "../../fixtures/game/setup.fixture";

describe("état présenté (synchronisation visuelle)", () => {
  it("projette uniquement ce que l'événement rejoué annonce : joueur actif, solde, patrimoine", () => {
    const { state } = create(makeSetup({ players: players(2) }));
    const turned = projectEvent(state, { type: "TurnStarted", turnNumber: 2, playerId: pid("p2") });
    expect(turned.activePlayerIndex).toBe(1);
    expect(turned.turnNumber).toBe(2);
    const paid = projectEvent(state, { type: "MoneyChanged", transactionId: 9, playerId: pid("p1"), amount: 100, reason: "scenario_gain", balanceAfter: 1100 });
    expect(paid.players[0]!.money).toBe(1100);
    expect(paid.players[1]!.money).toBe(1000);
    const owned = projectEvent(state, { type: "SiteAcquired", playerId: pid("p1"), siteId: "s", price: 300, heritageValue: 250 });
    expect(owned.holdings).toHaveLength(1);
    expect(projectEvent(state, { type: "PassedStart", playerId: pid("p1"), bonus: 1 })).toBe(state);
  });

  it("le panneau reste sur le tour en cours tant que la séquence visuelle n'est pas rejouée", () => {
    const ui = useUiStore.getState();
    ui.clear();
    const { state } = create(makeLineSetup({ cells: { 1: "event" }, players: players(2) }));
    ui.syncFromGame(state);
    expect(useUiStore.getState().presentedState?.activePlayerIndex).toBe(0);

    const next = journey(state); // p1 avance ; la main passe à p2 dans l'état RÉEL
    expect(next.state.activePlayerIndex).toBe(1);
    useUiStore.getState().enqueueBatch(next.events, next.state);
    expect(useUiStore.getState().presentedState?.activePlayerIndex).toBe(0); // rien n'a encore été rejoué

    // Rejouer la file à la main : chaque événement est projeté, le dernier pose l'état réel.
    let item = useUiStore.getState().takeNext();
    while (item) {
      if (item.event) useUiStore.getState().presentEvent(item.event);
      if (item.event?.type === "PawnMoved") expect(useUiStore.getState().presentedState?.activePlayerIndex).toBe(0); // toujours p1 pendant le déplacement
      if (item.settle) useUiStore.getState().setPresented(item.settle);
      item = useUiStore.getState().takeNext();
    }
    expect(useUiStore.getState().presentedState).toEqual(next.state);
  });

  it("un lot sans événement (horloge) est posé immédiatement si rien n'est en cours, sinon après la file", () => {
    const ui = useUiStore.getState();
    ui.clear();
    const { state } = create(makeSetup({ players: players(2) }));
    ui.syncFromGame(state);
    const later = { ...state, clock: { ...state.clock, activePlaySeconds: 5 } };
    useUiStore.getState().enqueueBatch([], later);
    expect(useUiStore.getState().presentedState?.clock.activePlaySeconds).toBe(5);

    useUiStore.getState().enqueueBatch([{ type: "TurnStarted", turnNumber: 1, playerId: pid("p1") }], state);
    useUiStore.getState().enqueueBatch([], { ...later, clock: { ...later.clock, activePlaySeconds: 9 } });
    expect(useUiStore.getState().presentedState?.clock.activePlaySeconds).toBe(5);
    expect(useUiStore.getState().queue).toHaveLength(2);
  });
});
