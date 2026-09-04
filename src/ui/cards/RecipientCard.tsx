"use client";

import { useEffect } from "react";
import type { GameState } from "@/core/game";
import type { PlayerId } from "@/core/shared";
import type { PlayerProfileDraft } from "@/data/ports";
import type { NarrationService } from "@/experience/narration";
import { DEFAULT_LOCALE, t } from "@/i18n";
import { CardShell } from "./CardShell";
import { PlayerFace } from "./PlayerFace";
import type { CardState } from "./cardState";

type RecipientCardState = Extract<CardState, { kind: "recipient" }>;

/** Partage, cadeau, don : le joueur actif choisit à qui donner. */
export function RecipientCard({ state, profiles, card, narrator, onChoose }: { readonly state: GameState; readonly profiles: readonly PlayerProfileDraft[]; readonly card: RecipientCardState; readonly narrator: NarrationService; readonly onChoose: (recipientId: PlayerId) => void }) {
  const name = state.players.find((p) => p.id === card.playerId)?.displayName ?? "";
  const prompt = t(DEFAULT_LOCALE, "recipient.prompt", { name, amount: card.amount });
  const cellType = card.reason === "gift" ? "event" : "solidarity";
  useEffect(() => {
    if (card.step === "offer") narrator.speak({ text: prompt, lang: "fr", important: true });
  }, [card.step, prompt, narrator]);
  return (
    <CardShell cellType={cellType} title={t(DEFAULT_LOCALE, "recipient.title")} subtitle={t(DEFAULT_LOCALE, card.reason === "gift" ? "recipient.reason.gift" : "recipient.reason.solidarity")} testId="recipient-card">
      <p className="text-center text-xl font-bold">{prompt}</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {card.candidates.map((id) => (
          <button key={id} type="button" disabled={card.step !== "offer"} onClick={() => onChoose(id)} className="flex min-h-24 items-center justify-center rounded-2xl border border-[var(--k-line)] bg-white p-2 active:scale-95" data-testid={`recipient-${id}`}>
            <PlayerFace state={state} profiles={profiles} playerId={id} />
          </button>
        ))}
      </div>
    </CardShell>
  );
}
