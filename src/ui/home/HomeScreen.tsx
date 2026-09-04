"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { GameSummary } from "@/data/ports";
import { DEFAULT_LOCALE, t } from "@/i18n";
import { gameStore } from "@/state/appStores";
import { Bidi } from "@/ui/primitives/Bidi";
import { Button } from "@/ui/primitives/Button";

export function HomeScreen() {
  const [games, setGames] = useState<readonly GameSummary[] | null>(null);
  const refresh = () => gameStore.getState().listSaved().then(setGames, () => setGames([]));
  useEffect(() => {
    void refresh();
  }, []);

  return (
    <main className="bg-table flex min-h-dvh w-full flex-col items-center justify-center gap-8 p-6 text-center">
      <header className="flex flex-col items-center gap-2">
        <span className="flex size-24 items-center justify-center rounded-full border-4 border-[var(--k-gold-light)] bg-[var(--k-teal)] text-white shadow-[0_18px_34px_-14px_rgba(15,118,110,0.8)]">
          <svg viewBox="0 0 24 24" aria-hidden="true" className="size-12" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"><path d="M12 3 14 9l6 .5-4.5 4 1.5 6L12 16l-5 3.5 1.5-6-4.5-4L10 9l2-6Z" /></svg>
        </span>
        <h1 className="font-display text-6xl font-black tracking-[0.1em] text-[var(--k-teal-dark)]">{t(DEFAULT_LOCALE, "app.name")}</h1>
        <p className="text-xl font-semibold">{t(DEFAULT_LOCALE, "app.tagline")}</p>
        <Bidi as="p" lang="ar" className="text-lg text-[var(--k-ink-soft)]">
          {t("ar", "app.tagline")}
        </Bidi>
      </header>

      <Link href="/nouvelle-partie" className="inline-flex min-h-16 w-full max-w-sm items-center justify-center rounded-2xl bg-[var(--k-teal)] px-8 text-xl font-semibold text-white shadow-[0_14px_30px_-10px_rgba(15,118,110,0.8)]" data-testid="new-game">
        {t(DEFAULT_LOCALE, "home.newGame")}
      </Link>

      <section className="w-full max-w-sm text-start" aria-labelledby="saved-title">
        <h2 id="saved-title" className="mb-2 text-sm font-semibold uppercase tracking-wide text-[var(--k-ink-soft)]">
          {t(DEFAULT_LOCALE, "home.savedGames")}
        </h2>
        {games === null ? (
          <p className="text-sm">{t(DEFAULT_LOCALE, "common.loading")}</p>
        ) : games.length === 0 ? (
          <p className="text-sm text-[var(--k-ink-soft)]">{t(DEFAULT_LOCALE, "home.noSavedGame")}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {games.map((g) => (
              <li key={g.gameId} className="flex items-center gap-3 rounded-2xl border border-[rgba(120,80,30,0.15)] bg-[var(--k-cream)] p-3 shadow-sm" data-testid="saved-game">
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{g.players.map((p) => p.displayName).join(" · ")}</span>
                  <span className="block text-xs text-[var(--k-ink-soft)]">
                    {t(DEFAULT_LOCALE, "home.turn", { turn: g.turnNumber })} · {g.status === "finished" ? t(DEFAULT_LOCALE, "home.finished") : t(DEFAULT_LOCALE, "home.inProgress")}
                  </span>
                </span>
                <Link href={`/partie/${g.gameId}`} className="inline-flex min-h-11 items-center rounded-xl bg-[var(--k-teal)] px-4 font-semibold text-white" data-testid="resume-game">
                  {t(DEFAULT_LOCALE, "home.resume")}
                </Link>
                <Button variant="ghost" onClick={() => gameStore.getState().remove(g.gameId).then(refresh)} aria-label={t(DEFAULT_LOCALE, "home.delete")}>
                  ✕
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
