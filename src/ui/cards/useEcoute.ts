"use client";

import { useEffect, useRef, useState } from "react";
import { ECOUTE_CONFIG } from "@/config/ecoute";
import type { AnswerOutcome } from "@/core/shared";
import type { EcouteService } from "@/experience/ecoute";
import type { NarrationService } from "@/experience/narration";
import type { QuestionStep } from "./cardState";

/**
 * LA SEULE étape où le micro peut s'ouvrir : la réponse est déjà révélée, et
 * il ne reste que trois verdicts possibles. À l'étape « question », l'enfant
 * est en train de répondre — le micro y est fermé, sa réponse n'est jamais
 * entendue. Ajouter une étape ici, c'est ouvrir le micro ailleurs : à faire en
 * connaissance de cause, et un test parcourt toutes les étapes.
 */
export const ETAPES_ECOUTE: readonly QuestionStep[] = ["revealed"];

/** Le micro doit-il être ouvert ? Fonction pure, pour que la règle soit lisible et testée seule. */
export function ecouteAutorisee(etape: QuestionStep, voixOffParle: boolean): boolean {
  // Tant que la voix off parle, le micro reste fermé : sinon le jeu s'entend
  // lui-même prononcer la réponse et pourrait y reconnaître un verdict.
  return ETAPES_ECOUTE.includes(etape) && !voixOffParle;
}

export interface UseEcouteOptions {
  /** `undefined` : la validation à la voix est éteinte — le micro ne s'ouvre jamais. */
  readonly ecouteur: EcouteService | undefined;
  readonly narrator: NarrationService;
  /** L'étape affichée : elle seule décide si le micro peut s'ouvrir. */
  readonly etape: QuestionStep;
  readonly onVerdict: (verdict: AnswerOutcome) => void;
}

/**
 * Ouvre le micro pendant la validation, et seulement là.
 *
 * Deux garde-fous portés ici, parce qu'ils ne relèvent ni des données ni du
 * navigateur :
 *
 * 1. Il ne s'ouvre qu'à l'étape où la réponse est déjà révélée. Pendant que
 *    l'enfant répond, le micro est FERMÉ : sa réponse n'est jamais entendue.
 * 2. Tant que la voix off parle, le micro se referme — sinon le jeu s'entend
 *    lui-même prononcer la réponse et pourrait y reconnaître un verdict.
 *
 * Rend `vrai` quand le micro est effectivement ouvert, pour le dire à l'écran :
 * un micro ouvert sans que personne ne le sache serait inacceptable.
 */
export function useEcoute({ ecouteur, narrator, etape, onVerdict }: UseEcouteOptions): boolean {
  const [ouvert, setOuvert] = useState(false);
  const rappel = useRef(onVerdict);
  useEffect(() => {
    rappel.current = onVerdict;
  });

  const possible = ETAPES_ECOUTE.includes(etape);
  useEffect(() => {
    if (!ecouteur || !possible || !ecouteur.isSupported()) return undefined;
    // Ouvrir ou refermer le micro : c'est le pilotage d'un système extérieur,
    // pas un état de React.
    const appliquer = () => {
      if (ecouteAutorisee(etape, narrator.isSpeaking())) ecouteur.ecouter((verdict) => rappel.current(verdict));
      else ecouteur.arreter();
    };
    appliquer();
    const minuterie = setInterval(() => {
      appliquer();
      setOuvert(ecouteur.ecoute());
    }, ECOUTE_CONFIG.silenceCheckMs);
    return () => {
      clearInterval(minuterie);
      ecouteur.arreter();
    };
  }, [ecouteur, narrator, etape, possible]);

  // Hors étape de validation, le micro est fermé par construction : on le DÉDUIT
  // au lieu de le mémoriser, pour qu'aucun témoin ne puisse rester allumé à tort.
  return ouvert && possible && ecouteur !== undefined;
}
