/** Langues de contenu et d'interface prises en charge par Kounouzi. */
export const LOCALES = ["fr", "ar"] as const;

export type Locale = (typeof LOCALES)[number];

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}
