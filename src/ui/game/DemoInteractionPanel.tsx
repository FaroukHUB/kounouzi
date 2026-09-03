"use client";

import type { GameState } from "@/core/game";
import { DEFAULT_LOCALE, t } from "@/i18n";
import { Button } from "@/ui/primitives/Button";

/**
 * ⚠️ PANNEAU TECHNIQUE TEMPORAIRE (Phase 3). Affiché quand le moteur attend
 * une interaction de la Phase 4. Il sera supprimé avec le résolveur de
 * démonstration. Volontairement austère : ce n'est pas une règle du jeu.
 */
export function DemoInteractionPanel({ state, onResolve }: { readonly state: GameState; readonly onResolve: () => void }) {
  const kind = state.phase.kind;
  if (kind !== "awaiting_answer" && kind !== "awaiting_purchase" && kind !== "awaiting_choice") return null;
  return (
    <div className="flex size-full flex-col items-center justify-center gap-3 px-[6%] text-center" data-testid="demo-panel">
      <p className="rounded-md border border-dashed border-amber-500 bg-amber-50 px-2 py-1 font-mono text-[0.65rem] uppercase tracking-wider text-amber-800">{t(DEFAULT_LOCALE, "demo.title")}</p>
      <p className="text-[clamp(0.7rem,1.5vw,0.9rem)] text-[var(--k-ink-soft)]">{t(DEFAULT_LOCALE, `demo.phase.${kind}`)}</p>
      <p className="hidden text-xs text-[var(--k-ink-soft)] md:block">{t(DEFAULT_LOCALE, "demo.body")}</p>
      <Button variant="secondary" size="md" onClick={onResolve} data-testid="demo-resolve" className="font-mono text-xs">
        {t(DEFAULT_LOCALE, "demo.resolve")}
      </Button>
    </div>
  );
}
