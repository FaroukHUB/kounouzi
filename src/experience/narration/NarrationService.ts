import type { Locale } from "@/core/shared";

export interface VoiceInfo {
  readonly name: string;
  readonly lang: string;
}

export interface Utterance {
  readonly text: string;
  readonly lang: Locale;
  /** Une annonce importante est mémorisée pour « Réécouter ». */
  readonly important?: boolean;
}

/**
 * Couche d'EXPÉRIENCE. La narration ne contrôle jamais le moteur et ne le
 * bloque jamais : si la voix est indisponible, tout continue normalement.
 * Toute information vocale existe aussi visuellement.
 */
export interface NarrationService {
  isSupported(): boolean;
  /** Met la phrase en file (jamais deux phrases en même temps). */
  speak(utterance: Utterance): void;
  stop(): void;
  replayLast(): void;
  getAvailableVoices(): readonly VoiceInfo[];
  setEnabled(enabled: boolean): void;
  setRate(rate: "slow" | "normal" | "fast"): void;
}

/** Narrateur muet : rendu serveur, tests, appareils sans synthèse vocale. */
export class NullNarrator implements NarrationService {
  isSupported(): boolean {
    return false;
  }
  speak(): void {}
  stop(): void {}
  replayLast(): void {}
  getAvailableVoices(): readonly VoiceInfo[] {
    return [];
  }
  setEnabled(): void {}
  setRate(): void {}
}
