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
    <main className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col items-center justify-center gap-8 p-6 text-center">
      <header className="flex flex-col items-center gap-2">
        <h1 className="text-6xl font-black tracking-tight text-[var(--k-teal)]">{t(DEFAULT_LOCALE, "app.name")}</h1>
        <p className="text-xl font-semibold">{t(DEFAULT_LOCALE, "app.tagline")}</p>
        <Bidi as="p" lang="ar" className="text-lg text-[var(--k-ink-soft)]">
          {t("ar", "app.tagline")}
        </Bidi>
      </header>

      <Link href="/nouvelle-partie" className="inline-flex min-h-16 w-full max-w-sm items-center justify-center rounded-2xl bg-[var(--k-teal)] px-8 text-xl font-semibold text-white shadow-lg" data-testid="new-game">
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
              <li key={g.gameId} className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-sm" data-testid="saved-game">
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
