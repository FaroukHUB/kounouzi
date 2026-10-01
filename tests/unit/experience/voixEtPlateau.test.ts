import { describe, expect, it } from "vitest";
import { VOICE_CONFIG } from "@/config/narration";
import { playEvent, type AnimationActions } from "@/animation/player";
import { DEFAULT_TIMINGS, REDUCED_TIMINGS, safetyTimeout } from "@/animation/timings";
import type { GameEvent } from "@/core/game";
import type { PlayerId } from "@/core/shared";
import { CloudNarrator, NullNarrator, voiceHold, type AudioLike, type NarrationService } from "@/experience/narration";

/**
 * « Lors d'un don, la voix dit bien "Assia donne 20 Kounouz à Adam" mais le
 * plateau écrit autre chose. » Deux causes, toutes deux traitées ici :
 *
 *  - le bandeau s'effaçait après une durée FIXE, alors que la voix en ligne
 *    doit d'abord télécharger sa phrase puis la dire : la file enchaînait et
 *    affichait déjà le bandeau suivant ;
 *  - la voix empilait les phrases en retard, donc son décalage grandissait tout
 *    au long de la partie.
 */
const p1 = "p1" as PlayerId;
const transfert: GameEvent = { type: "MoneyTransferred", transferId: "t1", fromPlayerId: p1, toPlayerId: "p2" as PlayerId, requested: 20, amount: 20, reason: "donation" };
/** Le délai de sécurité de cet événement : il ne doit JAMAIS se déclencher dans ces tests. */
const BUDGET = safetyTimeout(DEFAULT_TIMINGS.transferMs) + DEFAULT_TIMINGS.voiceHoldMaxMs;
/** Les durées d'animation s'écoulent tout de suite ; le délai de sécurité, jamais. */
const sansAttendre = (ms: number) => (ms === BUDGET ? new Promise<void>(() => {}) : Promise.resolve());

function recorder() {
  const calls: string[] = [];
  const actions: AnimationActions = {
    setPawn: () => {},
    setHighlight: () => {},
    setArrival: () => {},
    revealJourney: () => {},
    hideJourney: () => {},
    setBanner: (b) => calls.push(`banner:${b ? b.kind : "null"}`),
    openCard: () => {},
    updateCard: () => {},
    closeCard: () => {},
  };
  return { calls, actions };
}

/** Narrateur dont le test décide quand la phrase est finie. */
function voixPilotee(): NarrationService & { finir: () => void } {
  let enCours = true;
  const base = new NullNarrator();
  return { ...base, isSupported: () => true, isSpeaking: () => enCours, hasVoice: () => true, speak: () => {}, speakSequence: () => {}, stop: () => {}, replayLast: () => {}, getAvailableVoices: () => [], setEnabled: () => {}, setRate: () => {}, finir: () => void (enCours = false) };
}

/** Compte les sondages d'une attente (le temps est simulé). */
function sondeur() {
  let sondages = 0;
  return {
    get sondages() {
      return sondages;
    },
    sleep: async () => void (sondages += 1),
  };
}

describe("la voix et le plateau disent la même chose", () => {
  it("le bandeau reste affiché tant que la phrase n'est pas finie", async () => {
    const { calls, actions } = recorder();
    let liberer: (() => void) | null = null;
    const hold = () => new Promise<void>((resolve) => (liberer = resolve));
    const lecture = playEvent(transfert, actions, DEFAULT_TIMINGS, sansAttendre, hold);
    // La durée fixe du bandeau est écoulée, la phrase continue : le bandeau est TOUJOURS là.
    for (let i = 0; i < 5; i += 1) await Promise.resolve();
    expect(calls).toEqual(["banner:transfer"]);
    expect(liberer).not.toBeNull();
    liberer!();
    await lecture;
    expect(calls).toEqual(["banner:transfer", "banner:null", "banner:null"]);
  });

  it("l'attente suit la phrase : elle s'arrête dès qu'elle est dite, et sans voix elle n'existe pas", async () => {
    const voix = voixPilotee();
    const s = sondeur();
    const attendre = voiceHold(voix, DEFAULT_TIMINGS.voiceHoldMaxMs, { pollMs: 100, sleep: s.sleep });
    // Au troisième sondage, la phrase se termine.
    const enCours = attendre();
    await Promise.resolve();
    voix.finir();
    await enCours;
    expect(s.sondages).toBeGreaterThan(0);
    expect(s.sondages).toBeLessThan(DEFAULT_TIMINGS.voiceHoldMaxMs / 100);

    // Voix coupée, muette ou absente : aucun sondage, donc aucune attente.
    const muet = sondeur();
    await voiceHold(new NullNarrator(), DEFAULT_TIMINGS.voiceHoldMaxMs, { pollMs: 100, sleep: muet.sleep })();
    expect(muet.sondages).toBe(0);

    // Animations réduites : plafond à zéro, donc aucune attente même si la voix parle.
    expect(REDUCED_TIMINGS.voiceHoldMaxMs).toBe(0);
    const reduit = sondeur();
    await voiceHold(voixPilotee(), REDUCED_TIMINGS.voiceHoldMaxMs, { pollMs: 100, sleep: reduit.sleep })();
    expect(reduit.sondages).toBe(0);
  });

  it("une voix qui ne finit jamais ne bloque pas la file : l'attente est plafonnée", async () => {
    const { calls, actions } = recorder();
    const s = sondeur();
    const hold = voiceHold(voixPilotee(), DEFAULT_TIMINGS.voiceHoldMaxMs, { pollMs: 100, sleep: s.sleep });
    await playEvent(transfert, actions, DEFAULT_TIMINGS, sansAttendre, hold);
    expect(calls).toEqual(["banner:transfer", "banner:null", "banner:null"]);
    expect(s.sondages).toBe(DEFAULT_TIMINGS.voiceHoldMaxMs / 100);
  });

  it("la voix ne prend pas de retard : la phrase en attente la plus ancienne tombe, une séquence reste entière", async () => {
    // Une phrase abandonnée n'est jamais demandée au serveur : la liste des phrases
    // demandées est donc exactement la liste des phrases dites.
    const dites: string[] = [];
    const audio = (): AudioLike => {
      const a: AudioLike = {
        src: "",
        playbackRate: 1,
        onended: null,
        onerror: null,
        play: async () => queueMicrotask(() => a.onended?.()),
        pause: () => {},
      };
      return a;
    };
    const faire = () =>
      new CloudNarrator({
        ...VOICE_CONFIG,
        // Le manifeste est vide : chaque phrase passe par le point d'entrée serveur, donc son texte est dans l'URL.
        fetch: (async (input: RequestInfo | URL) => {
          const url = String(input);
          if (url.endsWith("manifest.json")) return Response.json({ version: 1, entries: {} });
          dites.push(decodeURIComponent(url.slice(url.indexOf("text=") + 5)));
          return new Response(new Uint8Array([1]), { status: 200 });
        }) as typeof fetch,
        createAudio: audio,
        createObjectUrl: () => "blob:x",
        revokeObjectUrl: () => {},
        now: () => 0,
      });
    const flush = () => new Promise((r) => setTimeout(r, 0));

    // Trois phrases demandées d'affilée, avant que rien n'ait pu être joué : la plus ancienne tombe.
    const narrateur = faire();
    narrateur.speak({ text: "un", lang: "fr" });
    narrateur.speak({ text: "deux", lang: "fr" });
    narrateur.speak({ text: "trois", lang: "fr" });
    expect(narrateur.isSpeaking()).toBe(true);
    await flush();
    expect(dites).toEqual(["deux", "trois"]);
    expect(narrateur.isSpeaking()).toBe(false);

    // Une question lue en plusieurs phrases n'est jamais tronquée.
    const lecteur = faire();
    lecteur.speakSequence([
      { text: "Question ?", lang: "fr" },
      { text: "Réponse A.", lang: "fr" },
      { text: "Réponse B.", lang: "fr" },
    ]);
    await flush();
    expect(dites.slice(2)).toEqual(["Question ?", "Réponse A.", "Réponse B."]);
  });
});
