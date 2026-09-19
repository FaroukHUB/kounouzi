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
import sirahJson from "@/content/questions/religion/sirah-al-urjuzah.v1.json";
import qawaidJson from "@/content/questions/religion/al-qawaid-al-arba.v1.json";
import kalimahJson from "@/content/questions/religion/kalimah-at-tawhid.v1.json";
import geographieJson from "@/content/questions/geography/geographie.v1.json";
import gestionJson from "@/content/questions/management/gestion.v1.json";

const bilingual = z.object({ fr: z.string().min(1), ar: z.string().min(1) });
/** Énoncé et réponse : français obligatoire, arabe facultatif (ajouté par relecture humaine). */
const frenchFirst = z.object({ fr: z.string().min(1), ar: z.string().min(1).optional() });
const sourceSchema = z.object({ title: z.string().min(1), url: z.string().url().optional(), author: z.string().optional(), retrievedAt: z.string().optional(), pages: z.string().optional(), file: z.string().optional(), publisher: z.string().optional(), locator: z.string().optional() });
/**
 * Entrée du CATALOGUE de sources d'une banque : une source institutionnelle
 * décrite une seule fois, nommée par une clé, et rattachée ensuite à toutes
 * les cartes qu'elle couvre (`sourceKeys`). Évite de recopier la même
 * référence trente fois et garde une seule vérité à corriger.
 */
const catalogueSourceSchema = sourceSchema.extend({ key: z.string().min(1) });

export const categoriesSchema = z.object({
  categories: z.array(z.object({ id: z.string().min(1), label: bilingual, visualKey: z.string().min(1), requiresSource: z.boolean(), showsExplanation: z.boolean(), generationMode: z.enum(GENERATION_MODES), active: z.boolean() })).min(1),
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
  /** Catalogue de sources partagées : une même source peut couvrir plusieurs cartes. */
  sources: z.array(catalogueSourceSchema).optional(),
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
      // Une explication vide n'est tolérée qu'en brouillon : la garde de jouabilité la refuse toujours.
      // Une explication absente reste absente : on ne la remplit jamais d'un texte inventé pour satisfaire le schéma.
      explanation: z.object({ fr: z.string(), ar: z.string() }),
      sources: z.array(sourceSchema),
      title: z.string().min(1).optional(),
      animationKey: z.string().min(1).optional(),
      animationHint: z.string().min(1).optional(),
      ageBand: z.string().min(1).optional(),
      reviewNotes: z.string().min(1).optional(),
      arReview: z.enum(["provisional", "reviewed"]).optional(),
      /** Sources du catalogue qui couvrent CETTE carte. Une clé inconnue fait échouer le chargement. */
      sourceKeys: z.array(z.string().min(1)).optional(),
    }),
  )
    .refine((qs) => qs.every((q) => q.status !== "validated" || q.explanation.fr.trim() !== ""), { message: "une question validée exige une explication française" })
    .refine((qs) => qs.every((q) => q.status !== "validated" || q.explanation.ar.trim() !== ""), { message: "une question validée exige une explication arabe" }),
}).superRefine((doc, ctx) => {
  // Une carte ne peut pas se rattacher à une source qui n'existe pas : jamais de référence fantôme.
  const connues = new Set((doc.sources ?? []).map((s) => s.key));
  for (const q of doc.questions) {
    for (const key of q.sourceKeys ?? []) {
      if (!connues.has(key)) ctx.addIssue({ code: "custom", message: `${q.id} cite la source « ${key} », absente du catalogue de la banque` });
    }
  }
});

/**
 * Cartes d'une banque avec leurs sources RÉSOLUES : celles propres à la carte,
 * puis celles du catalogue qu'elle nomme. Le noyau ne connaît que le résultat
 * (`CuratedQuestion.sources`) : la garde de jouabilité reste l'unique porte.
 */
function bankQuestions(doc: z.infer<typeof curatedBankSchema>): readonly CuratedQuestion[] {
  const catalogue = new Map((doc.sources ?? []).map(({ key, ...ref }) => [key, ref]));
  return doc.questions.map(({ sourceKeys, ...question }) => {
    if (sourceKeys === undefined || sourceKeys.length === 0) return question;
    const sources = [...question.sources];
    const vues = new Set(sources.map((s) => s.title));
    for (const key of sourceKeys) {
      const ref = catalogue.get(key);
      if (ref === undefined || vues.has(ref.title)) continue;
      vues.add(ref.title);
      sources.push(ref);
    }
    return { ...question, sources };
  });
}
const band = z.tuple([z.number().int().min(1).max(5), z.number().int().min(1).max(5)]);
export const bandsSchema = z.object({ child: z.array(z.object({ maxAge: z.number().int().min(0).optional(), band })).min(1), adult: z.record(z.string(), band) });

export const CATEGORIES: readonly CategoryDefinition[] = categoriesSchema.parse(categoriesJson).categories;
const geo = geoCatalogueSchema.parse(countriesJson);
export const GEO_FACTS: readonly GeoFact[] = geo.facts.map((f) => ({ ...f, sources: geo.sources }));
/** Faits réellement validés (banque réelle) : aucun pour l'instant. */
export const VALIDATED_GEO_FACTS: readonly GeoFact[] = GEO_FACTS.filter((f) => f.status === "validated");
/** Banque religieuse « Oussoul ath-Thalatha » : 100 cartes issues du PDF de contrôle humain, validées humainement (validation.v1.json). */
export const OUSSOUL_BANK: readonly CuratedQuestion[] = bankQuestions(curatedBankSchema.parse(oussoulJson));
/** Banque religieuse « Wa Ja'a Shahr Ramadan » : 25 cartes issues du PDF de contrôle humain, validées humainement (validation.v1.json). */
export const RAMADAN_BANK: readonly CuratedQuestion[] = bankQuestions(curatedBankSchema.parse(ramadanJson));
/** Banque religieuse « Ad-Durous al-Muhimmah » : 100 cartes issues du document de contrôle humain, validées humainement (validation.v1.json). */
export const DUROUS_BANK: readonly CuratedQuestion[] = bankQuestions(curatedBankSchema.parse(durousJson));
/** Banque religieuse « Sirah — al-Urjuzah al-Mi'iyyah » : 100 cartes issues du PDF de contrôle humain, validées humainement (validation.v1.json). */
export const SIRAH_BANK: readonly CuratedQuestion[] = bankQuestions(curatedBankSchema.parse(sirahJson));
/** Banque religieuse « Al-Qawaid al-Arba » : 25 cartes issues du PDF de contrôle humain, validées humainement (validation.v1.json). */
export const QAWAID_BANK: readonly CuratedQuestion[] = bankQuestions(curatedBankSchema.parse(qawaidJson));
/** Banque religieuse « Kalimah at-Tawhid » : 25 cartes issues du PDF de contrôle humain, validées humainement (validation.v1.json). */
export const KALIMAH_BANK: readonly CuratedQuestion[] = bankQuestions(curatedBankSchema.parse(kalimahJson));
/** Banques religieuses importées (une par ouvrage) : `draft` à l'import, `validated` par la décision humaine appliquée en données. */
export const RELIGION_BANKS: ReadonlyArray<{ readonly id: string; readonly work: string; readonly questions: readonly CuratedQuestion[]; readonly perLevel: number }> = [
  { id: "oussoul-ath-thalatha", work: "Sharh Thalathat al-Usul", questions: OUSSOUL_BANK, perLevel: 20 },
  { id: "wa-jaa-shahr-ramadan", work: "Wa Ja'a Shahr Ramadan", questions: RAMADAN_BANK, perLevel: 5 },
  { id: "ad-durous-al-mouhimmah", work: "Sharḥ ad-Durūs al-Muhimmah li-ʿĀmmat al-Ummah", questions: DUROUS_BANK, perLevel: 20 },
  { id: "sirah-al-urjuzah", work: "Sharḥ al-Urjūzah al-Mi’iyyah fī Dhikr Ḥāl Ashraf al-Bariyyah", questions: SIRAH_BANK, perLevel: 20 },
  { id: "al-qawaid-al-arba", work: "Sharḥ al-Qawāʿid al-Arbaʿ", questions: QAWAID_BANK, perLevel: 5 },
  { id: "kalimah-at-tawhid", work: "Kalimah at-Tawhid: Lā ilāha illā Allāh", questions: KALIMAH_BANK, perLevel: 5 },
];
/**
 * Banque « Géographie V1 » : 30 cartes écrites par l'auteur du jeu, jamais
 * générées (ADR 0038). La géographie exige une source même quand le fait
 * paraît évident ; aucune n'a encore été fournie, donc les 30 cartes restent
 * `draft` et la garde les refuse toutes. Rien n'est servi tant que la
 * vérification humaine n'a pas eu lieu.
 */
export const GEOGRAPHY_BANK: readonly CuratedQuestion[] = bankQuestions(curatedBankSchema.parse(geographieJson));
/**
 * Banque « Gestion V1 » : 30 cartes statiques écrites et contrôlées par
 * l'auteur du jeu, jamais générées (ADR 0039). La catégorie n'exige pas de
 * source — une carte y énonce un raisonnement de gestion, pas un fait
 * vérifiable contre une référence externe — et son comportement est conservé.
 * L'arabe reste `provisional` en attendant la relecture humaine.
 */
export const MANAGEMENT_BANK: readonly CuratedQuestion[] = bankQuestions(curatedBankSchema.parse(gestionJson));
/** Banque curée complète : seules les questions `validated` (et sourcées si la catégorie l'exige) sont jouables. */
export const CURATED_BANK: readonly CuratedQuestion[] = [...bankQuestions(curatedBankSchema.parse(curatedJson)), ...RELIGION_BANKS.flatMap((b) => b.questions), ...GEOGRAPHY_BANK, ...MANAGEMENT_BANK];
const BANDS = bandsSchema.parse(bandsJson);

export const categoryById = (id: string): CategoryDefinition | undefined => CATEGORIES.find((c) => c.id === id);

export interface DifficultyBand {
  readonly min: number;
  readonly max: number;
}

/** Bande de difficulté d'un profil : uniquement un POINT DE DÉPART (amorçage du Learning Engine), jamais un plafond. */
/** Bande d'amorçage : par ÂGE pour un enfant (âge inconnu = la plus jeune), par niveau initial pour un adulte. */
export function difficultyBandFor(profile: { readonly profileType: ProfileType; readonly age?: number | undefined; readonly initialLevel?: AdultInitialLevel | undefined }): DifficultyBand {
  const entry =
    profile.profileType === "child"
      ? (profile.age === undefined ? BANDS.child[0] : BANDS.child.find((b) => b.maxAge === undefined || profile.age! <= b.maxAge))?.band
      : BANDS.adult[profile.initialLevel ?? "standard"];
  const [min, max] = entry ?? [2, 4];
  return { min, max };
}

let registry: ContentRegistry | null = null;
/** Registre de contenu de l'application (construit une fois, données validées au chargement). */
export function contentRegistry(): ContentRegistry {
  registry ??= createContentRegistry(CATEGORIES, [
    createAlgorithmicProvider(),
    // Régime factuel conservé (contrat et tests) mais plus branché sur aucune catégorie : depuis l'ADR 0038
    // la géographie est une banque contrôlée. Les faits de démonstration restent « unverified », jamais promus.
    createFactualProvider(GEO_FACTS, { allowUnverified: DEMO_CONTENT_ENABLED }),
    createCuratedProvider(CURATED_BANK, CATEGORIES),
  ]);
  return registry;
}
