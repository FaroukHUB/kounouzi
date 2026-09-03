"use client";

import { useEffect } from "react";
import type { GameState } from "@/core/game";
import type { NarrationService } from "@/experience/narration";
import { DEFAULT_LOCALE, t, type DictionaryKey } from "@/i18n";
import { dictionaries } from "@/i18n";
import { Button } from "@/ui/primitives/Button";
import { CardShell } from "./CardShell";
import type { CardState } from "./cardState";

type ChoiceCardState = Extract<CardState, { kind: "choice" }>;

const known = (key: string): key is DictionaryKey => key in dictionaries.fr;

/** Libellé d'un scénario ou d'une option de démonstration (données d'interface, repli sur l'identifiant). */
export const scenarioTitle = (scenarioId: string): string => (known(`scenario.${scenarioId}`) ? t(DEFAULT_LOCALE, `scenario.${scenarioId}` as DictionaryKey) : scenarioId);
export const optionLabel = (optionId: string): string => (known(`scenario.option.${optionId}`) ? t(DEFAULT_LOCALE, `scenario.option.${optionId}` as DictionaryKey) : optionId);

export function ChoiceCard({ state, card, narrator, onChoose }: { readonly state: GameState; readonly card: ChoiceCardState; readonly narrator: NarrationService; readonly onChoose: (optionId: string) => void }) {
  const cellType = state.phase.kind === "awaiting_choice" ? (state.config.board.cells[state.players[state.activePlayerIndex]?.position ?? 0]?.type ?? "management") : "management";
  const title = scenarioTitle(card.choiceId);
  useEffect(() => {
    if (card.step === "offer") narrator.speak({ text: title, lang: "fr", important: true });
  }, [card.step, title, narrator]);
  return (
    <CardShell cellType={cellType} title={title} subtitle={t(DEFAULT_LOCALE, `cell.${cellType}`)} testId="choice-card">
      <p className="font-semibold">{t(DEFAULT_LOCALE, "scenario.choose")}</p>
      <div className="flex flex-col gap-2">
        {card.optionIds.map((id) => (
          <Button key={id} size="lg" variant="secondary" onClick={() => onChoose(id)} disabled={card.step !== "offer"} data-testid={`choose-${id}`}>
            {optionLabel(id)}
          </Button>
        ))}
      </div>
    </CardShell>
  );
}
