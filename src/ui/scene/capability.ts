import type { QualityTier } from "@/config/scene3d/tiers";

/**
 * QUI A LE DERNIER MOT SUR LE MODE DE RENDU — fonctions pures (ADR 0059).
 *
 * Aucun import de `three`, aucun accès direct au navigateur : ce qu'il faut
 * savoir de l'appareil entre par un paramètre. C'est ce qui rend la décision
 * testable, et c'est aussi ce qui garantit qu'elle est prise à UN seul endroit
 * au lieu d'être éparpillée dans des conditions au fil des composants.
 */

export const BOARD_RENDER_PREFERENCES = ["3d", "2d", "auto"] as const;
export type BoardRenderPreference = (typeof BOARD_RENDER_PREFERENCES)[number];

export type BoardRenderMode = "3d" | "2d";

/**
 * Pourquoi la 2D est servie. Dit à l'utilisateur ce qui s'est passé plutôt que
 * de le laisser croire que son réglage n'a servi à rien — le panneau de la voix
 * a déjà montré ce que coûte une cause muette.
 */
export type FallbackReason = "none" | "user" | "no-webgl" | "weak-device" | "too-slow";

/** Ce qu'on sait de l'appareil. `null` = l'information n'est pas disponible (c'est fréquent, et ce n'est pas une faiblesse). */
export interface DeviceReport {
  readonly webgl: boolean;
  readonly memoryGb: number | null;
  readonly cores: number | null;
}

export interface QualityThresholds {
  readonly minMemoryGb: number;
  readonly minCores: number;
}

export interface RenderDecision {
  readonly mode: BoardRenderMode;
  readonly reason: FallbackReason;
}

/**
 * Le mode de rendu, et la raison quand ce n'est pas la 3D.
 *
 * Trois principes :
 *
 * 1. **Le réglage explicite gagne toujours.** « 3D » force la 3D même sur un
 *    appareil que l'automatique jugerait faible — c'est le seul moyen de la
 *    tester, et c'est l'utilisateur qui regarde son écran, pas nous.
 * 2. **Sans WebGL, rien à discuter** : même « 3D » retombe en 2D. Un réglage ne
 *    fabrique pas une capacité absente.
 * 3. **Une information manquante n'est jamais un défaut.** Beaucoup de
 *    navigateurs ne publient ni mémoire ni nombre de cœurs ; les traiter comme
 *    des appareils faibles priverait de 3D une majorité de téléphones corrects.
 *    Le doute profite à la 3D, et la surveillance des images par seconde
 *    rattrape les cas réellement trop lents.
 *
 * Le mode « animations réduites » n'entre PAS dans cette décision : un plateau
 * 3D immobile reste un plateau 3D, et quelqu'un qui demande moins de mouvement
 * ne demande pas une vue différente. Il coupe les mouvements, pas la vue.
 */
export function decideRenderMode(preference: BoardRenderPreference, device: DeviceReport, thresholds: QualityThresholds): RenderDecision {
  if (!device.webgl) return { mode: "2d", reason: "no-webgl" };
  if (preference === "2d") return { mode: "2d", reason: "user" };
  if (preference === "3d") return { mode: "3d", reason: "none" };
  const weakMemory = device.memoryGb !== null && device.memoryGb < thresholds.minMemoryGb;
  const weakCores = device.cores !== null && device.cores < thresholds.minCores;
  return weakMemory || weakCores ? { mode: "2d", reason: "weak-device" } : { mode: "3d", reason: "none" };
}

/* ---------------------------------------------------------------------------
 * Surveillance des images par seconde
 * ------------------------------------------------------------------------- */

export interface SlowWatchConfig {
  /** En dessous de ce nombre d'images par seconde, la seconde compte comme lente. */
  readonly fallbackFps: number;
  /** Nombre de secondes lentes CONSÉCUTIVES avant de replier. */
  readonly fallbackSeconds: number;
}

export interface SlowWatchState {
  readonly lowSeconds: number;
  readonly tooSlow: boolean;
}

export const SLOW_WATCH_START: SlowWatchState = { lowSeconds: 0, tooSlow: false };

/**
 * Un pas de surveillance, une seconde de mesure à la fois.
 *
 * Il faut PLUSIEURS secondes lentes d'affilée, et le compteur retombe à zéro
 * dès qu'une seconde est correcte. Une seule mesure basse ne prouve rien : le
 * chargement d'une texture, un onglet qui revient au premier plan ou une
 * seconde où le téléphone fait autre chose suffisent à la produire. Replier sur
 * un à-coup, c'est priver de 3D un appareil qui l'aurait très bien tenue.
 *
 * Et le repli est définitif pour la partie en cours : une fois en 2D, on n'y
 * revient pas automatiquement. Une vue qui oscille entre 2D et 3D au fil de la
 * charge serait pire que les deux.
 */
export function watchSlowness(state: SlowWatchState, fps: number, config: SlowWatchConfig): SlowWatchState {
  if (state.tooSlow) return state;
  if (fps >= config.fallbackFps) return SLOW_WATCH_START;
  const lowSeconds = state.lowSeconds + 1;
  return { lowSeconds, tooSlow: lowSeconds >= config.fallbackSeconds };
}

/** Images par seconde d'un échantillon de durées d'image (en millisecondes). */
export function averageFps(frameDurationsMs: readonly number[]): number {
  const usable = frameDurationsMs.filter((ms) => ms > 0);
  if (usable.length === 0) return 0;
  const total = usable.reduce((sum, ms) => sum + ms, 0);
  return (usable.length * 1000) / total;
}

/* ---------------------------------------------------------------------------
 * Qualité
 * ------------------------------------------------------------------------- */

/**
 * Palier de qualité : un appareil faible dessine MOINS, pas plus mal. Ce qui
 * baisse, c'est la densité de pixels et le lissage — jamais la lisibilité du
 * plateau, qui est la raison d'être de l'écran.
 */
export function qualityFor(device: DeviceReport, thresholds: QualityThresholds): QualityTier {
  const memory = device.memoryGb;
  const cores = device.cores;
  if ((memory !== null && memory < thresholds.minMemoryGb) || (cores !== null && cores < thresholds.minCores)) return "low";
  if ((memory !== null && memory < thresholds.minMemoryGb * 2) || (cores !== null && cores < thresholds.minCores * 2)) return "medium";
  return "high";
}
