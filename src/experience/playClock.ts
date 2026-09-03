/**
 * Compte le temps de jeu ACTIF côté session et le transmet au moteur par
 * paquets (`AdvanceClock`). Suspendu quand l'onglet est caché, quand la
 * partie est en pause, ou quand la partie n'est plus en cours. Le moteur ne
 * lit jamais l'horloge lui-même.
 */
export interface PlayClockHandle {
  /** Envoie immédiatement les secondes accumulées (avant une sauvegarde, une pause, un démontage). */
  flush(): void;
  stop(): void;
}

export interface PlayClockOptions {
  readonly isActive: () => boolean;
  readonly isVisible: () => boolean;
  readonly onSeconds: (seconds: number) => void;
  readonly now?: () => number;
  readonly flushEveryMs?: number;
  readonly tickMs?: number;
  readonly setInterval?: typeof globalThis.setInterval;
  readonly clearInterval?: typeof globalThis.clearInterval;
}

export function startPlayClock(options: PlayClockOptions): PlayClockHandle {
  const now = options.now ?? (() => Date.now());
  const flushEvery = options.flushEveryMs ?? 5000;
  const tickMs = options.tickMs ?? 1000;
  const setI = options.setInterval ?? globalThis.setInterval;
  const clearI = options.clearInterval ?? globalThis.clearInterval;

  let lastTick = now();
  let accumulatedMs = 0;
  let sinceFlushMs = 0;

  const flush = () => {
    const seconds = Math.floor(accumulatedMs / 1000);
    if (seconds > 0) {
      accumulatedMs -= seconds * 1000;
      options.onSeconds(seconds);
    }
    sinceFlushMs = 0;
  };

  const timer = setI(() => {
    const current = now();
    const delta = current - lastTick;
    lastTick = current;
    if (!options.isActive() || !options.isVisible()) return;
    accumulatedMs += delta;
    sinceFlushMs += delta;
    if (sinceFlushMs >= flushEvery) flush();
  }, tickMs);

  return {
    flush,
    stop: () => {
      clearI(timer);
      flush();
    },
  };
}
