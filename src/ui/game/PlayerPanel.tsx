"use client";

import { avatarById } from "@/config/avatars";
import type { GameState } from "@/core/game";
import type { PlayerId } from "@/core/shared";
import type { PlayerProfileDraft } from "@/data/ports";
import { DEFAULT_LOCALE, t } from "@/i18n";
import { AvatarGlyph } from "@/ui/primitives/AvatarGlyph";

/**
 * Tuile d'un joueur : avatar, nom, Kounouz en GRAND, patrimoine. La même
 * tuile sert la liste (5-6 joueurs) et les coins autour du plateau (≤ 4).
 */
export function PlayerTile({ state, profiles, playerId, className = "" }: { readonly state: GameState; readonly profiles: readonly PlayerProfileDraft[]; readonly playerId: PlayerId; readonly className?: string }) {
  const p = state.players.find((x) => x.id === playerId);
  if (!p) return null;
  const avatar = avatarById(profiles.find((d) => d.id === p.id)?.avatarId ?? "amber");
  const heritage = state.holdings.filter((h) => h.ownerId === p.id).length;
  const active = state.players[state.activePlayerIndex]?.id === p.id;
  return (
    <div
      data-player={p.id}
      data-active={active}
      className={`flex items-center gap-2 rounded-2xl border px-3 py-2 transition ${active ? "border-[var(--k-gold)] bg-[var(--k-cream)] shadow-[0_10px_24px_-14px_rgba(60,35,10,0.8)]" : "border-[rgba(120,80,30,0.12)] bg-[rgba(255,250,240,0.85)]"} ${className}`}
    >
      <span className={`flex size-11 shrink-0 items-center justify-center rounded-full border-2 border-white text-white shadow ${active ? "ring-2 ring-[var(--k-gold)]" : ""}`} style={{ background: `radial-gradient(circle at 35% 30%, rgba(255,255,255,0.5) 0%, ${avatar.color} 45%)` }}>
        <AvatarGlyph shape={avatar.shape} className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="truncate font-semibold">{p.displayName}</span>
          {active ? <span className="rounded-full bg-[var(--k-teal)] px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-wide text-white">{t(DEFAULT_LOCALE, "game.turn", { turn: state.turnNumber })}</span> : null}
        </span>
        <span className="flex flex-wrap items-baseline gap-x-2">
          <span className="font-display text-[clamp(1.5rem,2.6vw,2rem)] font-black leading-none tabular-nums text-[var(--k-teal-dark)]" data-testid="player-money">
            {p.money}
          </span>
          <span className="text-xs font-semibold uppercase tracking-wide text-[var(--k-ink-soft)]">{t(DEFAULT_LOCALE, "game.kounouz")}</span>
        </span>
        <span className="block text-sm text-[var(--k-ink-soft)]" data-testid="player-heritage">
          {t(DEFAULT_LOCALE, "game.heritage")} {heritage}
        </span>
      </span>
    </div>
  );
}

export function PlayerPanel({ state, profiles }: { readonly state: GameState; readonly profiles: readonly PlayerProfileDraft[] }) {
  return (
    <ul className="flex flex-col gap-2" aria-label={t(DEFAULT_LOCALE, "game.players")}>
      {state.players.map((p) => (
        <li key={p.id}>
          <PlayerTile state={state} profiles={profiles} playerId={p.id} />
        </li>
      ))}
    </ul>
  );
}

/** Positions des tuiles autour du plateau (≤ 4 joueurs) : coins début/fin, haut/bas — propriétés logiques uniquement. */
const CORNER: readonly string[] = ["lg:col-start-1 lg:row-start-1 lg:self-start", "lg:col-start-3 lg:row-start-1 lg:self-start", "lg:col-start-1 lg:row-start-2 lg:self-end", "lg:col-start-3 lg:row-start-2 lg:self-end"];

/** Les joueurs autour du plateau : grille 2 × 2 sur petit écran, coins de part et d'autre du plateau en large. */
export function PlayerCorners({ state, profiles }: { readonly state: GameState; readonly profiles: readonly PlayerProfileDraft[] }) {
  return (
    <>
      {state.players.slice(0, 4).map((p, i) => (
        <PlayerTile key={p.id} state={state} profiles={profiles} playerId={p.id} className={`lg:w-44 ${CORNER[i] ?? ""}`} />
      ))}
    </>
  );
}
