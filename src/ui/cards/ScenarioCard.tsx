"use client";

import { useEffect } from "react";
import type { NarrationService } from "@/experience/narration";
import { DEFAULT_LOCALE, t } from "@/i18n";
import { CardShell } from "./CardShell";
import { scenarioTitle } from "./ChoiceCard";
import type { CardState } from "./cardState";

type ScenarioCardState = Extract<CardState, { kind: "scenario" }>;

/** Révélation brève d'un scénario automatique (le résultat — argent, effet — est projeté par la file). */
export function ScenarioCard({ card, narrator }: { readonly card: ScenarioCardState; readonly narrator: NarrationService }) {
  const title = scenarioTitle(card.scenarioId);
  useEffect(() => {
    narrator.speak({ text: title, lang: "fr", important: true });
  }, [title, narrator]);
  return (
    <CardShell cellType={card.cellType} title={t(DEFAULT_LOCALE, `cell.${card.cellType}`)} testId="scenario-card">
      <p className="text-center text-2xl font-black">{title}</p>
    </CardShell>
  );
}
