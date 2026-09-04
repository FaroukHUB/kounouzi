import type { CellType } from "@/core/game";

const PATHS: Record<CellType, string> = {
  start: "M5 3v18M5 4h12l-3 4 3 4H5",
  question: "M9 9a3 3 0 1 1 4.5 2.6c-.9.5-1.5 1.2-1.5 2.4M12 18h.01",
  heritage: "M3 20h18M5 20V10M9 20V10M15 20V10M19 20V10M3 10 12 4l9 6",
  event: "m12 3 2 6h6l-5 3.5L17 19l-5-3.5L7 19l2-6.5L4 9h6l2-6Z",
  management: "M4 7h16v10H4zM4 11h16M8 15h3",
  challenge: "M13 2 4 14h7l-1 8 9-12h-7l1-8Z",
  solidarity: "M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.5-7 10-7 10Z",
  treasure: "M4 10h16v10H4zM4 10l2-4h12l2 4M12 10v10M10 14h4",
  halt: "M12 3v3M12 18v3M3 12h3M18 12h3M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z",
};

export function CellIcon({ type, className }: { readonly type: CellType; readonly className?: string | undefined }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className ?? "size-5"} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d={PATHS[type]} />
    </svg>
  );
}
