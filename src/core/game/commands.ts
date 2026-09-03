import type { PlayerId } from "@/core/shared";
import type { ServedQuestion } from "@/core/content/types";
import type { AnswerRecord } from "./types";

/**
 * Tout ce qu'un humain (ou la couche session) peut demander au moteur.
 * Le joueur ne fournit JAMAIS de valeur de déplacement : `StartJourney` sans
 * paramètre, le moteur attribue le Chemin lui-même.
 */
export type PlayerCommand =
  | { readonly type: "StartJourney"; readonly playerId: PlayerId }
  | { readonly type: "SubmitAnswer"; readonly playerId: PlayerId; readonly requestId: string; readonly answer: AnswerRecord }
  | { readonly type: "DecidePurchase"; readonly playerId: PlayerId; readonly siteId: string; readonly buy: boolean }
  | { readonly type: "Choose"; readonly playerId: PlayerId; readonly choiceId: string; readonly optionId: string };

/** Commandes de session, indépendantes du joueur actif. */
export type SessionCommand =
  /** Temps de jeu ACTIF écoulé (la couche session ne l'envoie que si la partie est visible et non en pause). */
  | { readonly type: "AdvanceClock"; readonly seconds: number }
  /** Demande de fin (espace parent) : la partie s'arrête à la fin du tour de table en cours. */
  | { readonly type: "RequestGameEnd" }
  /** Fige la question distribuée pour la demande en cours (contenu résolu hors du moteur). */
  | { readonly type: "ServeQuestion"; readonly requestId: string; readonly question: ServedQuestion };

export type Command = PlayerCommand | SessionCommand;

export const isPlayerCommand = (c: Command): c is PlayerCommand => "playerId" in c;
