import { z } from "zod";
import avatarsJson from "./avatars.v1.json";

export const AVATAR_SHAPES = ["sun", "leaf", "gem", "star", "shell", "wave", "key", "feather"] as const;
export type AvatarShape = (typeof AVATAR_SHAPES)[number];

export const AVATAR_SEXES = ["garcon", "fille"] as const;
/** Tranches d'âge des personnages. Étiquettes du personnage choisi : elles ne pilotent aucune règle. */
export const AVATAR_AGE_BANDS = ["7-9", "10-12", "13-16", "17+"] as const;

const avatarSchema = z.object({
  id: z.string().min(1),
  color: z.string().regex(/^#[0-9a-f]{6}$/i),
  shape: z.enum(AVATAR_SHAPES),
  sex: z.enum(AVATAR_SEXES),
  ageBand: z.enum(AVATAR_AGE_BANDS),
  /** Portrait (tête + buste) pour les pastilles rondes. */
  portrait: z.string().min(1),
  /** Personnage entier, pour le choix à la création de partie. */
  figure: z.string().min(1),
});
export type Avatar = z.infer<typeof avatarSchema>;

export const AVATARS: readonly Avatar[] = z.object({ avatars: z.array(avatarSchema).min(6) }).parse(avatarsJson).avatars;

/** Avatar par défaut : le premier de la liste. Une partie enregistrée avec un avatar inconnu reste lisible. */
export const DEFAULT_AVATAR_ID = AVATARS[0]!.id;

export function avatarById(id: string): Avatar {
  return AVATARS.find((a) => a.id === id) ?? AVATARS[0]!;
}
