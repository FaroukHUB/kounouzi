"use client";

import { avatarById } from "@/config/avatars";
import type { GameState } from "@/core/game";
import type { PlayerProfileDraft } from "@/data/ports";
import { DEFAULT_LOCALE, t } from "@/i18n";
import { AvatarGlyph } from "@/ui/primitives/AvatarGlyph";

export function PlayerPanel({ state, profiles }: { readonly state: GameState; readonly profiles: readonly PlayerProfileDraft[] }) {
  const activeId = state.players[state.activePlayerIndex]?.id;
  return (
    <ul className="flex flex-col gap-2" aria-label={t(DEFAULT_LOCALE, "game.players")}>
      {state.players.map((p) => {
        const avatar = avatarById(profiles.find((d) => d.id === p.id)?.avatarId ?? "amber");
        const heritage = state.holdings.filter((h) => h.ownerId === p.id).length;
        const active = p.id === activeId;
        return (
          <li
            key={p.id}
            data-player={p.id}
            data-active={active}
            className={`flex items-center gap-3 rounded-2xl border px-3 py-2 transition ${active ? "border-[var(--k-gold)] bg-[var(--k-cream)] shadow-[0_10px_24px_-14px_rgba(60,35,10,0.8)]" : "border-[rgba(120,80,30,0.12)] bg-[rgba(255,250,240,0.7)]"}`}
          >
            <span className={`flex size-10 shrink-0 items-center justify-center rounded-full border-2 border-white text-white shadow ${active ? "ring-2 ring-[var(--k-gold)]" : ""}`} style={{ background: `radial-gradient(circle at 35% 30%, rgba(255,255,255,0.5) 0%, ${avatar.color} 45%)` }}>
              <AvatarGlyph shape={avatar.shape} className="size-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-semibold">{p.displayName}</span>
              <span className="block text-xs text-[var(--k-ink-soft)]">
                {t(DEFAULT_LOCALE, "game.money")} {p.money} · {t(DEFAULT_LOCALE, "game.heritage")} {heritage}
              </span>
            </span>
            {active ? <span className="rounded-full bg-[var(--k-teal)] px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wide text-white">{t(DEFAULT_LOCALE, "game.turn", { turn: state.turnNumber })}</span> : null}
          </li>
        );
      })}
    </ul>
  );
}
