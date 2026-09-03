/**
 * Modèle joueur — décisions validées en Phase 0.
 *
 * Un joueur est un enfant ou un adulte, avec les mêmes droits dans la partie
 * (pion, argent, patrimoine, questions, progression, score). Les données
 * propres à chaque type vivent dans des extensions séparées ; ce fichier ne
 * porte que les énumérations partagées par tout le noyau.
 */

/** Type de profil. Aucune autre valeur n'existe en V1. */
export const PROFILE_TYPES = ["child", "adult"] as const;
export type ProfileType = (typeof PROFILE_TYPES)[number];

/**
 * Niveau initial d'un joueur adulte. Sert UNIQUEMENT à amorcer et à borner les
 * premières questions ; le niveau réel par catégorie est ensuite appris par le
 * moteur pédagogique et n'est jamais plafonné par cette valeur.
 */
export const ADULT_INITIAL_LEVELS = ["discovery", "standard", "advanced"] as const;
export type AdultInitialLevel = (typeof ADULT_INITIAL_LEVELS)[number];
export const DEFAULT_ADULT_INITIAL_LEVEL: AdultInitialLevel = "standard";

/**
 * Audience d'un contenu. Frontière ABSOLUE : un enfant ne reçoit jamais un
 * contenu `adult`, un adulte ne reçoit jamais un contenu `child`, quelle que
 * soit la situation du vivier (voir `audience.ts`).
 */
export const AUDIENCE_SCOPES = ["all", "child", "adult"] as const;
export type AudienceScope = (typeof AUDIENCE_SCOPES)[number];

/**
 * Mode de validation d'une réponse orale (V1).
 * - `collective` : la tablée décide ensemble après révélation (défaut) ;
 * - `self`       : le joueur actif s'auto-évalue, sur action explicite.
 * Le moteur ne déduit jamais ce mode automatiquement.
 */
export const VALIDATION_MODES = ["collective", "self"] as const;
export type ValidationMode = (typeof VALIDATION_MODES)[number];
export const DEFAULT_VALIDATION_MODE: ValidationMode = "collective";

/** Résultat d'une réponse tel que tranché par la validation. */
export const ANSWER_OUTCOMES = ["correct", "partial", "incorrect"] as const;
export type AnswerOutcome = (typeof ANSWER_OUTCOMES)[number];

/**
 * Maîtrise déclarée de l'explication après une bonne réponse. Enregistrée
 * séparément du résultat ; n'influence jamais la difficulté pédagogique.
 */
export const EXPLANATION_MASTERIES = ["none", "fr", "ar", "both"] as const;
export type ExplanationMastery = (typeof EXPLANATION_MASTERIES)[number];
