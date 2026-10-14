import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SettingsSheet } from "@/ui/game/SettingsSheet";

const reglages = (props: Partial<Parameters<typeof SettingsSheet>[0]> = {}) =>
  renderToStaticMarkup(
    <SettingsSheet open={true} onClose={() => {}} narrationSupported={true} narrationMode="cloud" ecouteReason="ok" onReplay={() => {}} paused={false} onTogglePause={() => {}} endRequested={false} onRequestEnd={() => {}} onOpenHelp={() => {}} challengeSettings={null} onChallengeSettings={() => {}} {...props} />,
  );

describe("marqueur de version — savoir CE QUI est en ligne", () => {
  it("les réglages affichent la version déployée", () => {
    // Sans ce repère, un correctif poussé mais non déployé se diagnostique
    // exactement comme un correctif qui ne marche pas. C'est arrivé : plusieurs
    // échanges à chercher une cause dans le code pendant que le navigateur
    // servait un build antérieur au correctif.
    const html = reglages();
    expect(html).toContain('data-testid="build-marker"');
    expect(html).toContain("Version en ligne");
  });

  it("quand la voix est refusée, les réglages disent la CAUSE et pas trois à la fois", () => {
    const html = reglages({ narrationReason: "refused", narrationRefusal: { status: 404, detail: "voice_not_found" } });
    expect(html).toContain('data-testid="narration-refusal"');
    expect(html).toContain('data-cause="voice"');
    expect(html).toContain("voice_not_found");
    // L'ancien message énumérait les trois causes sans trancher : il reste
    // au-dessus, mais il n'est plus seul.
    expect(html).toContain("My Voices");
  });

  it("un refus sans détail reste compréhensible, et n'affiche rien de faux", () => {
    const html = reglages({ narrationReason: "refused", narrationRefusal: { status: 500 } });
    expect(html).toContain('data-cause="unknown"');
    expect(html).toContain("(500)");
  });

  it("sans refus, aucune ligne de cause n'apparaît", () => {
    expect(reglages({ narrationReason: "offline" })).not.toContain('data-testid="narration-refusal"');
    expect(reglages()).not.toContain('data-testid="narration-refusal"');
  });
});
