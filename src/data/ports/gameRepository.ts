import type { AdultInitialLevel, GameId, PlayerId, ProfileType } from "@/core/shared";

/**
 * Brouillon de profil saisi à la création d'une partie. Prépare le futur
 * profil joueur (Phase 5+) ; aucune mémoire pédagogique n'existe encore.
 */
export interface PlayerProfileDraft {
  readonly id: PlayerId;
  readonly displayName: string;
  readonly profileType: ProfileType;
  readonly avatarId: string;
  readonly child?: { readonly birthYear: number; readonly schoolGrade: string };
  readonly adult?: { readonly initialLevel: AdultInitialLevel };
}

export interface GameSummary {
  readonly gameId: GameId;
  readonly savedAt: string;
  readonly status: "in_progress" | "finished";
  readonly turnNumber: number;
  readonly players: readonly { readonly displayName: string; readonly avatarId: string }[];
}

/** Ce qui est réellement persisté : l'état du moteur sérialisé + les brouillons de profil. */
export interface SavedGame extends GameSummary {
  readonly profiles: readonly PlayerProfileDraft[];
  /** `GameState` sérialisé par `serializeGameState` (versionné). */
  readonly state: string;
}

export interface GameRepository {
  save(game: SavedGame): Promise<void>;
  load(gameId: GameId): Promise<SavedGame | undefined>;
  list(): Promise<readonly GameSummary[]>;
  remove(gameId: GameId): Promise<void>;
}
