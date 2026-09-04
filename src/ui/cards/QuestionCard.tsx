"use client";

import { motion } from "motion/react";
import { useEffect } from "react";
import { categoryById } from "@/config/content";
import type { CellType, GameState } from "@/core/game";
import type { AnswerOutcome, ExplanationMastery, ValidationMode } from "@/core/shared";
import type { PlayerProfileDraft } from "@/data/ports";
import type { NarrationService } from "@/experience/narration";
import { DEFAULT_LOCALE, t } from "@/i18n";
import { Bidi } from "@/ui/primitives/Bidi";
import { Button } from "@/ui/primitives/Button";
import { CardShell } from "./CardShell";
import { LongPressButton } from "./LongPressButton";
import { siteDisplayName } from "./MonumentCard";
import { servedFor, type CardState } from "./cardState";

type QuestionCardState = Extract<CardState, { kind: "question" }>;

export interface QuestionCardProps {
  readonly state: GameState;
  /** Conservé pour l'affichage futur (profil) ; la question vient de l'état, jamais d'une nouvelle résolution. */
  readonly profiles: readonly PlayerProfileDraft[];
  readonly card: QuestionCardState;
  readonly narrator: NarrationService;
  readonly reduced: boolean;
  readonly onUpdate: (patch: Partial<QuestionCardState>) => void;
  readonly onSubmit: (outcome: AnswerOutcome, mastery: ExplanationMastery, mode: ValidationMode) => void;
}

/**
 * La carte question : touche → tourbillon → retournement → question →
 * réponse orale → révélation (appui long) → Correct / Presque / Incorrect
 * (collectif, ou auto-évaluation explicite) → explication FR puis AR →
 * « connaissais-tu déjà ? » → envoi au moteur → résultat → récompense.
 */
const PURPOSE_CELL: Record<QuestionCardState["purpose"], CellType> = { standard: "question", halt: "halt", heritage_visit: "heritage", duel: "challenge" };

export function QuestionCard({ state, profiles, card, narrator, reduced, onUpdate, onSubmit }: QuestionCardProps) {
  void profiles;
  // La question affichée est celle FIGÉE dans l'état (question simple ou tour de Duel) : reprise exacte quel que soit le contenu.
  // Une fois la réponse envoyée, l'état réel est déjà passé à la suite : la carte garde son instantané pour le résultat et la récompense.
  const live = servedFor(state, card.requestId);
  const question = live.served ?? card.question ?? null;
  const pendingServe = live.pending && !card.question;
  const category = question ? categoryById(question.categoryId) : undefined;
  const responder = state.players.find((p) => p.id === card.playerId)?.displayName ?? "";
  const title = card.purpose === "duel" ? t(DEFAULT_LOCALE, "duel.yourTurn", { name: responder }) : card.purpose === "halt" ? t(DEFAULT_LOCALE, "halt.challenge") : card.purpose === "heritage_visit" ? t(DEFAULT_LOCALE, "visit.title") : (category?.label.fr ?? t(DEFAULT_LOCALE, "cell.question"));
  const cellType = PURPOSE_CELL[card.purpose];
  const visit = state.phase.kind === "awaiting_answer" && state.phase.purpose.kind === "heritage_visit" ? state.phase.purpose : null;
  const ownerName = visit ? (state.players.find((p) => p.id === visit.ownerId)?.displayName ?? "") : "";
  const contribution = state.config.rules.heritageVisit.contribution;
  const step = card.step;
  const intro =
    card.purpose === "heritage_visit" && visit ? (
      <div className="rounded-2xl bg-[var(--k-sand)] px-4 py-3 text-sm" data-testid="visit-intro">
        <p className="font-semibold">{t(DEFAULT_LOCALE, "visit.intro", { site: siteDisplayName(visit.siteId), owner: ownerName })}</p>
        <p className="text-[var(--k-ink-soft)]">{t(DEFAULT_LOCALE, "visit.stake", { correct: contribution.correct, partial: contribution.partial, incorrect: contribution.incorrect })}</p>
      </div>
    ) : card.purpose === "halt" ? (
      <p className="rounded-2xl bg-[var(--k-sand)] px-4 py-3 text-sm text-[var(--k-ink-soft)]" data-testid="halt-intro">
        {t(DEFAULT_LOCALE, "halt.challenge.hint")}
      </p>
    ) : null;

  useEffect(() => {
    if (live.served && !card.question) onUpdate({ question: live.served });
  }, [live.served, card.question, onUpdate]);

  // Narration coordonnée aux étapes (jamais bloquante pour le moteur).
  useEffect(() => {
    if (!question) return;
    if (step === "question") narrator.speak({ text: t(DEFAULT_LOCALE, "narration.question", { prompt: question.prompt.fr }), lang: "fr", important: true });
    if (step === "revealed") narrator.speak({ text: t(DEFAULT_LOCALE, "narration.answer", { answer: question.answer.fr }), lang: "fr", important: true });
    if (step === "explanation") {
      narrator.speak({ text: question.explanation.fr, lang: "fr", important: true });
      narrator.speak({ text: question.explanation.ar, lang: "ar" });
    }
    if (step === "result" && card.outcome) narrator.speak({ text: t(DEFAULT_LOCALE, `narration.result.${card.outcome}`), lang: "fr" });
    if (step === "reward" && card.rewardAmount) narrator.speak({ text: t(DEFAULT_LOCALE, "narration.reward", { amount: card.rewardAmount }), lang: "fr" });
  }, [step, question, narrator, card.outcome, card.rewardAmount]);

  if (!question) {
    if (pendingServe) return <CardShell cellType={cellType} title={title} testId="question-card"><p className="text-[var(--k-ink-soft)]">…</p></CardShell>;
    return (
      <CardShell cellType={cellType} title={title} testId="question-card">
        <p>{t(DEFAULT_LOCALE, "card.noQuestion")}</p>
        <Button variant="secondary" onClick={() => onSubmit("incorrect", "none", "collective")}>
          {t(DEFAULT_LOCALE, "card.noQuestion.skip")}
        </Button>
      </CardShell>
    );
  }

  if (step === "dealt" || step === "opening") {
    return (
      <motion.button
        type="button"
        data-testid="card-back"
        aria-label={t(DEFAULT_LOCALE, "card.touchToOpen")}
        className="flex h-[min(60vh,420px)] w-[min(70vw,300px)] flex-col items-center justify-center gap-3 rounded-[2rem] text-white shadow-2xl"
        style={{ backgroundColor: "var(--k-teal)", perspective: 1000 }}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={step === "opening" ? { rotate: reduced ? 0 : 360, scale: reduced ? 1 : [1, 1.15, 1], rotateY: 90, opacity: 1 } : { opacity: 1, scale: 1, rotate: 0 }}
        transition={{ duration: reduced ? 0 : 0.7, ease: "easeInOut" }}
        onAnimationComplete={() => {
          if (step === "opening") onUpdate({ step: "question" });
        }}
        onClick={() => {
          if (step === "dealt") onUpdate({ step: "opening" });
        }}
      >
        <span className="text-5xl font-black">?</span>
        <span className="text-sm font-semibold uppercase tracking-widest opacity-80">{title}</span>
        {card.purpose !== "standard" ? <span className="text-xs opacity-80">{category?.label.fr ?? ""}</span> : null}
        <span className="text-xs opacity-70">{t(DEFAULT_LOCALE, "card.touchToOpen")}</span>
      </motion.button>
    );
  }

  return (
    <CardShell cellType={cellType} title={title} subtitle={`${category?.label.fr ?? ""} · ${t(DEFAULT_LOCALE, "card.difficulty", { level: question.difficulty })}`} testId="question-card">
      {intro}
      <p className="text-[clamp(1.25rem,3vw,1.75rem)] font-bold leading-snug" data-testid="question-prompt">
        {question.prompt.fr}
      </p>

      {step === "question" ? (
        <>
          <p className="text-[var(--k-ink-soft)]">{t(DEFAULT_LOCALE, "card.answerAloud")}</p>
          <LongPressButton onComplete={() => onUpdate({ step: "revealed" })} hint={t(DEFAULT_LOCALE, "card.revealHint")}>
            {t(DEFAULT_LOCALE, "card.revealHold")}
          </LongPressButton>
        </>
      ) : null}

      {step !== "question" ? (
        <div className="rounded-2xl bg-[var(--k-sand)] px-4 py-3">
          <span className="block text-xs font-bold uppercase tracking-wider text-[var(--k-ink-soft)]">{t(DEFAULT_LOCALE, "card.answer")}</span>
          <span className="block text-2xl font-black" data-testid="question-answer">
            {question.answer.fr}
          </span>
        </div>
      ) : null}

      {step === "revealed" ? (
        <>
          <p className="font-semibold">{t(DEFAULT_LOCALE, "card.validation.title")}</p>
          <div className="grid grid-cols-3 gap-2" data-testid="validation">
            {(["correct", "partial", "incorrect"] as const).map((o) => (
              <Button key={o} size="lg" variant={o === "correct" ? "primary" : "secondary"} onClick={() => onUpdate({ step: "explanation", outcome: o })} data-testid={`validate-${o}`}>
                {t(DEFAULT_LOCALE, `card.validation.${o}`)}
              </Button>
            ))}
          </div>
          <label className="flex items-center gap-2 text-sm text-[var(--k-ink-soft)]">
            <input type="checkbox" className="size-5" checked={card.validationMode === "self"} onChange={(e) => onUpdate({ validationMode: e.target.checked ? "self" : "collective" })} data-testid="self-eval" />
            <span>
              {t(DEFAULT_LOCALE, "card.selfEval")} — {t(DEFAULT_LOCALE, "card.selfEval.hint")}
            </span>
          </label>
        </>
      ) : null}

      {step === "explanation" || step === "mastery" ? (
        <section className="flex flex-col gap-3" data-testid="explanation">
          <h3 className="font-bold">{t(DEFAULT_LOCALE, "card.explanation.title")}</h3>
          <p lang="fr">{question.explanation.fr}</p>
          <Bidi as="p" lang="ar" className="text-lg leading-relaxed">
            {question.explanation.ar}
          </Bidi>
          {question.sources.length > 0 ? (
            <p className="text-xs text-[var(--k-ink-soft)]">
              {t(DEFAULT_LOCALE, "card.source")} :{" "}
              {question.sources.map((s, i) => (
                <span key={i}>
                  {s.url ? (
                    <a href={s.url} target="_blank" rel="noreferrer" className="underline">
                      {s.title}
                    </a>
                  ) : (
                    s.title
                  )}
                  {s.author ? ` — ${s.author}` : ""}
                  {i < question.sources.length - 1 ? " ; " : ""}
                </span>
              ))}
            </p>
          ) : null}
        </section>
      ) : null}

      {step === "explanation" ? (
        <Button size="lg" onClick={() => (card.outcome === "correct" ? onUpdate({ step: "mastery" }) : onSubmit(card.outcome ?? "incorrect", "none", card.validationMode))} data-testid="explanation-next">
          {t(DEFAULT_LOCALE, "card.next")}
        </Button>
      ) : null}

      {step === "mastery" ? (
        <section className="flex flex-col gap-2" data-testid="mastery">
          <p className="font-semibold">{t(DEFAULT_LOCALE, "card.mastery.question")}</p>
          <div className="grid grid-cols-2 gap-2">
            {(["none", "fr", "ar", "both"] as const).map((m) => (
              <Button key={m} variant={m === "none" ? "secondary" : "primary"} onClick={() => onSubmit("correct", m, card.validationMode)} data-testid={`mastery-${m}`}>
                {t(DEFAULT_LOCALE, `card.mastery.${m}`)}
              </Button>
            ))}
          </div>
        </section>
      ) : null}

      {step === "submitted" ? <p className="text-[var(--k-ink-soft)]">…</p> : null}

      {step === "result" && card.outcome ? (
        <motion.p initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center text-2xl font-black" data-testid="result">
          {t(DEFAULT_LOCALE, `card.result.${card.outcome}`)}
        </motion.p>
      ) : null}

      {step === "reward" ? (
        <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 260, damping: 18 }} className="flex flex-col items-center gap-1 text-center" data-testid="reward">
          <span className="text-5xl font-black text-[var(--k-teal)]">{t(DEFAULT_LOCALE, "card.reward", { amount: card.rewardAmount ?? 0 })}</span>
          {card.multiplier && card.multiplier > 1 ? <span className="text-sm font-semibold text-[var(--k-gold)]">{t(DEFAULT_LOCALE, "card.reward.doubled")}</span> : null}
        </motion.div>
      ) : null}
    </CardShell>
  );
}
