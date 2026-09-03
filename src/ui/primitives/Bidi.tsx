import type { HTMLAttributes } from "react";
import type { Locale } from "@/core/shared";
import { directionOf } from "@/i18n/direction";

type BidiElement = "span" | "div" | "p" | "bdi" | "h1" | "h2" | "h3" | "li" | "blockquote";

export interface BidiProps extends Omit<HTMLAttributes<HTMLElement>, "lang" | "dir"> {
  /** Langue du texte contenu. Détermine `lang` et `dir`. */
  lang: Locale;
  /** Élément rendu. `span` par défaut. */
  as?: BidiElement;
}

/**
 * Isolation bidirectionnelle d'un fragment de texte.
 *
 * À utiliser pour TOUT texte dont la langue diffère de celle de l'interface
 * (ex. une explication arabe dans une carte française) : l'élément porte
 * `lang`, `dir` et `unicode-bidi: isolate`, ce qui empêche la ponctuation, les
 * chiffres et le texte voisin de se réordonner.
 */
export function Bidi({ lang, as: Tag = "span", className, ...rest }: BidiProps) {
  const classes = className ? `bidi-isolate ${className}` : "bidi-isolate";
  return <Tag lang={lang} dir={directionOf(lang)} className={classes} {...rest} />;
}
