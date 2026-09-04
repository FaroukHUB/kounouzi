"use client";

import { motion } from "motion/react";
import { useEffect } from "react";
import { challengeById, playerAge, recitationById, variantFor, type ChallengeSkipReason, type GameState } from "@/core/game";
import type { NarrationService } from "@/experience/narration";
import { DEFAULT_LOCALE, t } from "@/i18n";
import { Button } from "@/ui/primitives/Button";
import { CELL_STYLE } from "@/ui/board/cellStyles";
import { CardShell } from "./CardShell";
import { CardAnimation } from "./animations/CardAnimation";
import { servedFor, type CardState } from "./cardState";

type ChallengeCardState = Extract<CardState, { kind: "challenge" }>;

export interface ChallengeCardProps {
  readonly state: GameState;
  readonly card: ChallengeCardState;
  readonly narrator: NarrationService;
  readonly reduced: boolean;
  readonly onUpdate: (patch: Partial<ChallengeCardState>) => void;
  readonly onAccept: () => void;
  readonly onComplete: (success: boolean) => void;
  readonly onSkip: (reason: ChallengeSkipReason) => void;
}

/**
 * Carte Défi famille : « OH NOOON… » (cartes ohNo) → révélation animée selon
 * `animationKey` → J'accepte / Je passe (+ « Pas d'accord » pour un défi de
 * contact) → Réussi / Raté décidé par la tablée → résultat → gain affiché.
 * Aucun chrono imposé ; la définition vient des DONNÉES de la partie.
 */
export function ChallengeCard({ state, card, narrator, reduced, onUpdate, onAccept, onComplete, onSkip }: ChallengeCardProps) {
  const definition = challengeById(state, card.challengeId);
  const player = state.players.find((p) => p.id === card.playerId);
  const live = servedFor(state, card.requestId);
  const question = live.served ?? card.question ?? null;
  const step = card.step;

  useEffect(() => {
    if (live.served && !card.question) onUpdate({ question: live.served });
  }, [live.served, card.question, onUpdate]);

  // Narration courte, jamais bloquante : le texte du défi à la révélation, la question quand elle est figée.
  useEffect(() => {
    if (!definition) return;
    if (step === "reveal") narrator.speak({ text: definition.text, lang: "fr", important: true });
    if (step === "accepted" && question) narrator.speak({ text: t(DEFAULT_LOCALE, "narration.question", { prompt: question.prompt.fr }), lang: "fr", important: true });
  }, [step, definition, question, narrator]);

  if (!definition || !player) return null;
  const age = playerAge(player);
  const variant = variantFor(definition, age);
  const category = t(DEFAULT_LOCALE, `challenge.category.${definition.category}`);
  const subtitle = `${category}${definition.boss ? " · BOSS" : ""}`;

  if (step === "ohno") {
    return (
      <CardShell cellType="challenge" title={t(DEFAULT_LOCALE, "challenge.title")} subtitle={subtitle} testId="challenge-card" tall>
        <motion.p
          data-testid="challenge-ohno"
          initial={{ scale: 0.5, rotate: -6, opacity: 0 }}
          animate={reduced ? { scale: 1, rotate: 0, opacity: 1 } : { scale: [0.5, 1.15, 1], rotate: [-6, 3, 0], opacity: 1 }}
          transition={{ duration: reduced ? 0 : 0.6, ease: "easeOut" }}
          className="font-display py-10 text-center text-5xl font-black text-[var(--k-ruby)]"
        >
          {t(DEFAULT_LOCALE, "challenge.ohNo")}
        </motion.p>
      </CardShell>
    );
  }

  return (
    <CardShell cellType="challenge" title={definition.title} subtitle={subtitle} testId="challenge-card">
      <div data-testid="challenge-step" data-step={step} hidden />
      {step === "reveal" || step === "accepted" ? <CardAnimation animationKey={definition.animationKey} reduced={reduced} accent={CELL_STYLE.challenge.accent} /> : null}
      <p className="text-center text-sm font-semibold text-[var(--k-ink-soft)]">{t(DEFAULT_LOCALE, "challenge.for", { name: player.displayName })}</p>
      <p className="text-[clamp(1.2rem,3vw,1.6rem)] font-bold leading-snug" data-testid="challenge-text">
        {definition.text}
      </p>
      {card.surahIds && card.surahIds.length > 0 ? (
        <ul className="flex flex-col gap-2" data-testid="challenge-recitation">
          {card.surahIds.map((id) => {
            const surah = recitationById(state, id);
            return surah ? (
              <li key={id} className="rounded-2xl bg-[var(--k-sand)] px-4 py-3 text-lg font-bold">
                {t(DEFAULT_LOCALE, "challenge.recite", { fr: surah.nameFr, ar: surah.nameAr })}
              </li>
            ) : null;
          })}
          <li className="text-xs text-[var(--k-ink-soft)]">{t(DEFAULT_LOCALE, "challenge.recitation.hint")}</li>
        </ul>
      ) : null}
      {variant ? (
        <p className="rounded-2xl bg-[var(--k-sand)] px-4 py-2 font-semibold" data-testid="challenge-variant">
          {t(DEFAULT_LOCALE, "challenge.variant", { text: variant.text })}
        </p>
      ) : definition.adaptation ? (
        <p className="text-sm text-[var(--k-ink-soft)]" data-testid="challenge-adaptation">
          {definition.adaptation}
        </p>
      ) : null}
      <p className="text-center text-lg font-black text-[var(--k-teal)]" data-testid="challenge-stake">
        {definition.reward > 0 ? t(DEFAULT_LOCALE, "challenge.reward", { amount: definition.reward }) : t(DEFAULT_LOCALE, "challenge.rewardNone")}
      </p>
      {definition.consentRequired ? (
        <p className="rounded-2xl border border-[var(--k-gold)] px-4 py-2 text-sm" data-testid="challenge-consent">
          {t(DEFAULT_LOCALE, "challenge.consent")}
        </p>
      ) : null}

      {step === "reveal" ? (
        <div className="flex flex-col gap-2">
          <div className="grid grid-cols-2 gap-2">
            <Button size="lg" onClick={onAccept} data-testid="challenge-accept">
              {t(DEFAULT_LOCALE, "challenge.accept")}
            </Button>
            <Button size="lg" variant="secondary" onClick={() => onSkip("declined")} data-testid="challenge-skip">
              {t(DEFAULT_LOCALE, "challenge.skip")}
            </Button>
          </div>
          {definition.consentRequired ? (
            <Button size="lg" variant="secondary" onClick={() => onSkip("consent_refused")} data-testid="challenge-consent-refused">
              {t(DEFAULT_LOCALE, "challenge.consentRefused")}
            </Button>
          ) : null}
          <p className="text-center text-xs text-[var(--k-ink-soft)]">{t(DEFAULT_LOCALE, "challenge.skipHint")}</p>
        </div>
      ) : null}

      {step === "accepted" ? (
        <div className="flex flex-col gap-3">
          {definition.contentRef?.kind === "validated_question" ? (
            <section className="rounded-2xl bg-white/70 px-4 py-3" data-testid="challenge-question">
              {question ? (
                <>
                  <p className="text-lg font-bold" data-testid="challenge-question-prompt">
                    {question.prompt.fr}
                  </p>
                  <p className="text-xs text-[var(--k-ink-soft)]">{t(DEFAULT_LOCALE, "challenge.question.hint")}</p>
                </>
              ) : (
                <p className="text-[var(--k-ink-soft)]">{t(DEFAULT_LOCALE, "challenge.question.pending")}</p>
              )}
            </section>
          ) : null}
          <p className="font-semibold">{t(DEFAULT_LOCALE, "challenge.validate")}</p>
          <div className="grid grid-cols-2 gap-2">
            <Button size="lg" onClick={() => onComplete(true)} data-testid="challenge-success" disabled={definition.contentRef?.kind === "validated_question" && !question}>
              {t(DEFAULT_LOCALE, "challenge.success")}
            </Button>
            <Button size="lg" variant="secondary" onClick={() => onComplete(false)} data-testid="challenge-failure">
              {t(DEFAULT_LOCALE, "challenge.failure")}
            </Button>
          </div>
        </div>
      ) : null}

      {step === "submitted" ? <p className="text-[var(--k-ink-soft)]">…</p> : null}

      {step === "result" ? (
        <motion.p initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center text-2xl font-black" data-testid="challenge-result">
          {card.skipped ? t(DEFAULT_LOCALE, "challenge.result.skipped") : card.success ? t(DEFAULT_LOCALE, "challenge.result.success") : t(DEFAULT_LOCALE, "challenge.result.failure")}
        </motion.p>
      ) : null}

      {step === "reward" ? (
        <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 260, damping: 18 }} className="text-center" data-testid="challenge-reward">
          <span className="text-5xl font-black text-[var(--k-teal)]">{t(DEFAULT_LOCALE, "card.reward", { amount: card.rewardAmount ?? 0 })}</span>
        </motion.div>
      ) : null}
    </CardShell>
  );
}
