import type { GameEvent } from "@/core/game";
import type { GameId } from "@/core/shared";

/**
 * Journal de PLAYTEST — outil de développement LOCAL. Chaque lot d'événements
 * dispatché est horodaté (horloge murale de l'appareil + temps de jeu actif
 * lu dans l'état). Rien ici n'influence jamais les règles, le Learning Engine
 * ni le Chemin : c'est une lecture passive des événements. Aucune donnée ne
 * quitte l'appareil.
 */
export interface PlaytestEntry {
  /** Horloge murale (ms depuis l'époque) au moment du dispatch. */
  readonly at: number;
  /** Temps de jeu actif (secondes) au moment du dispatch. */
  readonly active: number;
  readonly events: readonly GameEvent[];
}

export interface PlaytestLog {
  readonly gameId: GameId;
  readonly entries: readonly PlaytestEntry[];
}

export const INTERACTION_KINDS = ["question", "duel", "family_challenge", "monument", "heritage_visit", "event", "management", "solidarity", "treasure", "halt", "donation"] as const;
export type InteractionKind = (typeof INTERACTION_KINDS)[number];
