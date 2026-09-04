/**
 * Arithmétique de dates ISO. Le noyau ne lit JAMAIS l'horloge : `now` lui est
 * toujours injecté (commande, paramètre, fixture). Ici, uniquement des calculs.
 */
const DAY_MS = 86_400_000;

export function parseIso(iso: string): number {
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) throw new RangeError(`date ISO invalide : ${iso}`);
  return ms;
}

export function addDays(iso: string, days: number): string {
  return new Date(parseIso(iso) + days * DAY_MS).toISOString();
}

export function daysBetween(fromIso: string, toIso: string): number {
  return (parseIso(toIso) - parseIso(fromIso)) / DAY_MS;
}

export const isDue = (nextDueAt: string | null, now: string): boolean => nextDueAt !== null && parseIso(nextDueAt) <= parseIso(now);
