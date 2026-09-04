"use client";

import { AnimatePresence, motion } from "motion/react";
import type { GameState } from "@/core/game";
import type { ChallengeSkipReason } from "@/core/game";
import type { AnswerOutcome, ExplanationMastery, PlayerId, ValidationMode } from "@/core/shared";
import type { PlayerProfileDraft } from "@/data/ports";
import type { NarrationService } from "@/experience/narration";
import { useUiStore } from "@/state/uiStore";
import { ChallengeCard } from "./ChallengeCard";
import { ChoiceCard } from "./ChoiceCard";
import { DuelCard } from "./DuelCard";
import { HaltCard } from "./HaltCard";
import { MonumentCard } from "./MonumentCard";
import { OpponentCard } from "./OpponentCard";
import { QuestionCard } from "./QuestionCard";
import { RecipientCard } from "./RecipientCard";
import { ScenarioCard } from "./ScenarioCard";
import type { CardState } from "./cardState";

export interface CardOverlayProps {
  readonly state: GameState;
  readonly profiles: readonly PlayerProfileDraft[];
  readonly narrator: NarrationService;
  readonly reduced: boolean;
  /** `playerId` = le joueur qui répond (joueur actif, ou dueliste en cours). */
  readonly onSubmitAnswer: (requestId: string, playerId: PlayerId, outcome: AnswerOutcome, mastery: ExplanationMastery, mode: ValidationMode) => void;
  readonly onDecidePurchase: (siteId: string, buy: boolean) => void;
  readonly onChoose: (choiceId: string, optionId: string) => void;
  readonly onChooseOpponent: (opponentId: PlayerId) => void;
  readonly onChooseRecipient: (recipientId: PlayerId) => void;
  readonly onAcceptChallenge: () => void;
  readonly onCompleteChallenge: (success: boolean) => void;
  readonly onSkipChallenge: (reason: ChallengeSkipReason) => void;
}

/** Couche des cartes au-dessus du plateau (le plateau se met légèrement en retrait). */
export function CardOverlay({ state, profiles, narrator, reduced, onSubmitAnswer, onDecidePurchase, onChoose, onChooseOpponent, onChooseRecipient, onAcceptChallenge, onCompleteChallenge, onSkipChallenge }: CardOverlayProps) {
  const card = useUiStore((s) => s.card);
  const updateCard = useUiStore((s) => s.updateCard);

  const render = (c: CardState) => {
    switch (c.kind) {
      case "question":
        return (
          <QuestionCard
            state={state}
            profiles={profiles}
            card={c}
            narrator={narrator}
            reduced={reduced}
            onUpdate={(patch) => updateCard(patch)}
            onSubmit={(outcome, mastery, mode) => {
              updateCard({ step: "submitted" });
              onSubmitAnswer(c.requestId, c.playerId, outcome, mastery, mode);
            }}
          />
        );
      case "monument":
        return (
          <MonumentCard
            state={state}
            card={c}
            narrator={narrator}
            onDecide={(buy) => {
              updateCard({ step: "submitted" });
              onDecidePurchase(c.siteId, buy);
            }}
          />
        );
      case "choice":
        return (
          <ChoiceCard
            state={state}
            card={c}
            narrator={narrator}
            onChoose={(optionId) => {
              updateCard({ step: "submitted" });
              onChoose(c.choiceId, optionId);
            }}
          />
        );
      case "scenario":
        return <ScenarioCard card={c} narrator={narrator} />;
      case "opponent":
        return (
          <OpponentCard
            state={state}
            profiles={profiles}
            card={c}
            narrator={narrator}
            onChoose={(opponentId) => {
              updateCard({ step: "submitted" });
              onChooseOpponent(opponentId);
            }}
          />
        );
      case "recipient":
        return (
          <RecipientCard
            state={state}
            profiles={profiles}
            card={c}
            narrator={narrator}
            onChoose={(recipientId) => {
              updateCard({ step: "submitted" });
              onChooseRecipient(recipientId);
            }}
          />
        );
      case "duel":
        return <DuelCard state={state} profiles={profiles} card={c} />;
      case "halt":
        return <HaltCard />;
      case "challenge":
        return (
          <ChallengeCard
            state={state}
            card={c}
            narrator={narrator}
            reduced={reduced}
            onUpdate={(patch) => updateCard(patch)}
            onAccept={onAcceptChallenge}
            onComplete={(success) => {
              updateCard({ step: "submitted" });
              onCompleteChallenge(success);
            }}
            onSkip={(reason) => {
              updateCard({ step: "submitted" });
              onSkipChallenge(reason);
            }}
          />
        );
    }
  };

  return (
    <AnimatePresence>
      {card ? (
        <motion.div key="overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="absolute inset-0 z-30 flex items-center justify-center bg-[var(--k-ink)]/45 p-3" data-testid="card-overlay">
          {render(card)}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
