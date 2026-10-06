/**
 * TRANCHE D'ÂGE d'une question (« 5-6 », « 8-10 », « 13+ »).
 *
 * Elle était jusqu'ici une information de CONTRÔLE : écrite dans les banques,
 * lue par personne. Le résultat se mesurait en partie — un enfant de 6 ans
 * recevait régulièrement des questions écrites pour des 8-10 ans, parce que le
 * moteur ne regardait que le NUMÉRO de difficulté, et qu'une difficulté 2 ne
 * veut pas dire le même âge d'une banque à l'autre (religion niveau 2 = 8-10
 * ans, géographie difficulté 2 = 5-6 ou 7-8 ans). Depuis l'ADR 0055, la
 * tranche compte dans la sélection (ADR 0055).
 */
export interface AgeBand {
  readonly min: number;
  readonly max: number;
}

/** `null` quand la tranche est absente ou illisible : aucune question n'est écartée faute d'étiquette. */
export function parseAgeBand(band: string | undefined): AgeBand | null {
  if (!band) return null;
  const ouverte = /^(\d{1,2})\s*\+$/.exec(band.trim());
  if (ouverte) return { min: Number(ouverte[1]), max: Number.POSITIVE_INFINITY };
  const bornee = /^(\d{1,2})\s*-\s*(\d{1,2})$/.exec(band.trim());
  if (!bornee) return null;
  const min = Number(bornee[1]);
  const max = Number(bornee[2]);
  return min <= max ? { min, max } : null;
}

/**
 * Écart en ANNÉES entre un âge et une tranche ; 0 à l'intérieur. `null` quand
 * l'âge est inconnu (adulte) ou la tranche absente : il n'y a alors rien à dire,
 * et surtout rien à pénaliser.
 */
export function ageBandGap(age: number | undefined, band: string | undefined): number | null {
  const bande = parseAgeBand(band);
  if (age === undefined || !bande) return null;
  if (age < bande.min) return bande.min - age;
  if (age > bande.max) return age - bande.max;
  return 0;
}
