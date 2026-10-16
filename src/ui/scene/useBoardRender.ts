"use client";

import { useSyncExternalStore } from "react";
import { create } from "zustand";
import { SCENE_3D } from "@/config/scene3d";
import type { QualityTier } from "@/config/scene3d/tiers";
import { useSessionStore } from "@/state/sessionStore";
import { decideRenderMode, qualityFor, type BoardRenderMode, type DeviceReport, type FallbackReason } from "./capability";

/**
 * Ce qu'on sait de l'appareil, lu UNE SEULE FOIS.
 *
 * Ces valeurs ne changent pas pendant une session, et la détection de WebGL
 * coûte un contexte graphique : la relire à chaque rendu serait absurde. Le
 * résultat est donc mis en cache, ce qui donne aussi à `useSyncExternalStore`
 * l'instantané stable qu'il exige — sans quoi React boucle indéfiniment.
 */
let cached: DeviceReport | null = null;

function probeDevice(): DeviceReport {
  if (cached) return cached;
  let webgl = false;
  try {
    const canvas = document.createElement("canvas");
    webgl = canvas.getContext("webgl2") !== null || canvas.getContext("webgl") !== null;
  } catch {
    webgl = false;
  }
  const nav = navigator as Navigator & { readonly deviceMemory?: number };
  const memory = typeof nav.deviceMemory === "number" ? nav.deviceMemory : null;
  const cores = typeof navigator.hardwareConcurrency === "number" && navigator.hardwareConcurrency > 0 ? navigator.hardwareConcurrency : null;
  cached = { webgl, memoryGb: memory, cores };
  return cached;
}

/**
 * Côté serveur, aucun appareil à interroger. On suppose la 3D possible : la
 * très grande majorité des appareils la gère, donc c'est l'hypothèse qui évite
 * un changement de vue juste après l'hydratation dans le cas courant. Les
 * appareils sans WebGL basculent en 2D au premier rendu client, ce que
 * `useSyncExternalStore` prévoit explicitement.
 */
const SERVER_DEVICE: DeviceReport = { webgl: true, memoryGb: null, cores: null };

const subscribeNothing = () => () => undefined;

/**
 * Repli constaté À L'USAGE (images par seconde durablement trop basses).
 *
 * Transitoire, jamais persisté : c'est une observation sur la session en cours,
 * pas une préférence. Il vit hors de React pour que la boucle de rendu puisse
 * le signaler depuis une image, et non depuis un effet.
 */
interface SlowStore {
  readonly tooSlow: boolean;
  markTooSlow(): void;
}

export const useSlowStore = create<SlowStore>()((set) => ({
  tooSlow: false,
  markTooSlow: () => set({ tooSlow: true }),
}));

export interface BoardRenderDecision {
  readonly mode: BoardRenderMode;
  readonly reason: FallbackReason;
  readonly quality: QualityTier;
}

/**
 * Le mode de rendu du plateau, et pourquoi.
 *
 * L'ordre des priorités est celui de l'ADR 0059 : sans WebGL rien n'est
 * possible ; sinon un réglage explicite de l'utilisateur gagne — y compris
 * contre la mesure, parce que c'est lui qui regarde son écran ; en automatique
 * seulement, un appareil faible ou une 3D constatée trop lente donne la 2D.
 */
export function useBoardRender(): BoardRenderDecision {
  const preference = useSessionStore((s) => s.boardRender);
  const tooSlow = useSlowStore((s) => s.tooSlow);
  const device = useSyncExternalStore(subscribeNothing, probeDevice, () => SERVER_DEVICE);
  const decision = decideRenderMode(preference, device, SCENE_3D.quality);
  const quality = qualityFor(device, SCENE_3D.quality);
  if (decision.mode === "3d" && tooSlow && preference === "auto") return { mode: "2d", reason: "too-slow", quality };
  return { mode: decision.mode, reason: decision.reason, quality };
}
