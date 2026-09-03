import type { AudienceScope, ProfileType } from "@/core/shared";

/** Texte bilingue. Les deux langues sont OBLIGATOIRES pour toute explication (ADR 0004). */
export interface Bilingual {
  readonly fr: string;
  readonly ar: string;
}

export type CategoryId = string;

export const GENERATION_MODES = ["curated", "algorithmic", "factual"] as const;
export type GenerationMode = (typeof GENERATION_MODES)[number];

export interface CategoryDefinition {
  readonly id: CategoryId;
  readonly label: Bilingual;
  readonly visualKey: string;
  /** `true` (religion) : aucune question publiable sans source primaire. */
  readonly requiresSource: boolean;
  readonly generationMode: GenerationMode;
  readonly active: boolean;
}

/** Source consultable par le parent. Jamais inventée ; l'URL peut être absente, jamais fictive. */
export interface SourceRef {
  readonly title: string;
  readonly url?: string | undefined;
  readonly author?: string | undefined;
  readonly retrievedAt?: string | undefined;
}

/** Identité stable d'une question jouée, quelle que soit son origine (mémoire pédagogique, Phase 5). */
export type QuestionRef =
  | { readonly kind: "curated"; readonly questionId: string }
  | { readonly kind: "algorithmic"; readonly generatorId: string; readonly version: number; readonly variation: number }
  | { readonly kind: "factual"; readonly templateId: string; readonly factId: string };

/** Ce que l'interface affiche et ce que la mémoire enregistrera. Forme unique pour les trois régimes. */
export interface QuestionInstance {
  readonly ref: QuestionRef;
  readonly categoryId: CategoryId;
  readonly knowledgeNodeId: string;
  readonly difficulty: number;
  readonly audienceScope: AudienceScope;
  readonly prompt: Bilingual;
  readonly answer: Bilingual;
  readonly explanation: Bilingual;
  readonly sources: readonly SourceRef[];
}

export interface QuestionRequest {
  readonly categoryId: CategoryId;
  readonly difficulty: number;
  readonly profileType: ProfileType;
  /** Compteur déterministe (numéro de demande) : jamais un tirage. */
  readonly variation: number;
}

/** Un fournisseur par régime. Même contrat, aucune connaissance de l'origine côté interface. */
export interface ContentProvider {
  readonly mode: GenerationMode;
  supports(categoryId: CategoryId): boolean;
  /** `null` si aucune question appropriée n'existe : la catégorie est alors ignorée, jamais remplie artificiellement. */
  resolve(request: QuestionRequest): QuestionInstance | null;
}

export const CURATED_STATUSES = ["draft", "generated", "to_verify", "validated", "rejected", "archived"] as const;
export type CuratedStatus = (typeof CURATED_STATUSES)[number];

/** Question de la banque curée (religion, histoire, arabe, culture…). */
export interface CuratedQuestion {
  readonly id: string;
  readonly categoryId: CategoryId;
  readonly knowledgeNodeId: string;
  readonly difficulty: number;
  readonly audienceScope: AudienceScope;
  readonly status: CuratedStatus;
  readonly prompt: Bilingual;
  readonly answer: Bilingual;
  readonly explanation: Bilingual;
  readonly sources: readonly SourceRef[];
}
