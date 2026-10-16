import { create } from "zustand";
import { DEFAULT_VOICE_TONE } from "@/config/narration";
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
  /** Vibration aux moments clés. ON par défaut : très courte, et jamais la seule information. */
  readonly hapticsEnabled: boolean;
  setReducedMotion(value: boolean | null): void;
  setNarrationEnabled(value: boolean): void;
  setNarrationRate(value: NarrationRate): void;
  setVoiceTone(value: string): void;
  setEcouteEnabled(value: boolean): void;
  setPreciseTimer(value: boolean): void;
  setBoardRender(value: BoardRenderPreference): void;
  setHapticsEnabled(value: boolean): void;
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
      hapticsEnabled: true,
      setReducedMotion: (reducedMotion) => set({ reducedMotion }),
      setNarrationEnabled: (narrationEnabled) => set({ narrationEnabled }),
      setNarrationRate: (narrationRate) => set({ narrationRate }),
      setVoiceTone: (voiceTone) => set({ voiceTone }),
      setEcouteEnabled: (ecouteEnabled) => set({ ecouteEnabled }),
      setPreciseTimer: (preciseTimer) => set({ preciseTimer }),
      setBoardRender: (boardRender) => set({ boardRender }),
      setHapticsEnabled: (hapticsEnabled) => set({ hapticsEnabled }),
    }),
    {
      name: "kounouzi.session.v1",
      // v2 : narration OFF pour tout le monde (voix de l'appareil jugée mauvaise, ADR 0035).
      // v3 : voix en ligne (ADR 0036) → narration ON pour tout le monde ; les autres préférences sont conservées.
      // v4 : plateau 3D (ADR 0059). Les anciens enregistrements n'ont pas les
      // préférences de plateau ; `auto` est le bon défaut pour tout le monde, et
      // les autres préférences sont conservées telles quelles.
      // v5 : vibration (étape 6 du plateau 3D). ON par défaut pour tout le monde.
      // v6 : le choix de l'illustration du plateau est fait — l'illustration
      // couvre tout le plateau, et le réglage temporaire qui servait à comparer
      // les deux rendus disparaît avec le mode perdant. Aucun code mort.
      version: 6,
      migrate: (persisted, version) => {
        const s = (persisted ?? {}) as Partial<SessionState>;
        const withNarration = version < 3 ? { ...s, narrationEnabled: true } : s;
        const withBoard = version < 4 ? { ...withNarration, boardRender: "auto" as const } : withNarration;
        const withHaptics = version < 5 ? { ...withBoard, hapticsEnabled: true } : withBoard;
        if (version >= 6) return withHaptics;
        // Le réglage temporaire d'illustration disparaît des préférences
        // enregistrées : le choix est fait, et garder une clé morte ferait
        // croire plus tard qu'un mode perdu existe encore.
        const sansTexture = { ...(withHaptics as Record<string, unknown>) };
        delete sansTexture["boardTexture"];
        return sansTexture;
      },
      storage: createJSONStorage(() => (typeof window === "undefined" ? noopStorage : window.localStorage)),
      partialize: (s) => ({ reducedMotion: s.reducedMotion, narrationEnabled: s.narrationEnabled, narrationRate: s.narrationRate, voiceTone: s.voiceTone, ecouteEnabled: s.ecouteEnabled, preciseTimer: s.preciseTimer, boardRender: s.boardRender, hapticsEnabled: s.hapticsEnabled }),
    },
  ),
);
