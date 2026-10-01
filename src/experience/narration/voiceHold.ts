import type { NarrationService } from "./NarrationService";

/** Attente par petits pas : la voix ne prévient pas quand elle a fini, on la sonde. */
const DEFAULT_POLL_MS = 120;

export interface VoiceHoldOptions {
  readonly pollMs?: number | undefined;
  readonly sleep?: ((ms: number) => Promise<void>) | undefined;
}

/**
 * LE PLATEAU NE DOIT JAMAIS ÉCRIRE AUTRE CHOSE QUE CE QUE LA VOIX DIT.
 *
 * La narration est demandée au moment où le bandeau apparaît, mais la voix en
 * ligne doit d'abord télécharger sa phrase, puis la dire : elle finit après le
 * bandeau. La file d'animation, elle, n'attendait pas — elle enchaînait, et son
 * retard s'accumulait phrase après phrase. En partie réelle, la voix disait
 * « Assia donne 20 Kounouz à Adam » alors que le plateau affichait déjà le
 * bandeau suivant.
 *
 * D'où cette attente : le bandeau reste tant qu'une phrase est dite ou en
 * attente. Elle est BORNÉE (`maxMs`) et ne s'applique jamais quand la voix est
 * coupée, muette ou absente (`isSpeaking()` est alors faux) : le jeu ne dépend
 * donc jamais de la narration, conformément à l'ADR 0036.
 */
export function voiceHold(narrator: NarrationService, maxMs: number, options: VoiceHoldOptions = {}): () => Promise<void> {
  const pollMs = Math.max(1, options.pollMs ?? DEFAULT_POLL_MS);
  const sleep = options.sleep ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));
  return async () => {
    if (maxMs <= 0) return;
    for (let attendu = 0; attendu < maxMs && narrator.isSpeaking(); attendu += pollMs) await sleep(pollMs);
  };
}
