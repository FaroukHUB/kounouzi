import type { ResolvedBoard } from "@/core/game";
import { DEFAULT_LOCALE, t } from "@/i18n";
import { CellIcon } from "@/ui/board/CellIcon";
import { CELL_STYLE } from "@/ui/board/cellStyles";

/**
 * La légende des cases, construite À PARTIR DU PLATEAU de la partie : elle ne
 * liste que les types réellement présents, dans l'ordre du chemin. Un plateau
 * différent produit donc une légende différente, sans rien à mettre à jour.
 */
export function BoardLegend({ board, className = "" }: { readonly board: ResolvedBoard; readonly className?: string }) {
  const types = [...new Set(board.cells.map((c) => c.type))];
  return (
    <section className={`w-full ${className}`} aria-labelledby="legend-title" data-testid="board-legend">
      <h2 id="legend-title" className="mb-2 text-sm font-semibold uppercase tracking-wide text-[var(--k-ink-soft)]">
        {t(DEFAULT_LOCALE, "help.legend.title")}
      </h2>
      <ul className="flex flex-col gap-2">
        {types.map((type) => {
          const style = CELL_STYLE[type];
          return (
            <li key={type} data-legend={type} className="flex items-start gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-[28%] border" style={{ background: `linear-gradient(160deg, ${style.bg} 0%, ${style.bg2} 100%)`, color: style.accent, borderColor: `${style.accent}66` }}>
                <CellIcon type={type} className="size-5" />
              </span>
              <span className="min-w-0">
                <span className="block font-semibold">{t(DEFAULT_LOCALE, `cell.${type}`)}</span>
                <span className="block text-sm text-[var(--k-ink-soft)]">{t(DEFAULT_LOCALE, `help.legend.${type}`)}</span>
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
