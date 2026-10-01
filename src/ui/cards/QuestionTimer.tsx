"use client";

import { useEffect, useState } from "react";
import { DEFAULT_LOCALE, t } from "@/i18n";

export interface QuestionTimerProps {
  /** Secondes accordées (donnée, selon le profil du répondant). */
  readonly seconds: number;
  /** En dessous de ce seuil, le chronomètre alerte. */
  readonly warnAtSeconds: number;
  /** Le compte à rebours n'avance que pendant qu'on cherche la réponse. */
  readonly running: boolean;
}

/**
 * LE CHRONOMÈTRE D'UNE QUESTION.
 *
 * Il mesure, il ne juge pas : à zéro il s'arrête et le dit, la réponse reste
 * possible et la validation reste celle de la tablée. Il n'envoie aucune
 * commande au moteur et n'entre pas dans l'état de la partie — une partie
 * reprise ne dépend donc jamais de lui. Durées et seuil d'alerte sont des
 * données (`question-timer.v1.json`).
 *
 * Remis à zéro par le `key` de l'appelant (une question = un chronomètre).
 */
export function QuestionTimer({ seconds, warnAtSeconds, running }: QuestionTimerProps) {
  const [restant, setRestant] = useState(seconds);
  useEffect(() => {
    if (!running) return undefined;
    const minuterie = setInterval(() => setRestant((r) => (r <= 0 ? 0 : r - 1)), 1000);
    return () => clearInterval(minuterie);
  }, [running]);

  const ecoule = restant <= 0;
  const alerte = !ecoule && restant <= warnAtSeconds;
  const part = seconds > 0 ? Math.max(0, Math.min(1, restant / seconds)) : 0;
  const couleur = ecoule ? "var(--k-ruby)" : alerte ? "var(--k-amber)" : "var(--k-teal)";

  return (
    <div className="flex items-center gap-3" data-testid="question-timer" data-remaining={restant} data-expired={ecoule ? "true" : "false"}>
      <span className="text-sm font-black tabular-nums" style={{ color: couleur }} role="timer" aria-label={t(DEFAULT_LOCALE, "timer.label", { seconds: restant })}>
        {ecoule ? t(DEFAULT_LOCALE, "timer.expired") : t(DEFAULT_LOCALE, "timer.remaining", { seconds: restant })}
      </span>
      <span className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--k-sand)]" aria-hidden="true">
        <span className="block h-full rounded-full transition-[width] duration-1000 ease-linear" style={{ width: `${part * 100}%`, backgroundColor: couleur }} />
      </span>
    </div>
  );
}
