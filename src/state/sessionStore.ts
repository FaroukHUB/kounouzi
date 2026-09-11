import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export const NARRATION_RATES = ["slow", "normal", "fast"] as const;
export type NarrationRate = (typeof NARRATION_RATES)[number];

/** Préférences d'expérience de l'appareil. Aucune règle de jeu ici. */
export interface SessionState {
  /** `null` = suivre `prefers-reduced-motion` de l'appareil. */
  readonly reducedMotion: boolean | null;
  readonly narrationEnabled: boolean;
  readonly narrationRate: NarrationRate;
  readonly preciseTimer: boolean;
  setReducedMotion(value: boolean | null): void;
  setNarrationEnabled(value: boolean): void;
  setNarrationRate(value: NarrationRate): void;
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
      preciseTimer: false,
      setReducedMotion: (reducedMotion) => set({ reducedMotion }),
      setNarrationEnabled: (narrationEnabled) => set({ narrationEnabled }),
      setNarrationRate: (narrationRate) => set({ narrationRate }),
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
      partialize: (s) => ({ reducedMotion: s.reducedMotion, narrationEnabled: s.narrationEnabled, narrationRate: s.narrationRate, preciseTimer: s.preciseTimer }),
    },
  ),
);
