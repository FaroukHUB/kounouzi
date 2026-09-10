"use client";

import { motion } from "motion/react";
import { useState } from "react";
import type { GameState } from "@/core/game";
import type { PlayerId } from "@/core/shared";
import type { PlayerProfileDraft } from "@/data/ports";
import { DEFAULT_LOCALE, t } from "@/i18n";
import { CellIcon } from "@/ui/board/CellIcon";
import { Button } from "@/ui/primitives/Button";
import { formatKounouz } from "@/ui/primitives/money";
import { CardShell } from "./CardShell";
import { PlayerFace } from "./PlayerFace";
import type { CardState } from "./cardState";

type HassanatCardState = Extract<CardState, { kind: "hassanat" }>;

/**
 * Carte HASSANĀT (ADR 0035) : une occasion VOLONTAIRE de générosité. Famille
 * visuelle distincte (ni Défi, ni Don, ni Zakat). ACCEPTER (puis le bénéficiaire
 * si plusieurs) ou PASSER (0 point, 0 pénalité). Les points Hassanāt sont le
 * score de générosité du jeu : aucune affirmation sur une récompense réelle.
 */
export function HassanatCard({ state, profiles, card, onAccept, onSkip }: { readonly state: GameState; readonly profiles: readonly PlayerProfileDraft[]; readonly card: HassanatCardState; readonly onAccept: (beneficiaryId: PlayerId) => void; readonly onSkip: () => void }) {
  const def = state.config.hassanat.definitions.find((d) => d.id === card.cardId);
  const player = state.players.find((p) => p.id === card.playerId);
  const money = player?.money ?? 0;
  const [choosing, setChoosing] = useState(false);
  const accept = () => {
    if (card.candidates.length === 1) onAccept(card.candidates[0]!);
    else setChoosing(true);
  };
  return (
    <CardShell cellType="hassanat" title={def?.title ?? t(DEFAULT_LOCALE, "hassanat.title")} subtitle={t(DEFAULT_LOCALE, "hassanat.subtitle")} testId="hassanat-card" tall>
      <div className="flex items-center gap-3">
        <span className="k-float flex size-16 shrink-0 items-center justify-center rounded-full border-4 border-[var(--k-gold-light)] bg-[var(--k-teal)] text-white shadow-md" aria-hidden="true">
          <CellIcon type="hassanat" className="size-9" />
        </span>
        <span className="min-w-0">
          <span className="block text-xs font-bold uppercase tracking-wider text-[var(--k-ink-soft)]">{t(DEFAULT_LOCALE, `hassanat.kind.${card.hassanatKind}`)}</span>
          {def ? (
            <span className="block text-lg font-semibold" data-testid="hassanat-text">
              {def.text}
            </span>
          ) : null}
        </span>
      </div>
      <dl className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-[var(--k-sand)] px-4 py-3">
          <dt className="text-xs font-bold uppercase tracking-wider text-[var(--k-ink-soft)]">{t(DEFAULT_LOCALE, "game.kounouz")}</dt>
          <dd className="text-xl font-black tabular-nums" data-testid="hassanat-cost">
            {card.cost > 0 ? t(DEFAULT_LOCALE, "hassanat.cost", { amount: formatKounouz(card.cost) }) : t(DEFAULT_LOCALE, "hassanat.free")}
          </dd>
        </div>
        <div className="rounded-2xl bg-[var(--k-teal)] px-4 py-3 text-white">
          <dt className="text-xs font-bold uppercase tracking-wider opacity-80">{t(DEFAULT_LOCALE, "game.hassanat")}</dt>
          <dd className="text-xl font-black tabular-nums" data-testid="hassanat-reward">
            {t(DEFAULT_LOCALE, "hassanat.reward", { amount: card.reward })}
          </dd>
        </div>
      </dl>
      <p className="text-xs text-[var(--k-ink-soft)]">{t(DEFAULT_LOCALE, "hassanat.score")}</p>

      {card.step === "offer" && !choosing ? (
        <div className="flex flex-col gap-2">
          {money < card.cost ? <p className="text-sm text-[var(--k-ruby)]">{t(DEFAULT_LOCALE, "establishment.tooExpensive")}</p> : null}
          <div className="grid grid-cols-2 gap-2">
            <Button size="lg" onClick={accept} disabled={money < card.cost || card.candidates.length === 0} data-testid="hassanat-accept">
              {t(DEFAULT_LOCALE, "hassanat.accept")}
            </Button>
            <Button size="lg" variant="secondary" onClick={onSkip} data-testid="hassanat-skip">
              {t(DEFAULT_LOCALE, "hassanat.skip")}
            </Button>
          </div>
          <p className="text-center text-xs text-[var(--k-ink-soft)]">{t(DEFAULT_LOCALE, "hassanat.skipHint")}</p>
        </div>
      ) : null}
      {card.step === "offer" && choosing ? (
        <div className="flex flex-col gap-2">
          <p className="text-center font-bold">{t(DEFAULT_LOCALE, "hassanat.forWhom")}</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3" data-testid="hassanat-candidates">
            {card.candidates.map((id) => (
              <button key={id} type="button" onClick={() => onAccept(id)} className="flex min-h-24 items-center justify-center rounded-2xl border border-[var(--k-line)] bg-white p-2 active:scale-95" data-testid={`hassanat-to-${id}`}>
                <PlayerFace state={state} profiles={profiles} playerId={id} />
              </button>
            ))}
          </div>
        </div>
      ) : null}
      {card.step === "accepted" || card.step === "granted" ? (
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center gap-1 text-center">
          <p className="text-xl font-black text-[var(--k-teal)]" data-testid="hassanat-accepted">
            {t(DEFAULT_LOCALE, "hassanat.accepted")}
          </p>
          {card.step === "granted" ? (
            <p className="font-display text-3xl font-black text-[var(--k-gold)]" data-testid="hassanat-granted">
              {t(DEFAULT_LOCALE, "hassanat.reward", { amount: card.granted ?? card.reward })}
            </p>
          ) : null}
        </motion.div>
      ) : null}
      {card.step === "skipped" ? (
        <p className="text-center text-[var(--k-ink-soft)]" data-testid="hassanat-skipped">
          {t(DEFAULT_LOCALE, "hassanat.skipped")}
        </p>
      ) : null}
    </CardShell>
  );
}
