import { avatarById, DEFAULT_AVATAR_ID } from "@/config/avatars";
import type { GameState } from "@/core/game";
import type { PlayerId } from "@/core/shared";
import type { PlayerProfileDraft } from "@/data/ports";
import { AvatarBadge } from "@/ui/primitives/AvatarBadge";

/** Avatar + prénom d'un joueur (face-à-face du Duel, choix d'adversaire ou de destinataire). */
export function PlayerFace({ state, profiles, playerId, size = "md", highlight = false }: { readonly state: GameState; readonly profiles: readonly PlayerProfileDraft[]; readonly playerId: PlayerId; readonly size?: "md" | "lg"; readonly highlight?: boolean }) {
  const player = state.players.find((p) => p.id === playerId);
  const avatar = avatarById(profiles.find((d) => d.id === playerId)?.avatarId ?? DEFAULT_AVATAR_ID);
  const dim = size === "lg" ? "size-20" : "size-12";
  return (
    <span className="flex flex-col items-center gap-1" data-testid={`face-${playerId}`}>
      <AvatarBadge avatar={avatar} className={`${dim} border-[3px] shadow-lg ${highlight ? "ring-4 ring-[var(--k-gold)]" : ""}`} />
      <span className={`font-display font-black ${size === "lg" ? "text-xl" : "text-sm"}`}>{player?.displayName ?? ""}</span>
    </span>
  );
}
