import type { Locale } from "@/core/shared";

/**
 * Clé stable d'une phrase vocale : langue + texte normalisé. Sert de nom de
 * fichier pré-généré et de clé de cache. Synchrone, identique dans le
 * navigateur et dans le script de génération (aucune API Web Crypto).
 */
export function normalizeVoiceText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

/** Empreinte 53 bits (cyrb53) rendue en hexadécimal : stable, rapide, suffisante pour quelques milliers de phrases. */
export function hash53(input: string, seed = 0): string {
  let h1 = 0xdeadbeef ^ seed;
  let h2 = 0x41c6ce57 ^ seed;
  for (let i = 0; i < input.length; i += 1) {
    const ch = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (h2 >>> 0).toString(16).padStart(8, "0") + (h1 >>> 0).toString(16).padStart(8, "0");
}

export function voiceKey(lang: Locale, text: string): string {
  return `${lang}-${hash53(`${lang}\n${normalizeVoiceText(text)}`)}`;
}
