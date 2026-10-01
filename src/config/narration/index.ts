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
  voiceSettings: z.object({ stability: z.number().min(0).max(1), similarity_boost: z.number().min(0).max(1), style: z.number().min(0).max(1), use_speaker_boost: z.boolean() }),
  /** Clés du dictionnaire FR sans gabarit, pré-générées une fois (script `voice:generate`). */
  phrases: z.array(z.string().min(1)),
});
export type VoiceConfig = z.infer<typeof voiceConfigSchema>;
export const VOICE_CONFIG: VoiceConfig = voiceConfigSchema.parse(voiceJson);
