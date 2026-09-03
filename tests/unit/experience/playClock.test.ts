import { describe, expect, it } from "vitest";
import { startPlayClock } from "@/experience/playClock";

function fakeTimers() {
  const timers: { fn: () => void; ms: number }[] = [];
  let now = 0;
  return {
    now: () => now,
    setInterval: ((fn: () => void, ms: number) => {
      timers.push({ fn, ms });
      return timers.length as unknown as ReturnType<typeof setInterval>;
    }) as typeof setInterval,
    clearInterval: (() => {
      timers.length = 0;
    }) as typeof clearInterval,
    advance(ms: number) {
      for (let elapsed = 0; elapsed < ms; elapsed += 1000) {
        now += 1000;
        for (const t of timers) t.fn();
      }
    },
  };
}

describe("horloge de temps actif (couche session)", () => {
  it("transmet le temps par paquets uniquement quand la partie est active et visible", () => {
    const f = fakeTimers();
    const received: number[] = [];
    let visible = true;
    let active = true;
    const clock = startPlayClock({ isActive: () => active, isVisible: () => visible, onSeconds: (s) => received.push(s), now: f.now, setInterval: f.setInterval, clearInterval: f.clearInterval, flushEveryMs: 5000 });

    f.advance(5000);
    expect(received).toEqual([5]);

    visible = false; // onglet caché : rien n'est compté
    f.advance(10_000);
    expect(received).toEqual([5]);

    visible = true;
    active = false; // pause
    f.advance(10_000);
    expect(received).toEqual([5]);

    active = true;
    f.advance(5000);
    expect(received).toEqual([5, 5]);

    clock.stop();
    expect(received.reduce((a, b) => a + b, 0)).toBe(10);
  });

  it("flush envoie immédiatement le reliquat", () => {
    const f = fakeTimers();
    const received: number[] = [];
    const clock = startPlayClock({ isActive: () => true, isVisible: () => true, onSeconds: (s) => received.push(s), now: f.now, setInterval: f.setInterval, clearInterval: f.clearInterval, flushEveryMs: 60_000 });
    f.advance(3000);
    expect(received).toEqual([]);
    clock.flush();
    expect(received).toEqual([3]);
  });
});
