import { z } from "zod";
import { AUDIENCE_SCOPES, type AdultInitialLevel, type ProfileType } from "@/core/shared";
import {
  CURATED_STATUSES,
  FACT_STATUSES,
  GENERATION_MODES,
  createAlgorithmicProvider,
  createContentRegistry,
  createCuratedProvider,
  createFactualProvider,
  type CategoryDefinition,
  type ContentRegistry,
  type CuratedQuestion,
  type DifficultyBand,
  type GeoFact,
} from "@/core/content";
import categoriesJson from "@/config/categories/categories.v1.json";
import { DEMO_CONTENT_ENABLED } from "@/config/demo";
import bandsJson from "@/config/difficulty/bands.v1.json";
import countriesJson from "@/content/geo/countries.demo.v1.json";
import curatedJson from "@/content/questions/curated.v1.json";

const bilingual = z.object({ fr: z.string().min(1), ar: z.string().min(1) });
const sourceSchema = z.object({ title: z.string().min(1), url: z.string().url().optional(), author: z.string().optional(), retrievedAt: z.string().optional() });

export const categoriesSchema = z.object({
  categories: z.array(z.object({ id: z.string().min(1), label: bilingual, visualKey: z.string().min(1), requiresSource: z.boolean(), generationMode: z.enum(GENERATION_MODES), active: z.boolean() })).min(1),
});
const review = z.object({ ar: z.enum(["provisional", "reviewed"]) }).optional();
export const geoCatalogueSchema = z.object({
  version: z.number().int().positive(),
  sources: z.array(sourceSchema),
  facts: z
    .array(
      z.object({
        id: z.string().min(1),
        version: z.number().int().positive(),
        status: z.enum(FACT_STATUSES),
        verifiedAt: z.string().optional(),
        country: bilingual,
        capital: bilingual,
        continent: bilingual,
        difficulty: z.number().int().min(1).max(5),
        review,
      }),
    )
    .min(1),
});
export const curatedBankSchema = z.object({
  version: z.number().int().positive(),
  questions: z.array(
    z.object({
      id: z.string().min(1),
      version: z.number().int().positive(),
      categoryId: z.string().min(1),
      knowledgeNodeId: z.string().min(1),
      difficulty: z.number().int().min(1).max(5),
      audienceScope: z.enum(AUDIENCE_SCOPES),
      status: z.enum(CURATED_STATUSES),
      prompt: bilingual,
      answer: bilingual,
      explanation: bilingual,
      sources: z.array(sourceSchema),
    }),
  ),
});
const band = z.tuple([z.number().int().min(1).max(5), z.number().int().min(1).max(5)]);
export const bandsSchema = z.object({ child: z.record(z.string(), band), adult: z.record(z.string(), band) });

export const CATEGORIES: readonly CategoryDefinition[] = categoriesSchema.parse(categoriesJson).categories;
const geo = geoCatalogueSchema.parse(countriesJson);
export const GEO_FACTS: readonly GeoFact[] = geo.facts.map((f) => ({ ...f, sources: geo.sources }));
/** Faits réellement validés (banque réelle) : aucun pour l'instant. */
export const VALIDATED_GEO_FACTS: readonly GeoFact[] = GEO_FACTS.filter((f) => f.status === "validated");
export const CURATED_BANK: readonly CuratedQuestion[] = curatedBankSchema.parse(curatedJson).questions;
const BANDS = bandsSchema.parse(bandsJson);

export const categoryById = (id: string): CategoryDefinition | undefined => CATEGORIES.find((c) => c.id === id);

/** Bande de difficulté provisoire d'un profil (Phase 4) ; remplacée par le Learning Engine en Phase 5. */
export function difficultyBandFor(profile: { readonly profileType: ProfileType; readonly schoolGrade?: string | undefined; readonly initialLevel?: AdultInitialLevel | undefined }): DifficultyBand {
  const entry = profile.profileType === "child" ? BANDS.child[profile.schoolGrade ?? ""] : BANDS.adult[profile.initialLevel ?? "standard"];
  const [min, max] = entry ?? [2, 4];
  return { min, max };
}

let registry: ContentRegistry | null = null;
/** Registre de contenu de l'application (construit une fois, données validées au chargement). */
export function contentRegistry(): ContentRegistry {
  registry ??= createContentRegistry(CATEGORIES, [
    createAlgorithmicProvider(),
    // Faits de démonstration « unverified » acceptés UNIQUEMENT derrière le drapeau explicite ; jamais promus « validated ».
    createFactualProvider(GEO_FACTS, { allowUnverified: DEMO_CONTENT_ENABLED }),
    createCuratedProvider(CURATED_BANK, CATEGORIES),
  ]);
  return registry;
}
