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

/** Traduction typée : une clé inconnue est une erreur de compilation. */
export function t(locale: Locale, key: DictionaryKey): string {
  return dictionaries[locale][key];
}
