import { z } from "zod";
import { hassanatCardDefinitionSchema } from "@/core/game/config.schema";
import type { HassanatCardDefinition, HassanatConfig } from "@/core/game/types";
import bank from "@/content/hassanat/hassanat-cards.v1.json";

/**
 * Banque des Cartes Hassanāt (données validées). Les points Hassanāt sont
 * une mécanique de score du jeu Kounouzi, rien de plus. Coûts et gains :
 * données provisoires jusqu'à décision produit.
 */
const parsed = z.object({ version: z.number().int().positive(), cards: z.array(hassanatCardDefinitionSchema).min(1) }).parse(bank);
export const HASSANAT_CARDS: readonly HassanatCardDefinition[] = parsed.cards;
export const HASSANAT_CONFIG: HassanatConfig = { definitions: HASSANAT_CARDS };
