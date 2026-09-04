"use client";

import { motion } from "motion/react";
import { DEFAULT_LOCALE, t } from "@/i18n";
import { CardShell } from "./CardShell";

/** « Ton voyage s'interrompt » : révélation brève à l'arrivée sur une Halte ; le Défi de reprise vient au tour suivant. */
export function HaltCard() {
  return (
    <CardShell cellType="halt" title={t(DEFAULT_LOCALE, "halt.title")} subtitle={t(DEFAULT_LOCALE, "cell.halt")} testId="halt-card">
      <motion.p initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center text-2xl font-black">
        {t(DEFAULT_LOCALE, "halt.stopped")}
      </motion.p>
      <p className="text-center text-[var(--k-ink-soft)]">{t(DEFAULT_LOCALE, "halt.challenge.hint")}</p>
    </CardShell>
  );
}
