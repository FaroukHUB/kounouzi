"use client";

import { useEffect } from "react";
import type { GameEvent, GameState } from "@/core/game";
import { useUiStore } from "@/state/uiStore";
import { playEvent, type AnimationActions, type VoiceHold } from "./player";
import type { Timings } from "./timings";

/**
 * Consomme la file d'événements séquentiellement : narration puis animation,
 * un événement à la fois. L'état du jeu est déjà acquis avant que quoi que ce
 * soit ne s'anime ; la file ne bloque jamais (délai de sécurité).
 *
 * `hold` fait patienter un bandeau jusqu'à la fin de la phrase qui l'accompagne :
 * sans elle, la voix disait une chose et le plateau en écrivait déjà une autre.
 */
export function useAnimationQueue(timings: Timings, onPlay?: (event: GameEvent, state: GameState) => void, state?: GameState | null, hold?: VoiceHold): void {
  const queueLength = useUiStore((s) => s.queue.length);
  const isAnimating = useUiStore((s) => s.isAnimating);

  useEffect(() => {
    if (isAnimating || queueLength === 0) return;
    const ui = useUiStore.getState();
    const item = ui.takeNext();
    if (!item) return;
    const settle = () => {
      const u = useUiStore.getState();
      if (item.settle) u.setPresented(item.settle);
      u.setAnimating(false);
    };
    if (!item.event) {
      settle();
      return;
    }
    const event = item.event;
    ui.setAnimating(true);
    ui.presentEvent(event);
    const actions: AnimationActions = {
      setPawn: ui.setPawn,
      setHighlight: ui.setHighlight,
      setArrival: ui.setArrival,
      revealJourney: ui.revealJourney,
      hideJourney: ui.hideJourney,
      setBanner: ui.setBanner,
      openCard: ui.openCard,
      updateCard: ui.updateCard,
      closeCard: ui.closeCard,
    };
    if (state) onPlay?.(event, state);
    void playEvent(event, actions, timings, undefined, hold).finally(settle);
  }, [queueLength, isAnimating, timings, onPlay, state, hold]);
}
