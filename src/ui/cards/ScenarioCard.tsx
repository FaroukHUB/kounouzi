"use client";

import { motion } from "motion/react";
import { useEffect } from "react";
import type { NarrationService } from "@/experience/narration";
import { DEFAULT_LOCALE, t } from "@/i18n";
import { CellIcon } from "@/ui/board/CellIcon";
import { ASSETS } from "@/ui/theme/assets";
import { CardShell } from "./CardShell";
import { scenarioTitle } from "./ChoiceCard";
import type { CardState } from "./cardState";

type ScenarioCardState = Extract<CardState, { kind: "scenario" }>;

/** Révélation brève d'un scénario automatique (le résultat — argent, effet — est projeté par la file). Le Trésor fait « oooh ». */
export function ScenarioCard({ card, narrator }: { readonly card: ScenarioCardState; readonly narrator: NarrationService }) {
  const title = scenarioTitle(card.scenarioId);
  const treasure = card.cellType === "treasure";
  useEffect(() => {
    narrator.speak({ text: title, lang: "fr", important: true });
  }, [title, narrator]);
  return (
    <CardShell cellType={card.cellType} title={t(DEFAULT_LOCALE, `cell.${card.cellType}`)} testId="scenario-card" tall={treasure}>
      {treasure ? (
        <div className="relative flex h-40 items-center justify-center" data-testid="treasure-glow">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={ASSETS.treasureGlow} alt="" aria-hidden="true" className="k-glow absolute size-44" decoding="async" />
          <motion.span initial={{ scale: 0.4, rotate: -10, opacity: 0 }} animate={{ scale: 1, rotate: 0, opacity: 1 }} transition={{ type: "spring", stiffness: 220, damping: 12 }} className="k-float relative flex size-24 items-center justify-center rounded-3xl border-4 border-[var(--k-gold-light)] bg-[var(--k-gold)] text-white shadow-[0_18px_30px_-12px_rgba(120,80,0,0.7)]">
            <CellIcon type="treasure" className="size-14" />
          </motion.span>
        </div>
      ) : (
        <motion.span initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 240, damping: 16 }} className="mx-auto flex size-20 items-center justify-center rounded-full bg-white/80 shadow-md" style={{ color: "var(--k-ink)" }}>
          <CellIcon type={card.cellType} className="size-10" />
        </motion.span>
      )}
      <p className="font-display text-center text-2xl font-black leading-snug">{title}</p>
    </CardShell>
  );
}
