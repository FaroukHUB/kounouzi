import { z } from "zod";
import pronunciationJson from "./pronunciation.v1.json";

/**
 * Lexique de prononciation (données validées) : aide de lecture pour la
 * synthèse vocale, jamais affiché, jamais interprété par les moteurs.
 */
export const pronunciationSchema = z.object({
  version: z.number().int().positive(),
  symbols: z.record(z.string().min(1), z.string()),
  words: z.record(z.string().min(1), z.string().min(1)),
});

export type PronunciationLexicon = Readonly<Pick<z.infer<typeof pronunciationSchema>, "symbols" | "words">>;

const parsed = pronunciationSchema.parse(pronunciationJson);
export const PRONUNCIATION: PronunciationLexicon = { symbols: parsed.symbols, words: parsed.words };
