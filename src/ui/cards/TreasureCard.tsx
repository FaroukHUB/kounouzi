"use client";

import { motion } from "motion/react";
import { useEffect } from "react";
import type { NarrationService } from "@/experience/narration";
import { DEFAULT_LOCALE, t } from "@/i18n";
import { CellIcon } from "@/ui/board/CellIcon";
import { ASSETS } from "@/ui/theme/assets";
import { CardShell } from "./CardShell";
import type { CardState } from "./cardState";

type TreasureCardState = Extract<CardState, { kind: "treasure" }>;

/** 💎 TRÉSOR ! Gain fixe des règles, versé une fois par le grand livre. Aucun hasard. */
export function TreasureCard({ card, narrator }: { readonly card: TreasureCardState; readonly narrator: NarrationService }) {
  useEffect(() => {
    narrator.speak({ text: t(DEFAULT_LOCALE, "narration.treasure", { amount: card.amount }), lang: "fr", important: true });
  }, [card.amount, narrator]);
  return (
    <CardShell cellType="treasure" title={t(DEFAULT_LOCALE, "treasure.title")} subtitle={t(DEFAULT_LOCALE, "cell.treasure")} testId="treasure-card" tall>
      <div className="relative flex h-40 items-center justify-center" data-testid="treasure-glow">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={ASSETS.treasureGlow} alt="" aria-hidden="true" className="k-glow absolute size-44" decoding="async" />
        <motion.span initial={{ scale: 0.4, rotate: -10, opacity: 0 }} animate={{ scale: 1, rotate: 0, opacity: 1 }} transition={{ type: "spring", stiffness: 220, damping: 12 }} className="k-float relative flex size-24 items-center justify-center rounded-3xl border-4 border-[var(--k-gold-light)] bg-[var(--k-gold)] text-white shadow-[0_18px_30px_-12px_rgba(120,80,0,0.7)]">
          <CellIcon type="treasure" className="size-14" />
        </motion.span>
      </div>
      <p className="font-display text-center text-3xl font-black leading-snug text-[var(--k-teal)]" data-testid="treasure-amount">
        {t(DEFAULT_LOCALE, "treasure.win", { amount: card.amount })}
      </p>
    </CardShell>
  );
}
