"use client";

import { motion } from "motion/react";
import { useMemo } from "react";
import type { Banner } from "@/animation/player";
import { EFFECTS } from "@/config/effects";
import { pieceForPlayer } from "@/config/pawns/pieces";
import { useUiStore } from "@/state/uiStore";
import { coinPlan, type Rect } from "./coinFlight";

/**
 * LES PIÈCES QUI VOLENT D'UN JOUEUR À L'AUTRE.
 *
 * EN DOM, PAS DANS LA SCÈNE 3D, et c'est délibéré : les comptes des joueurs
 * sont en DOM, les pièces doivent partir et arriver exactement dessus, et ce
 * faisant l'effet marche aussi bien sur le plateau 2D. Rien ici ne dépend de
 * WebGL.
 *
 * AUCUNE NOUVELLE PLOMBERIE. Le bandeau de la file d'animation porte déjà qui
 * paie, qui reçoit et combien (`transfer`, `service`), et il est déjà
 * synchronisé avec la voix. On s'y abonne, on ne touche ni au moteur, ni aux
 * événements, ni à la file.
 */

/** Les deux bouts d'un vol, ou `null` quand le bandeau ne parle pas d'argent entre joueurs. */
function endsOf(banner: Banner | null): { readonly from: string; readonly to: string; readonly amount: number } | null {
  if (!banner) return null;
  if (banner.kind === "transfer") return { from: banner.fromPlayerId, to: banner.toPlayerId, amount: banner.amount };
  if (banner.kind === "service") return { from: banner.playerId, to: banner.ownerId, amount: banner.amount };
  return null;
}

/** Où se trouve, À L'ÉCRAN, le repère d'un joueur. */
function anchorOf(playerId: string): Rect | null {
  if (typeof document === "undefined") return null;
  // Plusieurs mises en page coexistent (tuiles autour du plateau, liste, tiroir
  // du téléphone, pastilles d'avatars) : on prend le premier repère VISIBLE.
  const candidates = document.querySelectorAll<HTMLElement>(`[data-player-anchor="${CSS.escape(playerId)}"]`);
  for (const element of candidates) {
    const rect = element.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
  }
  return null;
}

export interface CoinFlightProps {
  readonly players: readonly { readonly id: string }[];
  /** Animations réduites : aucune pièce ne vole, le bandeau dit déjà tout. */
  readonly reduced: boolean;
}

export function CoinFlight({ players, reduced }: CoinFlightProps) {
  const banner = useUiStore((s) => s.banner);
  const ends = endsOf(banner);
  const key = ends ? `${ends.from}>${ends.to}:${ends.amount}` : null;

  /**
   * AUCUN ÉTAT. Le vol est entièrement déterminé par le bandeau en cours : on le
   * calcule au rendu, les pièces vivent tant que ce bandeau est là, et elles
   * disparaissent avec lui. Passer par un état posé depuis un effet obligerait à
   * écrire pendant une phase que React peut refaire — et n'apporterait rien,
   * puisqu'il n'y a rien à mémoriser.
   */
  const flight = useMemo(() => {
    if (reduced || !ends) return null;
    const from = anchorOf(ends.from);
    const to = anchorOf(ends.to);
    // L'un des deux joueurs n'est pas à l'écran (tiroir fermé, liste défilée) :
    // on ne fait pas voler des pièces depuis nulle part. Le bandeau, lui, dit
    // déjà ce qui se passe — l'effet est un supplément, jamais le message.
    if (!from || !to) return null;
    const plan = coinPlan(from, to, ends.amount, EFFECTS.coins);
    return plan.length === 0 ? null : { plan, color: pieceForPlayer(players, ends.from).color };
    // `key` résume le vol : tant qu'il ne change pas, c'est le même.
  }, [key, reduced]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!flight) return null;
  const size = EFFECTS.coins.size;
  return (
    <div className="pointer-events-none fixed inset-0 z-50" aria-hidden="true" data-testid="coin-flight">
      {flight.plan.map((step, i) => (
            <motion.span
              key={`${key}-${i}`}
              /* DORÉES, pas aux couleurs du joueur : ce sont des Kounouz, et une
                 pièce se reconnaît à l'or. La couleur du payeur reste là, en
                 liseré — elle dit d'où vient l'argent sans empêcher de
                 reconnaître une pièce. Vérifié à l'écran : remplies de la
                 couleur du joueur, elles se perdaient dans l'illustration. */
              className="absolute rounded-full shadow-[0_6px_16px_-6px_rgba(0,0,0,0.7)]"
              style={{
                width: size,
                height: size,
                background: "radial-gradient(circle at 34% 28%, #fff6d0 0%, #f2c438 42%, #c98b12 100%)",
                border: `2px solid ${flight.color}`,
              }}
              initial={{ x: step.fromX - size / 2, y: step.fromY - size / 2, scale: 0.45, opacity: 0 }}
              animate={{
                x: step.toX - size / 2,
                // L'arc : la pièce monte puis retombe, elle n'est pas poussée à plat.
                y: [step.fromY - size / 2, step.apexY - size / 2, step.toY - size / 2],
                scale: [0.45, 1, 1, 0.55],
                // Opaques pendant TOUT le vol : elles ne s'effacent qu'à l'arrivée.
                opacity: [0, 1, 1, 0],
              }}
              transition={{ duration: EFFECTS.coins.travelMs / 1000, delay: step.delayMs / 1000, ease: "easeInOut" }}
            />
      ))}
    </div>
  );
}
