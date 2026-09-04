/**
 * Manifeste unique des assets visuels (`/public/kounouzi`). Remplacer une
 * illustration = déposer le fichier et changer le chemin ici. Voir
 * `public/kounouzi/README.md` pour la liste des images attendues.
 */
export const ASSETS = {
  boardCenter: "/kounouzi/board/center-placeholder.svg",
  patternTile: "/kounouzi/backgrounds/pattern-tile.svg",
  monumentPlaceholder: "/kounouzi/monuments/placeholder.svg",
  treasureGlow: "/kounouzi/effects/treasure-glow.svg",
  cardBanner: {
    question: "/kounouzi/cards/question.svg",
    heritage: "/kounouzi/cards/heritage.svg",
    event: "/kounouzi/cards/event.svg",
    management: "/kounouzi/cards/management.svg",
    challenge: "/kounouzi/cards/challenge.svg",
    solidarity: "/kounouzi/cards/solidarity.svg",
    treasure: "/kounouzi/cards/treasure.svg",
    halt: "/kounouzi/cards/halt.svg",
    start: "/kounouzi/cards/start.svg",
  },
} as const;

/** Illustration d'un monument : une par identifiant de site quand elle existe, sinon le placeholder. */
export function monumentImage(siteId: string): string {
  void siteId;
  return ASSETS.monumentPlaceholder;
}
