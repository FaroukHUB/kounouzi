import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ANSWER_OUTCOMES } from "@/core/shared";
import { NullEcouteur, WebSpeechEcouteur } from "@/experience/ecoute";
import { SettingsSheet } from "@/ui/game/SettingsSheet";
import { QUESTION_STEPS } from "@/ui/cards/cardState";
import { ETAPES_ECOUTE, ecouteAutorisee } from "@/ui/cards/useEcoute";

describe("validation à la voix — le micro ne s'ouvre QUE pendant la validation", () => {
  it("de toutes les étapes de la carte, seule « réponse révélée » ouvre le micro", () => {
    // Le point entier de cette fonction : pendant que l'enfant répond (« question »),
    // le micro est fermé. Sa réponse n'est jamais écoutée, jamais transcrite.
    const ouvertes = QUESTION_STEPS.filter((e) => ecouteAutorisee(e, false));
    expect(ouvertes).toEqual(["revealed"]);
    expect(ecouteAutorisee("question", false)).toBe(false);
    expect(ETAPES_ECOUTE).toEqual(["revealed"]);
  });

  it("tant que la voix off parle, le micro reste fermé : le jeu ne s'entend pas lui-même", () => {
    // Sinon « la réponse est : … » pourrait être entendu comme un verdict.
    for (const etape of QUESTION_STEPS) expect(ecouteAutorisee(etape, true), etape).toBe(false);
  });

  it("la voix ne peut déclencher que les verdicts des boutons, jamais une autre action", () => {
    // `onVerdict` est typé par les issues du moteur : un verdict inventé ne compile pas.
    const verdicts: readonly string[] = [...ANSWER_OUTCOMES];
    expect(verdicts).toEqual(["correct", "partial", "incorrect"]);
  });
});

describe("validation à la voix — réglages", () => {
  const reglages = (props: Partial<Parameters<typeof SettingsSheet>[0]> = {}) =>
    renderToStaticMarkup(
      <SettingsSheet
        open={true}
        onClose={() => {}}
        narrationSupported={true}
        narrationMode="cloud"
        ecouteReason="ok"
        onReplay={() => {}}
        paused={false}
        onTogglePause={() => {}}
        endRequested={false}
        onRequestEnd={() => {}}
        onOpenHelp={() => {}}
        challengeSettings={null}
        onChallengeSettings={() => {}}
        {...props}
      />,
    );

  it("le réglage existe, il est ÉTEINT par défaut, et dit ce que fait le micro", () => {
    const html = reglages();
    expect(html).toContain('data-testid="ecoute-toggle"');
    // Un micro n'est jamais allumé à la place du parent : la case est décochée.
    expect(html).not.toMatch(/data-testid="ecoute-toggle"[^>]*checked/);
    const hint = html.slice(html.indexOf('data-testid="ecoute-hint"'));
    expect(hint).toContain("n&#x27;est jamais écoutée");
    expect(hint).toContain("navigateur");
  });

  it("quand l'appareil ne peut pas écouter, il DIT pourquoi au lieu de rester muet", () => {
    for (const raison of ["unsupported", "insecure", "denied"] as const) {
      const html = reglages({ ecouteReason: raison });
      expect(html, raison).toContain(`data-reason="${raison}"`);
    }
    expect(reglages({ ecouteReason: "ok" })).not.toContain('data-testid="ecoute-why"');
  });

  it("la raison affichée est bien celle de l'écouteur réel, pas une devinette", () => {
    expect(new WebSpeechEcouteur({ fabrique: null }).raison()).toBe("unsupported");
    expect(new NullEcouteur().raison()).toBe("unsupported");
  });
});
