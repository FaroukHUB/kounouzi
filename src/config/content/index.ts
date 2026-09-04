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
  type GeoFact,
} from "@/core/content";
import categoriesJson from "@/config/categories/categories.v1.json";
import { DEMO_CONTENT_ENABLED } from "@/config/demo";
import bandsJson from "@/config/difficulty/bands.v1.json";
import countriesJson from "@/content/geo/countries.demo.v1.json";
import curatedJson from "@/content/questions/curated.v1.json";
import oussoulJson from "@/content/questions/religion/oussoul-ath-thalatha.v1.json";
import ramadanJson from "@/content/questions/religion/wa-jaa-shahr-ramadan.v1.json";
import durousJson from "@/content/questions/religion/ad-durous-al-mouhimmah.v1.json";

const bilingual = z.object({ fr: z.string().min(1), ar: z.string().min(1) });
/** Énoncé et réponse : français obligatoire, arabe facultatif (ajouté par relecture humaine). */
const frenchFirst = z.object({ fr: z.string().min(1), ar: z.string().min(1).optional() });
const sourceSchema = z.object({ title: z.string().min(1), url: z.string().url().optional(), author: z.string().optional(), retrievedAt: z.string().optional(), pages: z.string().optional(), file: z.string().optional(), publisher: z.string().optional() });

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
      prompt: frenchFirst,
      answer: frenchFirst,
      // Une explication arabe vide n'est tolérée qu'en brouillon : la garde de jouabilité la refuse toujours.
      explanation: z.object({ fr: z.string().min(1), ar: z.string() }),
      sources: z.array(sourceSchema),
      title: z.string().min(1).optional(),
      animationKey: z.string().min(1).optional(),
      animationHint: z.string().min(1).optional(),
      ageBand: z.string().min(1).optional(),
      reviewNotes: z.string().min(1).optional(),
    }),
  ).refine((qs) => qs.every((q) => q.status !== "validated" || q.explanation.ar.trim() !== ""), { message: "une question validée exige une explication arabe" }),
});
const band = z.tuple([z.number().int().min(1).max(5), z.number().int().min(1).max(5)]);
export const bandsSchema = z.object({ child: z.record(z.string(), band), adult: z.record(z.string(), band) });

export const CATEGORIES: readonly CategoryDefinition[] = categoriesSchema.parse(categoriesJson).categories;
const geo = geoCatalogueSchema.parse(countriesJson);
export const GEO_FACTS: readonly GeoFact[] = geo.facts.map((f) => ({ ...f, sources: geo.sources }));
/** Faits réellement validés (banque réelle) : aucun pour l'instant. */
export const VALIDATED_GEO_FACTS: readonly GeoFact[] = GEO_FACTS.filter((f) => f.status === "validated");
/** Banque religieuse « Oussoul ath-Thalatha » : 100 cartes issues du PDF de contrôle humain, toutes `draft` jusqu'à validation explicite. */
export const OUSSOUL_BANK: readonly CuratedQuestion[] = curatedBankSchema.parse(oussoulJson).questions;
/** Banque religieuse « Wa Ja'a Shahr Ramadan » : 25 cartes issues du PDF de contrôle humain, toutes `draft` jusqu'à validation explicite. */
export const RAMADAN_BANK: readonly CuratedQuestion[] = curatedBankSchema.parse(ramadanJson).questions;
/** Banque religieuse « Ad-Durous al-Muhimmah » : 100 cartes issues du document de contrôle humain, toutes `draft` jusqu'à validation explicite. */
export const DUROUS_BANK: readonly CuratedQuestion[] = curatedBankSchema.parse(durousJson).questions;
/** Banques religieuses importées (une par ouvrage), toutes en brouillon à l'import. */
export const RELIGION_BANKS: ReadonlyArray<{ readonly id: string; readonly work: string; readonly questions: readonly CuratedQuestion[]; readonly perLevel: number }> = [
  { id: "oussoul-ath-thalatha", work: "Sharh Thalathat al-Usul", questions: OUSSOUL_BANK, perLevel: 20 },
  { id: "wa-jaa-shahr-ramadan", work: "Wa Ja'a Shahr Ramadan", questions: RAMADAN_BANK, perLevel: 5 },
  { id: "ad-durous-al-mouhimmah", work: "Sharḥ ad-Durūs al-Muhimmah li-ʿĀmmat al-Ummah", questions: DUROUS_BANK, perLevel: 20 },
];
/** Banque curée complète : seules les questions `validated` (et sourcées si la catégorie l'exige) sont jouables. */
export const CURATED_BANK: readonly CuratedQuestion[] = [...curatedBankSchema.parse(curatedJson).questions, ...RELIGION_BANKS.flatMap((b) => b.questions)];
const BANDS = bandsSchema.parse(bandsJson);

export const categoryById = (id: string): CategoryDefinition | undefined => CATEGORIES.find((c) => c.id === id);

export interface DifficultyBand {
  readonly min: number;
  readonly max: number;
}

/** Bande de difficulté d'un profil : uniquement un POINT DE DÉPART (amorçage du Learning Engine), jamais un plafond. */
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
