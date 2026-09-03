"use client";

import { useEffect } from "react";
import type { GameEvent, GameState } from "@/core/game";
import { useUiStore } from "@/state/uiStore";
import { playEvent, type AnimationActions } from "./player";
import type { Timings } from "./timings";

/**
 * Consomme la file d'événements séquentiellement : narration puis animation,
 * un événement à la fois. L'état du jeu est déjà acquis avant que quoi que ce
 * soit ne s'anime ; la file ne bloque jamais (délai de sécurité).
 */
export function useAnimationQueue(timings: Timings, onPlay?: (event: GameEvent, state: GameState) => void, state?: GameState | null): void {
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
    };
    if (state) onPlay?.(event, state);
    void playEvent(event, actions, timings).finally(settle);
  }, [queueLength, isAnimating, timings, onPlay, state]);
}
