"use client";

import type { ResolvedBoard } from "@/core/game";
import { DEFAULT_LOCALE, t } from "@/i18n";
import { BoardLegend } from "@/ui/common/BoardLegend";
import { Pillars } from "@/ui/common/Pillars";
import { Button } from "@/ui/primitives/Button";

/** « Comment on joue » : les trois piliers et la légende des cases de CETTE partie. Aucun réglage, aucune règle inventée. */
export function HelpSheet({ open, onClose, board }: { readonly open: boolean; readonly onClose: () => void; readonly board: ResolvedBoard }) {
  if (!open) return null;
  return (
    <div className="absolute inset-0 z-40 flex items-end justify-center bg-[var(--k-ink)]/50 p-3 sm:items-center" role="dialog" aria-modal="true" aria-labelledby="help-title" data-testid="help-sheet">
      <div className="max-h-[86dvh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-5 shadow-2xl">
        <div className="flex items-center justify-between">
          <h2 id="help-title" className="text-xl font-bold">
            {t(DEFAULT_LOCALE, "help.title")}
          </h2>
          <Button variant="ghost" onClick={onClose}>
            {t(DEFAULT_LOCALE, "common.close")}
          </Button>
        </div>
        <div className="mt-4 flex flex-col gap-6">
          <Pillars />
          <BoardLegend board={board} />
        </div>
      </div>
    </div>
  );
}
