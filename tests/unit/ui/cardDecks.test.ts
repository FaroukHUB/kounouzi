import { describe, expect, it } from "vitest";
import { CARD_DECKS, deckFor } from "@/config/cards";
import { CATEGORIES } from "@/config/content";

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
    }
  });

  it("une catégorie de Savoir prime sur la famille de case, et une famille sans illustration n'en reçoit aucune", () => {
    expect(deckFor({ categoryId: "maths" })?.id).toBe("maths");
    expect(deckFor({ categoryId: "geography" })?.id).toBe("histoire-geo");
    // Un Duel pose une question de Savoir sur une case Défi : la catégorie décide.
    expect(deckFor({ categoryId: "maths", cellType: "challenge" })?.id).toBe("maths");
    expect(deckFor({ cellType: "challenge" })?.id).toBe("defi");
    expect(deckFor({ cellType: "donation" })?.id).toBe("don");
    // Tant que l'illustration n'est pas fournie, la carte garde l'habillage historique.
    expect(deckFor({ cellType: "treasure" })).toBeUndefined();
    expect(deckFor({})).toBeUndefined();
  });

  it("aucun jeu ne réclame une catégorie qui n'existe pas", () => {
    const connues = new Set(CATEGORIES.map((c) => c.id));
    for (const d of CARD_DECKS) for (const c of d.categories) expect(connues, `${d.id} → ${c}`).toContain(c);
  });
});
