import { describe, expect, it } from "vitest";
import { DEFAULT_VOICE_TONE, VOICE_CONFIG, VOICE_TONES, toneOf, voiceConfigSchema } from "@/config/narration";
import { CloudNarrator, handleVoiceRequest, settingsForTone } from "@/experience/narration";

const DEPS = { tones: VOICE_CONFIG.tones, defaultTone: VOICE_CONFIG.defaultTone, voiceSettings: VOICE_CONFIG.voiceSettings };

describe("ton de la voix — des données qu'on écoute, pas des nombres qu'on lit", () => {
  it("plusieurs tons nommés, du plus posé au plus pétillant, chacun avec son débit", () => {
    expect(VOICE_TONES.length).toBeGreaterThanOrEqual(3);
    for (const ton of VOICE_TONES) {
      expect(ton.label.fr.length, ton.id).toBeGreaterThan(0);
      expect(ton.label.ar.length, ton.id).toBeGreaterThan(0);
      expect(ton.rate, ton.id).toBeGreaterThan(0);
    }
    // Un ton plus expressif est MOINS stable : c'est tout l'intérêt, une voix très
    // stable lit à plat — c'est ce qui fait dire « on dirait un robot ».
    const stabilites = VOICE_TONES.map((t) => t.voiceSettings.stability);
    expect([...stabilites].sort((a, b) => b - a)).toEqual(stabilites);
    const styles = VOICE_TONES.map((t) => t.voiceSettings.style);
    expect([...styles].sort((a, b) => a - b)).toEqual(styles);
    expect(new Set(VOICE_TONES.map((t) => t.id)).size).toBe(VOICE_TONES.length);
  });

  it("le ton par défaut existe vraiment, et un identifiant inconnu y retombe", () => {
    expect(toneOf(DEFAULT_VOICE_TONE).id).toBe(DEFAULT_VOICE_TONE);
    expect(toneOf("ton-qui-n-existe-pas").id).toBe(DEFAULT_VOICE_TONE);
    expect(toneOf(undefined).id).toBe(DEFAULT_VOICE_TONE);
  });

  it("le ton par défaut porte EXACTEMENT les réglages des phrases pré-générées", () => {
    // Sinon on entendrait l'ancien ton sur les phrases du manifeste et le nouveau
    // sur les autres, dans la même partie.
    expect(toneOf(DEFAULT_VOICE_TONE).voiceSettings).toEqual(VOICE_CONFIG.voiceSettings);
  });

  it("une donnée de ton hors bornes est refusée au chargement", () => {
    expect(() => voiceConfigSchema.parse({ ...VOICE_CONFIG, tones: [{ ...VOICE_TONES[0]!, voiceSettings: { ...VOICE_TONES[0]!.voiceSettings, stability: 1.5 } }] })).toThrow();
    expect(() => voiceConfigSchema.parse({ ...VOICE_CONFIG, tones: [] })).toThrow();
  });

  it("LE NAVIGATEUR N'ENVOIE QU'UN NOM : les réglages sont retrouvés sur le serveur", () => {
    // Un navigateur ne dicte jamais ce qu'on demande au fournisseur.
    expect(settingsForTone(DEPS, "petillant")).toEqual(toneOf("petillant").voiceSettings);
    expect(settingsForTone(DEPS, "n-importe-quoi")).toEqual(toneOf(DEFAULT_VOICE_TONE).voiceSettings);
    expect(settingsForTone(DEPS, null)).toEqual(toneOf(DEFAULT_VOICE_TONE).voiceSettings);
    // Sans tons configurés du tout, on retombe sur les réglages historiques.
    expect(settingsForTone({ voiceSettings: VOICE_CONFIG.voiceSettings }, "petillant")).toEqual(VOICE_CONFIG.voiceSettings);
  });

  it("le serveur transmet au fournisseur les réglages DU TON DEMANDÉ", async () => {
    let corps: Record<string, unknown> = {};
    const faux: typeof fetch = async (_url, init) => {
      corps = JSON.parse(String(init?.body)) as Record<string, unknown>;
      return new Response(new ArrayBuffer(8), { status: 200 });
    };
    const deps = { env: { ELEVENLABS_API_KEY: "k", ELEVENLABS_VOICE_ID: "v" }, fetch: faux, maxTextLength: 1200, languages: ["fr"] as const, ...DEPS };
    await handleVoiceRequest(new Request("https://x/api/voix?lang=fr&text=bravo&ton=petillant"), deps);
    expect(corps["voice_settings"]).toEqual(toneOf("petillant").voiceSettings);
    await handleVoiceRequest(new Request("https://x/api/voix?lang=fr&text=bravo&ton=pose"), deps);
    expect(corps["voice_settings"]).toEqual(toneOf("pose").voiceSettings);
    await handleVoiceRequest(new Request("https://x/api/voix?lang=fr&text=bravo"), deps);
    expect(corps["voice_settings"]).toEqual(toneOf(DEFAULT_VOICE_TONE).voiceSettings);
  });

  it("changer de ton change l'URL demandée, et laisse tomber les phrases pré-générées", async () => {
    const demandes: string[] = [];
    const audio = () => {
      const a = { src: "", playbackRate: 1, onended: null as null | (() => void), onerror: null, play: async () => queueMicrotask(() => a.onended?.()), pause: () => {} };
      return a as never;
    };
    const narrateur = new CloudNarrator({
      ...VOICE_CONFIG,
      fetch: (async (input: RequestInfo | URL) => {
        const url = String(input);
        demandes.push(url);
        if (url.includes("manifest")) return Response.json({ version: 1, entries: {} });
        return new Response(new Uint8Array([73, 68, 51]), { status: 200, headers: { "content-type": "audio/mpeg" } });
      }) as typeof fetch,
      createAudio: audio,
      createObjectUrl: (b: Blob) => `blob:${b.size}`,
      revokeObjectUrl: () => {},
    });

    narrateur.setTone("petillant", toneOf("petillant").rate);
    narrateur.speak({ text: "bravo", lang: "fr" });
    await new Promise((r) => setTimeout(r, 20));
    expect(demandes.some((u) => u.includes("ton=petillant"))).toBe(true);

    // Au ton par défaut, aucun paramètre : les phrases pré-générées restent servies.
    narrateur.setTone(null);
    demandes.length = 0;
    narrateur.speak({ text: "bravo", lang: "fr" });
    await new Promise((r) => setTimeout(r, 20));
    expect(demandes.some((u) => u.includes("ton="))).toBe(false);
  });

  it("le débit du ton se compose avec la vitesse demandée par la tablée", async () => {
    const vitesses: number[] = [];
    const audio = () => {
      const a = { src: "", playbackRate: 1, onended: null as null | (() => void), onerror: null, play: async () => { vitesses.push(a.playbackRate); queueMicrotask(() => a.onended?.()); }, pause: () => {} };
      return a as never;
    };
    const narrateur = new CloudNarrator({
      ...VOICE_CONFIG,
      fetch: (async (input: RequestInfo | URL) => (String(input).includes("manifest") ? Response.json({ version: 1, entries: {} }) : new Response(new Uint8Array([73, 68, 51]), { status: 200, headers: { "content-type": "audio/mpeg" } }))) as typeof fetch,
      createAudio: audio,
      createObjectUrl: (b: Blob) => `blob:${b.size}`,
      revokeObjectUrl: () => {},
    });
    narrateur.setTone("pose", toneOf("pose").rate);
    narrateur.setRate("fast");
    narrateur.speak({ text: "bravo", lang: "fr" });
    await new Promise((r) => setTimeout(r, 20));
    expect(vitesses[0]).toBeCloseTo(VOICE_CONFIG.rates.fast * toneOf("pose").rate, 5);
  });
});
