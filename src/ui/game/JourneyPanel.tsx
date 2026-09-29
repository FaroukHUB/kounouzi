"use client";

import { AnimatePresence, motion } from "motion/react";
import { avatarById, DEFAULT_AVATAR_ID } from "@/config/avatars";
import type { GameState } from "@/core/game";
import type { PlayerProfileDraft } from "@/data/ports";
import { DEFAULT_LOCALE, t } from "@/i18n";
import { pieceForPlayer } from "@/config/pawns/pieces";
import { AvatarBadge } from "@/ui/primitives/AvatarBadge";
import { formatKounouz } from "@/ui/primitives/money";
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

export interface JourneyActionProps extends JourneyPanelProps {
  /** Profils (avatars) : l'avatar du joueur actif est montré ICI, pas sur le plateau. */
  readonly profiles: readonly PlayerProfileDraft[];
}

/** Le Chemin peut-il être lancé maintenant ? Même condition pour le bouton et pour le cœur. */
const canStartJourney = ({ state, reveal, isAnimating }: JourneyPanelProps): boolean => state.phase.kind === "awaiting_journey" && !isAnimating && !reveal;

/**
 * Le cœur du plateau. Il ne dessine RIEN par défaut : la carte illustrée
 * (tapis du plateau) reste entièrement visible pendant la partie. Le cartouche
 * n'apparaît que pour le moment fort — le dévoilement du Chemin, « Ton chemin
 * se dévoile… N » — puis s'efface. Le nombre vient du moteur.
 *
 * L'appel à l'action (« Au tour de X » + « Découvrir mon chemin ») vit
 * ailleurs, dans `JourneyAction`, à une place FIXE sous le plateau : un bouton
 * qui change de position à chaque tour est un bouton qu'on cherche.
 */
export function JourneyPanel(props: JourneyPanelProps) {
  const { state, reveal } = props;
  const name = (id: string) => state.players.find((p) => p.id === id)?.displayName ?? "";
  return (
    <div className="relative flex size-[94%] items-center justify-center text-center" data-testid="board-center">
      <AnimatePresence initial={false}>
        {reveal ? (
          <motion.div
            key="reveal"
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 0.25 }}
            className="flex w-[78%] flex-col items-center gap-1 rounded-[1.6rem] bg-[rgba(255,250,240,0.94)] px-[5%] py-[4%] shadow-[0_10px_30px_-12px_rgba(40,25,10,0.55)]"
          >
            <p className="text-[clamp(0.8rem,1.8vw,1.1rem)] text-[var(--k-ink-soft)]">{t(DEFAULT_LOCALE, "game.journey.reveal")}</p>
            <motion.p key={reveal.steps} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35, duration: 0.3 }} className="font-display text-[clamp(2.4rem,7vw,4.5rem)] font-black leading-none text-[var(--k-teal)]">
              {reveal.steps}
            </motion.p>
            <p className="text-[clamp(0.85rem,2vw,1.2rem)] font-semibold">{reveal.steps === 1 ? t(DEFAULT_LOCALE, "game.journey.step") : t(DEFAULT_LOCALE, "game.journey.steps", { steps: reveal.steps })}</p>
            <p className="text-[clamp(0.7rem,1.5vw,0.95rem)] text-[var(--k-ink-soft)]">{t(DEFAULT_LOCALE, "game.journey.advances", { name: name(reveal.playerId), steps: reveal.steps })}</p>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

/**
 * L'appel à l'action, à une place FIXE sous le plateau (ou dans le panneau
 * latéral à cinq joueurs et plus) : l'AVATAR du joueur actif, « Au tour de X »
 * puis « Découvrir mon chemin ». Il ne masque jamais la carte, et le joueur le
 * retrouve toujours au même endroit d'un tour à l'autre. L'avatar vit ici :
 * sur le plateau, les joueurs ne sont que des pions.
 */
export function JourneyAction(props: JourneyActionProps) {
  const { shown, isAnimating, profiles } = props;
  const active = shown.players[shown.activePlayerIndex];
  const avatar = avatarById(profiles.find((d) => d.id === active?.id)?.avatarId ?? DEFAULT_AVATAR_ID);
  const canStart = canStartJourney(props);
  return (
    <div className="flex items-center justify-center gap-3 text-center lg:min-h-[3.25rem]" data-testid="journey-action">
      {/* L'avatar du joueur actif : c'est ici qu'on reconnaît qui joue — le plateau ne porte que des pions. */}
      <span key={active?.id ?? "none"} data-testid="journey-avatar" className="flex">
        <AvatarBadge avatar={avatar} color={active ? pieceForPlayer(shown.players, active.id).color : undefined} className="size-12 shadow-[0_8px_18px_-8px_rgba(40,25,10,0.7)] ring-2 ring-[var(--k-gold)]" />
      </span>
      <AnimatePresence mode="wait" initial={false}>
        {canStart && active ? (
          <motion.div key="cta" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }} className="flex flex-col items-center gap-2 lg:flex-row lg:gap-3">
            <p className="whitespace-nowrap text-[clamp(0.95rem,2vw,1.15rem)] font-semibold">
              {t(DEFAULT_LOCALE, "game.turnOf", { name: active.displayName })}
              {/* Les tuiles des joueurs vivent dans un tiroir sur téléphone : la
                  bourse de celui qui joue reste visible sans rien ouvrir. */}
              <span className="ms-2 font-black tabular-nums text-[var(--k-teal-dark)]" data-testid="active-money">
                {formatKounouz(active.money)}
              </span>
            </p>
            <Button size="xl" onClick={props.onStartJourney} data-testid="start-journey" className="whitespace-nowrap shadow-[0_14px_30px_-10px_rgba(15,118,110,0.7)]">
              {t(DEFAULT_LOCALE, "game.journey.cta")}
            </Button>
          </motion.div>
        ) : (
          <motion.p key="wait" initial={{ opacity: 0 }} animate={{ opacity: 0.7 }} exit={{ opacity: 0 }} className="text-[clamp(0.8rem,1.7vw,1.05rem)] text-[var(--k-ink-soft)]">
            {isAnimating ? t(DEFAULT_LOCALE, "game.animating") : t(DEFAULT_LOCALE, "game.turnOf", { name: active?.displayName ?? "" })}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
