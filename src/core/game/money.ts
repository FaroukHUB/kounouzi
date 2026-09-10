/**
 * Arithmétique monétaire EXACTE. Les Kounouz sont manipulés en centimes
 * entiers (1 Kounouz = 100 centimes) puis rendus en nombre à deux décimales :
 * aucune erreur flottante ne peut s'accumuler dans le grand livre. Toute
 * règle qui additionne, plafonne ou prend un pourcentage passe par ici.
 */
export const CENTS_PER_KOUNOUZ = 100;

/** Kounouz → centimes entiers (arrondi au centime le plus proche). */
export const toCents = (kounouz: number): number => Math.round(kounouz * CENTS_PER_KOUNOUZ);
/** Centimes entiers → Kounouz (au plus deux décimales). */
export const fromCents = (cents: number): number => cents / CENTS_PER_KOUNOUZ;
/** Normalise un montant à deux décimales. */
export const roundMoney = (kounouz: number): number => fromCents(toCents(kounouz));
export const addMoney = (a: number, b: number): number => fromCents(toCents(a) + toCents(b));
export const sumMoney = (values: readonly number[]): number => fromCents(values.reduce((s, v) => s + toCents(v), 0));
/** Un montant valide : fini et exprimable en centimes entiers. */
export const isMoney = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value) && Math.abs(value * CENTS_PER_KOUNOUZ - Math.round(value * CENTS_PER_KOUNOUZ)) < 1e-6;

/**
 * Pourcentage exact d'une base : `rate` (0..1) est porté en millionièmes
 * entiers, le produit reste entier, l'arrondi final se fait au centime
 * (demi-centime arrondi vers le haut). 2,5 % de 1000 = 25 ; de 1005 = 25,13.
 */
export function percentOf(base: number, rate: number): number {
  const millionths = Math.round(rate * 1_000_000);
  return fromCents(Math.round((toCents(base) * millionths) / 1_000_000));
}
