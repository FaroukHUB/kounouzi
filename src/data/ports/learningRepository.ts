import type { PlayerLearningMemory } from "@/core/learning";
import type { PlayerId } from "@/core/shared";
import type { PlayerProfileDraft } from "./gameRepository";

/**
 * Port de la mémoire pédagogique : le Learning Engine ne connaît JAMAIS
 * IndexedDB (ni, plus tard, Supabase). Une mémoire par joueur, écrasée à
 * chaque sauvegarde ; la mémoire survit aux parties et aux fermetures.
 */
export interface LearningRepository {
  load(playerId: PlayerId): Promise<PlayerLearningMemory | undefined>;
  save(memory: PlayerLearningMemory): Promise<void>;
  remove(playerId: PlayerId): Promise<void>;
}

/** Profil joueur persistant (identifiant stable d'une partie à l'autre : c'est lui qui porte la mémoire). */
export interface SavedPlayerProfile extends PlayerProfileDraft {
  readonly savedAt: string;
}

export interface PlayerProfileRepository {
  list(): Promise<readonly SavedPlayerProfile[]>;
  save(profile: SavedPlayerProfile): Promise<void>;
  remove(playerId: PlayerId): Promise<void>;
}
