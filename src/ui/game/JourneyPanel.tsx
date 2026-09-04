"use client";

import { AnimatePresence, motion } from "motion/react";
import type { GameState } from "@/core/game";
import { DEFAULT_LOCALE, t } from "@/i18n";
import { Button } from "@/ui/primitives/Button";
import { ASSETS } from "@/ui/theme/assets";

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
 * Le cœur du plateau : médaillon Kounouzi (illustration remplaçable),
 * « Au tour de X » → « Découvrir mon chemin » → « Ton chemin se dévoile… N ».
 * Le nombre vient du moteur.
 */
export function JourneyPanel({ state, shown, reveal, isAnimating, onStartJourney }: JourneyPanelProps) {
  const active = shown.players[shown.activePlayerIndex];
  const name = (id: string) => state.players.find((p) => p.id === id)?.displayName ?? "";
  const canStart = state.phase.kind === "awaiting_journey" && !isAnimating && !reveal;

  return (
    <div className="relative flex size-[94%] flex-col items-center justify-center rounded-full text-center" data-testid="board-center">
      {/* Médaillon décoratif (asset remplaçable) */}
      {/* eslint-disable-next-line @next/next/no-img-element -- médaillon SVG léger, remplaçable */}
      <img src={ASSETS.boardCenter} alt="" aria-hidden="true" className="pointer-events-none absolute inset-0 size-full rounded-full object-cover opacity-95" decoding="async" />
      <span className="k-rays pointer-events-none absolute inset-[6%] rounded-full border border-dashed border-[rgba(138,90,43,0.35)]" aria-hidden="true" />
      <div className="relative flex w-[78%] flex-col items-center gap-[2%] rounded-[2rem] px-[4%] py-[4%]" style={{ background: "radial-gradient(ellipse at 50% 40%, rgba(255,250,240,0.92) 0%, rgba(255,250,240,0.75) 60%, rgba(255,250,240,0) 100%)" }}>
        <p className="font-display text-[clamp(1.1rem,3.2vw,2.3rem)] font-black tracking-[0.12em] text-[var(--k-teal-dark)]">KOUNOUZI</p>
        <p className="mb-[3%] text-[clamp(0.6rem,1.3vw,0.95rem)] font-semibold uppercase tracking-[0.2em] text-[var(--k-wood)]">{t(DEFAULT_LOCALE, "app.tagline")}</p>
        <AnimatePresence mode="wait" initial={false}>
          {reveal ? (
            <motion.div key="reveal" initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.05 }} transition={{ duration: 0.25 }} className="flex flex-col items-center gap-1">
              <p className="text-[clamp(0.8rem,1.8vw,1.1rem)] text-[var(--k-ink-soft)]">{t(DEFAULT_LOCALE, "game.journey.reveal")}</p>
              <motion.p key={reveal.steps} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35, duration: 0.3 }} className="font-display text-[clamp(2.4rem,7vw,4.5rem)] font-black leading-none text-[var(--k-teal)]">
                {reveal.steps}
              </motion.p>
              <p className="text-[clamp(0.85rem,2vw,1.2rem)] font-semibold">{reveal.steps === 1 ? t(DEFAULT_LOCALE, "game.journey.step") : t(DEFAULT_LOCALE, "game.journey.steps", { steps: reveal.steps })}</p>
              <p className="text-[clamp(0.7rem,1.5vw,0.95rem)] text-[var(--k-ink-soft)]">{t(DEFAULT_LOCALE, "game.journey.advances", { name: name(reveal.playerId), steps: reveal.steps })}</p>
            </motion.div>
          ) : canStart && active ? (
            <motion.div key="cta" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex w-full flex-col items-center gap-3">
              <p className="text-[clamp(0.95rem,2.2vw,1.4rem)] font-semibold">{t(DEFAULT_LOCALE, "game.turnOf", { name: active.displayName })}</p>
              <Button size="xl" onClick={onStartJourney} data-testid="start-journey" className="w-full max-w-[22rem] shadow-[0_14px_30px_-10px_rgba(15,118,110,0.7)]">
                {t(DEFAULT_LOCALE, "game.journey.cta")}
              </Button>
            </motion.div>
          ) : (
            <motion.p key="wait" initial={{ opacity: 0 }} animate={{ opacity: 0.7 }} exit={{ opacity: 0 }} className="min-h-[1.5em] text-[clamp(0.8rem,1.7vw,1.05rem)] text-[var(--k-ink-soft)]">
              {isAnimating ? t(DEFAULT_LOCALE, "game.animating") : ""}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
