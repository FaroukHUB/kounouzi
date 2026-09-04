import { z } from "zod";
import { recitationRefSchema } from "@/core/game/config.schema";
import type { RecitationRef } from "@/core/game/types";
import bankJson from "@/content/religion/quran/surah-bank.v1.json";

/**
 * Banque de sourates : RÉFÉRENCES DE RÉCITATION UNIQUEMENT (nom, numéro,
 * niveau de jeu). Aucun verset n'est stocké, affiché ni généré ; le schéma est
 * strict : tout champ de texte inconnu est refusé. `status: validated` signifie
 * seulement que le nom et le numéro sont validés pour le défi oral.
 */
const entrySchema = z.strictObject({
  id: z.string().regex(/^surah_\d{3}$/),
  surah_number: z.number().int().min(1).max(114),
  name_fr: z.string().min(1).max(40),
  name_ar: z.string().min(1).max(40),
  level: z.number().int().min(1).max(5),
  audience_scope: z.literal("all"),
  challenge_types: z.array(z.literal("recitation")).min(1),
  recitation_scope: z.literal("full_surah"),
  content_kind: z.literal("recitation_reference_only"),
  status: z.enum(["validated", "draft"]),
  display_quran_text: z.literal(false),
  source: z.strictObject({ type: z.literal("quran"), surah_number: z.number().int().min(1).max(114) }),
});

const bankSchema = z.strictObject({
  schema_version: z.number().int().positive(),
  bank_id: z.string().min(1),
  description: z.string(),
  rules: z.strictObject({
    no_quran_text_generation: z.literal(true),
    oral_validation_only: z.literal(true),
    speech_recognition: z.literal(false),
    selection_randomness: z.literal(false),
    selection_strategy: z.literal("deterministic_rotation"),
    level_mapping_is_game_difficulty_not_religious_rank: z.literal(true),
  }),
  surahs: z.array(entrySchema).min(1),
});

const bank = bankSchema.parse(bankJson);

/** Toutes les entrées de la banque (contrôle). */
export const SURAH_BANK = bank.surahs;

/** Références validées, servies aux défis de récitation (figées dans chaque partie). */
export const SURAH_RECITATIONS: readonly RecitationRef[] = bank.surahs
  .filter((s) => s.status === "validated" && s.source.surah_number === s.surah_number)
  .map((s) => recitationRefSchema.parse({ id: s.id, surahNumber: s.surah_number, nameFr: s.name_fr, nameAr: s.name_ar, level: s.level }));
