import { describe, expect, it } from "vitest";
import { VOICE_CONFIG } from "@/config/narration";
import { fr } from "@/i18n/fr";
import { voiceKey } from "@/experience/narration";

const GABARIT = /\{[a-zA-Z]+\}/;

describe("pré-génération des phrases fixes — le script doit pouvoir tourner", () => {
  it("chaque clé déclarée existe vraiment dans le dictionnaire français", () => {
    // `pnpm voice:generate` LÈVE sur une clé inconnue, et s'arrête. La liste a
    // contenu trois clés disparues quand les félicitations sont devenues des
    // variantes (ADR 0051) : le script refusait de démarrer, le manifeste
    // restait vide, et rien ne le disait.
    for (const cle of VOICE_CONFIG.phrases) {
      expect(Object.hasOwn(fr, cle), `clé absente du dictionnaire FR : ${cle}`).toBe(true);
    }
  });

  it("aucune clé déclarée ne contient de gabarit : un prénom ne s'enregistre pas à l'avance", () => {
    // Une phrase qui nomme un joueur ou un montant a autant de versions qu'il y
    // a de prénoms : elle est dite à la demande, jamais pré-générée. Le script
    // lève aussi sur ce cas ; quatre clés avec `{name}` traînaient dans la liste.
    for (const cle of VOICE_CONFIG.phrases) {
      const texte = (fr as Record<string, string>)[cle]!;
      expect(GABARIT.test(texte), `${cle} contient un gabarit : « ${texte} »`).toBe(false);
    }
  });

  it("la liste couvre TOUTES les phrases de narration qui peuvent l'être, et rien d'autre", () => {
    // Sinon une phrase fixe ajoutée plus tard resterait payante et lente pour
    // toujours, sans que personne s'en aperçoive.
    const possibles = Object.keys(fr)
      .filter((k) => k.startsWith("narration.") && !GABARIT.test((fr as Record<string, string>)[k]!))
      .sort();
    expect([...VOICE_CONFIG.phrases].sort()).toEqual(possibles);
    expect(possibles.length).toBeGreaterThan(0);
  });

  it("deux phrases déclarées ne peuvent pas se partager un fichier", () => {
    // Le nom du fichier vient du HACHAGE du texte : deux clés au texte identique
    // écriraient le même mp3, et l'une écraserait l'autre en silence.
    const cles = VOICE_CONFIG.phrases.map((c) => voiceKey("fr", (fr as Record<string, string>)[c]!));
    expect(new Set(cles).size).toBe(cles.length);
  });
});
