import { describe, expect, it } from "vitest";
import { CHALLENGE_TOGGLE_CATEGORIES, DEFAULT_CHALLENGE_SETTINGS, FAMILY_CHALLENGES, challengesConfigFor } from "@/config/challenges";
import { contentRegistry } from "@/config/content";
import { DEMO_SCENARIOS } from "@/config/demo";
import { CHALLENGE_CATEGORIES, CHALLENGE_TOGGLES, challengesConfigSchema } from "@/core/game";
import { KNOWN_ANIMATION_KEYS } from "@/ui/cards/animations/families";

/** Les 13 défis du PDF retirés par décision de l'auteur (ADR 0041) : jamais remplacés, jamais renumérotés. */
const RETIRES = ["CH-003", "CH-011", "CH-013", "CH-015", "CH-047", "CH-077", "CH-078", "CH-082", "CH-083", "CH-094", "CH-095", "CH-096", "CH-097"];

describe("banque canonique des Défis famille (données importées du PDF)", () => {
  it("compte 87 défis : les 100 du PDF moins les 13 retirés, identifiants uniques et JAMAIS renumérotés", () => {
    expect(FAMILY_CHALLENGES).toHaveLength(87);
    expect(new Set(FAMILY_CHALLENGES.map((c) => c.id)).size).toBe(87);
    // Un identifiant désigne toujours le même défi : aucun trou n'est comblé, aucun numéro n'est réattribué.
    const attendus = Array.from({ length: 100 }, (_, i) => `CH-${String(i + 1).padStart(3, "0")}`).filter((id) => !RETIRES.includes(id));
    expect(FAMILY_CHALLENGES.map((c) => c.id)).toEqual(attendus);
    for (const id of RETIRES) expect(FAMILY_CHALLENGES.find((c) => c.id === id), id).toBeUndefined();
    const count = (category: string) => FAMILY_CHALLENGES.filter((c) => c.category === category).length;
    expect({ movement: count("movement"), animals: count("animals"), family: count("family"), solidarity: count("solidarity"), oh_no: count("oh_no"), memory: count("memory"), reflection: count("reflection"), geography: count("geography"), observation: count("observation"), language: count("language"), maths: count("maths"), logic: count("logic"), arabic: count("arabic"), religion: count("religion"), boss: count("boss") }).toEqual({
      movement: 16,
      animals: 20,
      family: 11,
      solidarity: 3,
      oh_no: 15,
      memory: 6,
      reflection: 1,
      geography: 0,
      observation: 1,
      language: 2,
      maths: 0,
      logic: 1,
      arabic: 5,
      religion: 3,
      boss: 3,
    });
  });

  it("chaque défi a un texte, un gain entier, un âge minimal 5/8/10, une clé d'animation connue de la présentation", () => {
    for (const c of FAMILY_CHALLENGES) {
      expect(c.text.length, c.id).toBeGreaterThan(5);
      expect([5, 8, 10], c.id).toContain(c.minAge);
      expect(Number.isInteger(c.reward) && c.reward >= 0, c.id).toBe(true);
      expect(KNOWN_ANIMATION_KEYS, c.id).toContain(c.animationKey);
    }
  });

  it("pour les petits : aucun jumping jack, série de squats ni pompes avant 10 ans ; jamais d'imitation de personne", () => {
    for (const c of FAMILY_CHALLENGES) {
      const wording = `${c.text} ${c.adaptation ?? ""}`.toLowerCase();
      if (c.minAge < 10) expect(wording, c.id).not.toMatch(/jumping|squat|pompe/);
      expect(wording, c.id).not.toMatch(/imite (ta |ton |papa|maman|le voisin|un joueur)/);
    }
    // CH-011 (« le défi pompes ») a été retiré : plus aucun défi ne mentionne de pompes, à tout âge.
    expect(FAMILY_CHALLENGES.some((c) => /pompe/i.test(`${c.text} ${c.adaptation ?? ""}`))).toBe(false);
  });

  it("« OH NON » : les 15 de la catégorie plus les cartes marquées ; contact = 3 défis à consentement ; boss marqués", () => {
    for (const c of FAMILY_CHALLENGES.filter((x) => x.category === "oh_no")) expect(c.ohNo, c.id).toBe(true);
    expect(FAMILY_CHALLENGES.filter((c) => c.ohNo).length).toBeGreaterThanOrEqual(15);
    expect(FAMILY_CHALLENGES.filter((c) => c.consentRequired).map((c) => c.id)).toEqual(["CH-041", "CH-045", "CH-046"]);
    expect(FAMILY_CHALLENGES.filter((c) => c.boss).map((c) => c.id)).toEqual(["CH-020", "CH-039", "CH-055", "CH-070", "CH-085", "CH-090", "CH-098", "CH-099", "CH-100"]);
  });

  it("défis religieux : aucun texte religieux, tous référencent du contenu validé ; proposables uniquement quand le registre sert du contenu validé", () => {
    const religion = FAMILY_CHALLENGES.filter((c) => c.category === "religion");
    // Les quatre défis à question religieuse (CH-094 à CH-097) ont été retirés : restent les trois récitations.
    expect(religion.map((c) => c.id)).toEqual(["CH-091", "CH-092", "CH-093"]);
    for (const c of religion) expect(c.contentRef, c.id).toBeDefined();
    expect(religion.every((c) => c.contentRef?.kind === "validated_recitation")).toBe(true);
    // Le schéma refuse un défi religieux sans référence.
    const bad = { definitions: [{ ...religion[0]!, contentRef: undefined }], toggles: CHALLENGE_TOGGLE_CATEGORIES, settings: DEFAULT_CHALLENGE_SETTINGS, contentAvailable: [] };
    expect(challengesConfigSchema.safeParse(bad).success).toBe(false);
    // Registre réel : une récitation reste décidée par joueur dans le moteur, donc jamais annoncée ici.
    const config = challengesConfigFor(DEFAULT_CHALLENGE_SETTINGS, contentRegistry());
    expect(config.contentAvailable.filter((id) => religion.some((c) => c.id === id))).toEqual([]);
    // Les boss « savoir » (catégorie libre) peuvent s'appuyer sur les maths algorithmiques déjà jouables.
    expect(config.contentAvailable).toEqual(["CH-099", "CH-100"]);
  });

  it("réglages parents : chaque catégorie est couverte par un interrupteur ; les défis solidaires portent leurs résultats économiques réels", () => {
    const covered = new Set(Object.values(CHALLENGE_TOGGLE_CATEGORIES).flat());
    for (const category of CHALLENGE_CATEGORIES) expect(covered.has(category), category).toBe(true);
    for (const toggle of CHALLENGE_TOGGLES) expect(DEFAULT_CHALLENGE_SETTINGS[toggle]).toBe(true);
    expect(FAMILY_CHALLENGES.find((c) => c.id === "CH-051")?.onSuccess?.[0]).toMatchObject({ kind: "transfer_choice", amount: 5 });
    expect(FAMILY_CHALLENGES.find((c) => c.id === "CH-052")?.onSuccess?.[0]).toMatchObject({ kind: "give_to_poorest", amount: 10 });
    expect(FAMILY_CHALLENGES.find((c) => c.id === "CH-053")).toMatchObject({ reward: 0, onSuccess: [{ kind: "choice", choiceId: "CH-053" }] });
  });

  it("variantes d'âge : CH-002 propose 5 s / 10 s / 15 s selon la tranche ; le scénario démo « Défi famille » existe sans retirer le Duel", () => {
    expect(FAMILY_CHALLENGES.find((c) => c.id === "CH-002")?.variants).toEqual([
      { ageMin: 5, ageMax: 8, text: "5 s" },
      { ageMin: 8, ageMax: 10, text: "10 s" },
      { ageMin: 10, text: "15 s" },
    ]);
    const challengeCell = DEMO_SCENARIOS.filter((s) => s.cellType === "challenge").map((s) => s.outcomes[0]?.kind);
    expect(challengeCell).toEqual(["duel", "family_challenge", "question", "hassanat_opportunity"]);
  });
});
