import type { PlayerId } from "@/core/shared";
import type { ServedQuestion } from "@/core/content/types";
import type { AnswerRecord, ChallengeSettings, ChallengeSkipReason } from "./types";

/**
 * Tout ce qu'un humain (ou la couche session) peut demander au moteur.
 * Le joueur ne fournit JAMAIS de valeur de déplacement : `StartJourney` sans
 * paramètre, le moteur attribue le Chemin lui-même. Il ne choisit jamais une
 * question, une difficulté ni une notion : seulement un adversaire ou un
 * destinataire quand le jeu le lui demande.
 */
export type PlayerCommand =
  | { readonly type: "StartJourney"; readonly playerId: PlayerId }
  /** `playerId` = le joueur qui répond : le joueur actif, ou l'adversaire pendant un Duel. */
  | { readonly type: "SubmitAnswer"; readonly playerId: PlayerId; readonly requestId: string; readonly answer: AnswerRecord }
  | { readonly type: "DecidePurchase"; readonly playerId: PlayerId; readonly siteId: string; readonly buy: boolean }
  | { readonly type: "Choose"; readonly playerId: PlayerId; readonly choiceId: string; readonly optionId: string }
  | { readonly type: "ChooseOpponent"; readonly playerId: PlayerId; readonly opponentId: PlayerId }
  | { readonly type: "ChooseRecipient"; readonly playerId: PlayerId; readonly recipientId: PlayerId }
  /* ---- Défi famille ---- */
  | { readonly type: "AcceptChallenge"; readonly playerId: PlayerId }
  /** Validation collective : réussi ou raté. Réussi crédite le gain une fois ; raté = 0. */
  | { readonly type: "CompleteChallenge"; readonly playerId: PlayerId; readonly success: boolean }
  /** Refus (0 Kounouz, aucune autre pénalité) ; `consent_refused` : l'autre personne refuse, le défi éligible suivant est proposé. */
  | { readonly type: "SkipChallenge"; readonly playerId: PlayerId; readonly reason: ChallengeSkipReason };

/** Commandes de session, indépendantes du joueur actif. */
export type SessionCommand =
  /** Temps de jeu ACTIF écoulé (la couche session ne l'envoie que si la partie est visible et non en pause). */
  | { readonly type: "AdvanceClock"; readonly seconds: number }
  /** Demande de fin (espace parent) : la partie s'arrête à la fin du tour de table en cours. */
  | { readonly type: "RequestGameEnd" }
  /** Fige la question distribuée pour la demande en cours (contenu résolu hors du moteur). */
  | { readonly type: "ServeQuestion"; readonly requestId: string; readonly question: ServedQuestion }
  /** Réglages parents des Défis famille (interrupteurs) : explicites, journalisés, sans effet sur le reste des règles. */
  | { readonly type: "SetChallengeSettings"; readonly settings: ChallengeSettings };

export type Command = PlayerCommand | SessionCommand;

export const isPlayerCommand = (c: Command): c is PlayerCommand => "playerId" in c;
