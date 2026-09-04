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

type OpponentCardState = Extract<CardState, { kind: "opponent" }>;

/** Le joueur actif choisit son adversaire — la seule décision stratégique du Duel (jamais la question ni la difficulté). */
export function OpponentCard({ state, profiles, card, narrator, onChoose }: { readonly state: GameState; readonly profiles: readonly PlayerProfileDraft[]; readonly card: OpponentCardState; readonly narrator: NarrationService; readonly onChoose: (opponentId: PlayerId) => void }) {
  const name = state.players.find((p) => p.id === card.challengerId)?.displayName ?? "";
  const prompt = t(DEFAULT_LOCALE, "duel.choose", { name });
  useEffect(() => {
    if (card.step === "offer") narrator.speak({ text: prompt, lang: "fr", important: true });
  }, [card.step, prompt, narrator]);
  return (
    <CardShell cellType="challenge" title={`⚔ ${t(DEFAULT_LOCALE, "duel.title")}`} subtitle={t(DEFAULT_LOCALE, "cell.challenge")} testId="opponent-card">
      <p className="text-center text-xl font-bold">{prompt}</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {card.candidates.map((id) => (
          <button key={id} type="button" disabled={card.step !== "offer"} onClick={() => onChoose(id)} className="flex min-h-24 items-center justify-center rounded-2xl border border-[var(--k-line)] bg-white p-2 active:scale-95" data-testid={`opponent-${id}`}>
            <PlayerFace state={state} profiles={profiles} playerId={id} />
          </button>
        ))}
      </div>
      <p className="text-center text-xs text-[var(--k-ink-soft)]">{t(DEFAULT_LOCALE, "duel.hint")}</p>
    </CardShell>
  );
}
