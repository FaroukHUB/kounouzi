import { describe, expect, it } from "vitest";
import { VOICE_CONFIG } from "@/config/narration";
import { handleVoiceRequest, missingVoiceEnv, voiceConfigured, VOICE_ENV } from "@/experience/narration";

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
});
