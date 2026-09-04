import { z } from "zod";
import type { ContentRegistry } from "@/core/content";
import { challengeDefinitionSchema, challengeSettingsSchema } from "@/core/game/config.schema";
import { ALL_CHALLENGES_ON, CHALLENGE_CATEGORIES, CHALLENGE_TOGGLES, type ChallengeDefinition, type ChallengeSettings, type ChallengesConfig } from "@/core/game/types";
import bankJson from "@/content/challenges/family-challenges.v1.json";
import { SURAH_RECITATIONS } from "./surahs";

export { SURAH_BANK, SURAH_RECITATIONS } from "./surahs";

const bankSchema = z.object({
  version: z.number().int().positive(),
  toggles: z.object(Object.fromEntries(CHALLENGE_TOGGLES.map((t) => [t, z.array(z.enum(CHALLENGE_CATEGORIES)).default([])])) as Record<(typeof CHALLENGE_TOGGLES)[number], z.ZodDefault<z.ZodArray<z.ZodEnum<{ [K in (typeof CHALLENGE_CATEGORIES)[number]]: K }>>>>),
  challenges: z.array(challengeDefinitionSchema).min(1),
});

const bank = bankSchema.parse(bankJson);

/** Banque canonique V1 des Défis famille (données importées du PDF de conception). */
export const FAMILY_CHALLENGES: readonly ChallengeDefinition[] = bank.challenges;
export const CHALLENGE_TOGGLE_CATEGORIES: ChallengesConfig["toggles"] = bank.toggles;
export const DEFAULT_CHALLENGE_SETTINGS: ChallengeSettings = challengeSettingsSchema.parse(ALL_CHALLENGES_ON);

/**
 * Configuration des Défis famille figée dans une partie. Le contenu validé
 * disponible est calculé ICI, hors du moteur, depuis le registre : un défi à
 * référence de contenu n'est éligible que si le registre sert déjà du contenu
 * jouable (donc validé) dans la catégorie demandée. Les récitations
 * référencent la banque de sourates validées (noms et numéros seulement) ;
 * leur éligibilité dépend du joueur (niveau, sourates maîtrisées) et se
 * décide dans le moteur.
 */
export function challengesConfigFor(settings: ChallengeSettings, registry: ContentRegistry, definitions: readonly ChallengeDefinition[] = FAMILY_CHALLENGES): ChallengesConfig {
  const categoriesWithContent = new Set([...registry.slots("child"), ...registry.slots("adult")].map((s) => s.categoryId));
  const contentAvailable = definitions
    .filter((d) => {
      const ref = d.contentRef;
      if (!ref) return false;
      if (ref.kind === "validated_recitation") return false; // décidé par joueur dans le moteur (banque figée ci-dessous)
      return ref.categoryId === "any" ? categoriesWithContent.size > 0 : categoriesWithContent.has(ref.categoryId);
    })
    .map((d) => d.id);
  return { definitions, toggles: CHALLENGE_TOGGLE_CATEGORIES, settings, contentAvailable, recitations: SURAH_RECITATIONS };
}
