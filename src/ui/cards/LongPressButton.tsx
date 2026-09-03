"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

export interface LongPressButtonProps {
  readonly holdMs?: number;
  readonly onComplete: () => void;
  readonly children: ReactNode;
  readonly hint?: string | undefined;
}

/**
 * Protection contre le clic accidentel : la révélation exige un appui
 * maintenu. La progression est un simple `transform: scaleX` (pas de layout).
 */
export function LongPressButton({ holdMs = 700, onComplete, children, hint }: LongPressButtonProps) {
  const [progress, setProgress] = useState(0);
  const start = useRef<number | null>(null);
  const frame = useRef<number | null>(null);
  const done = useRef(false);

  const stop = () => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
    start.current = null;
    setProgress(0);
  };

  const tick = (now: number) => {
    if (start.current === null || done.current) return;
    const p = Math.min(1, (now - start.current) / holdMs);
    setProgress(p);
    if (p >= 1) {
      done.current = true;
      stop();
      onComplete();
      return;
    }
    frame.current = requestAnimationFrame(tick);
  };

  const begin = () => {
    if (done.current) return;
    start.current = performance.now();
    frame.current = requestAnimationFrame(tick);
  };

  useEffect(() => () => stop(), []);

  return (
    <div className="flex flex-col items-center gap-1">
      <button
        type="button"
        data-testid="reveal-hold"
        className="relative min-h-16 w-full max-w-xs overflow-hidden rounded-2xl bg-[var(--k-ink)] px-6 text-lg font-semibold text-white select-none touch-manipulation"
        onPointerDown={begin}
        onPointerUp={stop}
        onPointerLeave={stop}
        onPointerCancel={stop}
        onContextMenu={(e) => e.preventDefault()}
      >
        <span className="absolute inset-0 origin-[left] bg-[var(--k-gold)]" style={{ transform: `scaleX(${progress})`, opacity: 0.55 }} aria-hidden="true" />
        <span className="relative">{children}</span>
      </button>
      {hint ? <span className="text-xs text-[var(--k-ink-soft)]">{hint}</span> : null}
    </div>
  );
}
