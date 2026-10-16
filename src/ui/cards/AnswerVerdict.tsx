"use client";

import { motion, type TargetAndTransition } from "motion/react";
import type { AnswerOutcome } from "@/core/shared";
import { DEFAULT_LOCALE, t } from "@/i18n";

/**
 * LE VERDICT D'UNE RÉPONSE — correct, presque, à revoir.
 *
 * TROIS SIGNAUX, PAS UN. Chaque verdict se distingue par sa FORME, par son
 * MOUVEMENT et par sa couleur, et jamais par la couleur seule : un enfant qui
 * distingue mal le rouge du vert — c'est un garçon sur douze — doit pouvoir
 * lire le résultat aussi vite que les autres. La forme est d'ailleurs le signal
 * le plus rapide des trois.
 *
 * ET UNE RÉPONSE FAUSSE NE SE FAIT PAS GRONDER : pas de secousse, pas de rouge
 * vif, pas de croix. Elle se pose doucement, et le texte dit « ce sera pour une
 * prochaine fois ». Le jeu enseigne, il ne sanctionne pas.
 */

export interface VerdictStyle {
  /** Signe tracé dans le médaillon : une forme, pas une couleur. */
  readonly glyph: "check" | "tilde" | "circle";
  readonly background: string;
  readonly ink: string;
  /** Mouvement d'entrée, propre à chaque verdict. */
  readonly motion: "pop" | "tilt" | "settle";
}

export const VERDICT_STYLES: Readonly<Record<AnswerOutcome, VerdictStyle>> = {
  correct: { glyph: "check", background: "#0f766e", ink: "#ffffff", motion: "pop" },
  partial: { glyph: "tilde", background: "#d4a017", ink: "#2a1c00", motion: "tilt" },
  incorrect: { glyph: "circle", background: "#64748b", ink: "#ffffff", motion: "settle" },
};

const PATHS: Readonly<Record<VerdictStyle["glyph"], string>> = {
  check: "M6 13.5 L10.5 18 L18.5 7",
  tilde: "M5.5 14.5c2.2-4 4.4-4 6.5 0s4.3 4 6.5 0",
  circle: "M12 5.2a6.8 6.8 0 1 0 0 13.6 6.8 6.8 0 1 0 0-13.6",
};

const ENTRANCE: Record<VerdictStyle["motion"], { initial: TargetAndTransition; animate: TargetAndTransition }> = {
  pop: { initial: { scale: 0.3, opacity: 0 }, animate: { scale: [0.3, 1.18, 1], opacity: 1 } },
  tilt: { initial: { scale: 0.6, rotate: -14, opacity: 0 }, animate: { scale: 1, rotate: [-14, 10, 0], opacity: 1 } },
  settle: { initial: { scale: 0.85, y: -14, opacity: 0 }, animate: { scale: 1, y: 0, opacity: 1 } },
};

export function AnswerVerdict({ outcome, reduced }: { readonly outcome: AnswerOutcome; readonly reduced: boolean }) {
  const style = VERDICT_STYLES[outcome];
  const entrance = ENTRANCE[style.motion];
  return (
    <motion.div
      className="flex flex-col items-center gap-2 text-center"
      data-testid="result"
      data-outcome={outcome}
      initial={reduced ? false : entrance.initial}
      animate={reduced ? {} : entrance.animate}
      transition={{ duration: reduced ? 0 : 0.5, ease: "easeOut" }}
    >
      <span className="flex size-16 items-center justify-center rounded-full shadow-[0_10px_22px_-12px_rgba(0,0,0,0.6)]" style={{ backgroundColor: style.background }} aria-hidden="true">
        <svg viewBox="0 0 24 24" className="size-9" fill="none" stroke={style.ink} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" data-glyph={style.glyph}>
          <path d={PATHS[style.glyph]} />
        </svg>
      </span>
      <p className="text-2xl font-black">{t(DEFAULT_LOCALE, `card.result.${outcome}`)}</p>
    </motion.div>
  );
}
