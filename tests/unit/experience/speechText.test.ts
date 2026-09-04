import { describe, expect, it } from "vitest";
import { RELIGION_BANKS } from "@/config/content";
import { PRONUNCIATION } from "@/config/narration";
import { EMPTY_LEXICON, planUtterances, pronounceable, questionUtterances, segmentsByScript, splitChoices } from "@/experience/narration";

describe("découpage des choix écrits dans l'énoncé (« A. … B. … ») : phrases séparées pour la voix, lignes séparées à l'écran", () => {
  it("sépare question et choix quand la suite A, B (C, D) est complète et ordonnée", () => {
    expect(splitChoices("Qui est le Créateur ? A. Allah B. Une statue")).toEqual({ question: "Qui est le Créateur ?", choices: [{ letter: "A", text: "Allah" }, { letter: "B", text: "Une statue" }] });
    expect(splitChoices("Lequel n'est PAS cité ? A. Les anges B. Les prophètes C. Les arbres et les pierres D. Une équation de maths").choices.map((c) => c.letter)).toEqual(["A", "B", "C", "D"]);
  });

  it("laisse l'énoncé entier sans suite valide (Vrai ou faux, une seule lettre, lettres désordonnées, question vide)", () => {
    expect(splitChoices("Allah nous a créés sans raison.")).toEqual({ question: "Allah nous a créés sans raison.", choices: [] });
    expect(splitChoices("Choisis : B. Non C. Oui").choices).toEqual([]);
    expect(splitChoices("A. Oui B. Non").choices).toEqual([]);
    expect(splitChoices("Une seule ? A. Oui").choices).toEqual([]);
  });

  it("toutes les cartes Religion qui portent des choix en ligne sont découpées, sans perdre un mot", () => {
    const withChoices = RELIGION_BANKS.flatMap((b) => b.questions).filter((q) => / [A-D]\. /.test(q.prompt.fr));
    expect(withChoices.length).toBeGreaterThan(200);
    for (const q of withChoices) {
      const s = splitChoices(q.prompt.fr);
      expect(s.choices.length, q.id).toBeGreaterThanOrEqual(2);
      const rebuilt = [s.question, ...s.choices.map((c) => `${c.letter}. ${c.text}`)].join(" ");
      expect(rebuilt.replace(/\s+/g, " "), q.id).toBe(q.prompt.fr.replace(/\s+/g, " ").trim());
    }
  });

  it("la lecture dit « Question : … » puis « Réponse A : … », « Réponse B : … » en phrases séparées, toutes rejouables", () => {
    expect(questionUtterances("Qui est le Créateur ? A. Allah B. Une statue", "fr")).toEqual([
      { text: "Question : Qui est le Créateur ?", lang: "fr", important: true },
      { text: "Réponse A : Allah", lang: "fr", important: true },
      { text: "Réponse B : Une statue", lang: "fr", important: true },
    ]);
    expect(questionUtterances("Allah nous a créés sans raison.", "fr")).toHaveLength(1);
  });
});

describe("prononciation : lexique de données puis repli déterministe sur les seuls mots translittérés ; le texte affiché ne change jamais", () => {
  it("applique les symboles et le lexique (expression la plus longue d'abord, insensible à la casse)", () => {
    expect(pronounceable("Le Prophète ﷺ a dit.", PRONUNCIATION)).toBe("Le Prophète salla llahou alayhi wa sallam a dit.");
    expect(pronounceable("Que signifie « Lā ilāha illā Allāh » ?", PRONUNCIATION)).toBe("Que signifie « La ilaha illa Allah » ?");
    expect(pronounceable("Le shirk et le Shirk.", PRONUNCIATION)).toBe("Le chirk et le chirk.");
    expect(pronounceable("Ḥajjat al-Wadāʿ", PRONUNCIATION)).toBe("Hadjat al Wada");
  });

  it("repli sur un mot marqué hors lexique : signes simplifiés, u → ou, sh → ch, dh → d, tiret → espace, « ah » final → « a »", () => {
    expect(pronounceable("Ṭumaʾnīnah", EMPTY_LEXICON)).toBe("Toumanina");
    expect(pronounceable("Al-Ḥudaybiyah", EMPTY_LEXICON)).toBe("Al Houdaybiya");
    expect(pronounceable("Muhājirūn et Shaʿbān", EMPTY_LEXICON)).toBe("Mouhajiroun et Chaban");
    // Le lexique affine ce que le repli ne sait pas (terminaisons nasales).
    expect(pronounceable("Muhājirūn et Shaʿbān", PRONUNCIATION)).toBe("Mouhajiroune et Chaabane");
  });

  it("ne touche jamais aux mots français, même accentués, ni à un « u » ou un « sh » hors mot translittéré", () => {
    for (const s of ["Le jeûne entraîne la maîtrise de l'âme.", "Une statue peut-elle créer ?", "Il faut connaître le châtiment.", "un short en été"]) expect(pronounceable(s, PRONUNCIATION)).toBe(s);
  });

  it("le lexique est de la donnée validée : symboles et mots non vides", () => {
    expect(Object.keys(PRONUNCIATION.words).length).toBeGreaterThan(100);
    expect(PRONUNCIATION.symbols["ﷺ"]).toBeTruthy();
    for (const [w, p] of Object.entries(PRONUNCIATION.words)) expect(p.trim(), w).not.toBe("");
  });
});

describe("segmentation par écriture et plan de lecture : l'arabe n'est dit qu'avec une voix arabe, jamais massacré", () => {
  it("découpe un texte mixte en passages français et arabes, dans l'ordre", () => {
    expect(segmentsByScript("Que signifie « إيمانًا واحتسابًا » ici ?")).toEqual([
      { lang: "fr", text: "Que signifie «" },
      { lang: "ar", text: "إيمانًا واحتسابًا" },
      { lang: "fr", text: "» ici ?" },
    ]);
    expect(segmentsByScript("Bonjour")).toEqual([{ lang: "fr", text: "Bonjour" }]);
    // La ponctuation latine finale ne forme jamais un passage à dire.
    expect(segmentsByScript("لم يخلقنا الله عبثًا، بل خلقنا لحكمة.")).toEqual([{ lang: "ar", text: "لم يخلقنا الله عبثًا، بل خلقنا لحكمة" }]);
  });

  it("avec une voix arabe : les passages arabes sont dits en arabe ; sans : ils sont tus, le français reste", () => {
    const u = { text: "Mission « إيمانًا واحتسابًا » : que signifie-t-elle ?", lang: "fr" as const, important: true };
    expect(planUtterances(u, { hasArabicVoice: true, lexicon: EMPTY_LEXICON })).toEqual([
      { text: "Mission «", lang: "fr", important: true },
      { text: "إيمانًا واحتسابًا", lang: "ar", important: true },
      { text: "» : que signifie-t-elle ?", lang: "fr", important: true },
    ]);
    expect(planUtterances(u, { hasArabicVoice: false, lexicon: EMPTY_LEXICON })).toEqual([
      { text: "Mission «", lang: "fr", important: true },
      { text: "» : que signifie-t-elle ?", lang: "fr", important: true },
    ]);
  });

  it("une phrase arabe entière (« Écouter en arabe ») est dite telle quelle avec une voix arabe, sinon rien du tout", () => {
    const ar = { text: "شُرع الصيام لتحقيق التقوى.", lang: "ar" as const };
    expect(planUtterances(ar, { hasArabicVoice: true, lexicon: PRONUNCIATION })).toEqual([ar]);
    expect(planUtterances(ar, { hasArabicVoice: false, lexicon: PRONUNCIATION })).toEqual([]);
  });

  it("la forme prononçable est appliquée au français dans le plan (ﷺ devient une formule, jamais un symbole lu de travers)", () => {
    expect(planUtterances({ text: "Le Messager ﷺ", lang: "fr" }, { hasArabicVoice: false, lexicon: PRONUNCIATION })).toEqual([{ text: "Le Messager salla llahou alayhi wa sallam", lang: "fr" }]);
  });
});
