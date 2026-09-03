"use client";

import { AnimatePresence, motion } from "motion/react";
import type { Banner } from "@/animation/player";
import type { GameState } from "@/core/game";
import { DEFAULT_LOCALE, t } from "@/i18n";

export function TurnBanner({ banner, state }: { readonly banner: Banner | null; readonly state: GameState }) {
  const name = (id: string) => state.players.find((p) => p.id === id)?.displayName ?? "";
  const text = banner
    ? banner.kind === "turn"
      ? t(DEFAULT_LOCALE, "game.turnOf", { name: name(banner.playerId) })
      : banner.kind === "skipped"
        ? t(DEFAULT_LOCALE, "game.skipped", { name: name(banner.playerId) })
        : banner.kind === "passed_start"
          ? t(DEFAULT_LOCALE, "game.passedStart", { amount: banner.amount })
          : banner.kind === "owned"
            ? t(DEFAULT_LOCALE, "monument.owned", { name: name(banner.ownerId) })
            : t(DEFAULT_LOCALE, "game.lastRound")
    : null;
  return (
    <div className="pointer-events-none absolute inset-x-0 top-3 z-20 flex justify-center" aria-live="polite">
      <AnimatePresence>
        {text ? (
          <motion.div
            key={text}
            initial={{ opacity: 0, y: -16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.22 }}
            className="rounded-full bg-[var(--k-ink)] px-5 py-2 text-base font-semibold text-white shadow-lg"
          >
            {text}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
