import type { fr } from "./fr";

/** Toute langue doit fournir exactement les clés du dictionnaire français. */
export type Dictionary = { readonly [K in keyof typeof fr]: string };

export type DictionaryKey = keyof Dictionary;
