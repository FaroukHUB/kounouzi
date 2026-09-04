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

/**
 * Identité IMMUABLE et versionnée d'une question distribuée. Une fois servie,
 * elle ne change plus : une mise à jour de contenu (catalogue, générateur,
 * banque) ne modifie jamais rétroactivement une question commencée.
 * Pour l'algorithmique, `params` contient les valeurs réellement instanciées
 * (ex. `{ a: 7, b: 8 }`), jamais seulement « difficulté 3, multiplication ».
 */
export type QuestionRef =
  | { readonly origin: "curated"; readonly questionId: string; readonly contentVersion: number }
  | {
      readonly origin: "algorithmic";
      readonly generatorId: string;
      readonly generatorVersion: number;
      readonly knowledgeNodeId: string;
      readonly difficulty: number;
      readonly params: Readonly<Record<string, number | string>>;
    }
  | { readonly origin: "factual"; readonly factId: string; readonly factVersion: number; readonly templateId: string; readonly templateVersion: number };

/** Clé stable d'une référence (départage déterministe, anti-répétition). */
export function questionRefKey(ref: QuestionRef): string {
  switch (ref.origin) {
    case "curated":
      return `curated:${ref.questionId}@${ref.contentVersion}`;
    case "algorithmic":
      return `algorithmic:${ref.generatorId}@${ref.generatorVersion}:${Object.keys(ref.params)
        .sort()
        .map((k) => `${k}=${String(ref.params[k])}`)
        .join(",")}`;
    case "factual":
      return `factual:${ref.factId}@${ref.factVersion}:${ref.templateId}@${ref.templateVersion}`;
  }
}

/** Qualité linguistique, distincte de la justesse du contenu : l'arabe généré reste `provisional` tant qu'une relecture humaine n'a pas eu lieu. */
export interface LinguisticReview {
  readonly ar: "provisional" | "reviewed";
}

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
  readonly review: LinguisticReview;
}

/**
 * Instantané figé dans `GameState` quand la question est distribuée : identité
 * versionnée + contenu servi. Suffisant pour reprendre EXACTEMENT la même
 * question après toute modification de contenu, sans dupliquer la banque.
 */
export type ServedQuestion = QuestionInstance;

export interface QuestionRequest {
  readonly categoryId: CategoryId;
  readonly difficulty: number;
  readonly profileType: ProfileType;
  /** Compteur déterministe (numéro de demande) : jamais un tirage. */
  readonly variation: number;
}

/**
 * Une question POTENTIELLE vue par le Learning Engine : une notion, une
 * difficulté, une audience, et une instanciation déterministe (la variation
 * est un compteur, jamais un tirage). Un créneau curé ou factuel n'a qu'une
 * formulation ; un créneau algorithmique en produit autant qu'on lui demande.
 */
export interface KnowledgeSlot {
  /** Identifiant stable et unique dans le registre (départage déterministe). */
  readonly slotId: string;
  readonly categoryId: CategoryId;
  readonly knowledgeNodeId: string;
  readonly difficulty: number;
  readonly audienceScope: AudienceScope;
  instantiate(variation: number): QuestionInstance | null;
}

/** Un fournisseur par régime. Même contrat, aucune connaissance de l'origine côté interface. */
export interface ContentProvider {
  readonly mode: GenerationMode;
  supports(categoryId: CategoryId): boolean;
  /** `null` si aucune question appropriée n'existe : la catégorie est alors ignorée, jamais remplie artificiellement. */
  resolve(request: QuestionRequest): QuestionInstance | null;
  /** Tous les créneaux jouables par ce profil (frontière d'audience déjà appliquée), dans un ordre stable. */
  slots(profileType: ProfileType): readonly KnowledgeSlot[];
}

export const CURATED_STATUSES = ["draft", "generated", "to_verify", "validated", "rejected", "archived"] as const;
export type CuratedStatus = (typeof CURATED_STATUSES)[number];

/** Question de la banque curée (religion, histoire, arabe, culture…). */
export interface CuratedQuestion {
  readonly id: string;
  readonly version: number;
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
