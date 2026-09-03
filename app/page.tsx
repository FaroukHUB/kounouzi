import { DEFAULT_LOCALE, t } from "@/i18n";
import { Bidi } from "@/ui/primitives/Bidi";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-4xl font-semibold tracking-tight">{t(DEFAULT_LOCALE, "app.name")}</h1>
      <p className="text-lg">{t(DEFAULT_LOCALE, "app.tagline")}</p>
      <Bidi as="p" lang="ar" className="text-lg">
        {t("ar", "app.tagline")}
      </Bidi>
    </main>
  );
}
