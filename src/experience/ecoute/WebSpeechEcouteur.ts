import { ECOUTE_CONFIG, type EcouteConfig } from "@/config/ecoute";
import type { AnswerOutcome } from "@/core/shared";
import type { EcouteReason, EcouteService } from "./EcouteService";
import { verdictEntendu } from "./vocabulaire";

/**
 * L'API de reconnaissance du navigateur n'est pas dans les types DOM
 * standards : on déclare le strict minimum dont on se sert, rien de plus.
 */
interface ReconnaissanceLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: { readonly results: SpeechRecognitionResultList; readonly resultIndex: number }) => void) | null;
  onerror: ((event: { readonly error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

type FabriqueReconnaissance = new () => ReconnaissanceLike;

function fabriqueDuNavigateur(): FabriqueReconnaissance | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: FabriqueReconnaissance; webkitSpeechRecognition?: FabriqueReconnaissance };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/**
 * Écoute par le navigateur, et par lui seul : aucune clé, aucun service
 * Kounouzi, aucun audio envoyé par le jeu. Le navigateur peut, lui, faire appel
 * à son propre service de reconnaissance — c'est dit dans les réglages.
 *
 * La reconnaissance s'arrête d'elle-même après un silence : tant que l'appelant
 * n'a pas dit `arreter()`, on la relance. Un refus du micro, lui, est
 * DÉFINITIF pour la session : on ne redemande pas en boucle.
 */
export class WebSpeechEcouteur implements EcouteService {
  private readonly fabrique: FabriqueReconnaissance | null;
  private readonly config: EcouteConfig;
  private reconnaissance: ReconnaissanceLike | null = null;
  private voulu = false;
  private refuse = false;
  private rappel: ((verdict: AnswerOutcome) => void) | null = null;

  constructor(options: { readonly config?: EcouteConfig; readonly fabrique?: FabriqueReconnaissance | null } = {}) {
    this.config = options.config ?? ECOUTE_CONFIG;
    this.fabrique = options.fabrique === undefined ? fabriqueDuNavigateur() : options.fabrique;
  }

  isSupported(): boolean {
    return this.raison() === "ok";
  }

  raison(): EcouteReason {
    if (this.refuse) return "denied";
    if (this.fabrique === null) return "unsupported";
    // Le micro n'existe que dans un contexte sécurisé ; `isSecureContext` est absent au rendu serveur.
    if (typeof window !== "undefined" && window.isSecureContext === false) return "insecure";
    return "ok";
  }

  ecoute(): boolean {
    return this.voulu && this.reconnaissance !== null;
  }

  ecouter(onVerdict: (verdict: AnswerOutcome) => void): void {
    if (this.raison() !== "ok" || this.voulu) return;
    this.voulu = true;
    this.rappel = onVerdict;
    this.demarrer();
  }

  arreter(): void {
    this.voulu = false;
    this.rappel = null;
    const courante = this.reconnaissance;
    this.reconnaissance = null;
    courante?.abort();
  }

  private demarrer(): void {
    if (!this.voulu || this.fabrique === null) return;
    const reconnaissance = new this.fabrique();
    reconnaissance.lang = this.config.lang;
    reconnaissance.continuous = true;
    // Seules les phrases FINALES sont lues : une phrase en cours change encore, et validerait trop tôt.
    reconnaissance.interimResults = false;
    reconnaissance.maxAlternatives = this.config.maxAlternatives;
    reconnaissance.onresult = (event) => this.lire(event.results, event.resultIndex);
    reconnaissance.onerror = (event) => {
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        this.refuse = true;
        this.arreter();
      }
    };
    reconnaissance.onend = () => {
      // Fin après un silence : on relance, tant que l'appelant veut encore écouter.
      if (this.voulu && this.reconnaissance === reconnaissance) this.demarrer();
    };
    this.reconnaissance = reconnaissance;
    try {
      reconnaissance.start();
    } catch {
      // Un `start()` sur une reconnaissance déjà démarrée lève : sans conséquence, l'écoute continue.
    }
  }

  private lire(results: SpeechRecognitionResultList, depuis: number): void {
    for (let i = Math.max(0, depuis); i < results.length; i += 1) {
      const resultat = results[i];
      if (!resultat?.isFinal) continue;
      for (let k = 0; k < resultat.length; k += 1) {
        const proposition = resultat[k];
        if (!proposition) continue;
        // Plusieurs navigateurs renvoient une confiance de 0 : cela ne veut pas dire « mauvaise ».
        if (proposition.confidence > 0 && proposition.confidence < this.config.minConfidence) continue;
        const verdict = verdictEntendu(proposition.transcript, this.config);
        if (verdict) {
          this.rappel?.(verdict);
          return;
        }
      }
    }
  }
}
