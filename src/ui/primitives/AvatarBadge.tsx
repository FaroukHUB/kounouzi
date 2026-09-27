import type { Avatar } from "@/config/avatars";

/**
 * Pastille ronde d'un personnage : son portrait sur un disque de SA couleur.
 * La couleur reste la marque du joueur (pion, halo, liseré de propriété), le
 * portrait dit qui il est. Même pastille partout : barre d'action, tuiles,
 * cartes, face-à-face du Duel.
 */
export function AvatarBadge({ avatar, color, className = "", alt = "" }: { readonly avatar: Avatar; readonly color?: string | undefined; readonly className?: string; readonly alt?: string }) {
  return (
    <span
      data-avatar={avatar.id}
      className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-white shadow ${className}`}
      style={{ background: `radial-gradient(circle at 35% 30%, rgba(255,255,255,0.55) 0%, ${color ?? avatar.color} 45%)` }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- pastille de taille fixe, image déjà dimensionnée (512 px) : l'optimiseur n'apporte rien */}
      <img src={avatar.portrait} alt={alt} aria-hidden={alt ? undefined : true} className="size-full object-cover" decoding="async" />
    </span>
  );
}
