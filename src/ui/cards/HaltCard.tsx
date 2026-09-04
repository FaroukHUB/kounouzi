"use client";

import { motion } from "motion/react";
import { DEFAULT_LOCALE, t } from "@/i18n";
import { CellIcon } from "@/ui/board/CellIcon";
import { CardShell } from "./CardShell";

/** « Ton voyage s'interrompt » : une étape du voyage, pas une punition. Le Défi de reprise vient au tour suivant. */
export function HaltCard() {
  return (
    <CardShell cellType="halt" title={t(DEFAULT_LOCALE, "halt.title")} subtitle={t(DEFAULT_LOCALE, "cell.halt")} testId="halt-card" tall>
      <motion.span initial={{ rotate: -90, scale: 0.6, opacity: 0 }} animate={{ rotate: 0, scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 160, damping: 14 }} className="mx-auto flex size-24 items-center justify-center rounded-full border-4 border-[#c4b5fd] bg-[#ede9fe] text-[#5b21b6] shadow-md">
        <CellIcon type="halt" className="size-14" />
      </motion.span>
      <motion.p initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="font-display text-center text-2xl font-black">
        {t(DEFAULT_LOCALE, "halt.stopped")}
      </motion.p>
      <p className="text-center text-[var(--k-ink-soft)]">{t(DEFAULT_LOCALE, "halt.challenge.hint")}</p>
    </CardShell>
  );
}
