/**
 * Manifeste unique des assets visuels (`/public/kounouzi`). Remplacer une
 * illustration = déposer le fichier et changer le chemin ici. Voir
 * `public/kounouzi/README.md` pour la liste des images attendues.
 */
export const ASSETS = {
  /**
   * Carte illustrée servant de TAPIS à tout le plateau. Carrée (1254 × 1254)
   * et composée POUR lui : tout ce qui porte une information tient dans le
   * carré central, la périphérie n'est que mer et ciel puisqu'elle passe sous
   * les cases. Remplaçable : déposer un fichier, changer ce chemin.
   */
  boardCenter: "/kounouzi/board/center-carte.v3.webp",
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
    donation: "/kounouzi/cards/solidarity.svg",
    hassanat: "/kounouzi/cards/hassanat.svg",
  },
} as const;

/** Illustration d'un établissement : une par identifiant de site quand elle existe, sinon le placeholder (aucun personnage). */
export function monumentImage(siteId: string): string {
  void siteId;
  return ASSETS.monumentPlaceholder;
}
