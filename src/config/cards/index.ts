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
  back: z.string().min(1),
  face: z.string().min(1),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  panel: panelSchema.optional(),
});
export type CardDeck = z.infer<typeof deckSchema> & { readonly panel: CardPanel };

const fichier = z.object({ defaultPanel: panelSchema, decks: z.array(deckSchema) }).parse(decksJson);

/** Les jeux de cartes illustrés fournis. Une famille absente garde l'habillage historique. */
export const CARD_DECKS: readonly CardDeck[] = fichier.decks.map((d) => ({ ...d, panel: d.panel ?? fichier.defaultPanel }));

/**
 * Le jeu de cartes d'une carte affichée : la CATÉGORIE prime (une question de
 * maths porte la carte Mathématiques), la famille de case sert de repli (Défi,
 * Don). `undefined` : aucune illustration fournie, habillage historique.
 */
export function deckFor({ categoryId, cellType }: { readonly categoryId?: string | undefined; readonly cellType?: string | undefined }): CardDeck | undefined {
  if (categoryId !== undefined) {
    const parCategorie = CARD_DECKS.find((d) => d.categories.includes(categoryId));
    if (parCategorie) return parCategorie;
  }
  if (cellType !== undefined) return CARD_DECKS.find((d) => d.cells.includes(cellType));
  return undefined;
}
