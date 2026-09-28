"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";
import type { CardDeck } from "@/config/cards";
import { CellIcon } from "@/ui/board/CellIcon";
import { CARD_STYLE, type CardStyleKey } from "@/ui/board/cellStyles";
import { ASSETS } from "@/ui/theme/assets";

export interface CardShellProps {
  /** Famille visuelle : type de case, ou `hassanat` pour la carte Hassanāt. */
  readonly cellType: CardStyleKey;
  readonly title: string;
  readonly subtitle?: string | undefined;
  readonly children: ReactNode;
  readonly testId?: string | undefined;
  /** Bandeau illustré plus haut (Duel, Trésor, Halte). */
  readonly tall?: boolean | undefined;
  /** Carte illustrée fournie : la FACE devient la carte, le texte vit dans son parchemin. */
  readonly deck?: CardDeck | undefined;
}

/**
 * Coque commune des cartes : parchemin, bandeau illustré par famille de case
 * (asset remplaçable), médaillon d'icône, coins ornés. Contenu scrollable, tactile.
 */
export function CardShell({ cellType, title, subtitle, children, testId, tall, deck }: CardShellProps) {
  const style = CARD_STYLE[cellType];
  if (deck) return <IllustratedCard deck={deck} title={title} subtitle={subtitle} testId={testId} cellType={cellType}>{children}</IllustratedCard>;
  return (
    <motion.section
      data-testid={testId ?? "card"}
      data-card-type={cellType}
      initial={{ opacity: 0, scale: 0.9, y: 24 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 12 }}
      transition={{ type: "tween", duration: 0.25 }}
      className="bg-parchment relative flex max-h-[min(90dvh,760px)] w-[min(94vw,580px)] flex-col overflow-hidden rounded-[1.8rem] shadow-[0_34px_80px_-30px_rgba(40,25,10,0.7),0_0_0_1px_rgba(120,80,30,0.25)]"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      {/* Liseré doré */}
      <span className="pointer-events-none absolute inset-[6px] z-20 rounded-[1.5rem] border border-[rgba(212,160,23,0.45)]" aria-hidden="true" />
      <header className={`relative flex items-end gap-3 px-6 ${tall ? "min-h-28 pb-4 pt-8" : "min-h-20 py-4"}`} style={{ backgroundColor: style.bg, color: style.fg, backgroundImage: `url(${ASSETS.cardBanner[cellType]})`, backgroundSize: "cover", backgroundPosition: "center" }}>
        <span className="flex size-12 shrink-0 items-center justify-center rounded-full border-2 border-white/80 shadow-md" style={{ backgroundColor: style.accent, color: "#fff" }}>
          <CellIcon type={cellType} className="size-6" />
        </span>
        <span className="min-w-0">
          <span className="block text-xs font-bold uppercase tracking-[0.18em] opacity-75">{subtitle}</span>
          <span className="font-display block truncate text-xl font-black">{title}</span>
        </span>
      </header>
      <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-6 py-5">{children}</div>
    </motion.section>
  );
}

/**
 * Carte illustrée : l'image FACE est la carte elle-même (son format vient de
 * l'image, jamais deviné), et tout le texte vit dans le parchemin, borné par la
 * zone d'écriture déclarée en données. Le titre de la famille est déjà peint
 * sur l'illustration : on ne le redessine pas.
 */
function IllustratedCard({ deck, title, subtitle, children, testId, cellType }: { readonly deck: CardDeck; readonly title: string; readonly subtitle?: string | undefined; readonly children: ReactNode; readonly testId?: string | undefined; readonly cellType: CardStyleKey }) {
  const p = deck.panel;
  return (
    <motion.section
      data-testid={testId ?? "card"}
      data-card-type={cellType}
      data-deck={deck.id}
      initial={{ opacity: 0, scale: 0.9, y: 24 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 12 }}
      transition={{ type: "tween", duration: 0.25 }}
      className="relative h-[min(88dvh,820px)] max-w-[94vw] select-none"
      style={{ aspectRatio: `${deck.width} / ${deck.height}` }}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- carte entière, image déjà dimensionnée */}
      <img src={deck.face} alt="" aria-hidden="true" className="absolute inset-0 size-full rounded-[4%] object-fill drop-shadow-[0_30px_60px_rgba(0,0,0,0.6)]" decoding="async" />
      {/* La typographie est resserrée DANS la carte illustrée : le parchemin est
          plus petit qu'une feuille de carte classique, et tout doit y tenir sans
          que le joueur ait à faire défiler pour trouver le bouton. */}
      <div
        className="absolute flex flex-col items-center gap-2 overflow-y-auto text-center text-[#3b2a14] [scrollbar-width:none] [&_[data-testid=card-animation]]:h-12 [&_button]:min-h-10 [&_button]:px-3 [&_button]:py-2 [&_button]:text-sm [&_p]:text-[0.95rem] [&_p]:leading-snug [&_span]:text-[0.9rem] [&_[data-testid=question-prompt]]:text-[1.05rem] [&_[data-testid=question-prompt]]:font-bold"
        style={{ insetInlineStart: `${p.start * 100}%`, insetInlineEnd: `${(1 - p.end) * 100}%`, top: `${p.top * 100}%`, bottom: `${(1 - p.bottom) * 100}%` }}
        data-testid="card-panel"
      >
        {subtitle ? <p className="text-[0.65rem] font-bold uppercase tracking-[0.18em] text-[#8a6a2a]">{subtitle}</p> : null}
        {children}
      </div>
    </motion.section>
  );
}
