"use client";

import { AnimatePresence, motion } from "motion/react";
import type { GameState } from "@/core/game";
import { DEFAULT_LOCALE, t } from "@/i18n";
import { Button } from "@/ui/primitives/Button";

export interface JourneyPanelProps {
  /** État réel (phase, commandes). */
  readonly state: GameState;
  /** État présenté (joueur affiché). */
  readonly shown: GameState;
  readonly reveal: { readonly playerId: string; readonly steps: number } | null;
  readonly isAnimating: boolean;
  readonly onStartJourney: () => void;
}

/**
 * Le cœur de l'expérience du tour : « Au tour de X » → « Découvrir mon chemin »
 * → « Ton chemin se dévoile… N étapes ». Le nombre vient du moteur.
 */
export function JourneyPanel({ state, shown, reveal, isAnimating, onStartJourney }: JourneyPanelProps) {
  const active = shown.players[shown.activePlayerIndex];
  const name = (id: string) => state.players.find((p) => p.id === id)?.displayName ?? "";
  const canStart = state.phase.kind === "awaiting_journey" && !isAnimating && !reveal;

  return (
    <div className="flex size-full flex-col items-center justify-center gap-3 px-[6%] text-center">
      <AnimatePresence mode="wait" initial={false}>
        {reveal ? (
          <motion.div key="reveal" initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.05 }} transition={{ duration: 0.25 }} className="flex flex-col items-center gap-2">
            <p className="text-[clamp(0.9rem,2vw,1.2rem)] text-[var(--k-ink-soft)]">{t(DEFAULT_LOCALE, "game.journey.reveal")}</p>
            <motion.p
              key={reveal.steps}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35, duration: 0.3 }}
              className="text-[clamp(2.4rem,7vw,4.5rem)] font-black leading-none text-[var(--k-teal)]"
            >
              {reveal.steps}
            </motion.p>
            <p className="text-[clamp(0.9rem,2.2vw,1.3rem)] font-semibold">{reveal.steps === 1 ? t(DEFAULT_LOCALE, "game.journey.step") : t(DEFAULT_LOCALE, "game.journey.steps", { steps: reveal.steps })}</p>
            <p className="text-[clamp(0.75rem,1.6vw,1rem)] text-[var(--k-ink-soft)]">{t(DEFAULT_LOCALE, "game.journey.advances", { name: name(reveal.playerId), steps: reveal.steps })}</p>
          </motion.div>
        ) : canStart && active ? (
          <motion.div key="cta" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-4">
            <p className="text-[clamp(1rem,2.4vw,1.5rem)] font-semibold">{t(DEFAULT_LOCALE, "game.turnOf", { name: active.displayName })}</p>
            <Button size="xl" onClick={onStartJourney} data-testid="start-journey" className="min-w-[60%]">
              {t(DEFAULT_LOCALE, "game.journey.cta")}
            </Button>
          </motion.div>
        ) : (
          <motion.p key="wait" initial={{ opacity: 0 }} animate={{ opacity: 0.7 }} exit={{ opacity: 0 }} className="text-[clamp(0.85rem,1.8vw,1.1rem)] text-[var(--k-ink-soft)]">
            {isAnimating ? t(DEFAULT_LOCALE, "game.animating") : ""}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
