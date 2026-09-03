import type { Locale } from "@/core/shared";
import { ar } from "./ar";
import { fr } from "./fr";
import type { Dictionary, DictionaryKey } from "./types";

export type { Dictionary, DictionaryKey } from "./types";
export { directionOf } from "./direction";
export type { TextDirection } from "./direction";

/** Décision validée : interface française en V1. */
export const DEFAULT_LOCALE: Locale = "fr";

export const dictionaries: Readonly<Record<Locale, Dictionary>> = { fr, ar };

export type TemplateValues = Readonly<Record<string, string | number>>;

/** Traduction typée : une clé inconnue est une erreur de compilation. `{x}` est remplacé par `values.x`. */
export function t(locale: Locale, key: DictionaryKey, values?: TemplateValues): string {
  const template = dictionaries[locale][key];
  if (!values) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) => (name in values ? String(values[name]) : match));
}
