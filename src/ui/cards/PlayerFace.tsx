import { avatarById } from "@/config/avatars";
import type { GameState } from "@/core/game";
import type { PlayerId } from "@/core/shared";
import type { PlayerProfileDraft } from "@/data/ports";
import { AvatarGlyph } from "@/ui/primitives/AvatarGlyph";

/** Avatar + prénom d'un joueur (face-à-face du Duel, choix d'adversaire ou de destinataire). */
export function PlayerFace({ state, profiles, playerId, size = "md", highlight = false }: { readonly state: GameState; readonly profiles: readonly PlayerProfileDraft[]; readonly playerId: PlayerId; readonly size?: "md" | "lg"; readonly highlight?: boolean }) {
  const player = state.players.find((p) => p.id === playerId);
  const avatar = avatarById(profiles.find((d) => d.id === playerId)?.avatarId ?? "amber");
  const dim = size === "lg" ? "size-20" : "size-12";
  return (
    <span className="flex flex-col items-center gap-1" data-testid={`face-${playerId}`}>
      <span className={`flex ${dim} items-center justify-center rounded-full border-[3px] border-white text-white shadow-lg ${highlight ? "ring-4 ring-[var(--k-gold)]" : ""}`} style={{ background: `radial-gradient(circle at 35% 30%, rgba(255,255,255,0.5) 0%, ${avatar.color} 45%)` }}>
        <AvatarGlyph shape={avatar.shape} className={size === "lg" ? "size-10" : "size-6"} />
      </span>
      <span className={`font-display font-black ${size === "lg" ? "text-xl" : "text-sm"}`}>{player?.displayName ?? ""}</span>
    </span>
  );
}
