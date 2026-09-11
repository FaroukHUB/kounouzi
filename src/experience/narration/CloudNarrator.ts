import type { Locale } from "@/core/shared";
import type { NarrationMode, NarrationService, Utterance, VoiceInfo } from "./NarrationService";
import { normalizeVoiceText, voiceKey } from "./voiceKey";

/** Ce dont le narrateur a besoin d'un élément audio (injectable pour les tests). */
export interface AudioLike {
  src: string;
  playbackRate: number;
  onended: (() => void) | null;
  onerror: (() => void) | null;
  play(): Promise<void>;
  pause(): void;
}

export interface CloudNarratorOptions {
  readonly endpoint: string;
  readonly manifestUrl: string;
  readonly languages: readonly Locale[];
  readonly maxTextLength: number;
  readonly fallbackToDevice: boolean;
  readonly rates: { readonly slow: number; readonly normal: number; readonly fast: number };
  /** Voix de secours (appareil) ; silence si absente ou non retenue. */
  readonly fallback?: NarrationService | undefined;
  readonly fetch?: typeof fetch | undefined;
  readonly createAudio?: (() => AudioLike) | undefined;
  readonly createObjectUrl?: ((blob: Blob) => string) | undefined;
  readonly revokeObjectUrl?: ((url: string) => void) | undefined;
  /** Délai de sécurité par phrase (ms) : la file n'attend jamais indéfiniment un audio. */
  readonly safetyMs?: number | undefined;
  /** Après un échec réseau, délai avant de retenter la voix en ligne (ms). */
  readonly retryAfterMs?: number | undefined;
  readonly now?: (() => number) | undefined;
}

interface Manifest {
  readonly entries: Readonly<Record<string, { readonly file: string }>>;
}

export type CloudAvailability = "unknown" | "available" | "unavailable";

/**
 * Voix en ligne Kounouzi (ADR 0036) : une seule voix, qui dit tout, prénoms et
 * montants compris. Chaque phrase est un fichier audio : pré-généré et servi
 * en statique quand il figure au manifeste, sinon demandé au serveur
 * (`/api/voix`, cache HTTP long). Jamais bloquant pour le jeu : sans réseau ou
 * sans clé, la voix de l'appareil prend le relais (ou le silence), le texte
 * reste toujours affiché.
 */
export class CloudNarrator implements NarrationService {
  private readonly o: CloudNarratorOptions;
  private readonly fallback: NarrationService | null;
  private enabled = true;
  private rate: keyof CloudNarratorOptions["rates"] = "normal";
  private queue: Utterance[] = [];
  private playing = false;
  private current: AudioLike | null = null;
  private generation = 0;
  private last: readonly Utterance[] | null = null;
  private availability: CloudAvailability = "unknown";
  private retryAt = 0;
  private manifest: Manifest | null = null;
  private manifestLoading: Promise<void> | null = null;
  private unlocked = false;

  constructor(options: CloudNarratorOptions) {
    this.o = options;
    this.fallback = options.fallbackToDevice && options.fallback ? options.fallback : null;
  }

  private get canPlay(): boolean {
    return this.o.createAudio !== undefined || typeof Audio !== "undefined";
  }

  private get cloudUsable(): boolean {
    return this.canPlay && this.availability !== "unavailable";
  }

  isSupported(): boolean {
    return this.canPlay || (this.fallback?.isSupported() ?? false);
  }

  mode(): NarrationMode {
    if (this.cloudUsable) return "cloud";
    return this.fallback?.mode?.() ?? (this.fallback?.isSupported() ? "device" : "none");
  }

  availabilityState(): CloudAvailability {
    return this.availability;
  }

  hasVoice(lang: Locale): boolean {
    if (this.cloudUsable && this.o.languages.includes(lang)) return true;
    return this.fallback?.hasVoice(lang) ?? false;
  }

  speak(utterance: Utterance): void {
    this.speakSequence([utterance]);
  }

  speakSequence(utterances: readonly Utterance[]): void {
    if (utterances.some((u) => u.important)) this.last = utterances;
    if (!this.enabled) return;
    const usable = utterances.map((u) => ({ ...u, text: normalizeVoiceText(u.text) })).filter((u) => u.text.length > 0);
    if (usable.length === 0) return;
    if (!this.canPlay || !this.cloudWorthTrying()) {
      this.fallback?.speakSequence(usable);
      return;
    }
    this.queue.push(...usable);
    void this.drain();
  }

  stop(): void {
    this.generation += 1;
    this.queue = [];
    this.playing = false;
    const cur = this.current;
    this.current = null;
    if (cur) {
      try {
        cur.onended = null;
        cur.onerror = null;
        cur.pause();
      } catch {
        /* jamais bloquant */
      }
    }
    this.fallback?.stop();
  }

  replayLast(): void {
    if (!this.last) return;
    this.stop();
    this.speakSequence(this.last);
  }

  getAvailableVoices(): readonly VoiceInfo[] {
    if (this.cloudUsable) return this.o.languages.map((lang) => ({ name: "Kounouzi (en ligne)", lang }));
    return this.fallback?.getAvailableVoices() ?? [];
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    this.fallback?.setEnabled(enabled);
    if (!enabled) this.stop();
  }

  setRate(rate: "slow" | "normal" | "fast"): void {
    this.rate = rate;
    this.fallback?.setRate(rate);
  }

  /**
   * Téléphones : le son n'est autorisé qu'après un geste de l'utilisateur.
   * À appeler sur le premier toucher (un instant de silence, jamais audible).
   */
  unlock(): void {
    if (this.unlocked || !this.canPlay) return;
    this.unlocked = true;
    try {
      const a = this.audio();
      a.src = SILENCE_WAV;
      void a.play().catch(() => {
        this.unlocked = false;
      });
    } catch {
      this.unlocked = false;
    }
  }

  /** Demande UNE fois au serveur si la voix en ligne existe (clé configurée), sans rien générer. */
  async probe(): Promise<CloudAvailability> {
    try {
      const res = await this.fetchFn()(`${this.o.endpoint}?probe=1`, { method: "GET", cache: "no-store" });
      if (res.status === 204) this.availability = "available";
      else if (res.status === 503) this.availability = "unavailable";
    } catch {
      this.retryAt = this.now() + this.retryAfterMs();
    }
    return this.availability;
  }

  private cloudWorthTrying(): boolean {
    return this.availability !== "unavailable" && this.now() >= this.retryAt;
  }

  private fetchFn(): typeof fetch {
    return this.o.fetch ?? fetch;
  }
  private now(): number {
    return this.o.now?.() ?? Date.now();
  }
  private retryAfterMs(): number {
    return this.o.retryAfterMs ?? 30_000;
  }
  private audio(): AudioLike {
    return this.o.createAudio ? this.o.createAudio() : (new Audio() as unknown as AudioLike);
  }

  private loadManifest(): Promise<void> {
    if (this.manifest) return Promise.resolve();
    if (!this.manifestLoading) {
      this.manifestLoading = (async () => {
        try {
          const res = await this.fetchFn()(this.o.manifestUrl, { method: "GET" });
          const data = res.ok ? ((await res.json()) as Partial<Manifest> | null) : null;
          this.manifest = { entries: data?.entries ?? {} };
        } catch {
          this.manifest = { entries: {} };
        }
      })();
    }
    return this.manifestLoading;
  }

  /** URL statique si la phrase est pré-générée, sinon le point d'entrée serveur. */
  private urlFor(u: Utterance): string {
    const key = voiceKey(u.lang, u.text);
    const file = this.manifest?.entries[key]?.file;
    if (file) return `${this.o.manifestUrl.slice(0, this.o.manifestUrl.lastIndexOf("/") + 1)}${file}`;
    return `${this.o.endpoint}?lang=${u.lang}&text=${encodeURIComponent(u.text)}`;
  }

  private async drain(): Promise<void> {
    if (this.playing) return;
    this.playing = true;
    const gen = this.generation;
    await this.loadManifest();
    while (gen === this.generation) {
      const next = this.queue.shift();
      if (!next) break;
      if (next.text.length > this.o.maxTextLength || !this.o.languages.includes(next.lang)) {
        this.fallback?.speak(next);
        continue;
      }
      const ok = await this.playOne(next, gen);
      if (gen !== this.generation) return;
      if (!ok) {
        // Voix en ligne indisponible : ce qui reste passe à la voix de secours, sans attendre.
        const rest = [next, ...this.queue];
        this.queue = [];
        this.fallback?.speakSequence(rest);
        break;
      }
    }
    if (gen === this.generation) this.playing = false;
  }

  /** Télécharge puis joue une phrase ; `false` si la voix en ligne a échoué (rien n'a été entendu). */
  private async playOne(u: Utterance, gen: number): Promise<boolean> {
    let url = this.urlFor(u);
    let objectUrl: string | null = null;
    try {
      const res = await this.fetchFn()(url, { method: "GET" });
      if (gen !== this.generation) return true;
      if (!res.ok) {
        if (res.status === 503) this.availability = "unavailable";
        else this.retryAt = this.now() + this.retryAfterMs();
        return false;
      }
      this.availability = "available";
      const blob = await res.blob();
      if (gen !== this.generation) return true;
      const toUrl = this.o.createObjectUrl ?? ((b: Blob) => URL.createObjectURL(b));
      objectUrl = toUrl(blob);
      url = objectUrl;
    } catch {
      this.retryAt = this.now() + this.retryAfterMs();
      return false;
    }
    const a = this.audio();
    this.current = a;
    a.src = url;
    a.playbackRate = this.o.rates[this.rate];
    await new Promise<void>((resolve) => {
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        resolve();
      };
      a.onended = finish;
      a.onerror = finish;
      setTimeout(finish, this.o.safetyMs ?? 20_000);
      a.play().catch(finish);
    });
    if (this.current === a) this.current = null;
    if (objectUrl) (this.o.revokeObjectUrl ?? ((x: string) => URL.revokeObjectURL(x)))(objectUrl);
    return true;
  }
}

/** Un WAV d'un échantillon silencieux : suffit à débloquer l'audio sur mobile. */
const SILENCE_WAV = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YQAAAAA=";
