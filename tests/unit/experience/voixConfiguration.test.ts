import { describe, expect, it } from "vitest";
import { VOICE_CONFIG } from "@/config/narration";
import { handleVoiceRequest, missingVoiceEnv, refusalCause, voiceConfigured, VOICE_ENV } from "@/experience/narration";

const DEPS = { fetch: (async () => new Response(null, { status: 200 })) as typeof fetch, maxTextLength: 1200, languages: ["fr"] as const, tones: VOICE_CONFIG.tones, defaultTone: VOICE_CONFIG.defaultTone };

describe("voix en ligne — le serveur NOMME ce qui lui manque", () => {
  it("les deux variables sont exigées, et seulement elles", () => {
    expect([...VOICE_ENV]).toEqual(["ELEVENLABS_API_KEY", "ELEVENLABS_VOICE_ID"]);
    expect(voiceConfigured({ ELEVENLABS_API_KEY: "k", ELEVENLABS_VOICE_ID: "v" })).toBe(true);
    // Le modèle est facultatif : il a une valeur par défaut.
    expect(voiceConfigured({ ELEVENLABS_API_KEY: "k", ELEVENLABS_VOICE_ID: "v", ELEVENLABS_MODEL_ID: undefined })).toBe(true);
  });

  it("une clé posée SANS identifiant de voix : la voix reste muette, et on dit laquelle manque", () => {
    // Le cas vécu : la clé est bien dans Vercel, l'identifiant de voix non, et
    // le jeu retombait sur la voix de l'appareil sans dire ce qui clochait.
    expect(voiceConfigured({ ELEVENLABS_API_KEY: "k" })).toBe(false);
    expect(missingVoiceEnv({ ELEVENLABS_API_KEY: "k" })).toEqual(["ELEVENLABS_VOICE_ID"]);
    expect(missingVoiceEnv({ ELEVENLABS_VOICE_ID: "v" })).toEqual(["ELEVENLABS_API_KEY"]);
    expect(missingVoiceEnv({})).toEqual(["ELEVENLABS_API_KEY", "ELEVENLABS_VOICE_ID"]);
    // Une variable VIDE compte comme absente : un champ laissé blanc ne configure rien.
    expect(missingVoiceEnv({ ELEVENLABS_API_KEY: "k", ELEVENLABS_VOICE_ID: "" })).toEqual(["ELEVENLABS_VOICE_ID"]);
  });

  it("la sonde répond 503 EN NOMMANT la variable, sans jamais livrer sa valeur", async () => {
    const res = await handleVoiceRequest(new Request("https://x/api/voix?probe=1"), { ...DEPS, env: { ELEVENLABS_API_KEY: "secret-a-ne-jamais-sortir" } });
    expect(res.status).toBe(503);
    const corps = (await res.json()) as { reason: string; missing: string[] };
    expect(corps).toEqual({ reason: "unconfigured", missing: ["ELEVENLABS_VOICE_ID"] });
    // Le NOM d'une variable n'est pas un secret ; sa VALEUR ne doit jamais sortir.
    expect(JSON.stringify(corps)).not.toContain("secret-a-ne-jamais-sortir");
  });

  it("une demande de phrase répond pareil : on sait pourquoi rien ne sort", async () => {
    const res = await handleVoiceRequest(new Request("https://x/api/voix?lang=fr&text=bravo"), { ...DEPS, env: {} });
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ reason: "unconfigured", missing: ["ELEVENLABS_API_KEY", "ELEVENLABS_VOICE_ID"] });
  });

  it("les deux variables posées : la sonde dit oui, et rien ne manque", async () => {
    const res = await handleVoiceRequest(new Request("https://x/api/voix?probe=1"), { ...DEPS, env: { ELEVENLABS_API_KEY: "k", ELEVENLABS_VOICE_ID: "v" } });
    expect(res.status).toBe(204);
    expect(missingVoiceEnv({ ELEVENLABS_API_KEY: "k", ELEVENLABS_VOICE_ID: "v" })).toEqual([]);
  });

  it("un refus du fournisseur est RELAYÉ avec son code, jamais avale", async () => {
    // Avant, le serveur jetait le code d'ElevenLabs et le jeu affichait « clé
    // invalide, quota atteint, ou voix inconnue » : trois causes dans le même
    // sac, aucune à corriger.
    const refus = (status: number, corps: unknown) => (async () => new Response(JSON.stringify(corps), { status, headers: { "content-type": "application/json" } })) as typeof fetch;
    const env = { ELEVENLABS_API_KEY: "k", ELEVENLABS_VOICE_ID: "v" };
    const res = await handleVoiceRequest(new Request("https://x/api/voix?lang=fr&text=bravo"), { ...DEPS, env, fetch: refus(404, { detail: { status: "voice_not_found", message: "…" } }) });
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ reason: "upstream", status: 404, detail: "voice_not_found" });
  });

  it("le refus se traduit en UNE cause, et donc en une consigne", () => {
    // Le code du fournisseur prime, le code HTTP tranche à défaut.
    expect(refusalCause({ status: 404, detail: "voice_not_found" })).toBe("voice");
    expect(refusalCause({ status: 401, detail: "invalid_api_key" })).toBe("key");
    expect(refusalCause({ status: 429, detail: "quota_exceeded" })).toBe("quota");
    expect(refusalCause({ status: 401 })).toBe("key");
    expect(refusalCause({ status: 403 })).toBe("key");
    expect(refusalCause({ status: 404 })).toBe("voice");
    expect(refusalCause({ status: 429 })).toBe("quota");
    expect(refusalCause({ status: 422 })).toBe("request");
    expect(refusalCause({ status: 500 })).toBe("unknown");
    expect(refusalCause({})).toBe("unknown");
    // Un quota annoncé avec un 200 inattendu reste un quota : le repère prime.
    expect(refusalCause({ status: 500, detail: "quota_exceeded" })).toBe("quota");
  });

  it("le corps du fournisseur n'est jamais relayé en entier", async () => {
    // Il peut être long et contenir n'importe quoi : on ne garde qu'un repère court.
    const long = "x".repeat(500);
    const env = { ELEVENLABS_API_KEY: "k", ELEVENLABS_VOICE_ID: "v" };
    const res = await handleVoiceRequest(new Request("https://x/api/voix?lang=fr&text=bravo"), {
      ...DEPS,
      env,
      fetch: (async () => new Response(JSON.stringify({ detail: long }), { status: 400, headers: { "content-type": "application/json" } })) as typeof fetch,
    });
    const corps = (await res.json()) as { detail: string };
    expect(corps.detail.length).toBeLessThanOrEqual(120);
  });

  it("un refus sans corps lisible ne fait pas tomber le serveur", async () => {
    const env = { ELEVENLABS_API_KEY: "k", ELEVENLABS_VOICE_ID: "v" };
    const res = await handleVoiceRequest(new Request("https://x/api/voix?lang=fr&text=bravo"), {
      ...DEPS,
      env,
      fetch: (async () => new Response("<html>502</html>", { status: 502 })) as typeof fetch,
    });
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ reason: "upstream", status: 502 });
  });
});
