import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { FAMILY_CHALLENGES, SURAH_BANK, SURAH_RECITATIONS, challengesConfigFor, DEFAULT_CHALLENGE_SETTINGS } from "@/config/challenges";
import { contentRegistry } from "@/config/content";
import { recitationRefSchema } from "@/core/game";

const root = fileURLToPath(new URL("../../../", import.meta.url));

describe("banque de sourates : références de récitation uniquement", () => {
  it("38 entrées, identifiants et numéros uniques, toutes validées, aucun affichage de texte coranique", () => {
    expect(SURAH_BANK).toHaveLength(38);
    expect(new Set(SURAH_BANK.map((s) => s.surah_number)).size).toBe(38);
    expect(new Set(SURAH_BANK.map((s) => s.id)).size).toBe(38);
    for (const s of SURAH_BANK) {
      expect(s.status, s.id).toBe("validated");
      expect(s.display_quran_text, s.id).toBe(false);
      expect(s.content_kind, s.id).toBe("recitation_reference_only");
      expect(s.id, s.id).toBe(`surah_${String(s.surah_number).padStart(3, "0")}`);
    }
    expect(SURAH_RECITATIONS).toHaveLength(38);
    expect(SURAH_RECITATIONS.find((r) => r.id === "surah_001")).toEqual({ id: "surah_001", surahNumber: 1, nameFr: "Al-Fātiḥah", nameAr: "الفاتحة", level: 1 });
  });

  it("aucun texte de verset : seuls nom, numéro et niveau existent ; le schéma strict refuse tout champ de texte", () => {
    const raw = JSON.parse(readFileSync(join(root, "src/content/religion/quran/surah-bank.v1.json"), "utf8")) as { surahs: Record<string, unknown>[] };
    const allowed = new Set(["id", "surah_number", "name_fr", "name_ar", "level", "audience_scope", "challenge_types", "recitation_scope", "content_kind", "status", "display_quran_text", "source"]);
    for (const s of raw.surahs) for (const key of Object.keys(s)) expect(allowed.has(key), key).toBe(true);
    // Un nom reste court : jamais un verset.
    for (const r of SURAH_RECITATIONS) {
      expect(r.nameAr.length).toBeLessThanOrEqual(12);
      expect(r.nameFr.length).toBeLessThanOrEqual(20);
    }
    expect(recitationRefSchema.safeParse({ id: "surah_001", surahNumber: 1, nameFr: "Al-Fātiḥah", nameAr: "الفاتحة", level: 1, text: "…" }).success).toBe(false);
  });

  it("aucune génération de Coran : rien dans le code ne construit, télécharge ou synthétise un verset ; aucun hasard dans la sélection", () => {
    const walk = (dir: string): string[] => readdirSync(dir).flatMap((n) => (statSync(join(dir, n)).isDirectory() ? walk(join(dir, n)) : /\.(ts|tsx|mjs)$/.test(n) ? [join(dir, n)] : []));
    const sources = [...walk(join(root, "src")), ...walk(join(root, "scripts"))].map((f) => readFileSync(f, "utf8"));
    for (const src of sources) {
      expect(src).not.toMatch(/quran\.com|alquran|api\.quran|verse_text|ayah_text|ayat\b/i);
      expect(src).not.toMatch(/speechRecognition|webkitSpeechRecognition/i);
    }
    const selector = readFileSync(join(root, "src/core/game/challenges.ts"), "utf8");
    expect(selector).not.toMatch(/Math\.random|getRandomValues/);
  });

  it("CH-093 référence toujours surah_001 ; CH-091 et CH-092 sont des références de récitation ; la banque est figée dans chaque partie", () => {
    expect(FAMILY_CHALLENGES.find((c) => c.id === "CH-093")?.contentRef).toEqual({ kind: "validated_recitation", count: 1, surahId: "surah_001" });
    expect(FAMILY_CHALLENGES.find((c) => c.id === "CH-091")?.contentRef).toEqual({ kind: "validated_recitation", count: 1 });
    expect(FAMILY_CHALLENGES.find((c) => c.id === "CH-092")?.contentRef).toEqual({ kind: "validated_recitation", count: 2 });
    const config = challengesConfigFor(DEFAULT_CHALLENGE_SETTINGS, contentRegistry());
    expect(config.recitations).toEqual(SURAH_RECITATIONS);
  });
});
