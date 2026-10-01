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
      {/* Les actions collent au bas de la carte : sur un petit écran, le texte défile derrière elles, elles ne quittent jamais l'écran. */}
      <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-6 py-5 [&_[data-card-actions]]:sticky [&_[data-card-actions]]:bottom-0 [&_[data-card-actions]]:z-10 [&_[data-card-actions]]:-mx-2 [&_[data-card-actions]]:bg-[rgba(250,245,232,0.96)] [&_[data-card-actions]]:backdrop-blur-[3px] [&_[data-card-actions]]:rounded-t-xl [&_[data-card-actions]]:shadow-[0_-12px_16px_-10px_rgba(70,50,20,0.3)] [&_[data-card-actions]]:px-2 [&_[data-card-actions]]:pb-1 [&_[data-card-actions]]:pt-2">{children}</div>
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
      <div
        ref={ajusterAuParchemin}
        className="absolute overflow-y-auto text-[#3b2a14] [scrollbar-width:none]"
        style={{ insetInlineStart: `${p.start * 100}%`, insetInlineEnd: `${(1 - p.end) * 100}%`, top: `${p.top * 100}%`, bottom: `${(1 - p.bottom) * 100}%` }}
        data-testid="card-panel"
      >
        <div
          className="flex flex-col items-center gap-2 text-center [&_[data-testid=card-animation]]:h-12 [&_button]:min-h-10 [&_button]:px-3 [&_button]:py-2 [&_button]:text-sm [&_p]:text-[0.95rem] [&_p]:leading-snug [&_span]:text-[0.9rem] [&_[data-testid=question-prompt]]:text-[1.05rem] [&_[data-testid=question-prompt]]:font-bold [&_[data-card-actions]]:sticky [&_[data-card-actions]]:bottom-0 [&_[data-card-actions]]:z-10 [&_[data-card-actions]]:w-full [&_[data-card-actions]]:bg-[rgba(249,245,235,0.94)] [&_[data-card-actions]]:backdrop-blur-[3px] [&_[data-card-actions]]:rounded-t-xl [&_[data-card-actions]]:shadow-[0_-12px_16px_-10px_rgba(70,50,20,0.35)] [&_[data-card-actions]]:pb-1 [&_[data-card-actions]]:pt-2 [&_[data-card-actions]_button]:min-h-14"
        >
          {subtitle ? <p className="text-[0.65rem] font-bold uppercase tracking-[0.18em] text-[#8a6a2a]">{subtitle}</p> : null}
          {children}
        </div>
      </div>
    </motion.section>
  );
}

/**
 * Le parchemin d'une carte illustrée est plus petit qu'une feuille de carte
 * classique. Le contenu est donc RÉDUIT jusqu'à tenir dans la zone d'écriture.
 *
 * Plancher à 0,75. Il était à 0,55, et sur téléphone cela ne suffisait toujours
 * pas : une carte longue (énoncé, choix, réponse, explication FR et AR, source,
 * puis quatre boutons) débordait de 90 px d'un parchemin de 290 px, et le
 * débordement est MASQUÉ par l'illustration. Les boutons disparaissaient donc
 * purement et simplement — constaté en partie sur téléphone. Ce qui garantit
 * désormais qu'une action reste visible, ce n'est plus la réduction mais le
 * fait que les actions COLLENT au bas du parchemin (`data-card-actions`) : le
 * texte défile derrière elles. La réduction ne sert plus qu'au confort de
 * lecture, d'où un plancher nettement plus lisible. Mesuré et appliqué sur le
 * nœud, pour ne pas relancer un rendu à chaque pixel.
 */
function ajusterAuParchemin(panel: HTMLDivElement | null) {
  const contenu = panel?.firstElementChild as HTMLElement | null | undefined;
  if (!panel || !contenu) return;
  let enCours = false;
  const appliquer = () => {
    if (enCours) return;
    enCours = true;
    // `zoom` plutôt qu'un `scale` : il agit sur la MISE EN PAGE, donc le
    // parchemin ne garde pas une zone de défilement fantôme sous un contenu
    // rétréci — et les zones tactiles suivent le texte.
    contenu.style.zoom = "1";
    const dispo = panel.clientHeight;
    const reel = contenu.scrollHeight;
    const facteur = reel <= dispo || reel === 0 ? 1 : Math.max(0.75, dispo / reel);
    contenu.style.zoom = String(facteur);
    panel.dataset["fit"] = facteur.toFixed(2);
    enCours = false;
  };
  appliquer();
  // La taille du parchemin change avec l'écran ; son contenu change à chaque étape de la carte.
  const taille = new ResizeObserver(appliquer);
  taille.observe(panel);
  const contenuChange = new MutationObserver(appliquer);
  contenuChange.observe(contenu, { childList: true, subtree: true, characterData: true });
  return () => {
    taille.disconnect();
    contenuChange.disconnect();
  };
}
