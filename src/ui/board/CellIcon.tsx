import type { CardStyleKey } from "./cellStyles";

const PATHS: Record<CardStyleKey, string> = {
  start: "M5 3v18M5 4h12l-3 4 3 4H5",
  question: "M9 9a3 3 0 1 1 4.5 2.6c-.9.5-1.5 1.2-1.5 2.4M12 18h.01",
  heritage: "M3 20h18M5 20V10M9 20V10M15 20V10M19 20V10M3 10 12 4l9 6",
  event: "m12 3 2 6h6l-5 3.5L17 19l-5-3.5L7 19l2-6.5L4 9h6l2-6Z",
  management: "M4 7h16v10H4zM4 11h16M8 15h3",
  challenge: "M13 2 4 14h7l-1 8 9-12h-7l1-8Z",
  solidarity: "M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.5-7 10-7 10Z",
  treasure: "M4 10h16v10H4zM4 10l2-4h12l2 4M12 10v10M10 14h4",
  halt: "M12 3v3M12 18v3M3 12h3M18 12h3M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z",
  hassanat: "M12 3l1.6 3.3 3.6.5-2.6 2.5.6 3.6L12 11.2 8.8 12.9l.6-3.6L6.8 6.8l3.6-.5L12 3ZM4 15c2 0 3 1 5 1h5M4 15v5h6l4 1 6-2v-2l-6 1M15 16l4-1",
  donation: "M4 14c0-2 1-3 3-3h3l2-1 3 1h3M4 14v4h5l3 2 5-2 3-1v-3M12 3a2.5 2.5 0 0 1 4 2c0 2-4 4-4 4s-4-2-4-4a2.5 2.5 0 0 1 4-2Z",
};

export function CellIcon({ type, className }: { readonly type: CardStyleKey; readonly className?: string | undefined }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className ?? "size-5"} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d={PATHS[type]} />
    </svg>
  );
}
