import type { AnswerOutcome } from "@/core/shared";

/**
 * Pourquoi le micro n'écoute pas. Affiché tel quel dans les réglages : on ne
 * devine pas à la place de l'appareil, et le parent sait quoi faire.
 * - `ok` : l'écoute est possible.
 * - `unsupported` : ce navigateur n'a pas de reconnaissance vocale (Firefox).
 * - `insecure` : la page n'est pas en HTTPS, le micro est interdit.
 * - `denied` : le micro a été refusé pour ce site.
 */
export type EcouteReason = "ok" | "unsupported" | "insecure" | "denied";

/**
 * Couche d'EXPÉRIENCE. L'écoute ne contrôle jamais le moteur : elle appuie sur
 * un bouton qui existe déjà, et qui reste toujours utilisable au doigt. Si le
 * micro est absent, refusé ou sourd, rien ne change dans la partie.
 *
 * Elle n'écoute que la VALIDATION, une fois la réponse révélée. La réponse de
 * l'enfant n'est jamais écoutée, jamais transcrite, jamais envoyée nulle part.
 */
export interface EcouteService {
  isSupported(): boolean;
  raison(): EcouteReason;
  /** Ouvre le micro jusqu'à `arreter()`. Chaque verdict reconnu appelle `onVerdict`. */
  ecouter(onVerdict: (verdict: AnswerOutcome) => void): void;
  /** Ferme le micro. Appelable à tout moment, même si l'écoute n'a jamais démarré. */
  arreter(): void;
  /** Le micro est ouvert en ce moment (pour le témoin à l'écran). */
  ecoute(): boolean;
}

/** Écouteur sourd : rendu serveur, tests, et appareils sans reconnaissance vocale. */
export class NullEcouteur implements EcouteService {
  constructor(private readonly motif: EcouteReason = "unsupported") {}
  isSupported(): boolean {
    return false;
  }
  raison(): EcouteReason {
    return this.motif;
  }
  ecouter(): void {}
  arreter(): void {}
  ecoute(): boolean {
    return false;
  }
}
