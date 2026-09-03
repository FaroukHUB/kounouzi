import { z } from "zod";
import avatarsJson from "./avatars.v1.json";

export const AVATAR_SHAPES = ["sun", "leaf", "gem", "star", "shell", "wave", "key", "feather"] as const;
export type AvatarShape = (typeof AVATAR_SHAPES)[number];

const avatarSchema = z.object({ id: z.string().min(1), color: z.string().regex(/^#[0-9a-f]{6}$/i), shape: z.enum(AVATAR_SHAPES) });
export type Avatar = z.infer<typeof avatarSchema>;

export const AVATARS: readonly Avatar[] = z.object({ avatars: z.array(avatarSchema).min(6) }).parse(avatarsJson).avatars;

export function avatarById(id: string): Avatar {
  return AVATARS.find((a) => a.id === id) ?? AVATARS[0]!;
}
