/**
 * Parcours déterministe d'un intervalle : `index` → valeur, à pas fixe
 * premier avec la taille de l'intervalle. Toutes les valeurs sont visitées
 * avant toute répétition. Ce n'est pas un tirage : même index, même valeur.
 */
export function pickInRange(min: number, max: number, index: number, salt = 0): number {
  const span = max - min + 1;
  if (span <= 0 || !Number.isInteger(index) || index < 0) throw new RangeError(`intervalle ou index invalide [${min}, ${max}] @${index}`);
  const stride = strideFor(span);
  return min + ((index * stride + salt) % span);
}

/** Plus grand entier < span premier avec span (1 si span ≤ 2). */
export function strideFor(span: number): number {
  for (let s = span - 1; s > 1; s -= 1) if (gcd(s, span) === 1) return s;
  return 1;
}

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}
