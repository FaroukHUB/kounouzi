import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { FAMILY_CHALLENGES, SURAH_BANK, SURAH_RECITATIONS, challengesConfigFor, DEFAULT_CHALLENGE_SETTINGS } from "@/config/challenges";
import { contentRegistry } from "@/config/content";
import { ECOUTE_CONFIG } from "@/config/ecoute";
import { recitationRefSchema } from "@/core/game";
import { ANSWER_OUTCOMES } from "@/core/shared";

const root = fileURLToPath(new URL("../../../", import.meta.url));

/** Tout le code du projet, chemin relatif à la racine + contenu. */
function sourcesDuProjet(): readonly (readonly [string, string])[] {
  const walk = (dir: string): string[] => readdirSync(dir).flatMap((n) => (statSync(join(dir, n)).isDirectory() ? walk(join(dir, n)) : /\.(ts|tsx|mjs)$/.test(n) ? [join(dir, n)] : []));
  return [...walk(join(root, "src")), ...walk(join(root, "scripts"))].map((f) => [f.slice(root.length), readFileSync(f, "utf8")] as const);
}

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
    const sources = sourcesDuProjet();
    for (const [, src] of sources) expect(src).not.toMatch(/quran\.com|alquran|api\.quran|verse_text|ayah_text|ayat\b/i);
    const selector = readFileSync(join(root, "src/core/game/challenges.ts"), "utf8");
    expect(selector).not.toMatch(/Math\.random|getRandomValues/);
  });

  /**
   * AUCUNE RÉCITATION N'EST JUGÉE PAR LA MACHINE. Une machine qui écouterait un
   * enfant réciter le Coran pour dire si c'est juste serait inacceptable : la
   * récitation se valide en famille, par des humains, et rien d'autre.
   *
   * Depuis l'ADR 0054, le micro existe pour UN seul usage : entendre
   * « correct », « presque » ou « faux » une fois la réponse d'une question
   * révélée, c'est-à-dire appuyer sur un bouton à la place du doigt. Trois
   * verrous le prouvent ici, plutôt qu'une interdiction en bloc qui ne disait
   * pas CE qu'elle protégeait :
   */
  it("aucune récitation jugée par la machine : un seul fichier touche au micro, pour trois verdicts, hors des cartes de Défi", () => {
    // 1. Un SEUL fichier parle à la reconnaissance vocale du navigateur. Partout
    //    ailleurs — noyau, contenu, cartes, scripts — elle reste interdite.
    const AUTORISE = "src/experience/ecoute/WebSpeechEcouteur.ts";
    for (const [chemin, src] of sourcesDuProjet()) {
      if (chemin === AUTORISE) continue;
      expect(src, chemin).not.toMatch(/speechRecognition|webkitSpeechRecognition/i);
    }

    // 2. Le micro ne peut déclencher QUE les trois verdicts d'une question.
    //    Aucune commande ne peut porter sur une récitation ni sur un Défi.
    expect(ECOUTE_CONFIG.commandes.map((c) => c.id).sort()).toEqual([...ANSWER_OUTCOMES].sort());

    // 3. Seule la carte QUESTION ouvre le micro. La carte Défi — celle qui porte
    //    les récitations — ne l'ouvre nulle part, pas plus que les autres.
    const cartes = sourcesDuProjet().filter(([chemin]) => chemin.startsWith("src/ui/cards/") && chemin.endsWith(".tsx"));
    const ouvrantes = cartes.filter(([, src]) => /useEcoute/.test(src)).map(([chemin]) => chemin);
    expect(ouvrantes).toEqual(["src/ui/cards/QuestionCard.tsx"]);
    expect(readFileSync(join(root, "src/ui/cards/ChallengeCard.tsx"), "utf8")).not.toMatch(/useEcoute|ecouteur/i);
  });

  it("CH-093 référence toujours surah_001 ; CH-091 et CH-092 sont des références de récitation ; la banque est figée dans chaque partie", () => {
    expect(FAMILY_CHALLENGES.find((c) => c.id === "CH-093")?.contentRef).toEqual({ kind: "validated_recitation", count: 1, surahId: "surah_001" });
    expect(FAMILY_CHALLENGES.find((c) => c.id === "CH-091")?.contentRef).toEqual({ kind: "validated_recitation", count: 1 });
    expect(FAMILY_CHALLENGES.find((c) => c.id === "CH-092")?.contentRef).toEqual({ kind: "validated_recitation", count: 2 });
    const config = challengesConfigFor(DEFAULT_CHALLENGE_SETTINGS, contentRegistry());
    expect(config.recitations).toEqual(SURAH_RECITATIONS);
  });
});
