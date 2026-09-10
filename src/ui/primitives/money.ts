/** Affichage d'un montant en Kounouz : entier tel quel, sinon deux décimales avec virgule (représentation exacte en centimes côté moteur). */
export function formatKounouz(amount: number): string {
  const cents = Math.round(amount * 100);
  if (cents % 100 === 0) return String(cents / 100);
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  return `${sign}${Math.floor(abs / 100)},${String(abs % 100).padStart(2, "0")}`;
}
