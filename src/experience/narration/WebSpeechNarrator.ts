import { PRONUNCIATION } from "@/config/narration";
import type { Locale } from "@/core/shared";
import type { NarrationService, Utterance, VoiceInfo } from "./NarrationService";
import { planUtterances, type PronunciationLexicon } from "./speechText";

const RATE_VALUES = { slow: 0.85, normal: 1, fast: 1.2 } as const;
const BCP47 = { fr: "fr-FR", ar: "ar" } as const;

/**
 * Implémentation V1 sur l'API native du navigateur (`window.speechSynthesis`).
 * Client uniquement (protégée contre le rendu serveur). Aucune API externe.
 * Remplaçable par un autre `NarrationService` sans toucher au moteur ni aux écrans.
 */
export class WebSpeechNarrator implements NarrationService {
  private readonly synth: SpeechSynthesis | null;
  private queue: Utterance[] = [];
  private speaking = false;
  private enabled = true;
  private rate: keyof typeof RATE_VALUES = "normal";
  private last: readonly Utterance[] | null = null;
  private readonly lexicon: PronunciationLexicon;
  private voices: SpeechSynthesisVoice[] = [];
  /** Génération courante : un `stop()` l'incrémente, ce qui périme les fins et minuteries des phrases annulées. */
  private generation = 0;

  constructor(options: { readonly lexicon?: PronunciationLexicon } = {}) {
    this.lexicon = options.lexicon ?? PRONUNCIATION;
    this.synth = typeof window !== "undefined" && "speechSynthesis" in window ? window.speechSynthesis : null;
    if (this.synth) {
      this.refreshVoices();
      // Les voix peuvent apparaître après coup : on écoute `voiceschanged`.
      this.synth.addEventListener?.("voiceschanged", () => this.refreshVoices());
    }
  }

  isSupported(): boolean {
    return this.synth !== null && typeof SpeechSynthesisUtterance !== "undefined";
  }

  speak(utterance: Utterance): void {
    this.speakSequence([utterance]);
  }

  speakSequence(utterances: readonly Utterance[]): void {
    if (utterances.some((u) => u.important)) this.last = utterances;
    if (!this.enabled || !this.isSupported()) return;
    // Plan de lecture : translittérations prononçables, passages arabes dits en arabe ou tus sans voix arabe.
    const plan = utterances.flatMap((u) => planUtterances(u, { hasArabicVoice: this.hasVoice("ar"), lexicon: this.lexicon }));
    this.queue.push(...plan);
    this.drain();
  }

  hasVoice(lang: Locale): boolean {
    return this.isSupported() && this.pickVoice(lang) !== null;
  }

  stop(): void {
    this.queue = [];
    this.speaking = false;
    this.generation += 1;
    this.synth?.cancel();
  }

  replayLast(): void {
    if (!this.last) return;
    this.stop();
    this.speakSequence(this.last);
  }

  getAvailableVoices(): readonly VoiceInfo[] {
    return this.voices.map((v) => ({ name: v.name, lang: v.lang }));
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) this.stop();
  }

  setRate(rate: keyof typeof RATE_VALUES): void {
    this.rate = rate;
  }

  private refreshVoices(): void {
    this.voices = this.synth?.getVoices() ?? [];
  }

  /** Priorité `fr-FR`, puis toute voix `fr…` ; sinon la voix par défaut de l'appareil (jamais bloquant). */
  private pickVoice(lang: Utterance["lang"]): SpeechSynthesisVoice | null {
    const wanted = BCP47[lang];
    const exact = this.voices.find((v) => v.lang.toLowerCase() === wanted.toLowerCase());
    if (exact) return exact;
    const prefix = this.voices.find((v) => v.lang.toLowerCase().startsWith(lang));
    return prefix ?? null;
  }

  private drain(): void {
    if (this.speaking || !this.synth) return;
    const next = this.queue.shift();
    if (!next) return;
    this.speaking = true;
    const gen = this.generation;
    try {
      const u = new SpeechSynthesisUtterance(next.text);
      u.lang = BCP47[next.lang];
      u.rate = RATE_VALUES[this.rate];
      const voice = this.pickVoice(next.lang);
      if (voice) u.voice = voice;
      const done = () => {
        // Une phrase annulée par `stop()` (ou sa minuterie) ne doit pas couper la phrase suivante.
        if (gen !== this.generation) return;
        this.speaking = false;
        this.drain();
      };
      u.onend = done;
      u.onerror = done;
      this.synth.speak(u);
      // Garde-fou : certains navigateurs n'émettent jamais `end` ; on libère la file après un délai raisonnable.
      setTimeout(() => {
        if (this.speaking) done();
      }, 15_000);
    } catch {
      this.speaking = false;
      this.drain();
    }
  }
}
