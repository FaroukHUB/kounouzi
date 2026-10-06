import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { CARD_DECKS, deckFor } from "@/config/cards";
import { CATEGORIES } from "@/config/content";
import { DEMO_ESTABLISHMENTS } from "@/config/demo";

describe("cartes illustrées — jeux de cartes fournis", () => {
  it("chaque jeu porte un dos, une face, son format et une zone d'écriture cohérente", () => {
    expect(CARD_DECKS.length).toBeGreaterThan(0);
    for (const d of CARD_DECKS) {
      expect(d.back, d.id).toMatch(/^\/kounouzi\/cards\/decks\/.+\.webp$/);
      expect(d.face, d.id).toMatch(/^\/kounouzi\/cards\/decks\/.+\.webp$/);
      expect(d.width, d.id).toBeGreaterThan(0);
      expect(d.height, d.id).toBeGreaterThan(d.width);
      // La zone d'écriture reste À L'INTÉRIEUR de la carte, et n'est jamais vide.
      expect(d.panel.start, d.id).toBeLessThan(d.panel.end);
      expect(d.panel.top, d.id).toBeLessThan(d.panel.bottom);
      expect(d.panel.start, d.id).toBeGreaterThan(0);
      expect(d.panel.bottom, d.id).toBeLessThan(1);
      // L'image est vraiment là : un chemin bien formé mais absent donnerait une carte vide.
      expect(existsSync(`public${d.back}`), `${d.id} : dos manquant`).toBe(true);
      expect(existsSync(`public${d.face}`), `${d.id} : face manquante`).toBe(true);
    }
  });

  it("une case Savoir ouvre la carte de sa matière, une autre case ouvre la carte de sa famille", () => {
    expect(deckFor({ categoryId: "maths" })?.id).toBe("maths");
    expect(deckFor({ categoryId: "geography" })?.id).toBe("histoire-geo");
    // Un Duel pose une question de Savoir sur une case Défi : c'est la CASE qui ouvre,
    // donc l'appelant ne passe que sa famille et la carte Défi s'ouvre.
    expect(deckFor({ cellType: "challenge" })?.id).toBe("defi");
    expect(deckFor({ cellType: "donation" })?.id).toBe("don");
    expect(deckFor({ cellType: "treasure" })?.id).toBe("tresor");
    expect(deckFor({ cellType: "halt" })?.id).toBe("halte");
    expect(deckFor({ cellType: "hassanat" })?.id).toBe("hassanat");
    // La famille Patrimoine n'a pas de carte à elle : ce sont les ÉTABLISSEMENTS qui
    // portent la leur. Un établissement ajouté plus tard, dont l'auteur n'aurait pas
    // encore dessiné la carte, garde l'habillage historique : rien ne casse.
    expect(deckFor({ cellType: "heritage" })).toBeUndefined();
    expect(deckFor({ siteId: "est-pas-encore-dessine", cellType: "heritage" })).toBeUndefined();
    expect(deckFor({})).toBeUndefined();
  });

  it("un établissement dont l'auteur a dessiné la carte ouvre LA SIENNE, avant toute famille", () => {
    expect(deckFor({ siteId: "est-restaurant-algerie" })?.id).toBe("restaurant-algerien");
    expect(deckFor({ siteId: "est-restaurant-maroc" })?.id).toBe("restaurant-marocain");
    expect(deckFor({ siteId: "est-maktaba-albani" })?.id).toBe("maktaba-al-albani");
    expect(deckFor({ siteId: "est-maktaba-ibn-baz" })?.id).toBe("maktaba-as-sunnah");
    // Une carte peut servir DEUX établissements : les deux hôtels d'une même ville partagent la leur.
    expect(deckFor({ siteId: "est-hotel-makkah-a" })?.id).toBe("hotel-la-mecque");
    expect(deckFor({ siteId: "est-hotel-makkah-b" })?.id).toBe("hotel-la-mecque");
    expect(deckFor({ siteId: "est-hotel-madinah-a" })?.id).toBe("hotel-medine");
    expect(deckFor({ siteId: "est-hotel-madinah-b" })?.id).toBe("hotel-medine");
    expect(deckFor({ siteId: "est-umrah-agency-a" })?.id).toBe("agence-omra-an-nour");
    expect(deckFor({ siteId: "est-umrah-agency-b" })?.id).toBe("agence-omra-al-huda");
    expect(deckFor({ siteId: "est-museum-dubai" })?.id).toBe("musee-dubai");
    expect(deckFor({ siteId: "est-park-kounouzi" })?.id).toBe("parc-familial-halal");
    // L'établissement est plus précis que la case : même sur une case Patrimoine, c'est sa carte.
    expect(deckFor({ siteId: "est-restaurant-maroc", cellType: "heritage" })?.id).toBe("restaurant-marocain");
  });

  it("le nom PEINT sur la carte est celui des données : la carte et le plateau disent la même chose", () => {
    // Le titre vit dans l'illustration ; si les données disaient autre chose, le plateau,
    // les bandeaux et la voix contrediraient la carte que l'enfant a sous les yeux.
    const nom = (id: string) => DEMO_ESTABLISHMENTS.find((s) => s.id === id)?.establishment?.name;
    expect(nom("est-restaurant-algerie")?.fr).toBe("Restaurant Algérien");
    expect(nom("est-restaurant-maroc")?.fr).toBe("Restaurant Marocain");
    expect(nom("est-maktaba-albani")?.fr).toBe("Maktaba Al-Albānī");
    expect(nom("est-maktaba-ibn-baz")?.fr).toBe("Maktaba As-Sunnah");
    expect(nom("est-umrah-agency-a")?.fr).toBe("Agence Omra An-Nour");
    expect(nom("est-umrah-agency-b")?.fr).toBe("Agence Omra Al-Hudā");
    expect(nom("est-museum-dubai")?.fr).toBe("Musée Dubaï");
    expect(nom("est-park-kounouzi")?.fr).toBe("Parc Familial Halal");
    // Le nom arabe est obligatoire partout : un enfant arabophone lit le plateau aussi.
    for (const s of DEMO_ESTABLISHMENTS) expect(s.establishment?.name.ar, s.id).toBeTruthy();
    // Et chaque carte d'établissement vise un établissement qui existe vraiment.
    const connus = new Set(DEMO_ESTABLISHMENTS.map((s) => s.id));
    for (const d of CARD_DECKS) for (const s of d.sites) expect(connus, `${d.id} → ${s}`).toContain(s);
  });

  it("les douze établissements du plateau portent leur carte : plus aucune case d'emoji", () => {
    for (const s of DEMO_ESTABLISHMENTS) {
      const carte = deckFor({ siteId: s.id });
      expect(carte, `${s.id} : aucune carte dessinée`).toBeDefined();
      // Et le cadrage de la case est une donnée mesurée, jamais le bord de l'image.
      expect(carte!.cellFocus, s.id).toBeGreaterThan(0);
      expect(carte!.cellFocus, s.id).toBeLessThan(1);
    }
  });

  it("aucun jeu ne réclame une catégorie qui n'existe pas", () => {
    const connues = new Set(CATEGORIES.map((c) => c.id));
    for (const d of CARD_DECKS) for (const c of d.categories) expect(connues, `${d.id} → ${c}`).toContain(c);
  });
});
