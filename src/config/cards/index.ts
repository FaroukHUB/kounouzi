import { z } from "zod";
import decksJson from "./decks.v1.json";

/** Zone d'écriture d'une carte, en fraction de sa largeur et de sa hauteur (propriétés logiques). */
const panelSchema = z.object({ start: z.number().min(0).max(1), top: z.number().min(0).max(1), end: z.number().min(0).max(1), bottom: z.number().min(0).max(1) });
export type CardPanel = z.infer<typeof panelSchema>;

const deckSchema = z.object({
  id: z.string().min(1),
  /** Catégories de Savoir servies par ce jeu de cartes. */
  categories: z.array(z.string().min(1)),
  /** Familles de case servies par ce jeu de cartes (Défi, Don…). */
  cells: z.array(z.string().min(1)),
  /** Établissements servis par ce jeu de cartes : la carte d'UN établissement, nom peint sur l'illustration. */
  sites: z.array(z.string().min(1)).default([]),
  back: z.string().min(1),
  face: z.string().min(1),
  /** Vignette carrée (l'illustration seule) pour la CASE du plateau ; absente = la case garde son icône. */
  thumb: z.string().min(1).optional(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  panel: panelSchema.optional(),
});
export type CardDeck = z.infer<typeof deckSchema> & { readonly panel: CardPanel };

const fichier = z.object({ defaultPanel: panelSchema, decks: z.array(deckSchema) }).parse(decksJson);

/** Les jeux de cartes illustrés fournis. Une famille absente garde l'habillage historique. */
export const CARD_DECKS: readonly CardDeck[] = fichier.decks.map((d) => ({ ...d, panel: d.panel ?? fichier.defaultPanel }));

/**
 * Le jeu de cartes d'une carte affichée, DU PLUS PRÉCIS AU PLUS GÉNÉRAL.
 * L'appelant dit ce qui décide : un établissement passe son IDENTIFIANT
 * (la Casbah d'Alger a sa propre carte, son nom est peint dessus), une case
 * Savoir passe sa CATÉGORIE (une question de maths porte la carte
 * Mathématiques), les autres cases passent leur FAMILLE (un Duel ouvre une
 * carte Défi, quelle que soit la matière de la question posée).
 * `undefined` : aucune illustration fournie, habillage historique.
 */
export function deckFor({ siteId, categoryId, cellType }: { readonly siteId?: string | undefined; readonly categoryId?: string | undefined; readonly cellType?: string | undefined }): CardDeck | undefined {
  if (siteId !== undefined) {
    const parSite = CARD_DECKS.find((d) => d.sites.includes(siteId));
    if (parSite) return parSite;
  }
  if (categoryId !== undefined) {
    const parCategorie = CARD_DECKS.find((d) => d.categories.includes(categoryId));
    if (parCategorie) return parCategorie;
  }
  if (cellType !== undefined) return CARD_DECKS.find((d) => d.cells.includes(cellType));
  return undefined;
}
