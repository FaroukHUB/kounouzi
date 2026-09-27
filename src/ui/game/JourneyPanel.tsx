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
 * Le cœur du plateau : la carte illustrée Kounouzi (asset remplaçable,
 * `ASSETS.boardCenter`) affichée ENTIÈRE dans un cadre carré arrondi —
 * `object-contain`, jamais de recadrage, aucun monument perdu. L'illustration
 * porte elle-même le titre du jeu ; le panneau ne dessine donc plus que ce qui
 * sert à jouer, sur une pastille lisible posée en bas :
 * « Au tour de X » → « Découvrir mon chemin » → « Ton chemin se dévoile… N ».
 * Le nombre vient du moteur.
 */
export function JourneyPanel({ state, shown, reveal, isAnimating, onStartJourney }: JourneyPanelProps) {
  const active = shown.players[shown.activePlayerIndex];
  const name = (id: string) => state.players.find((p) => p.id === id)?.displayName ?? "";
  const canStart = state.phase.kind === "awaiting_journey" && !isAnimating && !reveal;

  return (
    <div className="relative flex size-[94%] items-center justify-center text-center" data-testid="board-center">
      {/*
       * L'illustration est DANS LE FLUX : elle donne sa hauteur au cadre, si
       * bien que le cartouche se pose à l'intérieur de l'image et jamais
       * au-delà, quelle que soit la proportion du fichier déposé.
       */}
      <div className="relative flex size-full items-end justify-center">
        <div className="mb-[6%] flex w-[86%] flex-col items-center gap-[2%] rounded-[1.6rem] bg-[rgba(255,250,240,0.94)] px-[4%] py-[3%] shadow-[0_10px_30px_-12px_rgba(40,25,10,0.55)]">
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
    </div>
  );
}
