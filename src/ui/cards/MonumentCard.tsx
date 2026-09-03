"use client";

import { motion } from "motion/react";
import { useEffect } from "react";
import type { GameState } from "@/core/game";
import type { NarrationService } from "@/experience/narration";
import { DEFAULT_LOCALE, t } from "@/i18n";
import { Button } from "@/ui/primitives/Button";
import { CardShell } from "./CardShell";
import type { CardState } from "./cardState";

type MonumentCardState = Extract<CardState, { kind: "monument" }>;

/** Nom affiché d'un site de démonstration (aucun monument réel en Phase 4). */
export function siteDisplayName(siteId: string): string {
  const n = siteId.match(/(\d+)$/)?.[1];
  return t(DEFAULT_LOCALE, "monument.demoName", { n: n ? Number(n) : siteId });
}

export function MonumentCard({ state, card, narrator, onDecide }: { readonly state: GameState; readonly card: MonumentCardState; readonly narrator: NarrationService; readonly onDecide: (buy: boolean) => void }) {
  const site = state.config.sites[card.siteId];
  const name = siteDisplayName(card.siteId);
  useEffect(() => {
    if (card.step === "offer") narrator.speak({ text: t(DEFAULT_LOCALE, "narration.monumentOffer", { price: card.price }), lang: "fr", important: true });
    if (card.step === "acquired") narrator.speak({ text: t(DEFAULT_LOCALE, "narration.acquired"), lang: "fr" });
  }, [card.step, card.price, narrator]);

  return (
    <CardShell cellType="heritage" title={name} subtitle={t(DEFAULT_LOCALE, "monument.title")} testId="monument-card">
      <p className="text-[var(--k-ink-soft)]">{t(DEFAULT_LOCALE, "monument.history.pending")}</p>
      <dl className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-[var(--k-sand)] px-4 py-3">
          <dt className="text-xs font-bold uppercase tracking-wider text-[var(--k-ink-soft)]">{t(DEFAULT_LOCALE, "monument.price")}</dt>
          <dd className="text-2xl font-black">{card.price}</dd>
        </div>
        <div className="rounded-2xl bg-[var(--k-sand)] px-4 py-3">
          <dt className="text-xs font-bold uppercase tracking-wider text-[var(--k-ink-soft)]">{t(DEFAULT_LOCALE, "monument.heritageValue")}</dt>
          <dd className="text-2xl font-black">{site?.heritageValue ?? "—"}</dd>
        </div>
      </dl>
      {card.step === "offer" ? (
        <div className="flex flex-col gap-2">
          {!card.affordable ? <p className="text-sm text-[var(--k-ruby)]">{t(DEFAULT_LOCALE, "monument.tooExpensive")}</p> : null}
          <div className="grid grid-cols-2 gap-2">
            <Button size="lg" onClick={() => onDecide(true)} disabled={!card.affordable} data-testid="monument-buy">
              {t(DEFAULT_LOCALE, "monument.buy")}
            </Button>
            <Button size="lg" variant="secondary" onClick={() => onDecide(false)} data-testid="monument-pass">
              {t(DEFAULT_LOCALE, "monument.pass")}
            </Button>
          </div>
        </div>
      ) : null}
      {card.step === "acquired" ? (
        <motion.p initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center text-2xl font-black text-[var(--k-teal)]" data-testid="monument-acquired">
          {t(DEFAULT_LOCALE, "monument.acquired")}
        </motion.p>
      ) : null}
      {card.step === "declined" ? <p className="text-center text-[var(--k-ink-soft)]">{t(DEFAULT_LOCALE, "monument.declined")}</p> : null}
    </CardShell>
  );
}
