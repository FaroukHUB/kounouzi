"use client";

import type { GameState } from "@/core/game";
import { DEFAULT_LOCALE, t } from "@/i18n";

/** Temps restant : approximatif par défaut (jamais stressant), précis sur demande. Le moteur reste à la seconde. */
export function TimeBadge({ state, precise }: { readonly state: GameState; readonly precise: boolean }) {
  const condition = state.config.rules.endCondition;
  if (condition.kind === "free") return <span className="text-sm text-[var(--k-ink-soft)]">{t(DEFAULT_LOCALE, "game.timeFree")}</span>;
  if (condition.kind === "turns_per_player") return <span className="text-sm text-[var(--k-ink-soft)]">{t(DEFAULT_LOCALE, "game.turn", { turn: state.turnNumber })}</span>;
  const remaining = Math.max(0, condition.targetSeconds - state.clock.activePlaySeconds);
  if (state.clock.timeTargetReached || remaining === 0) return <span className="text-sm font-semibold text-[var(--k-ruby)]">{t(DEFAULT_LOCALE, "game.timeOver")}</span>;
  if (precise) {
    const m = Math.floor(remaining / 60);
    const s = Math.floor(remaining % 60);
    return <span className="text-sm tabular-nums text-[var(--k-ink-soft)]">{t(DEFAULT_LOCALE, "game.timeLeftPrecise", { time: `${m}:${String(s).padStart(2, "0")}` })}</span>;
  }
  return <span className="text-sm text-[var(--k-ink-soft)]">{t(DEFAULT_LOCALE, "game.timeLeft", { minutes: Math.max(1, Math.round(remaining / 60)) })}</span>;
}
