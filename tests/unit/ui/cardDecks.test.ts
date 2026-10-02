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
    // Tant que l'illustration n'est pas fournie, la carte garde l'habillage historique :
    // les établissements sans carte dessinée attendent la leur (Maktaba, hôtel…).
    expect(deckFor({ cellType: "heritage" })).toBeUndefined();
    expect(deckFor({ siteId: "est-maktaba-albani", cellType: "heritage" })).toBeUndefined();
    expect(deckFor({})).toBeUndefined();
  });

  it("une carte d'établissement porte aussi sa vignette : la CASE du plateau la montre, pas une pastille d'emoji", () => {
    // Le titre peint sur la carte est illisible à la taille d'une tuile : la vignette est
    // découpée dans le BAS de la carte, l'illustration seule. Et on ne charge pas la carte
    // entière (180 ko) pour une case de 80 px.
    for (const id of ["casbah-alger", "restaurant-marocain"]) {
      const d = CARD_DECKS.find((x) => x.id === id)!;
      expect(d.thumb, id).toMatch(/^\/kounouzi\/cards\/decks\/.+\.webp$/);
      expect(existsSync(`public${d.thumb}`), `${id} : vignette manquante`).toBe(true);
    }
    // Les jeux de cartes par catégorie ou par case n'en ont pas : rien ne change pour eux.
    expect(CARD_DECKS.find((d) => d.id === "maths")?.thumb).toBeUndefined();
  });

  it("un établissement dont l'auteur a dessiné la carte ouvre LA SIENNE, avant toute famille", () => {
    expect(deckFor({ siteId: "est-restaurant-algerie" })?.id).toBe("casbah-alger");
    expect(deckFor({ siteId: "est-restaurant-maroc" })?.id).toBe("restaurant-marocain");
    // L'établissement est plus précis que la case : même sur une case Patrimoine, c'est sa carte.
    expect(deckFor({ siteId: "est-restaurant-maroc", cellType: "heritage" })?.id).toBe("restaurant-marocain");
  });

  it("le nom PEINT sur la carte est celui des données : la carte et le plateau disent la même chose", () => {
    // Le titre vit dans l'illustration ; si les données disaient autre chose, le plateau,
    // les bandeaux et la voix contrediraient la carte que l'enfant a sous les yeux.
    const nom = (id: string) => DEMO_ESTABLISHMENTS.find((s) => s.id === id)?.establishment?.name;
    expect(nom("est-restaurant-algerie")?.fr).toBe("Casbah d’Alger");
    expect(nom("est-restaurant-maroc")?.fr).toBe("Restaurant Marocain");
    // Et chaque carte d'établissement vise un établissement qui existe vraiment.
    const connus = new Set(DEMO_ESTABLISHMENTS.map((s) => s.id));
    for (const d of CARD_DECKS) for (const s of d.sites) expect(connus, `${d.id} → ${s}`).toContain(s);
  });

  it("aucun jeu ne réclame une catégorie qui n'existe pas", () => {
    const connues = new Set(CATEGORIES.map((c) => c.id));
    for (const d of CARD_DECKS) for (const c of d.categories) expect(connues, `${d.id} → ${c}`).toContain(c);
  });
});
