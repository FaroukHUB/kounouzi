"use client";

import { motion } from "motion/react";
import { categoryById } from "@/config/content";
import type { GameState } from "@/core/game";
import type { AnswerOutcome } from "@/core/shared";
import type { PlayerProfileDraft } from "@/data/ports";
import { DEFAULT_LOCALE, t } from "@/i18n";
import { CardShell } from "./CardShell";
import { PlayerFace } from "./PlayerFace";
import type { CardState } from "./cardState";

type DuelCardState = Extract<CardState, { kind: "duel" }>;

const OUTCOME_STYLE: Record<AnswerOutcome, string> = { correct: "text-[var(--k-teal)]", partial: "text-[var(--k-gold)]", incorrect: "text-[var(--k-ruby)]" };
const OUTCOME_MARK: Record<AnswerOutcome, string> = { correct: "✅", partial: "🟡", incorrect: "❌" };

/**
 * Mise en scène du Duel Kounouzi : face-à-face (VS), « X, à toi ! », puis
 * résultat clair. Les questions elles-mêmes passent par la carte question.
 * Seul le résultat relatif compte : aucun chrono, aucune vitesse.
 */
export function DuelCard({ state, profiles, card }: { readonly state: GameState; readonly profiles: readonly PlayerProfileDraft[]; readonly card: DuelCardState }) {
  const name = (id: string) => state.players.find((p) => p.id === id)?.displayName ?? "";
  const category = card.categoryId ? (categoryById(card.categoryId)?.label.fr ?? card.categoryId) : null;
  const subtitle = category ? t(DEFAULT_LOCALE, "duel.category", { category }) : t(DEFAULT_LOCALE, "cell.challenge");

  return (
    <CardShell cellType="challenge" title={`⚔ ${t(DEFAULT_LOCALE, "duel.title")}`} subtitle={subtitle} testId="duel-card">
      <div className="flex items-center justify-around gap-4 py-2" data-stage={card.stage}>
        <PlayerFace state={state} profiles={profiles} playerId={card.challengerId} size="lg" highlight={card.stage === "turn" ? card.duelistId === card.challengerId : card.winnerId === card.challengerId} />
        <motion.span initial={{ scale: 0.4, rotate: -12, opacity: 0 }} animate={{ scale: 1, rotate: 0, opacity: 1 }} transition={{ type: "spring", stiffness: 260, damping: 14 }} className="text-4xl font-black text-[var(--k-ruby)]">
          {t(DEFAULT_LOCALE, "duel.vs")}
        </motion.span>
        <PlayerFace state={state} profiles={profiles} playerId={card.opponentId} size="lg" highlight={card.stage === "turn" ? card.duelistId === card.opponentId : card.winnerId === card.opponentId} />
      </div>

      {card.stage === "intro" ? (
        <p className="text-center text-xl font-bold" data-testid="duel-intro">
          {t(DEFAULT_LOCALE, "duel.challenge", { name: name(card.challengerId), opponent: name(card.opponentId) })}
        </p>
      ) : null}
      {card.stage === "turn" && card.duelistId ? (
        <motion.p initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="text-center text-2xl font-black" data-testid="duel-turn">
          {t(DEFAULT_LOCALE, "duel.yourTurn", { name: name(card.duelistId) })}
        </motion.p>
      ) : null}
      {card.stage === "result" && card.challengerOutcome && card.opponentOutcome ? (
        <div className="flex flex-col gap-3" data-testid="duel-result">
          <dl className="grid grid-cols-2 gap-2 text-center">
            {(
              [
                [card.challengerId, card.challengerOutcome],
                [card.opponentId, card.opponentOutcome],
              ] as const
            ).map(([id, outcome]) => (
              <div key={id} className="rounded-2xl bg-[var(--k-sand)] px-3 py-2">
                <dt className="text-xs font-bold uppercase tracking-wider text-[var(--k-ink-soft)]">{name(id)}</dt>
                <dd className={`text-lg font-black ${OUTCOME_STYLE[outcome]}`}>
                  {OUTCOME_MARK[outcome]} {t(DEFAULT_LOCALE, `duel.outcome.${outcome}`)}
                </dd>
              </div>
            ))}
          </dl>
          <motion.p initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 240, damping: 16 }} className="text-center text-2xl font-black text-[var(--k-teal)]" data-testid="duel-verdict">
            {card.winnerId ? t(DEFAULT_LOCALE, "duel.result.win", { name: name(card.winnerId) }) : t(DEFAULT_LOCALE, "duel.result.draw")}
          </motion.p>
        </div>
      ) : null}
      <p className="text-center text-xs text-[var(--k-ink-soft)]">{t(DEFAULT_LOCALE, "duel.hint")}</p>
    </CardShell>
  );
}
