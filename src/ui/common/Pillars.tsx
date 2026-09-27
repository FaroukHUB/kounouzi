import type { CellType } from "@/core/game";
import { DEFAULT_LOCALE, t, type DictionaryKey } from "@/i18n";
import { CellIcon } from "@/ui/board/CellIcon";
import { CELL_STYLE } from "@/ui/board/cellStyles";

/**
 * Les trois piliers du jeu — Joue, Apprends, Gère — et, pour chacun, la case
 * qui l'incarne sur le plateau : le Défi, le Savoir, l'Établissement. Les
 * couleurs ne sont pas choisies ici : ce sont celles des cases, pour qu'un
 * enfant relie le pilier à ce qu'il voit sur le plateau.
 */
const PILIERS = [
  { cle: "play", type: "challenge", titre: "pillars.play.title", texte: "pillars.play.text" },
  { cle: "learn", type: "question", titre: "pillars.learn.title", texte: "pillars.learn.text" },
  { cle: "manage", type: "heritage", titre: "pillars.manage.title", texte: "pillars.manage.text" },
] as const satisfies readonly { readonly cle: string; readonly type: CellType; readonly titre: DictionaryKey; readonly texte: DictionaryKey }[];

/**
 * `titleClassName` : le titre se pose tantôt sur un fond sombre (accueil),
 * tantôt sur une feuille blanche (aide en jeu). Par défaut, encre sombre.
 */
export function Pillars({ className = "", titleClassName = "text-[var(--k-ink-soft)]" }: { readonly className?: string; readonly titleClassName?: string }) {
  return (
    <section className={`w-full ${className}`} aria-labelledby="pillars-title" data-testid="pillars">
      <h2 id="pillars-title" className={`mb-3 text-center text-sm font-semibold uppercase tracking-wide ${titleClassName}`}>
        {t(DEFAULT_LOCALE, "pillars.title")}
      </h2>
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {PILIERS.map(({ cle, type, titre, texte }) => {
          const style = CELL_STYLE[type];
          return (
            <li key={cle} data-pillar={cle} className="flex flex-col items-center gap-2 rounded-2xl border p-4 text-center" style={{ background: `linear-gradient(160deg, ${style.bg} 0%, ${style.bg2} 100%)`, color: style.fg, borderColor: `${style.accent}66` }}>
              <span className="flex size-11 items-center justify-center rounded-full" style={{ backgroundColor: "rgba(255,255,255,0.75)", color: style.accent }}>
                <CellIcon type={type} className="size-6" />
              </span>
              <span className="font-display text-xl font-black uppercase tracking-wide">{t(DEFAULT_LOCALE, titre)}</span>
              <span className="text-sm">{t(DEFAULT_LOCALE, texte)}</span>
              <span className="mt-1 rounded-full px-2 py-0.5 text-[0.7rem] font-semibold uppercase tracking-wide" style={{ backgroundColor: `${style.accent}33` }}>
                {t(DEFAULT_LOCALE, `cell.${type}`)}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
