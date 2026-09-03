import type { Locale } from "@/core/shared";

export type TextDirection = "ltr" | "rtl";

/** Table explicite : ajouter une langue oblige à déclarer sa direction. */
const DIRECTION_BY_LOCALE: Readonly<Record<Locale, TextDirection>> = {
  fr: "ltr",
  ar: "rtl",
};

export function directionOf(locale: Locale): TextDirection {
  return DIRECTION_BY_LOCALE[locale];
}
