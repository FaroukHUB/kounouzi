import { create } from "zustand";
import { DEFAULT_VOICE_TONE } from "@/config/narration";
import { createJSONStorage, persist } from "zustand/middleware";

export const NARRATION_RATES = ["slow", "normal", "fast"] as const;
export type NarrationRate = (typeof NARRATION_RATES)[number];

/** Préférences d'expérience de l'appareil. Aucune règle de jeu ici. */
export interface SessionState {
  /** `null` = suivre `prefers-reduced-motion` de l'appareil. */
  readonly reducedMotion: boolean | null;
  readonly narrationEnabled: boolean;
  readonly narrationRate: NarrationRate;
  /** Ton de la voix (ADR 0056) : identifiant d'un ton des données, essayé à l'oreille dans les réglages. */
  readonly voiceTone: string;
  /** Validation à la voix (ADR 0054) : OFF par défaut, c'est un micro. */
  readonly ecouteEnabled: boolean;
  readonly preciseTimer: boolean;
  setReducedMotion(value: boolean | null): void;
  setNarrationEnabled(value: boolean): void;
  setNarrationRate(value: NarrationRate): void;
  setVoiceTone(value: string): void;
  setEcouteEnabled(value: boolean): void;
  setPreciseTimer(value: boolean): void;
}

const noopStorage = { getItem: () => null, setItem: () => undefined, removeItem: () => undefined };

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      reducedMotion: null,
      // Voix Kounouzi en ligne (ADR 0036) : ON par défaut ; le jeu n'attend jamais une narration.
      narrationEnabled: true,
      narrationRate: "normal",
      voiceTone: DEFAULT_VOICE_TONE,
      // Le micro ne s'ouvre QUE si on le demande : jamais activé à la place du parent.
      ecouteEnabled: false,
      preciseTimer: false,
      setReducedMotion: (reducedMotion) => set({ reducedMotion }),
      setNarrationEnabled: (narrationEnabled) => set({ narrationEnabled }),
      setNarrationRate: (narrationRate) => set({ narrationRate }),
      setVoiceTone: (voiceTone) => set({ voiceTone }),
      setEcouteEnabled: (ecouteEnabled) => set({ ecouteEnabled }),
      setPreciseTimer: (preciseTimer) => set({ preciseTimer }),
    }),
    {
      name: "kounouzi.session.v1",
      // v2 : narration OFF pour tout le monde (voix de l'appareil jugée mauvaise, ADR 0035).
      // v3 : voix en ligne (ADR 0036) → narration ON pour tout le monde ; les autres préférences sont conservées.
      version: 3,
      migrate: (persisted, version) => {
        const s = (persisted ?? {}) as Partial<SessionState>;
        return version < 3 ? { ...s, narrationEnabled: true } : s;
      },
      storage: createJSONStorage(() => (typeof window === "undefined" ? noopStorage : window.localStorage)),
      partialize: (s) => ({ reducedMotion: s.reducedMotion, narrationEnabled: s.narrationEnabled, narrationRate: s.narrationRate, voiceTone: s.voiceTone, ecouteEnabled: s.ecouteEnabled, preciseTimer: s.preciseTimer }),
    },
  ),
);
