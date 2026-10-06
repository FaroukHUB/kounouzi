import { z } from "zod";
import { LOCALES } from "@/core/shared";
import pronunciationJson from "./pronunciation.v1.json";
import voiceJson from "./voice.v1.json";

/**
 * Lexique de prononciation (données validées) : aide de lecture pour la
 * synthèse vocale de l'appareil, jamais affiché, jamais interprété par les moteurs.
 */
export const pronunciationSchema = z.object({
  version: z.number().int().positive(),
  symbols: z.record(z.string().min(1), z.string()),
  words: z.record(z.string().min(1), z.string().min(1)),
});

export type PronunciationLexicon = Readonly<Pick<z.infer<typeof pronunciationSchema>, "symbols" | "words">>;

const parsed = pronunciationSchema.parse(pronunciationJson);
export const PRONUNCIATION: PronunciationLexicon = { symbols: parsed.symbols, words: parsed.words };

/**
 * Voix en ligne (ADR 0036) : point d'entrée serveur, manifeste des phrases
 * pré-générées, langues servies, longueur maximale, vitesses. Aucune clé ici.
 */
const voiceSettingsSchema = z.object({ stability: z.number().min(0).max(1), similarity_boost: z.number().min(0).max(1), style: z.number().min(0).max(1), use_speaker_boost: z.boolean() });
export type VoiceSettings = z.infer<typeof voiceSettingsSchema>;

export const voiceConfigSchema = z.object({
  version: z.number().int().positive(),
  endpoint: z.string().startsWith("/"),
  manifestUrl: z.string().startsWith("/"),
  languages: z.array(z.enum(LOCALES)).min(1),
  maxTextLength: z.number().int().min(1).max(5000),
  fallbackToDevice: z.boolean(),
  rates: z.object({ slow: z.number().positive(), normal: z.number().positive(), fast: z.number().positive() }),
  /**
   * Ton de la voix chez le fournisseur. Une voix très « stable » lit à plat —
   * c'est ce qui fait dire « on dirait un robot » ; un peu moins de stabilité
   * et un peu de style donnent une voix qui encourage. Données, jamais code.
   */
  voiceSettings: voiceSettingsSchema,
  /** Ton servi quand aucun n'est demandé (ou quand l'identifiant reçu est inconnu). */
  defaultTone: z.string().min(1),
  /**
   * TONS NOMMÉS (ADR 0056). Le ton ne se juge pas en lisant des nombres : il
   * s'écoute. Chaque ton est une donnée, choisie dans les réglages et essayée
   * aussitôt — sans redéploiement. Le navigateur n'envoie que l'identifiant ;
   * les valeurs sont retrouvées ici, côté serveur.
   */
  tones: z
    .array(
      z.object({
        id: z.string().min(1),
        label: z.object({ fr: z.string().min(1), ar: z.string().min(1) }),
        /** Vitesse de lecture propre au ton : un guide pour enfants parle un peu moins vite. */
        rate: z.number().positive(),
        voiceSettings: voiceSettingsSchema,
      }),
    )
    .min(1),
  /** Clés du dictionnaire FR sans gabarit, pré-générées une fois (script `voice:generate`). */
  phrases: z.array(z.string().min(1)),
});
export type VoiceConfig = z.infer<typeof voiceConfigSchema>;
export const VOICE_CONFIG: VoiceConfig = voiceConfigSchema.parse(voiceJson);

export type VoiceTone = VoiceConfig["tones"][number];

/** Le ton demandé, ou celui par défaut ; jamais `undefined` : il y a toujours une voix à servir. */
export function toneOf(id: string | undefined, config: VoiceConfig = VOICE_CONFIG): VoiceTone {
  return config.tones.find((t) => t.id === id) ?? config.tones.find((t) => t.id === config.defaultTone) ?? config.tones[0]!;
}

export const VOICE_TONES: readonly VoiceTone[] = VOICE_CONFIG.tones;
export const DEFAULT_VOICE_TONE = toneOf(VOICE_CONFIG.defaultTone).id;
