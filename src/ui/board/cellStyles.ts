import type { CellType } from "@/core/game";

/** Identité visuelle par type de case (données d'interface, extensibles). */
export const CELL_STYLE: Readonly<Record<CellType, { readonly bg: string; readonly fg: string; readonly accent: string }>> = {
  start: { bg: "#0f766e", fg: "#ffffff", accent: "#14b8a6" },
  question: { bg: "#fff7ed", fg: "#9a3412", accent: "#f59e0b" },
  heritage: { bg: "#eef2ff", fg: "#3730a3", accent: "#6366f1" },
  event: { bg: "#fdf2f8", fg: "#9d174d", accent: "#ec4899" },
  management: { bg: "#ecfdf5", fg: "#065f46", accent: "#10b981" },
  challenge: { bg: "#fef2f2", fg: "#991b1b", accent: "#ef4444" },
  solidarity: { bg: "#f0f9ff", fg: "#075985", accent: "#0ea5e9" },
  treasure: { bg: "#fefce8", fg: "#854d0e", accent: "#eab308" },
};
