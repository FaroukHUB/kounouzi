"use client";

import Link from "next/link";
import { motion } from "motion/react";
import type { GameState } from "@/core/game";
import { DEFAULT_LOCALE, t } from "@/i18n";

export function FinalRanking({ state }: { readonly state: GameState }) {
  const ranking = state.ranking ?? [];
  const winner = ranking[0] ? state.players.find((p) => p.id === ranking[0]!.playerId) : undefined;
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 z-30 flex items-center justify-center bg-[var(--k-ink)]/60 p-4">
      <motion.section initial={{ scale: 0.92, y: 16 }} animate={{ scale: 1, y: 0 }} className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl" aria-labelledby="ranking-title">
        <h2 id="ranking-title" className="text-2xl font-black">
          {t(DEFAULT_LOCALE, "game.finished.title")}
        </h2>
        {winner ? <p className="mt-1 text-lg text-[var(--k-teal)]">{t(DEFAULT_LOCALE, "game.finished.winner", { name: winner.displayName })}</p> : null}
        <ol className="mt-4 flex flex-col gap-2">
          {ranking.map((row) => {
            const p = state.players.find((x) => x.id === row.playerId);
            return (
              <li key={row.playerId} className="flex items-center justify-between rounded-xl bg-[var(--k-sand)] px-3 py-2">
                <span className="font-semibold">
                  {t(DEFAULT_LOCALE, "game.ranking.rank", { rank: row.rank })} {p?.displayName}
                </span>
                <span className="text-sm tabular-nums text-[var(--k-ink-soft)]">
                  {t(DEFAULT_LOCALE, "game.ranking.score")} {row.score}
                </span>
              </li>
            );
          })}
        </ol>
        <Link href="/" className="mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-2xl bg-[var(--k-teal)] font-semibold text-white">
          {t(DEFAULT_LOCALE, "game.finished.home")}
        </Link>
      </motion.section>
    </motion.div>
  );
}
