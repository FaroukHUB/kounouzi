"use client";

import { useEffect, useState } from "react";
import type { GameState, MoneyDestination } from "@/core/game";
import type { PlayerId } from "@/core/shared";
import type { PlayerProfileDraft } from "@/data/ports";
import type { NarrationService } from "@/experience/narration";
import { DEFAULT_LOCALE, t } from "@/i18n";
import { Button } from "@/ui/primitives/Button";
import { CellIcon } from "@/ui/board/CellIcon";
import { CardShell } from "./CardShell";
import { PlayerFace } from "./PlayerFace";
import type { CardState } from "./cardState";

type DonationCardState = Extract<CardState, { kind: "donation" }>;

/**
 * Case Don : un don VOLONTAIRE (jamais une Zakat). Le joueur choisit un
 * montant parmi ceux des règles qu'il peut payer, puis une destination : la
 * Caisse Masākīn (des Kounouz qui n'appartiennent plus à personne) ou un
 * autre joueur. Tout passe par le grand livre.
 */
export function DonationCard({ state, profiles, card, narrator, onDonate }: { readonly state: GameState; readonly profiles: readonly PlayerProfileDraft[]; readonly card: DonationCardState; readonly narrator: NarrationService; readonly onDonate: (amount: number, to: MoneyDestination) => void }) {
  const name = state.players.find((p) => p.id === card.playerId)?.displayName ?? "";
  const [amount, setAmount] = useState<number | null>(card.amounts.length === 1 ? (card.amounts[0] ?? null) : null);
  useEffect(() => {
    if (card.step === "offer") narrator.speak({ text: t(DEFAULT_LOCALE, "narration.donation.offer", { name }), lang: "fr", important: true });
  }, [card.step, name, narrator]);
  const disabled = card.step !== "offer";
  return (
    <CardShell cellType="donation" title={t(DEFAULT_LOCALE, "donation.title")} subtitle={t(DEFAULT_LOCALE, "donation.subtitle")} testId="donation-card">
      <p className="text-center text-xl font-bold">{t(DEFAULT_LOCALE, "donation.prompt", { name })}</p>
      <div className="grid grid-cols-4 gap-2" data-testid="donation-amounts">
        {card.amounts.map((a) => (
          <Button key={a} size="lg" variant={amount === a ? "primary" : "secondary"} disabled={disabled} onClick={() => setAmount(a)} data-testid={`donation-amount-${a}`} aria-pressed={amount === a}>
            {a}
          </Button>
        ))}
      </div>
      {amount !== null ? (
        <>
          <p className="font-semibold">{t(DEFAULT_LOCALE, "donation.destination")}</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3" data-testid="donation-destinations">
            <button type="button" disabled={disabled} onClick={() => onDonate(amount, { kind: "masakin" })} className="flex min-h-24 flex-col items-center justify-center gap-1 rounded-2xl border-2 border-[var(--k-teal)] bg-white p-2 active:scale-95" data-testid="donation-to-fund">
              <span className="flex size-10 items-center justify-center rounded-full bg-[var(--k-teal)] text-white">
                <CellIcon type="donation" className="size-6" />
              </span>
              <span className="text-sm font-bold">{t(DEFAULT_LOCALE, "donation.toFund")}</span>
              <span className="text-[0.65rem] text-[var(--k-ink-soft)]">{t(DEFAULT_LOCALE, "donation.toFund.hint")}</span>
            </button>
            {card.candidates.map((id) => (
              <button key={id} type="button" disabled={disabled} onClick={() => onDonate(amount, { kind: "player", playerId: id as PlayerId })} className="flex min-h-24 items-center justify-center rounded-2xl border border-[var(--k-line)] bg-white p-2 active:scale-95" data-testid={`donation-to-${id}`}>
                <PlayerFace state={state} profiles={profiles} playerId={id} />
              </button>
            ))}
          </div>
        </>
      ) : null}
    </CardShell>
  );
}
