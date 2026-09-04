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
  /** Met plusieurs phrases en file, dans l'ordre : la pause entre deux phrases est naturelle. « Réécouter » rejoue toute la séquence. */
  speakSequence(utterances: readonly Utterance[]): void;
  /** Une voix existe pour cette langue sur l'appareil (l'arabe n'est jamais lu par une autre voix). */
  hasVoice(lang: Locale): boolean;
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
  speakSequence(): void {}
  hasVoice(): boolean {
    return false;
  }
  stop(): void {}
  replayLast(): void {}
  getAvailableVoices(): readonly VoiceInfo[] {
    return [];
  }
  setEnabled(): void {}
  setRate(): void {}
}
