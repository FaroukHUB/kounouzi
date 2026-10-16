import { create } from "zustand";
import { DEFAULT_VOICE_TONE } from "@/config/narration";
import { DEFAULT_BOARD_TEXTURE_MODE, type BoardTextureMode } from "@/config/scene3d";
import type { BoardRenderPreference } from "@/ui/scene/capability";
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
  /**
   * Plateau 3D ou 2D (ADR 0059). `auto` laisse l'appareil décider ; `3d` et
   * `2d` sont des ordres et ont le dernier mot — sauf si WebGL manque, auquel
   * cas aucun réglage ne fabrique la capacité absente.
   */
  readonly boardRender: BoardRenderPreference;
  /** Comment l'illustration est posée sur le plateau 3D. Réglage TEMPORAIRE de l'étape 1, retiré après le choix. */
  readonly boardTexture: BoardTextureMode;
  setReducedMotion(value: boolean | null): void;
  setNarrationEnabled(value: boolean): void;
  setNarrationRate(value: NarrationRate): void;
  setVoiceTone(value: string): void;
  setEcouteEnabled(value: boolean): void;
  setPreciseTimer(value: boolean): void;
  setBoardRender(value: BoardRenderPreference): void;
  setBoardTexture(value: BoardTextureMode): void;
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
      boardRender: "auto",
      boardTexture: DEFAULT_BOARD_TEXTURE_MODE,
      setReducedMotion: (reducedMotion) => set({ reducedMotion }),
      setNarrationEnabled: (narrationEnabled) => set({ narrationEnabled }),
      setNarrationRate: (narrationRate) => set({ narrationRate }),
      setVoiceTone: (voiceTone) => set({ voiceTone }),
      setEcouteEnabled: (ecouteEnabled) => set({ ecouteEnabled }),
      setPreciseTimer: (preciseTimer) => set({ preciseTimer }),
      setBoardRender: (boardRender) => set({ boardRender }),
      setBoardTexture: (boardTexture) => set({ boardTexture }),
    }),
    {
      name: "kounouzi.session.v1",
      // v2 : narration OFF pour tout le monde (voix de l'appareil jugée mauvaise, ADR 0035).
      // v3 : voix en ligne (ADR 0036) → narration ON pour tout le monde ; les autres préférences sont conservées.
      // v4 : plateau 3D (ADR 0059). Les anciens enregistrements n'ont pas les
      // préférences de plateau ; `auto` est le bon défaut pour tout le monde, et
      // les autres préférences sont conservées telles quelles.
      version: 4,
      migrate: (persisted, version) => {
        const s = (persisted ?? {}) as Partial<SessionState>;
        const withNarration = version < 3 ? { ...s, narrationEnabled: true } : s;
        return version < 4 ? { ...withNarration, boardRender: "auto" as const, boardTexture: DEFAULT_BOARD_TEXTURE_MODE } : withNarration;
      },
      storage: createJSONStorage(() => (typeof window === "undefined" ? noopStorage : window.localStorage)),
      partialize: (s) => ({ reducedMotion: s.reducedMotion, narrationEnabled: s.narrationEnabled, narrationRate: s.narrationRate, voiceTone: s.voiceTone, ecouteEnabled: s.ecouteEnabled, preciseTimer: s.preciseTimer, boardRender: s.boardRender, boardTexture: s.boardTexture }),
    },
  ),
);
