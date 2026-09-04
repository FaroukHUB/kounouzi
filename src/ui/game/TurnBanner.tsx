"use client";

import { AnimatePresence, motion } from "motion/react";
import type { Banner } from "@/animation/player";
import type { GameState } from "@/core/game";
import { DEFAULT_LOCALE, t } from "@/i18n";

export function bannerText(banner: Banner, state: GameState): string {
  const name = (id: string) => state.players.find((p) => p.id === id)?.displayName ?? "";
  switch (banner.kind) {
    case "turn":
      return t(DEFAULT_LOCALE, "game.turnOf", { name: name(banner.playerId) });
    case "skipped":
      return t(DEFAULT_LOCALE, "game.skipped", { name: name(banner.playerId) });
    case "passed_start":
      return t(DEFAULT_LOCALE, "game.passedStart", { amount: banner.amount });
    case "owned":
      return t(DEFAULT_LOCALE, "monument.owned", { name: name(banner.ownerId) });
    case "revisit":
      return t(DEFAULT_LOCALE, "visit.own");
    case "halt_lifted":
      return t(DEFAULT_LOCALE, "halt.lifted", { name: name(banner.playerId) });
    case "halt_lost":
      return t(DEFAULT_LOCALE, "halt.lost", { name: name(banner.playerId) });
    case "transfer":
      return t(DEFAULT_LOCALE, banner.contribution ? "banner.contribution" : "banner.transfer", { from: name(banner.fromPlayerId), to: name(banner.toPlayerId), amount: banner.amount });
    case "shield":
      return t(DEFAULT_LOCALE, "banner.shield", { amount: banner.amount });
    case "investment":
      return banner.payout > 0 ? t(DEFAULT_LOCALE, "banner.investment.win", { amount: banner.payout }) : t(DEFAULT_LOCALE, "banner.investment.lose");
    case "saving":
      return t(DEFAULT_LOCALE, "banner.saving", { amount: banner.payout });
    case "cancelled":
      return t(DEFAULT_LOCALE, "banner.cancelled");
    case "last_round":
      return t(DEFAULT_LOCALE, "game.lastRound");
  }
}

export function TurnBanner({ banner, state }: { readonly banner: Banner | null; readonly state: GameState }) {
  const text = banner ? bannerText(banner, state) : null;
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
            className={banner?.kind === "transfer" ? "rounded-2xl bg-[var(--k-ruby)] px-6 py-3 text-center text-lg font-black text-white shadow-xl" : "rounded-full bg-[var(--k-ink)] px-5 py-2 text-base font-semibold text-white shadow-lg"}
            data-testid="banner"
            data-banner={banner?.kind}
          >
            {text}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
