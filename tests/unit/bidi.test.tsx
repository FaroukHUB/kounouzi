import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Bidi } from "@/ui/primitives/Bidi";

describe("<Bidi>", () => {
  it("isole un texte arabe avec lang, dir=rtl et la classe d'isolation", () => {
    const html = renderToStaticMarkup(<Bidi lang="ar">سلام</Bidi>);
    expect(html).toBe('<span lang="ar" dir="rtl" class="bidi-isolate">سلام</span>');
  });

  it("isole un texte français en ltr", () => {
    const html = renderToStaticMarkup(<Bidi lang="fr">Bonjour</Bidi>);
    expect(html).toContain('lang="fr"');
    expect(html).toContain('dir="ltr"');
  });

  it("accepte un élément et des classes supplémentaires", () => {
    const html = renderToStaticMarkup(
      <Bidi as="p" lang="ar" className="text-lg">
        نص
      </Bidi>,
    );
    expect(html.startsWith("<p ")).toBe(true);
    expect(html).toContain('class="bidi-isolate text-lg"');
  });
});
