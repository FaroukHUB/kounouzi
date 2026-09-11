import { describe, expect, it } from "vitest";
import { VOICE_CONFIG } from "@/config/narration";
import { CloudNarrator, NullNarrator, hash53, normalizeVoiceText, voiceKey, type AudioLike, type NarrationService, type Utterance } from "@/experience/narration";

/** Élément audio simulé : la fin de lecture est déclenchée par le test (ou tout de suite). */
function fakeAudioFactory(log: string[], auto = true) {
  const created: (AudioLike & { finish: () => void })[] = [];
  const factory = () => {
    const a: AudioLike & { finish: () => void } = {
      src: "",
      playbackRate: 1,
      onended: null,
      onerror: null,
      play: async () => {
        log.push(`play:${a.src}@${a.playbackRate}`);
        if (auto) queueMicrotask(() => a.onended?.());
      },
      pause: () => log.push("pause"),
      finish: () => a.onended?.(),
    };
    created.push(a);
    return a;
  };
  return { factory, created };
}

/** Voix de secours espionne. */
function spyFallback(log: string[]): NarrationService {
  const base = new NullNarrator();
  return {
    ...base,
    isSupported: () => true,
    hasVoice: (lang) => lang === "fr",
    speak: (u) => log.push(`device:${u.text}`),
    speakSequence: (us) => us.forEach((u) => log.push(`device:${u.text}`)),
    stop: () => log.push("device:stop"),
    setEnabled: (e) => log.push(`device:enabled=${e}`),
    setRate: (r) => log.push(`device:rate=${r}`),
    replayLast: () => {},
    getAvailableVoices: () => [{ name: "Appareil", lang: "fr" }],
    mode: () => "device",
  };
}

type Route = (url: string) => Response | Promise<Response>;
const fetchOf = (route: Route, log: string[]): typeof fetch =>
  (async (input: RequestInfo | URL) => {
    const url = String(input);
    log.push(`fetch:${url}`);
    return route(url);
  }) as typeof fetch;
const mp3 = () => new Response(new Uint8Array([73, 68, 51]), { status: 200, headers: { "content-type": "audio/mpeg" } });
const manifest = (entries: Record<string, { file: string }>) => Response.json({ version: 1, entries });
const flush = () => new Promise((r) => setTimeout(r, 0));

function make(route: Route, extra: Partial<ConstructorParameters<typeof CloudNarrator>[0]> = {}) {
  const log: string[] = [];
  const { factory, created } = fakeAudioFactory(log);
  const narrator = new CloudNarrator({ ...VOICE_CONFIG, fetch: fetchOf(route, log), createAudio: factory, createObjectUrl: (b) => `blob:${b.size}`, revokeObjectUrl: (u) => log.push(`revoke:${u}`), fallback: spyFallback(log), retryAfterMs: 1000, now: () => 0, ...extra });
  return { narrator, log, created };
}

describe("clé de phrase : stable, normalisée, identique navigateur / script", () => {
  it("normalise les espaces et hache lang + texte ; deux textes différents donnent deux clés", () => {
    expect(normalizeVoiceText("  Bonne   réponse !\n ")).toBe("Bonne réponse !");
    expect(voiceKey("fr", "Bonne réponse !")).toBe(voiceKey("fr", "  Bonne  réponse ! "));
    expect(voiceKey("fr", "Bonne réponse !")).not.toBe(voiceKey("ar", "Bonne réponse !"));
    expect(voiceKey("fr", "Bonne réponse !")).not.toBe(voiceKey("fr", "Presque !"));
    expect(voiceKey("fr", "Trésor !")).toMatch(/^fr-[0-9a-f]{16}$/);
    expect(hash53("kounouzi")).toBe(hash53("kounouzi"));
  });
});

describe("voix en ligne : une phrase = un fichier, joué dans l'ordre, jamais bloquant", () => {
  it("demande le manifeste une fois, joue les phrases l'une après l'autre à la vitesse choisie, libère les objets", async () => {
    const { narrator, log } = make((url) => (url.endsWith("manifest.json") ? manifest({}) : mp3()));
    narrator.setRate("fast");
    narrator.speakSequence([
      { text: "C'est au tour de Maryam.", lang: "fr", important: true },
      { text: "Maryam, ton chemin avance de 3 étapes.", lang: "fr" },
    ]);
    for (let i = 0; i < 8; i += 1) await flush();
    expect(log.filter((l) => l.startsWith("fetch:"))).toEqual([`fetch:${VOICE_CONFIG.manifestUrl}`, `fetch:/api/voix?lang=fr&text=${encodeURIComponent("C'est au tour de Maryam.")}`, `fetch:/api/voix?lang=fr&text=${encodeURIComponent("Maryam, ton chemin avance de 3 étapes.")}`]);
    expect(log.filter((l) => l.startsWith("play:"))).toEqual(["play:blob:3@1.15", "play:blob:3@1.15"]);
    expect(log.filter((l) => l.startsWith("revoke:"))).toHaveLength(2);
    expect(log.some((l) => l.startsWith("device:C'est"))).toBe(false);
    expect(narrator.mode()).toBe("cloud");
    expect(narrator.hasVoice("ar")).toBe(true);
  });

  it("une phrase pré-générée est servie depuis le fichier statique, sans appel au serveur", async () => {
    const key = voiceKey("fr", "Trésor !");
    const { narrator, log } = make((url) => (url.endsWith("manifest.json") ? manifest({ [key]: { file: `${key}.mp3` } }) : mp3()));
    narrator.speak({ text: "Trésor !", lang: "fr" });
    for (let i = 0; i < 6; i += 1) await flush();
    expect(log).toContain(`fetch:/kounouzi/audio/voix/${key}.mp3`);
    expect(log.some((l) => l.startsWith("fetch:/api/voix"))).toBe(false);
  });

  it("serveur non configuré (503) : la voix de l'appareil prend le relais pour toute la file, et la voix en ligne n'est plus tentée", async () => {
    const { narrator, log } = make((url) => (url.endsWith("manifest.json") ? manifest({}) : Response.json({ reason: "unconfigured" }, { status: 503 })));
    narrator.speakSequence([
      { text: "Un", lang: "fr" },
      { text: "Deux", lang: "fr" },
    ]);
    for (let i = 0; i < 6; i += 1) await flush();
    expect(log.filter((l) => l.startsWith("device:") && !l.includes("="))).toEqual(["device:Un", "device:Deux"]);
    expect(log.filter((l) => l.startsWith("fetch:/api/voix"))).toHaveLength(1);
    expect(narrator.mode()).toBe("device");
    expect(narrator.hasVoice("ar")).toBe(false);
    narrator.speak({ text: "Trois", lang: "fr" });
    await flush();
    expect(log.filter((l) => l.startsWith("fetch:/api/voix"))).toHaveLength(1);
    expect(log).toContain("device:Trois");
  });

  it("panne réseau : secours immédiat, puis nouvel essai en ligne après le délai", async () => {
    let t = 0;
    let failing = true;
    const { narrator, log } = make(
      (url) => {
        if (url.endsWith("manifest.json")) return manifest({});
        if (failing) throw new Error("hors ligne");
        return mp3();
      },
      { now: () => t },
    );
    narrator.speak({ text: "Bonne réponse !", lang: "fr" });
    for (let i = 0; i < 6; i += 1) await flush();
    expect(log).toContain("device:Bonne réponse !");
    narrator.speak({ text: "Presque !", lang: "fr" });
    await flush();
    expect(log.filter((l) => l.startsWith("fetch:/api/voix"))).toHaveLength(1);
    expect(log).toContain("device:Presque !");
    failing = false;
    t = 5000;
    narrator.speak({ text: "Trésor !", lang: "fr" });
    for (let i = 0; i < 6; i += 1) await flush();
    expect(log.filter((l) => l.startsWith("fetch:/api/voix"))).toHaveLength(2);
    expect(log.filter((l) => l.startsWith("play:"))).toHaveLength(1);
  });

  it("stop() coupe la phrase en cours et vide la file ; désactivée, la voix ne demande rien ; replayLast rejoue la dernière annonce importante", async () => {
    const audioDone = { fn: null as (() => void) | null };
    const log: string[] = [];
    const created: AudioLike[] = [];
    const factory = () => {
      const a: AudioLike = { src: "", playbackRate: 1, onended: null, onerror: null, play: async () => { log.push(`play:${a.src}`); audioDone.fn = () => a.onended?.(); }, pause: () => log.push("pause") };
      created.push(a);
      return a;
    };
    const narrator = new CloudNarrator({ ...VOICE_CONFIG, fetch: fetchOf((url) => (url.endsWith("manifest.json") ? manifest({}) : mp3()), log), createAudio: factory, createObjectUrl: () => "blob:x", revokeObjectUrl: () => {}, fallback: spyFallback(log), now: () => 0 });
    narrator.speakSequence([
      { text: "Première", lang: "fr", important: true },
      { text: "Seconde", lang: "fr" },
    ]);
    for (let i = 0; i < 6; i += 1) await flush();
    expect(log.filter((l) => l.startsWith("play:"))).toHaveLength(1);
    narrator.stop();
    expect(log).toContain("pause");
    audioDone.fn?.();
    for (let i = 0; i < 6; i += 1) await flush();
    expect(log.filter((l) => l.startsWith("play:"))).toHaveLength(1);
    expect(log.filter((l) => l.startsWith("fetch:/api/voix"))).toHaveLength(1);

    narrator.setEnabled(false);
    narrator.speak({ text: "Silence", lang: "fr" });
    for (let i = 0; i < 4; i += 1) await flush();
    expect(log.some((l) => l.includes("Silence"))).toBe(false);

    narrator.setEnabled(true);
    narrator.replayLast();
    for (let i = 0; i < 6; i += 1) await flush();
    expect(log.filter((l) => l.startsWith("fetch:/api/voix")).at(-1)).toBe(`fetch:/api/voix?lang=fr&text=${encodeURIComponent("Première")}`);
  });

  it("une phrase trop longue ou dans une langue non servie va à la voix de secours ; hors navigateur, tout va au secours", async () => {
    const { narrator, log } = make((url) => (url.endsWith("manifest.json") ? manifest({}) : mp3()), { languages: ["fr"] });
    const long: Utterance = { text: "x".repeat(VOICE_CONFIG.maxTextLength + 1), lang: "fr" };
    narrator.speakSequence([long, { text: "عربي", lang: "ar" }, { text: "Court", lang: "fr" }]);
    for (let i = 0; i < 8; i += 1) await flush();
    expect(log.filter((l) => l.startsWith("device:") && !l.includes("="))).toEqual([`device:${long.text}`, "device:عربي"]);
    expect(log.filter((l) => l.startsWith("play:"))).toHaveLength(1);

    const noAudio = new CloudNarrator({ ...VOICE_CONFIG, fetch: fetchOf(() => mp3(), log), fallback: spyFallback(log) });
    expect(noAudio.isSupported()).toBe(true);
    expect(noAudio.mode()).toBe("device");
    noAudio.speak({ text: "Sans audio", lang: "fr" });
    expect(log).toContain("device:Sans audio");
    const mute = new CloudNarrator({ ...VOICE_CONFIG, fetch: fetchOf(() => mp3(), log) });
    expect(mute.isSupported()).toBe(false);
    expect(() => mute.speak({ text: "Rien", lang: "fr" })).not.toThrow();
    expect(() => mute.unlock()).not.toThrow();
  });

  it("la sonde fixe l'état une fois : 204 → en ligne, 503 → appareil, panne → inchangé", async () => {
    const ok = make(() => new Response(null, { status: 204 }));
    expect(await ok.narrator.probe()).toBe("available");
    const no = make(() => Response.json({ reason: "unconfigured" }, { status: 503 }));
    expect(await no.narrator.probe()).toBe("unavailable");
    expect(no.narrator.mode()).toBe("device");
    const down = make(() => {
      throw new Error("réseau");
    });
    expect(await down.narrator.probe()).toBe("unknown");
  });
});
