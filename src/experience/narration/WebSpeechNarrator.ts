import type { NarrationService, Utterance, VoiceInfo } from "./NarrationService";

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
  private last: Utterance | null = null;
  private voices: SpeechSynthesisVoice[] = [];

  constructor() {
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
    if (utterance.important) this.last = utterance;
    if (!this.enabled || !this.isSupported()) return;
    this.queue.push(utterance);
    this.drain();
  }

  stop(): void {
    this.queue = [];
    this.speaking = false;
    this.synth?.cancel();
  }

  replayLast(): void {
    if (!this.last) return;
    this.stop();
    this.speak(this.last);
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
    try {
      const u = new SpeechSynthesisUtterance(next.text);
      u.lang = BCP47[next.lang];
      u.rate = RATE_VALUES[this.rate];
      const voice = this.pickVoice(next.lang);
      if (voice) u.voice = voice;
      const done = () => {
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
