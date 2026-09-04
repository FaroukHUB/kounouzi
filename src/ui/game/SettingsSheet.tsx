"use client";

import { CHALLENGE_TOGGLES, type ChallengeSettings } from "@/core/game";
import { DEFAULT_LOCALE, t } from "@/i18n";
import { NARRATION_RATES, useSessionStore } from "@/state/sessionStore";
import { Button } from "@/ui/primitives/Button";

export interface SettingsSheetProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly narrationSupported: boolean;
  readonly onReplay: () => void;
  readonly paused: boolean;
  readonly onTogglePause: () => void;
  readonly endRequested: boolean;
  readonly onRequestEnd: () => void;
  /** Réglages parents des Défis famille de la partie (`null` : aucune banque dans cette partie). */
  readonly challengeSettings: ChallengeSettings | null;
  readonly onChallengeSettings: (settings: ChallengeSettings) => void;
}

/** Réglages d'expérience (préférences locales). Aucune règle de jeu. */
export function SettingsSheet(props: SettingsSheetProps) {
  const s = useSessionStore();
  if (!props.open) return null;
  const reducedValue = s.reducedMotion === null ? "system" : s.reducedMotion ? "on" : "off";
  return (
    <div className="absolute inset-0 z-40 flex items-end justify-center bg-[var(--k-ink)]/50 p-3 sm:items-center" role="dialog" aria-modal="true" aria-labelledby="settings-title">
      <div className="w-full max-w-md rounded-3xl bg-white p-5 shadow-2xl">
        <div className="flex items-center justify-between">
          <h2 id="settings-title" className="text-xl font-bold">
            {t(DEFAULT_LOCALE, "settings.title")}
          </h2>
          <Button variant="ghost" onClick={props.onClose}>
            {t(DEFAULT_LOCALE, "common.close")}
          </Button>
        </div>

        <div className="mt-4 flex flex-col gap-4">
          <label className="flex items-center justify-between gap-3">
            <span>{t(DEFAULT_LOCALE, "settings.reducedMotion")}</span>
            <select className="min-h-11 rounded-xl border px-3" value={reducedValue} onChange={(e) => s.setReducedMotion(e.target.value === "system" ? null : e.target.value === "on")}>
              <option value="system">{t(DEFAULT_LOCALE, "settings.reducedMotion.system")}</option>
              <option value="on">✓</option>
              <option value="off">✗</option>
            </select>
          </label>

          <label className="flex items-center justify-between gap-3">
            <span>{t(DEFAULT_LOCALE, "settings.narration")}</span>
            <input type="checkbox" className="size-6" checked={s.narrationEnabled} onChange={(e) => s.setNarrationEnabled(e.target.checked)} />
          </label>
          {!props.narrationSupported ? <p className="text-sm text-[var(--k-ink-soft)]">{t(DEFAULT_LOCALE, "settings.narration.unsupported")}</p> : null}

          <label className="flex items-center justify-between gap-3">
            <span>{t(DEFAULT_LOCALE, "settings.narrationRate")}</span>
            <select className="min-h-11 rounded-xl border px-3" value={s.narrationRate} onChange={(e) => s.setNarrationRate(e.target.value as (typeof NARRATION_RATES)[number])}>
              {NARRATION_RATES.map((r) => (
                <option key={r} value={r}>
                  {t(DEFAULT_LOCALE, `rate.${r}`)}
                </option>
              ))}
            </select>
          </label>

          <Button variant="secondary" onClick={props.onReplay} disabled={!props.narrationSupported || !s.narrationEnabled}>
            {t(DEFAULT_LOCALE, "settings.replay")}
          </Button>

          <label className="flex items-center justify-between gap-3">
            <span>{t(DEFAULT_LOCALE, "settings.preciseTimer")}</span>
            <input type="checkbox" className="size-6" checked={s.preciseTimer} onChange={(e) => s.setPreciseTimer(e.target.checked)} />
          </label>

          {props.challengeSettings ? (
            <fieldset className="flex flex-col gap-2 border-t pt-4" data-testid="challenge-settings">
              <legend className="font-semibold">{t(DEFAULT_LOCALE, "settings.challenges.title")}</legend>
              {CHALLENGE_TOGGLES.map((toggle) => (
                <label key={toggle} className="flex items-center justify-between gap-3 text-sm">
                  <span>{t(DEFAULT_LOCALE, `settings.challenges.${toggle}`)}</span>
                  <input type="checkbox" className="size-6" checked={props.challengeSettings![toggle]} onChange={(e) => props.onChallengeSettings({ ...props.challengeSettings!, [toggle]: e.target.checked })} data-testid={`challenge-toggle-${toggle}`} />
                </label>
              ))}
            </fieldset>
          ) : null}

          <div className="flex gap-2 border-t pt-4">
            <Button variant="secondary" className="flex-1" onClick={props.onTogglePause}>
              {props.paused ? t(DEFAULT_LOCALE, "game.resume") : t(DEFAULT_LOCALE, "game.pause")}
            </Button>
            <Button variant="danger" className="flex-1" onClick={props.onRequestEnd} disabled={props.endRequested}>
              {t(DEFAULT_LOCALE, "game.endRequest")}
            </Button>
          </div>
          {props.endRequested ? <p className="text-sm text-[var(--k-ink-soft)]">{t(DEFAULT_LOCALE, "game.endRequested")}</p> : null}
        </div>
      </div>
    </div>
  );
}
