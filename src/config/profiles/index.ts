/** Classes scolaires proposées à la création d'un profil enfant (données, extensibles). */
export const SCHOOL_GRADES = ["CP", "CE1", "CE2", "CM1", "CM2", "6e", "5e", "4e", "3e"] as const;
export type SchoolGrade = (typeof SCHOOL_GRADES)[number];

export function isSchoolGrade(value: string): value is SchoolGrade {
  return (SCHOOL_GRADES as readonly string[]).includes(value);
}
