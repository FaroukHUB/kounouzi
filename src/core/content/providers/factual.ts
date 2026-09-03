import { isAudienceAllowed } from "@/core/shared";
import type { Bilingual, ContentProvider, QuestionInstance, QuestionRequest, SourceRef } from "@/core/content/types";

export const GEOGRAPHY_CATEGORY_ID = "geography";
export const GEO_TEMPLATE_VERSION = 1;

export const FACT_STATUSES = ["unverified", "validated"] as const;
export type FactStatus = (typeof FACT_STATUSES)[number];

/**
 * Un fait géographique : une donnée → plusieurs questions par gabarit.
 * Pour la banque réelle : `status = "validated"`, source(s), `verifiedAt`,
 * `version`. Un fait `unverified` n'est jouable qu'en mode démonstration
 * explicite ; il n'est JAMAIS promu automatiquement, même s'il paraît évident.
 */
export interface GeoFact {
  readonly id: string;
  readonly version: number;
  readonly status: FactStatus;
  readonly verifiedAt?: string | undefined;
  readonly country: Bilingual;
  readonly capital: Bilingual;
  readonly continent: Bilingual;
  /** Difficulté de base du fait (la capitale) ; les autres gabarits s'en déduisent. */
  readonly difficulty: number;
  readonly sources: readonly SourceRef[];
  /** Qualité linguistique des noms arabes (provisoire jusqu'à relecture). */
  readonly review?: { readonly ar: "provisional" | "reviewed" } | undefined;
}

/** Ce qui manque à un fait pour être jouable dans la banque réelle. */
export function factPlayabilityIssues(fact: GeoFact): readonly string[] {
  const issues: string[] = [];
  if (fact.status !== "validated") issues.push(`statut ${fact.status} ≠ validated`);
  if (fact.sources.length === 0) issues.push("source manquante");
  if (!fact.verifiedAt) issues.push("date de vérification manquante");
  if (!Number.isInteger(fact.version) || fact.version < 1) issues.push("version manquante");
  return issues;
}

export interface FactualProviderOptions {
  /** Mode DÉMONSTRATION développeur uniquement : accepte les faits `unverified`. Jamais pour la banque réelle. */
  readonly allowUnverified: boolean;
}

interface Template {
  readonly id: string;
  readonly difficultyOffset: number;
  readonly node: (f: GeoFact) => string;
  readonly prompt: (f: GeoFact) => Bilingual;
  readonly answer: (f: GeoFact) => Bilingual;
  readonly explanation: (f: GeoFact) => Bilingual;
}

/** Gabarits bilingues. Aucun contenu inventé : tout vient du fait. */
export const GEO_TEMPLATES: readonly Template[] = [
  {
    id: "geo.capital_of",
    difficultyOffset: 0,
    node: (f) => `geo.country.${f.id}.capital`,
    prompt: (f) => ({ fr: `Quelle est la capitale de ${withArticle(f.country.fr)} ?`, ar: `ما هي عاصمة ${f.country.ar}؟` }),
    answer: (f) => ({ fr: f.capital.fr, ar: f.capital.ar }),
    explanation: (f) => ({ fr: `La capitale de ${withArticle(f.country.fr)} est ${f.capital.fr}.`, ar: `عاصمة ${f.country.ar} هي ${f.capital.ar}.` }),
  },
  {
    id: "geo.country_of_capital",
    difficultyOffset: 1,
    node: (f) => `geo.country.${f.id}.capital`,
    prompt: (f) => ({ fr: `${f.capital.fr} est la capitale de quel pays ?`, ar: `${f.capital.ar} عاصمة أي بلد؟` }),
    answer: (f) => ({ fr: f.country.fr, ar: f.country.ar }),
    explanation: (f) => ({ fr: `${f.capital.fr} est la capitale de ${withArticle(f.country.fr)}.`, ar: `${f.capital.ar} هي عاصمة ${f.country.ar}.` }),
  },
  {
    id: "geo.continent_of",
    difficultyOffset: 0,
    node: (f) => `geo.country.${f.id}.continent`,
    prompt: (f) => ({ fr: `Sur quel continent se trouve ${withArticle(f.country.fr)} ?`, ar: `في أي قارة يقع ${f.country.ar}؟` }),
    answer: (f) => ({ fr: f.continent.fr, ar: f.continent.ar }),
    explanation: (f) => ({ fr: `${capitalize(withArticle(f.country.fr))} se trouve en ${f.continent.fr}.`, ar: `يقع ${f.country.ar} في ${f.continent.ar}.` }),
  },
];

/** Article contracté français minimal (« l'Algérie », « la Tunisie », « le Maroc », « les Émirats »). Le catalogue porte le nom avec son article. */
const withArticle = (name: string) => name;
const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function createFactualProvider(allFacts: readonly GeoFact[], options: FactualProviderOptions = { allowUnverified: false }): ContentProvider {
  const facts = allFacts.filter((f) => (options.allowUnverified ? f.status === "unverified" || factPlayabilityIssues(f).length === 0 : factPlayabilityIssues(f).length === 0));
  return {
    mode: "factual",
    supports: (categoryId) => categoryId === GEOGRAPHY_CATEGORY_ID && facts.length > 0,
    resolve: (request: QuestionRequest): QuestionInstance | null => {
      if (request.categoryId !== GEOGRAPHY_CATEGORY_ID || !isAudienceAllowed("all", request.profileType)) return null;
      // Candidats (fait × gabarit) dans une fenêtre de difficulté, ordre stable ; parcours par le compteur.
      const candidates = facts.flatMap((f) => GEO_TEMPLATES.map((tpl) => ({ f, tpl, d: Math.min(5, f.difficulty + tpl.difficultyOffset) }))).filter((c) => Math.abs(c.d - request.difficulty) <= 1);
      const pool = candidates.length > 0 ? candidates : facts.flatMap((f) => GEO_TEMPLATES.map((tpl) => ({ f, tpl, d: Math.min(5, f.difficulty + tpl.difficultyOffset) })));
      const pick = pool[request.variation % pool.length];
      if (!pick) return null;
      return {
        ref: { origin: "factual", factId: pick.f.id, factVersion: pick.f.version, templateId: pick.tpl.id, templateVersion: GEO_TEMPLATE_VERSION },
        categoryId: GEOGRAPHY_CATEGORY_ID,
        knowledgeNodeId: pick.tpl.node(pick.f),
        difficulty: pick.d,
        audienceScope: "all",
        prompt: pick.tpl.prompt(pick.f),
        answer: pick.tpl.answer(pick.f),
        explanation: pick.tpl.explanation(pick.f),
        sources: pick.f.sources,
        review: { ar: pick.f.review?.ar ?? "provisional" },
      };
    },
  };
}
