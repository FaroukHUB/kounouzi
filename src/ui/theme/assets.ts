/**
 * Manifeste unique des assets visuels (`/public/kounouzi`). Remplacer une
 * illustration = déposer le fichier et changer le chemin ici. Voir
 * `public/kounouzi/README.md` pour la liste des images attendues.
 */
export const ASSETS = {
  /**
   * Illustration servant de TAPIS à tout le plateau, ET de fond de page sous un
   * voile sombre. Carrée (1254 × 1254). Remplaçable : déposer un fichier,
   * changer ce chemin — et `app/globals.css`, que le CSS ne peut pas lire d'ici
   * ; un test vérifie que les deux disent la même chose.
   *
   * La règle d'origine voulait que tout ce qui porte une information tienne
   * dans le carré central, la périphérie n'étant que mer et ciel puisqu'elle
   * passe sous les cases. Depuis la v6, L'AUTEUR A TRANCHÉ AUTREMENT et il faut
   * le savoir avant de « corriger » quoi que ce soit (ADR 0058) :
   *
   * - L'illustration porte SON LOGO en plein centre. Il tombe donc dans la zone
   *   réservée au panneau du Chemin (lignes 2 à 7, colonnes 2 à 7 : de 157 à
   *   1097 px sur 1254), et le panneau se pose dessus quand la tablée découvre
   *   son chemin. Assumé.
   * - Comme la même image sert de fond de page, ce logo réapparaît en grand
   *   derrière le plateau, surtout sur téléphone. Assumé aussi.
   * - Elle ne nomme plus les neuf pays du voyage, que l'ancienne carte portait
   *   et qui reliaient le plateau aux questions de géographie. Assumé : l'image
   *   primait, et les questions ne dépendent pas du plateau.
   */
  boardCenter: "/kounouzi/board/center-carte.v6.webp",
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
