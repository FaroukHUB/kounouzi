"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import type { GameState } from "@/core/game";
import type { PlayerProfileDraft } from "@/data/ports";
import { avatarById, DEFAULT_AVATAR_ID } from "@/config/avatars";
import { pieceForPlayer } from "@/config/pawns/pieces";
import { DEFAULT_LOCALE, t } from "@/i18n";
import { AvatarBadge } from "@/ui/primitives/AvatarBadge";
import { PlayerTile } from "./PlayerPanel";

/**
 * Sur téléphone, les tuiles des joueurs mangeaient l'écran et écrasaient le
 * plateau. Elles vivent désormais dans un tiroir : un onglet discret sur le
 * bord, à ouvrir quand on veut voir les comptes de tout le monde. Le joueur
 * dont c'est le tour reste visible sans rien ouvrir — son personnage est dans
 * la barre d'action, sous le plateau.
 */
export function PlayersDrawer({ state, profiles }: { readonly state: GameState; readonly profiles: readonly PlayerProfileDraft[] }) {
  const [open, setOpen] = useState(false);
  const actif = state.players[state.activePlayerIndex];
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-expanded={open}
        data-testid="players-tab"
        className="absolute end-2 top-2 z-20 flex items-center gap-1 rounded-full border border-[rgba(255,220,160,0.35)] bg-[rgba(12,22,30,0.82)] px-2 py-1.5 text-white shadow-[0_10px_24px_-12px_rgba(0,0,0,0.8)] lg:hidden"
        aria-label={t(DEFAULT_LOCALE, "game.players")}
      >
        {state.players.slice(0, 4).map((p) => (
          <AvatarBadge
            key={p.id}
            avatar={avatarById(profiles.find((d) => d.id === p.id)?.avatarId ?? DEFAULT_AVATAR_ID)}
            color={pieceForPlayer(state.players, p.id).color}
            className={`size-7 ${p.id === actif?.id ? "ring-2 ring-[var(--k-gold)]" : "opacity-60"}`}
          />
        ))}
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            key="tiroir"
            className="absolute inset-0 z-30 flex justify-end bg-[var(--k-ink)]/50 lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
            data-testid="players-drawer"
          >
            <motion.ul
              className="flex h-full w-[min(20rem,86vw)] flex-col gap-2 overflow-y-auto bg-[rgba(255,250,240,0.96)] p-3 shadow-2xl"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "tween", duration: 0.22 }}
              aria-label={t(DEFAULT_LOCALE, "game.players")}
              onClick={(e) => e.stopPropagation()}
            >
              {state.players.map((p) => (
                <li key={p.id}>
                  <PlayerTile state={state} profiles={profiles} playerId={p.id} />
                </li>
              ))}
            </motion.ul>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
