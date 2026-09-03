import { isAudienceAllowed } from "@/core/shared";
import type { Bilingual, ContentProvider, QuestionInstance, QuestionRequest, SourceRef } from "@/core/content/types";

export const GEOGRAPHY_CATEGORY_ID = "geography";

/** Un fait géographique vérifié : une donnée → plusieurs questions par gabarit. */
export interface GeoFact {
  readonly id: string;
  readonly country: Bilingual;
  readonly capital: Bilingual;
  readonly continent: Bilingual;
  /** Difficulté de base du fait (la capitale) ; les autres gabarits s'en déduisent. */
  readonly difficulty: number;
  readonly sources: readonly SourceRef[];
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

export function createFactualProvider(facts: readonly GeoFact[]): ContentProvider {
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
        ref: { kind: "factual", templateId: pick.tpl.id, factId: pick.f.id },
        categoryId: GEOGRAPHY_CATEGORY_ID,
        knowledgeNodeId: pick.tpl.node(pick.f),
        difficulty: pick.d,
        audienceScope: "all",
        prompt: pick.tpl.prompt(pick.f),
        answer: pick.tpl.answer(pick.f),
        explanation: pick.tpl.explanation(pick.f),
        sources: pick.f.sources,
      };
    },
  };
}
