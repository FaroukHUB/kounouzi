import type { CellType } from "@/core/game";

/** Identité visuelle par famille de case : couleurs, accent, symbole décoratif (données d'interface, extensibles). */
export interface CellStyle {
  readonly bg: string;
  readonly fg: string;
  readonly accent: string;
  /** Deuxième couleur du dégradé de la case. */
  readonly bg2: string;
}

export const CELL_STYLE: Readonly<Record<CellType, CellStyle>> = {
  start: { bg: "#0f766e", bg2: "#0b5f58", fg: "#ffffff", accent: "#5eead4" },
  question: { bg: "#fff4e0", bg2: "#ffe4b8", fg: "#8a3f12", accent: "#f59e0b" },
  heritage: { bg: "#eceffd", bg2: "#d9ddf8", fg: "#2f2f8f", accent: "#6366f1" },
  event: { bg: "#fdeef5", bg2: "#f9d4e4", fg: "#8e1a4a", accent: "#ec4899" },
  management: { bg: "#e9f8f0", bg2: "#cdeedd", fg: "#0c5c43", accent: "#10b981" },
  challenge: { bg: "#fdecec", bg2: "#f8cfcf", fg: "#8a1c1c", accent: "#ef4444" },
  solidarity: { bg: "#e9f6fd", bg2: "#cbe9f8", fg: "#0a4e73", accent: "#0ea5e9" },
  treasure: { bg: "#fff8dc", bg2: "#fbe7a3", fg: "#7a4a0a", accent: "#eab308" },
  halt: { bg: "#f1edfd", bg2: "#dfd6fb", fg: "#4c1d95", accent: "#8b5cf6" },
};
