import type { AvatarShape } from "@/config/avatars";

/** Symboles géométriques simples des pions V1 (illustrations définitives ultérieures). */
const PATHS: Record<AvatarShape, string> = {
  sun: "M12 4a1 1 0 0 1 1 1v2a1 1 0 1 1-2 0V5a1 1 0 0 1 1-1Zm0 4.5a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7ZM4 12a1 1 0 0 1 1-1h2a1 1 0 1 1 0 2H5a1 1 0 0 1-1-1Zm13-1h2a1 1 0 1 1 0 2h-2a1 1 0 1 1 0-2Zm-5 6a1 1 0 0 1 1 1v2a1 1 0 1 1-2 0v-2a1 1 0 0 1 1-1Z",
  leaf: "M19 4c-8 0-13 4-14 11 0 2 1 4 3 5 7-1 11-6 11-16ZM8 20c2-5 5-8 9-11",
  gem: "M7 4h10l4 6-9 10L3 10l4-6Zm0 0 5 6 5-6M3 10h18",
  star: "m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9L12 3Z",
  shell: "M12 20c-5 0-8-3-8-8 0-4 3-8 8-8s8 4 8 8c0 5-3 8-8 8Zm0-12v12M6 9c2 2 4 3 6 3s4-1 6-3",
  wave: "M3 8c2-2 4-2 6 0s4 2 6 0 4-2 6 0M3 13c2-2 4-2 6 0s4 2 6 0 4-2 6 0M3 18c2-2 4-2 6 0s4 2 6 0 4-2 6 0",
  key: "M15 3a6 6 0 1 0 0 12 6 6 0 0 0 0-12Zm-1 4a2 2 0 1 1 0 4 2 2 0 0 1 0-4ZM9.5 12.5 3 19l2 2 1.5-1.5L8 21l2-2-1.5-1.5L10 16",
  feather: "M20 4c-6 0-11 4-14 10l-3 6 6-3c6-3 10-8 11-13ZM6 18l8-8",
};

export function AvatarGlyph({ shape, className }: { readonly shape: AvatarShape; readonly className?: string | undefined }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className ?? "size-5"} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d={PATHS[shape]} />
    </svg>
  );
}
