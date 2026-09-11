import { describe, expect, it } from "vitest";
import { VOICE_CONFIG } from "@/config/narration";
import { handleVoiceRequest, voiceConfigured, type VoiceRouteDeps } from "@/experience/narration";

const ENV = { ELEVENLABS_API_KEY: "k-test", ELEVENLABS_VOICE_ID: "voix-test" };
const base = { maxTextLength: VOICE_CONFIG.maxTextLength, languages: VOICE_CONFIG.languages };
const req = (query: string) => new Request(`https://kounouzi.test/api/voix${query}`);
type Upstream = (url: string, init: RequestInit) => Response;
const deps = (env: VoiceRouteDeps["env"], upstream: Upstream, calls: { url: string; init: RequestInit }[] = []): VoiceRouteDeps => ({
  env,
  fetch: (async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ url: String(input), init: init ?? {} });
    return upstream(String(input), init ?? {});
  }) as typeof fetch,
  ...base,
});

describe("route /api/voix : la clé reste au serveur, le texte est validé, l'audio est mis en cache longtemps", () => {
  it("sonde : 204 quand la clé et la voix sont configurées, 503 sinon (sans appel amont)", async () => {
    const calls: { url: string; init: RequestInit }[] = [];
    expect((await handleVoiceRequest(req("?probe=1"), deps(ENV, () => new Response("x"), calls))).status).toBe(204);
    expect((await handleVoiceRequest(req("?probe=1"), deps({}, () => new Response("x"), calls))).status).toBe(503);
    expect((await handleVoiceRequest(req("?lang=fr&text=Bonjour"), deps({ ELEVENLABS_API_KEY: "k" }, () => new Response("x"), calls))).status).toBe(503);
    expect(calls).toHaveLength(0);
    expect(voiceConfigured(ENV)).toBe(true);
    expect(voiceConfigured({ ELEVENLABS_VOICE_ID: "v" })).toBe(false);
  });

  it("refuse une langue non servie, un texte vide, trop long ou avec caractères de contrôle (400, jamais mis en cache)", async () => {
    const calls: { url: string; init: RequestInit }[] = [];
    const d = deps(ENV, () => new Response("x"), calls);
    for (const q of ["?lang=en&text=Hello", "?lang=fr&text=", "?lang=fr", `?lang=fr&text=${"a".repeat(VOICE_CONFIG.maxTextLength + 1)}`, "?lang=fr&text=Bon%07jour"]) {
      const res = await handleVoiceRequest(req(q), d);
      expect(res.status, q).toBe(400);
      expect(res.headers.get("cache-control")).toBe("no-store");
    }
    expect(calls).toHaveLength(0);
  });

  it("appelle ElevenLabs avec la clé en en-tête, la voix et le modèle de l'environnement, et renvoie l'audio avec un cache immuable", async () => {
    const calls: { url: string; init: RequestInit }[] = [];
    const bytes = new Uint8Array([73, 68, 51, 4]);
    const res = await handleVoiceRequest(req(`?lang=fr&text=${encodeURIComponent("  C'est au tour de   Maryam. ")}`), deps({ ...ENV, ELEVENLABS_MODEL_ID: "modele-test" }, () => new Response(bytes, { status: 200, headers: { "content-type": "audio/mpeg" } }), calls));
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("audio/mpeg");
    expect(res.headers.get("cache-control")).toBe("public, max-age=31536000, s-maxage=31536000, immutable");
    expect(new Uint8Array(await res.arrayBuffer())).toEqual(bytes);
    expect(calls).toHaveLength(1);
    expect(calls[0]!.url).toBe("https://api.elevenlabs.io/v1/text-to-speech/voix-test?output_format=mp3_44100_64");
    const headers = calls[0]!.init.headers as Record<string, string>;
    expect(headers["xi-api-key"]).toBe("k-test");
    expect(JSON.parse(String(calls[0]!.init.body))).toEqual({ text: "C'est au tour de Maryam.", model_id: "modele-test", language_code: "fr" });
  });

  it("l'arabe est servi comme le français ; une panne amont donne 502 sans cache, jamais d'exception", async () => {
    const ar = await handleVoiceRequest(req(`?lang=ar&text=${encodeURIComponent("أحسنت")}`), deps(ENV, () => new Response(new Uint8Array([1]), { status: 200 })));
    expect(ar.status).toBe(200);
    expect(ar.headers.get("x-kounouzi-lang")).toBe("ar");
    const bad = await handleVoiceRequest(req("?lang=fr&text=Bonjour"), deps(ENV, () => new Response("quota", { status: 429 })));
    expect(bad.status).toBe(502);
    expect(bad.headers.get("cache-control")).toBe("no-store");
    const down = await handleVoiceRequest(
      req("?lang=fr&text=Bonjour"),
      deps(ENV, () => {
        throw new Error("réseau");
      }),
    );
    expect(down.status).toBe(502);
  });
});
